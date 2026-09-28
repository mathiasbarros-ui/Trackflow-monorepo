from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, model_validator


class SKUCreate(BaseModel):
    name: str
    sku: str
    client_name: str
    category: str
    warehouse: str


class SKUResponse(SKUCreate):
    id: int
    current_stock: int


class StockEntryCreate(BaseModel):
    sku_id: int
    quantity: int
    reference: str
    warehouse: str


class StockExitCreate(BaseModel):
    sku_id: int
    quantity: int
    exit_type: str
    tracking_number: Optional[str] = None
    warehouse: str

    @model_validator(mode="after")
    def validate_exit(self):
        if self.exit_type not in {"dispatch", "loss"}:
            raise ValueError("exit_type must be 'dispatch' or 'loss'")

        if self.exit_type == "dispatch" and not self.tracking_number:
            raise ValueError("tracking_number is required for dispatch")

        if self.exit_type == "loss" and self.tracking_number is not None:
            raise ValueError("tracking_number must be null for loss")

        return self


class StockEntryResponse(StockEntryCreate):
    id: int
    created_at: datetime
    user_uuid: str

    model_config = ConfigDict(from_attributes=True)


class StockExitResponse(StockExitCreate):
    id: int
    created_at: datetime
    user_uuid: str

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: int
    movement_type: str
    quantity: int
    created_at: datetime
    user_uuid: str
    product: SKUResponse
