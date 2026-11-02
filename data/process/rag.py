from __future__ import annotations

import argparse
import os
import re
from functools import lru_cache
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

import httpx
from qdrant_client import QdrantClient, models


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE_DIR = REPO_ROOT / "docs" / "company-knowledge-base"


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Falta configurar la variable de entorno {name}.")
    return value


def _embedding_config() -> tuple[str, str, str, int]:
    base_url = _required_env("RAG_EMBEDDING_API_BASE_URL").rstrip("/")
    model = _required_env("RAG_EMBEDDING_MODEL")
    dimension = int(_required_env("RAG_EMBEDDING_DIMENSION"))
    if dimension <= 0:
        raise RuntimeError("RAG_EMBEDDING_DIMENSION debe ser mayor que cero.")
    return (
        base_url,
        os.getenv("RAG_EMBEDDING_API_KEY", "").strip(),
        model,
        dimension,
    )


def _qdrant_config() -> tuple[str, str | None, str]:
    return (
        _required_env("QDRANT_URL"),
        os.getenv("QDRANT_API_KEY", "").strip() or None,
        _required_env("RAG_COLLECTION_NAME"),
    )


def _company_config() -> tuple[str, str]:
    return (
        _required_env("RAG_COMPANY_NAME"),
        _required_env("RAG_LANGUAGE"),
    )


def _api_url(base_url: str, path: str) -> str:
    versioned_base = base_url if base_url.endswith("/v1") else f"{base_url}/v1"
    return f"{versioned_base}/{path}"


def _auth_headers(api_key: str) -> dict[str, str]:
    if not api_key:
        return {}
    return {"Authorization": f"Bearer {api_key}"}


def embed(text: str) -> list[float]:
    """Embed one string using the separately configured embeddings model."""
    if not text.strip():
        raise ValueError("No se puede generar un embedding para texto vacío.")

    base_url, api_key, model, dimension = _embedding_config()
    response = httpx.post(
        _api_url(base_url, "embeddings"),
        headers=_auth_headers(api_key),
        json={"model": model, "input": text},
        timeout=60.0,
    )
    response.raise_for_status()
    data = response.json().get("data", [])
    if not data or not isinstance(data[0].get("embedding"), list):
        raise RuntimeError(
            "La API de embeddings devolvió una respuesta inválida.")

    vector = [float(value) for value in data[0]["embedding"]]
    if len(vector) != dimension:
        raise RuntimeError(
            "La dimensión del embedding no coincide con "
            "RAG_EMBEDDING_DIMENSION."
        )
    return vector


@lru_cache(maxsize=1)
def get_qdrant_client() -> QdrantClient:
    url, api_key, _ = _qdrant_config()
    return QdrantClient(url=url, api_key=api_key)


def _split_long_paragraph(paragraph: str, max_chars: int) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", paragraph)
    pieces: list[str] = []

    for sentence in sentences:
        if len(sentence) <= max_chars:
            pieces.append(sentence)
            continue

        words = sentence.split()
        current: list[str] = []
        current_length = 0
        for word in words:
            if current and current_length + len(word) + 1 > max_chars:
                pieces.append(" ".join(current))
                current = []
                current_length = 0
            current.append(word)
            current_length += len(word) + (1 if len(current) > 1 else 0)
        if current:
            pieces.append(" ".join(current))

    return pieces


def _semantic_chunks(content: str, max_chars: int) -> list[tuple[str, str]]:
    chunks: list[tuple[str, str]] = []
    section = "General"
    paragraph_lines: list[str] = []
    group: list[str] = []
    group_section = section
    group_length = 0

    def flush_group() -> None:
        nonlocal group, group_length
        if group:
            chunks.append((group_section, "\n\n".join(group)))
            group = []
            group_length = 0

    def flush_paragraph() -> None:
        nonlocal paragraph_lines, group_section, group_length
        paragraph = " ".join(line.strip() for line in paragraph_lines).strip()
        paragraph_lines = []
        if not paragraph:
            return

        for piece in _split_long_paragraph(paragraph, max_chars):
            if group and (group_section != section or group_length + len(piece) + 2 > max_chars):
                flush_group()
            if not group:
                group_section = section
            group.append(piece)
            group_length += len(piece) + 2

    for line in content.splitlines():
        heading = re.match(r"^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$", line)
        if heading:
            flush_paragraph()
            flush_group()
            section = heading.group(1).strip()
        elif line.strip():
            paragraph_lines.append(line)
        else:
            flush_paragraph()

    flush_paragraph()
    flush_group()
    return chunks


def _company_filter(company: str) -> models.Filter:
    return models.Filter(
        must=[models.FieldCondition(
            key="company", match=models.MatchValue(value=company))]
    )


