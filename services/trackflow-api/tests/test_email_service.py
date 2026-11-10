import pytest

from app.auth.email_service import get_frontend_url, send_password_reset_email


@pytest.mark.parametrize(
    ("configured_url", "expected"),
    [
        ("http://localhost:3001", "https://test-space-3001.app.github.dev"),
        ("http://localhost:3001/", "https://test-space-3001.app.github.dev"),
        ("http://127.0.0.1:3101", "https://test-space-3101.app.github.dev"),
        ("http://localhost:3000", "https://test-space-3000.app.github.dev"),
        ("https://backoffice.example.com/", "https://backoffice.example.com"),
        ("https://other-space-3001.app.github.dev", "https://other-space-3001.app.github.dev"),
    ],
)
def test_frontend_url_in_codespaces(monkeypatch, configured_url, expected):
    monkeypatch.setenv("CODESPACE_NAME", "test-space")
    monkeypatch.setenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev")
    monkeypatch.setenv("FRONTEND_URL", configured_url)

    assert get_frontend_url() == expected


def test_frontend_url_without_codespaces(monkeypatch):
    monkeypatch.delenv("CODESPACE_NAME", raising=False)
    monkeypatch.delenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", raising=False)
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:3001/")

    assert get_frontend_url() == "http://localhost:3001"


def test_default_frontend_is_backoffice(monkeypatch):
    monkeypatch.delenv("FRONTEND_URL", raising=False)
    monkeypatch.delenv("CODESPACE_NAME", raising=False)
    monkeypatch.delenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", raising=False)

    assert get_frontend_url() == "http://localhost:3001"


def test_reset_email_contains_public_backoffice_link(monkeypatch):
    import resend

    monkeypatch.setenv("RESEND_API_KEY", "test-key")
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:3001")
    monkeypatch.setenv("CODESPACE_NAME", "test-space")
    monkeypatch.setenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev")
    sent = []
    monkeypatch.setattr(resend.Emails, "send", lambda data: sent.append(data))

    send_password_reset_email("user@example.com", "test/token")

    assert len(sent) == 1
    assert sent[0]["to"] == ["user@example.com"]
    assert (
        'href="https://test-space-3001.app.github.dev/reset-password?token=test%2Ftoken"'
        in sent[0]["html"]
    )
