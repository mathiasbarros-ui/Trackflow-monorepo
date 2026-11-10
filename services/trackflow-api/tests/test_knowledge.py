import httpx

from routers import knowledge


def test_knowledge_query_returns_only_generated_answer(admin_client, monkeypatch):
    monkeypatch.setattr(knowledge.rag, "query", lambda question: "Respuesta generada.")

    response = admin_client.post(
        "/api/knowledge/query",
        json={"question": "  ¿Cuál es la política?  "},
    )

    assert response.status_code == 200
    assert response.json() == {"answer": "Respuesta generada."}
    assert "chunks" not in response.json()


def test_knowledge_query_requires_authentication(client):
    response = client.post(
        "/api/knowledge/query",
        json={"question": "¿Cuál es la política?"},
    )

    assert response.status_code == 401


def test_knowledge_query_rejects_non_admin(auth_client):
    response = auth_client.post(
        "/api/knowledge/query",
        json={"question": "¿Cuál es la política?"},
    )

    assert response.status_code == 403


def test_knowledge_query_rejects_blank_question(admin_client):
    response = admin_client.post("/api/knowledge/query", json={"question": "   "})

    assert response.status_code == 422


def test_knowledge_query_reports_missing_configuration(admin_client, monkeypatch):
    def missing_configuration(question):
        raise RuntimeError("Falta configurar RAG_COLLECTION_NAME.")

    monkeypatch.setattr(knowledge.rag, "query", missing_configuration)
    response = admin_client.post(
        "/api/knowledge/query",
        json={"question": "¿Cuál es la política?"},
    )

    assert response.status_code == 503
    assert "RAG_COLLECTION_NAME" in response.json()["detail"]


def test_knowledge_query_hides_provider_connection_details(admin_client, monkeypatch):
    def provider_unavailable(question):
        request = httpx.Request("POST", "https://model-provider.test/v1/chat/completions")
        raise httpx.ConnectError("connection refused", request=request)

    monkeypatch.setattr(knowledge.rag, "query", provider_unavailable)
    response = admin_client.post(
        "/api/knowledge/query",
        json={"question": "¿Cuál es la política?"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "El servicio RAG no está disponible. Inténtalo de nuevo más tarde."
    )
    assert "model-provider" not in response.text