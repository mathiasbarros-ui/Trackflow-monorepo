from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func
from sqlmodel import Session, col, select

from app.auth.database import engine
from app.auth.login_history import LoginAttempt
from app.auth.routes import require_superadmin_user
from app.auth.schemas import UserResponse
from app.auth.services import get_all_users, get_user_by_id, update_user
from app.auth.users import public_user, validate_access_changes


router = APIRouter(
    prefix="/admin",
    tags=["superadmin"],
    dependencies=[Depends(require_superadmin_user)],
)


class AccountPage(BaseModel):
    items: list[UserResponse]
    total: int


class AccountAccessUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "manager", "admin"] | None = None
    is_active: bool | None = None


class LoginAttemptResponse(BaseModel):
    id: int
    email: str
    user_id: str | None
    succeeded: bool
    method: str
    created_at: datetime


class LoginHistoryPage(BaseModel):
    items: list[LoginAttemptResponse]
    total: int


@router.get("/users", response_model=AccountPage)
def list_accounts(
    search: str = Query(default="", max_length=320),
    role: Literal["user", "manager", "admin", "superadmin"] | None = None,
    is_active: bool | None = None,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=25, ge=1, le=100),
):
    records = [
        user for user in get_all_users()
        if search.strip().casefold() in user["email"].casefold()
        and (role is None or user["role"] == role)
        and (is_active is None or user["is_active"] == is_active)
    ]
    records.sort(key=lambda user: (user["email"].casefold(), user["id"]))
    return {
        "items": [public_user(user) for user in records[offset:offset + limit]],
        "total": len(records),
    }


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_account_access(
    user_id: str,
    data: AccountAccessUpdate,
    current_user: dict = Depends(require_superadmin_user),
):
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    changes = data.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(status_code=400, detail="Indica un rol o un estado para actualizar")
    validate_access_changes(user, changes, current_user)
    return public_user(update_user(user_id, changes))


@router.get("/login-history", response_model=LoginHistoryPage)
def list_login_history(
    search: str = Query(default="", max_length=320),
    succeeded: bool | None = None,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=25, ge=1, le=100),
):
    filters = []
    if search.strip():
        filters.append(col(LoginAttempt.email).icontains(search.strip(), autoescape=True))
    if succeeded is not None:
        filters.append(LoginAttempt.succeeded == succeeded)
    with Session(engine) as session:
        total = session.exec(
            select(func.count()).select_from(LoginAttempt).where(*filters)
        ).one()
        items = session.exec(
            select(LoginAttempt).where(*filters)
            .order_by(col(LoginAttempt.id).desc())
            .offset(offset).limit(limit)
        ).all()
        return {
            "items": [
                {
                    **item.model_dump(),
                    # SQLite returns these UTC timestamps without timezone information.
                    "created_at": item.created_at.replace(tzinfo=timezone.utc),
                }
                for item in items
            ],
            "total": total,
        }
