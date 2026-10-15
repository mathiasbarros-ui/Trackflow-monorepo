from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.routes import get_current_user
from app.auth.schemas import ProfileResponse
from app.auth.services import (
    get_profile_by_user_id,
    update_profile
)


router = APIRouter(
    prefix="/profiles",
    tags=["profiles"]
)


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


@router.get(
    "/me",
    response_model=ProfileResponse,
    response_model_exclude_unset=True,
)
def get_my_profile(
    current_user: dict = Depends(get_current_user)
):
    profile = get_profile_by_user_id(
        current_user["id"]
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Perfil no encontrado"
        )

    return profile


@router.put(
    "/me",
    response_model=ProfileResponse | None,
    response_model_exclude_unset=True,
)
def edit_my_profile(
    data: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    changes = data.model_dump(
        exclude_none=True
    )

    return update_profile(
        current_user["id"],
        changes
    )
