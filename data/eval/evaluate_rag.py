from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Callable

from data.process.rag import retrieve


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_QUERIES = REPO_ROOT / "data" / "eval" / "test-queries.json"
MINIMUM_QUESTIONS = 8
RECALL_THRESHOLD = 0.8


def load_queries(path: Path = DEFAULT_QUERIES) -> list[dict]:
    try:
        queries = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise ValueError(
            f"No existe {path}; crea el set desde los documentos del briefing."
        ) from error
    except json.JSONDecodeError as error:
        raise ValueError(f"JSON inválido en {path}: {error}") from error

    if not isinstance(queries, list) or len(queries) < MINIMUM_QUESTIONS:
        raise ValueError(
            f"El set debe ser una lista con al menos {MINIMUM_QUESTIONS} preguntas."
        )

    for index, case in enumerate(queries, start=1):
        if not isinstance(case, dict) or not isinstance(case.get("question"), str):
            raise ValueError(f"La pregunta {index} debe tener un campo question.")
        relevant = case.get("relevant_chunks")
        if not isinstance(relevant, list) or not relevant:
            raise ValueError(
                f"La pregunta {index} debe incluir relevant_chunks no vacío."
            )
        for chunk in relevant:
            if not isinstance(chunk, dict) or not chunk.get("source_document"):
                raise ValueError(
                    f"Cada relevant_chunk de la pregunta {index} necesita source_document."
                )
    return queries


def evaluate(
    queries: list[dict],
    *,
    retriever: Callable[..., list[dict]] = retrieve,
    k: int = 3,
) -> dict:
    if k < 1:
        raise ValueError("k debe ser mayor que cero.")

    results = []
    hits = 0
    for case in queries:
        retrieved = retriever(case["question"], k=k)
        relevant = case["relevant_chunks"]
        matched = any(
            any(
                result.get("source_document") == expected["source_document"]
                and (
                    not expected.get("section")
                    or result.get("section") == expected["section"]
                )
                for expected in relevant
            )
            for result in retrieved[:k]
        )
        hits += int(matched)
        results.append({"question": case["question"], "hit": matched})

    recall = hits / len(queries) if queries else 0.0
    return {
        "total": len(queries),
        "hits": hits,
        "recall_at_k": recall,
        "k": k,
        "threshold": RECALL_THRESHOLD,
        "accepted": recall >= RECALL_THRESHOLD,
        "results": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Evalúa Recall@3 del RAG.")
    parser.add_argument("--queries", type=Path, default=DEFAULT_QUERIES)
    arguments = parser.parse_args()

    try:
        queries = load_queries(arguments.queries)
        result = evaluate(queries)
    except ValueError as error:
        parser.error(str(error))

    print(json.dumps(result, ensure_ascii=False, indent=2))
    if not result["accepted"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()