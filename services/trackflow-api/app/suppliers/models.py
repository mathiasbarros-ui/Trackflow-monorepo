from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class SupplierStatus(str, Enum):
    ACTIVE = "activo"
    SUSPENDED = "suspendido"


class ProductCategory(str, Enum):
    ELECTRONICS = "electronics"
    LOGISTICS = "logistics"
    METALS = "metals"


class SupplierCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    country: str = Field(min_length=2, max_length=2)
    category: ProductCategory
    rate: float = Field(gt=0)
    status: SupplierStatus = SupplierStatus.ACTIVE

    @field_validator("country")
    @classmethod
    def validate_country(cls, value: str) -> str:
        country = value.strip().upper()
        if country not in {"US", "ES"}:
            raise ValueError("country must be US or ES")
        return country


class SupplierRateUpdateRequest(BaseModel):
    rate: float = Field(gt=0)


class SupplierStatusUpdateRequest(BaseModel):
    status: SupplierStatus


class SupplierResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: int
    name: str
    country: str
    category: ProductCategory
    rate: float
    status: SupplierStatus
    updated_at: datetime
