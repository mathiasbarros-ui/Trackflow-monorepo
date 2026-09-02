import os
from urllib.parse import quote


def send_password_reset_email(
    to_email: str,
    token: str,
) -> None:
    import resend

    resend.api_key = os.environ["RESEND_API_KEY"]

    frontend_url = os.getenv(
        "FRONTEND_URL",
        "http://localhost:3000",
    ).rstrip("/")
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
            "subject": "Restablecer contrasena de TrackFlow",
            "html": (
                "<h2>Restablecer contrasena</h2>"
                "<p>Recibimos una solicitud para cambiar tu contrasena. "
                "El enlace vence en 30 minutos.</p>"
                f'<p><a href="{reset_url}">Restablecer contrasena</a></p>'
                "<p>Si no solicitaste el cambio, ignora este email.</p>"
            ),
        }
    )