def setup(source_dir: str | Path | None = None) -> int:
    """Index Markdown and text files from the company knowledge corpus."""
    company, language = _company_config()
    qdrant_url, qdrant_api_key, collection = _qdrant_config()
    _, _, _, dimension = _embedding_config()
    max_chars = int(os.getenv("RAG_CHUNK_SIZE_CHARS", "2200"))
    if max_chars < 100:
        raise RuntimeError("RAG_CHUNK_SIZE_CHARS debe ser al menos 100.")

    directory = Path(source_dir) if source_dir else Path(
        os.getenv("RAG_DOCUMENTS_DIR", str(DEFAULT_SOURCE_DIR))
    )
    if not directory.is_dir():
        raise FileNotFoundError(
            f"No existe el corpus de conocimiento: {directory}. "
            "Añade los documentos indicados en el briefing de empresa."
        )

    source_files = sorted(
        path for path in directory.rglob("*")
        if path.is_file() and path.suffix.lower() in {".md", ".txt"}
    )
    if not source_files:
        raise FileNotFoundError(f"No hay archivos .md o .txt en {directory}.")

    client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
    if not client.collection_exists(collection_name=collection):
        client.create_collection(
            collection_name=collection,
            vectors_config=models.VectorParams(
                size=dimension,
                distance=models.Distance.COSINE,
            ),
        )

    points: list[models.PointStruct] = []
    for source_file in source_files:
        source_document = source_file.relative_to(directory).as_posix()
        content = source_file.read_text(encoding="utf-8-sig")
        for chunk_index, (section, text) in enumerate(
            _semantic_chunks(content, max_chars)
        ):
            point_id = str(
                uuid5(NAMESPACE_URL,
                      f"{company}:{source_document}:{chunk_index}")
            )
            points.append(
                models.PointStruct(
                    id=point_id,
                    vector=embed(text),
                    payload={
                        "source_document": source_document,
                        "section": section,
                        "company": company,
                        "language": language,
                        "chunk_index": chunk_index,
                        "text": text,
                    },
                )
            )

    if not points:
        raise ValueError("El corpus no contiene texto indexable.")

    client.upsert(collection_name=collection, points=points, wait=True)
    indexed_ids = {point.id for point in points}
    stale_ids: list[str | int] = []
    offset = None
    while True:
        existing, offset = client.scroll(
            collection_name=collection,
            scroll_filter=_company_filter(company),
            limit=1000,
            offset=offset,
            with_payload=False,
            with_vectors=False,
        )
        stale_ids.extend(
            point.id for point in existing if point.id not in indexed_ids)
        if offset is None:
            break

    if stale_ids:
        client.delete(
            collection_name=collection,
            points_selector=models.PointIdsList(points=stale_ids),
            wait=True,
        )

    return len(points)


def retrieve(
    query: str,
    *,
    k: int = 5,
    min_score: float | None = None,
) -> list[dict]:
    """Return only relevant payloads above the configured similarity threshold."""
    if k < 1:
        raise ValueError("k debe ser mayor que cero.")
    if min_score is None:
        min_score = float(_required_env("RAG_MIN_SCORE"))
    if not -1 <= min_score <= 1:
        raise ValueError(
            "min_score debe estar entre -1 y 1 para similitud coseno.")

    _, _, collection = _qdrant_config()
    results = get_qdrant_client().query_points(
        collection_name=collection,
        query=embed(query),
        limit=k,
        with_payload=True,
        score_threshold=min_score,
    )

    retrieved: list[dict] = []
    for point in results.points:
        score = float(point.score)
        payload = point.payload or {}
        if score < min_score or not payload.get("text"):
            continue
        retrieved.append(
            {
                "source_document": payload.get("source_document", ""),
                "section": payload.get("section", ""),
                "company": payload.get("company", ""),
                "language": payload.get("language", ""),
                "chunk_index": payload.get("chunk_index", 0),
                "text": payload["text"],
                "score": score,
            }
        )
    return retrieved


def _generate_answer(question: str, context: list[dict]) -> str:
    base_url = _required_env("RAG_GENERATION_API_BASE_URL").rstrip("/")
    api_key = os.getenv("RAG_GENERATION_API_KEY", "").strip()
    model = _required_env("RAG_GENERATION_MODEL")
    system_prompt = _required_env("RAG_SYSTEM_PROMPT")
    context_text = "\n\n".join(
        f"[{item['source_document']} | {item['section']}]\n{item['text']}"
        for item in context
    )
    response = httpx.post(
        _api_url(base_url, "chat/completions"),
        headers=_auth_headers(api_key),
        json={
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        f"{system_prompt}\n\n"
                        "Responde solo con información sustentada por el contexto. "
                        "Si el contexto no permite responder, dilo claramente y no "
                        "inventes datos de la empresa."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Contexto recuperado:\n{context_text}\n\nPregunta: {question}",
                },
            ],
            "temperature": 0,
        },
        timeout=90.0,
    )
    response.raise_for_status()
    choices = response.json().get("choices", [])
    answer = choices[0].get("message", {}).get("content") if choices else None
    if not isinstance(answer, str) or not answer.strip():
        raise RuntimeError(
            "La API de generación devolvió una respuesta vacía.")
    return answer.strip()


def query(question: str) -> str:
    """Retrieve evidence and generate the user-facing answer from that context."""
    clean_question = question.strip()
    if not clean_question:
        raise ValueError("La pregunta no puede estar vacía.")

    embedding_model = _required_env("RAG_EMBEDDING_MODEL")
    generation_model = _required_env("RAG_GENERATION_MODEL")
    if embedding_model.casefold() == generation_model.casefold():
        raise RuntimeError(
            "RAG_EMBEDDING_MODEL y RAG_GENERATION_MODEL deben ser modelos distintos."
        )

    context = retrieve(clean_question, k=5)
    if not context:
        return os.getenv(
            "RAG_NO_ANSWER",
            "No encuentro información suficiente en los documentos disponibles para responder con confianza.",
        ).strip()
    return _generate_answer(clean_question, context)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Indexa el corpus de conocimiento RAG.")
    parser.add_argument("--source", type=Path, default=None)
    arguments = parser.parse_args()
    print(f"Chunks indexados: {setup(arguments.source)}")


if __name__ == "__main__":
    main()
