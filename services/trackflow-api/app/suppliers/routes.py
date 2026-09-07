from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query as ApiQuery, status
from tinydb import Query

from app.suppliers.database import get_suppliers_table
from app.suppliers.models import (
    ProductCategory,
    SupplierCreateRequest,
    SupplierRateUpdateRequest,
    SupplierResponse,
    SupplierStatusUpdateRequest,
)


router = APIRouter(
    prefix="/suppliers",
        tags=["suppliers"],
)

supplier_query = Query()


def current_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_supplier_response(supplier_data: dict) -> SupplierResponse:
    return SupplierResponse(**supplier_data)


def get_next_supplier_id(suppliers: list[dict]) -> int:
    return 1 if not suppliers else max(supplier["id"] for supplier in suppliers) + 1


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreateRequest) -> SupplierResponse:
    db, suppliers_table = get_suppliers_table()
    try:
        supplier_exists = suppliers_table.get(
            (supplier_query.name == payload.name)
            & (supplier_query.country == payload.country)
        )
        if supplier_exists:
            raise HTTPException(status_code=409, detail="supplier already exists")

        supplier_id = get_next_supplier_id(suppliers_table.all())
        supplier_data = {
            "id": supplier_id,
            **payload.model_dump(),
            "updated_at": current_timestamp(),
        }
        suppliers_table.insert(supplier_data)
        return build_supplier_response(supplier_data)
    finally:
        db.close()


@router.get("", response_model=list[SupplierResponse])
def list_suppliers(
    country: str | None = ApiQuery(default=None),
    category: ProductCategory | None = ApiQuery(default=None),
) -> list[SupplierResponse]:
    db, suppliers_table = get_suppliers_table()
    try:
        query_filter = None

        if country:
            normalized_country = country.strip().upper()
            query_filter = supplier_query.country == normalized_country

        if category:
            category_filter = supplier_query.category == category.value
            query_filter = category_filter if query_filter is None else (query_filter & category_filter)

        suppliers = suppliers_table.all() if query_filter is None else suppliers_table.search(query_filter)

        return [build_supplier_response(supplier) for supplier in suppliers]
    finally:
        db.close()


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int) -> SupplierResponse:
    db, suppliers_table = get_suppliers_table()
    try:
        supplier = suppliers_table.get(supplier_query.id == supplier_id)
        if supplier is None:
            raise HTTPException(status_code=404, detail="supplier not found")
        return build_supplier_response(supplier)
    finally:
        db.close()


@router.patch("/{supplier_id}/rate", response_model=SupplierResponse)
def update_supplier_rate(
    supplier_id: int,
    payload: SupplierRateUpdateRequest,
) -> SupplierResponse:
    db, suppliers_table = get_suppliers_table()
    try:
        supplier = suppliers_table.get(supplier_query.id == supplier_id)
        if supplier is None:
            raise HTTPException(status_code=404, detail="supplier not found")

        suppliers_table.update(
            {
                "rate": payload.rate,
                "updated_at": current_timestamp(),
            },
            supplier_query.id == supplier_id,
        )
        updated_supplier = suppliers_table.get(supplier_query.id == supplier_id)
        return build_supplier_response(updated_supplier)
    finally:
        db.close()


@router.patch("/{supplier_id}/status", response_model=SupplierResponse)
def update_supplier_status(
    supplier_id: int,
    payload: SupplierStatusUpdateRequest,
) -> SupplierResponse:
    db, suppliers_table = get_suppliers_table()
    try:
        supplier = suppliers_table.get(supplier_query.id == supplier_id)
        if supplier is None:
            raise HTTPException(status_code=404, detail="supplier not found")

        suppliers_table.update(
            {
                "status": payload.status.value,
                "updated_at": current_timestamp(),
            },
            supplier_query.id == supplier_id,
        )
        updated_supplier = suppliers_table.get(supplier_query.id == supplier_id)
        return build_supplier_response(updated_supplier)
    finally:
        db.close()


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(supplier_id: int) -> None:
    db, suppliers_table = get_suppliers_table()
    try:
        supplier = suppliers_table.get(supplier_query.id == supplier_id)
        if supplier is None:
            raise HTTPException(status_code=404, detail="supplier not found")

        suppliers_table.remove(supplier_query.id == supplier_id)
    finally:
        db.close()
