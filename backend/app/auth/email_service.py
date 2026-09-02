import os
from urllib.parse import quote


def get_frontend_url() -> str:
    configured_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    codespace_name = os.getenv("CODESPACE_NAME")
    forwarding_domain = os.getenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN")

    if (
        configured_url.rstrip("/") == "http://localhost:3000"
        and codespace_name
        and forwarding_domain
    ):
        return f"https://{codespace_name}-3000.{forwarding_domain}"

    return configured_url.rstrip("/")


def send_password_reset_email(
    to_email: str,
    token: str,
) -> None:
    import resend

    resend.api_key = os.environ["RESEND_API_KEY"]

    frontend_url = get_frontend_url()
    email_from = os.getenv(
        "EMAIL_FROM",
        "TrackFlow <onboarding@resend.dev>",
    )
    reset_url = (
        f"{frontend_url}/reset-password?token="
        f"{quote(token, safe='')}"
    )

    resend.Emails.send(
        {
            "from": email_from,
            "to": [to_email],
            "subject": "Restablecer contraseña de TrackFlow",
            "html": (
                "<h2>Restablecer contraseña</h2>"
                "<p>Recibimos una solicitud para cambiar tu contraseña. "
                "El enlace vence en 30 minutos.</p>"
                f'<p><a href="{reset_url}">Restablecer contraseña</a></p>'
                "<p>Si no solicitaste el cambio, ignora este email.</p>"
            ),
        }
    )