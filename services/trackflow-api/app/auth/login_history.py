import logging
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Field, Session, SQLModel

from app.auth.database import engine


logger = logging.getLogger(__name__)


class LoginAttempt(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(index=True)
    user_id: str | None = Field(default=None, index=True)
    succeeded: bool
    method: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), index=True
    )


def record_login_attempt(
    email: str, user_id: str | None, succeeded: bool, method: str
) -> None:
    try:
        with Session(engine) as session:
            session.add(LoginAttempt(
                email=email[:320],
                user_id=user_id,
                succeeded=succeeded,
                method=method,
            ))
            session.commit()
    except SQLAlchemyError as error:
        logger.exception("No se pudo registrar el intento de inicio de sesión")
        raise HTTPException(
            status_code=503,
            detail="No se pudo registrar el acceso. Inténtalo nuevamente.",
        ) from error
