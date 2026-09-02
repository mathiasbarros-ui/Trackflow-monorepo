import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
    OAuth2PasswordRequestForm,
)
from jose import JWTError, jwt
from passlib.hash import bcrypt
from pydantic import BaseModel, Field

from app.auth.database import reset_tokens_table
from app.auth.email_service import send_password_reset_email
from app.auth.services import (
    get_profile_by_user_id,
    get_user_by_email,
    get_user_by_id
)


load_dotenv()


router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)


JWT_SECRET = os.getenv(
    "JWT_SECRET",
    "development-secret-change-me",
)
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        os.getenv("ACCESS_TOKEN_MINUTES", "120"),
    )
)


bearer_scheme = HTTPBearer(
    bearerFormat="JWT",
    description="Pega el access_token devuelto por POST /auth/login",
)


class LoginInput(BaseModel):
    email: str
    password: str


class ChangePasswordInput(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)


class ForgotPasswordInput(BaseModel):
    email: str


class ResetPasswordInput(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)


def authenticate_user(email: str, password: str):
    user = get_user_by_email(email)

    if not user:
        return None

    if not bcrypt.verify(password, user["hashed_password"]):
        return None

    return user


def create_access_token(user_id: str):
    expiration = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": user_id,
        "exp": expiration
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=ALGORITHM
    )


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Token invalido o expirado",
            )

        user = get_user_by_id(user_id)

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Usuario no válido"
            )

        return user

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Token inválido o expirado"
        )


@router.post("/token")
def login_token(
    form: OAuth2PasswordRequestForm = Depends()
):
    # Swagger llama "username" al campo.
    # Nosotros usamos ese campo para enviar el email.

    user = authenticate_user(
        form.username,
        form.password
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Email o contraseña incorrectos"
        )

    token = create_access_token(
        user["id"]
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.post("/change-password")
def change_password(
    data: ChangePasswordInput,
    current_user: dict = Depends(get_current_user),
):
    if not bcrypt.verify(
        data.current_password,
        current_user["hashed_password"],
    ):
        raise HTTPException(
            status_code=400,
            detail="La contrasena actual es incorrecta",
        )

    from app.auth.services import update_user

    update_user(
        current_user["id"],
        {"hashed_password": bcrypt.hash(data.new_password)},
    )

    return {"message": "Contrasena actualizada correctamente"}


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordInput):
    generic_message = (
        "Si esa direccion esta registrada, recibiras un enlace en breve."
    )
    user = get_user_by_email(data.email)

    if not user:
        return {"message": generic_message}

    reset_tokens_table.update(
        {"used": True},
        lambda token: (
            token.get("user_id") == user["id"]
            and not token.get("used", False)
        ),
    )

    raw_token = secrets.token_urlsafe(32)
    reset_tokens_table.insert(
        {
            "user_id": user["id"],
            "token_hash": hash_reset_token(raw_token),
            "expires_at": (
                datetime.now(timezone.utc) + timedelta(minutes=30)
            ).isoformat(),
            "used": False,
        }
    )

    if os.getenv("RESEND_API_KEY"):
        try:
            send_password_reset_email(user["email"], raw_token)
        except Exception as error:
            print(f"Error enviando email de recuperacion: {error}")
    else:
        print("RESEND_API_KEY no configurada; no se envio email de recuperacion")

    return {"message": generic_message}


@router.post("/reset-password")
def reset_password(data: ResetPasswordInput):
    token_hash = hash_reset_token(data.token)
    reset_token = reset_tokens_table.get(
        lambda item: item.get("token_hash") == token_hash
    )

    if not reset_token or reset_token.get("used", False):
        raise HTTPException(status_code=400, detail="Token invalido o usado")

    expires_at = datetime.fromisoformat(reset_token["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El token expiro")

    user = get_user_by_id(reset_token["user_id"])
    if not user:
        raise HTTPException(status_code=400, detail="Token invalido")

    from app.auth.services import update_user

    update_user(
        user["id"],
        {"hashed_password": bcrypt.hash(data.new_password)},
    )
    reset_tokens_table.update(
        {"used": True},
        doc_ids=[reset_token.doc_id],
    )

    return {"message": "Contrasena actualizada correctamente"}


@router.post("/login")
def login(
    data: LoginInput
):
    user = authenticate_user(
        data.email,
        data.password
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Email o contraseña incorrectos"
        )

    token = create_access_token(
        user["id"]
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"]
        },
        "profile": get_profile_by_user_id(
            user["id"]
        )
    }


@router.get("/me")
def get_me(
    current_user: dict = Depends(get_current_user)
):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "role": current_user["role"],
        "profile": get_profile_by_user_id(
            current_user["id"]
        )
    }
