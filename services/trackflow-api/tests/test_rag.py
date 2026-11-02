import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from data.process import rag
from data.eval import evaluate_rag


class FakeQdrant:
    def __init__(self):
        self.exists = False
        self.points = {}

    def collection_exists(self, collection_name):
        return self.exists

    def create_collection(self, **kwargs):
        self.exists = True

    def upsert(self, *, points, **kwargs):
        self.points.update({point.id: point for point in points})

    def scroll(self, **kwargs):
        rows = [
            SimpleNamespace(id=point.id, payload=point.payload)
            for point in self.points.values()
        ]
        return rows, None

    def delete(self, *, points_selector, **kwargs):
        for point_id in points_selector.points:
            self.points.pop(point_id, None)


def configure_indexing(monkeypatch, source_dir):
    monkeypatch.setenv("QDRANT_URL", "http://localhost:6333")
    monkeypatch.setenv("RAG_COLLECTION_NAME", "test-knowledge")
    monkeypatch.setenv("RAG_COMPANY_NAME", "TestCo")
    monkeypatch.setenv("RAG_LANGUAGE", "es")
    monkeypatch.setenv("RAG_EMBEDDING_API_BASE_URL", "http://embedding.test/v1")
    monkeypatch.setenv("RAG_EMBEDDING_MODEL", "embedding-model")
    monkeypatch.setenv("RAG_EMBEDDING_DIMENSION", "3")
    monkeypatch.setenv("RAG_DOCUMENTS_DIR", str(source_dir))


def test_semantic_chunks_keep_sections_and_paragraphs_together():
    chunks = rag._semantic_chunks(
        "# Política\n\nPrimer párrafo completo.\n\nSegundo párrafo completo.",
        max_chars=100,
    )

    assert chunks == [
        ("Política", "Primer párrafo completo.\n\nSegundo párrafo completo.")
    ]


def test_setup_is_idempotent_and_removes_stale_chunks(tmp_path, monkeypatch):
    source_dir = tmp_path / "knowledge"
    source_dir.mkdir()
    source_file = source_dir / "policy.md"
    source_file.write_text("# Operación\n\nTexto vigente.", encoding="utf-8")
    configure_indexing(monkeypatch, source_dir)
    client = FakeQdrant()
    monkeypatch.setattr(rag, "QdrantClient", lambda **kwargs: client)
    monkeypatch.setattr(rag, "embed", lambda text: [0.1, 0.2, 0.3])

    assert rag.setup() == 1
    first_ids = set(client.points)
    assert rag.setup() == 1
    assert set(client.points) == first_ids

    source_file.write_text("# Operación\n\nVersión nueva.", encoding="utf-8")
    assert rag.setup() == 1
    assert len(client.points) == 1
    indexed = next(iter(client.points.values()))
    assert indexed.payload["text"] == "Versión nueva."
    assert indexed.payload["source_document"] == "policy.md"


def test_setup_requires_a_real_company_corpus(tmp_path, monkeypatch):
    configure_indexing(monkeypatch, tmp_path / "missing")

    with pytest.raises(FileNotFoundError, match="Añade los documentos"):
        rag.setup()


def test_query_returns_honest_no_answer_without_context(monkeypatch):
    expected = "No hay evidencia suficiente."
    monkeypatch.setenv("RAG_NO_ANSWER", expected)
    monkeypatch.setenv("RAG_EMBEDDING_MODEL", "embedding-model")
    monkeypatch.setenv("RAG_GENERATION_MODEL", "generation-model")
    monkeypatch.setattr(rag, "retrieve", lambda *args, **kwargs: [])

    assert rag.query("¿Cuál es la política?") == expected


def test_query_generates_from_retrieved_context(monkeypatch):
    context = [{
        "source_document": "policy.md",
        "section": "Devoluciones",
        "text": "El plazo es de 30 días.",
    }]
    monkeypatch.setenv("RAG_EMBEDDING_MODEL", "embedding-model")
    monkeypatch.setenv("RAG_GENERATION_MODEL", "generation-model")
    monkeypatch.setattr(rag, "retrieve", lambda *args, **kwargs: context)
    monkeypatch.setattr(rag, "_generate_answer", lambda question, items: "30 días.")

    assert rag.query("¿Cuál es el plazo?") == "30 días."


def test_query_rejects_reusing_generation_model_for_embeddings(monkeypatch):
    monkeypatch.setenv("RAG_EMBEDDING_MODEL", "same-model")
    monkeypatch.setenv("RAG_GENERATION_MODEL", "SAME-MODEL")

    with pytest.raises(RuntimeError, match="deben ser modelos distintos"):
        rag.query("¿Cuál es el plazo?")


def test_retrieve_filters_scores_and_returns_metadata(monkeypatch):
    monkeypatch.setenv("QDRANT_URL", "http://localhost:6333")
    monkeypatch.setenv("RAG_COLLECTION_NAME", "test-knowledge")
    monkeypatch.setattr(rag, "embed", lambda text: [0.1, 0.2, 0.3])

    class Client:
        def query_points(self, **kwargs):
            assert kwargs["score_threshold"] == 0.5
            return SimpleNamespace(points=[
                SimpleNamespace(
                    score=0.8,
                    payload={
                        "text": "Texto sustentado.",
                        "source_document": "policy.md",
                        "section": "Política",
                        "company": "TestCo",
                        "language": "es",
                        "chunk_index": 2,
                    },
                ),
                SimpleNamespace(score=0.2, payload={"text": "Ruido."}),
            ])

    monkeypatch.setattr(rag, "get_qdrant_client", lambda: Client())

    results = rag.retrieve("consulta", k=3, min_score=0.5)

    assert len(results) == 1
    assert results[0]["text"] == "Texto sustentado."
    assert results[0]["source_document"] == "policy.md"
    assert results[0]["score"] == 0.8


def test_recall_at_three_counts_relevant_source_and_section():
    queries = [
        {
            "question": "¿Cuál es el procedimiento?",
            "relevant_chunks": [
                {"source_document": "policy.md", "section": "Operación"}
            ],
        },
        {
            "question": "¿Cuál es el horario?",
            "relevant_chunks": [{"source_document": "hours.md"}],
        },
    ]

    def fake_retrieve(question, *, k):
        if "procedimiento" in question:
            return [
                {"source_document": "policy.md", "section": "Devoluciones"},
                {"source_document": "policy.md", "section": "Operación"},
            ][:k]
        return [{"source_document": "hours.md", "section": "Horario"}]

    result = evaluate_rag.evaluate(queries, retriever=fake_retrieve)

    assert result["hits"] == 2
    assert result["recall_at_k"] == 1.0
    assert result["accepted"] is True