from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


class SKU(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    sku: str = Field(index=True, unique=True)
    client_name: str
    category: str
    warehouse: str

    entries: list["StockEntry"] = Relationship(back_populates="product")
    exits: list["StockExit"] = Relationship(back_populates="product")


class StockEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sku_id: int = Field(foreign_key="sku.id")
    quantity: int
    reference: str
    warehouse: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_uuid: str

    product: Optional[SKU] = Relationship(back_populates="entries")


class StockExit(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sku_id: int = Field(foreign_key="sku.id")
    quantity: int
    exit_type: str
    tracking_number: Optional[str] = None
    warehouse: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_uuid: str

    product: Optional[SKU] = Relationship(back_populates="exits")
