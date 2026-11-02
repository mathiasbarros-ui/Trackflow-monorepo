# RAG knowledge assistant

## Flow

`docs/company-knowledge-base/` is the source corpus. `data.process.rag.setup()` reads Markdown and plain-text files, groups paragraphs under their headings, embeds each semantic chunk with the embeddings model, and upserts deterministic point IDs into the configured Qdrant collection. Re-running setup updates changed chunks and removes stale points for the configured company.

At query time, `retrieve()` embeds the question with the same embeddings model, requests the nearest Qdrant points, and filters scores below `RAG_MIN_SCORE`. `query()` sends only those retrieved chunks plus the question to the separately configured generation model. With no qualifying evidence, it returns `RAG_NO_ANSWER` without calling the generation model. The authenticated `POST /api/knowledge/query` endpoint returns only `{ "answer": "..." }`; it does not expose raw Qdrant results. The backoffice calls it through `/backend/api/knowledge/query`.

## Configuration

Set the RAG variables from `.env.example` using the assigned company briefing and the model credentials supplied for the course. Both model base URLs must expose OpenAI-compatible `/v1/embeddings` and `/v1/chat/completions` endpoints. The embedding and generation model IDs must be different. Set `RAG_EMBEDDING_DIMENSION` to the actual embedding dimension and calibrate `RAG_MIN_SCORE` against the evaluation set; the application intentionally has no guessed company-specific defaults.

For local development outside Docker, use `QDRANT_URL=http://localhost:6333`; Compose services use `http://qdrant:6333`. Add the briefing's source documents under `docs/company-knowledge-base/`, set the exact collection/company/language and generation system prompt from that briefing, then run:

```bash
docker compose up -d qdrant
uv run --project services/trackflow-api python -m data.process.rag
```

The setup command fails explicitly if the corpus or required configuration is missing. It never seeds synthetic company facts.

## Chunking and metadata

Markdown headings define `section`; paragraphs are kept together while below `RAG_CHUNK_SIZE_CHARS` (default 2200 characters). Oversized paragraphs are split on sentence boundaries and then word boundaries. This is a conservative initial strategy and should be measured against the assigned documents before tuning.

Each Qdrant payload stores `source_document`, `section`, `company`, `language`, `chunk_index`, and `text`. Point IDs are deterministic per company, source document, and chunk index, making setup idempotent. The collection uses cosine distance and the configured embedding dimension.

## Verification and evaluation

The unit tests mock Qdrant and model calls; they verify semantic grouping, idempotent indexing, stale-point cleanup, score filtering, honest no-context behavior, generated answers, authentication, and the response contract. Run them with:

```bash
uv run --project services/trackflow-api pytest services/trackflow-api/tests/test_rag.py services/trackflow-api/tests/test_knowledge.py -q
```

`data/eval/evaluate_rag.py` checks `data/eval/test-queries.json` and computes the share of questions whose expected source (and optional section) appears in the top three. It exits unsuccessfully below 80%. Each query entry has this shape:

```json
{
	"question": "Question grounded in the company documents",
	"relevant_chunks": [
		{ "source_document": "policy.md", "section": "Returns" }
	]
}
```

Run it after indexing with `uv run --project services/trackflow-api python -m data.eval.evaluate_rag`. The assigned `company-BRIEFING.md` and source documents are not present in this checkout, so a valid eight-question set, measured Recall@3, and company-specific prompt/threshold cannot yet be produced. Add those from the assigned corpus before treating retrieval quality as accepted.