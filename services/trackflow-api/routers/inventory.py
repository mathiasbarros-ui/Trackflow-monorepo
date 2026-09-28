from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, func, select

from app.auth.database import get_db
from models import SKU, StockEntry, StockExit
from schemas import (
    SKUCreate,
    SKUResponse,
    StockEntryCreate,
    StockEntryResponse,
    StockExitCreate,
    StockExitResponse,
)

# Ajustá solamente este import a la ubicación REAL de tu auth existente.
from app.auth.routes import get_current_user

router = APIRouter(prefix="/inventory", tags=["inventory"])

def calculate_stock(
    db: Session,
    sku_id: int,
    warehouse: str,

) -> int:

    inbound_statement = (
        select(func.coalesce(func.sum(StockEntry.quantity), 0))
        .where(StockEntry.sku_id == sku_id)
        .where(StockEntry.warehouse == warehouse)
    )

    outbound_statement = (
        select(func.coalesce(func.sum(StockExit.quantity), 0))
        .where(StockExit.sku_id == sku_id)
        .where(StockExit.warehouse == warehouse)
    )

    total_in = db.exec(inbound_statement).one()
    total_out = db.exec(outbound_statement).one()

    return total_in - total_out


@router.get("/products", response_model=list[SKUResponse])
def get_products(db: Session = Depends(get_db)):
    products = db.exec(select(SKU)).all()

    response = []

    for product in products:
        current_stock = calculate_stock(
            db,
            product.id,
            product.warehouse,
        )

        response.append(
            SKUResponse(
                id=product.id,
                name=product.name,
                sku=product.sku,
                client_name=product.client_name,
                category=product.category,
                warehouse=product.warehouse,
                current_stock=current_stock,
            )
        )

    return response


@router.post("/products", response_model=SKUResponse)
def create_product(
    payload: SKUCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    product = SKU(**payload.model_dump())

    db.add(product)
    db.commit()
    db.refresh(product)

    return SKUResponse(
        id=product.id,
        **payload.model_dump(),
        current_stock=0,
    )


@router.get("/products/{product_id}", response_model=SKUResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(SKU, product_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    current_stock = calculate_stock(
        db,
        product.id,
            product.warehouse,
    )

    return SKUResponse(
        id=product.id,
        name=product.name,
        sku=product.sku,
                client_name=product.client_name,
                category=product.category,
                warehouse=product.warehouse,
        current_stock=current_stock,
    )


@router.post("/orders/inbound", response_model=StockEntryResponse)
def create_inbound_order(
    payload: StockEntryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    product = db.get(SKU, payload.sku_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    order = StockEntry(
        **payload.model_dump(),
        user_uuid=str(current_user.uuid),
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    return StockEntryResponse.model_validate(order)


@router.post("/orders/outbound", response_model=StockExitResponse)
def create_outbound_order(
    payload: StockExitCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    product = db.get(SKU, payload.sku_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    available = calculate_stock(
        db,
        product.id,
        payload.warehouse,
    )

    if payload.quantity > available:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock for SKU '{product.sku}'. Available: {available}, requested: {payload.quantity}.",
        )

    order = StockExit(
        **payload.model_dump(),
        user_uuid=str(current_user.uuid),
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    return StockExitResponse.model_validate(order)


@router.get("/orders")
def get_orders(
    db: Session = Depends(get_db),
):
    entry_statement = (
        select(StockEntry, SKU)
        .join(
            SKU,
            StockEntry.sku_id == SKU.id,
        )
    )

    exit_statement = (
        select(StockExit, SKU)
        .join(
            SKU,
            StockExit.sku_id == SKU.id,
        )
    )

    entries = db.exec(entry_statement).all()
    exits = db.exec(exit_statement).all()

    movements = []

    for entry, sku in entries:
        movements.append({
            "id": entry.id,
            "movement_type": "inbound",
            "quantity": entry.quantity,
            "created_at": entry.created_at,
            "user_uuid": entry.user_uuid,
            "sku": {
                "id": sku.id,
                "name": sku.name,
                "sku": sku.sku,
                "client_name": sku.client_name,
                "category": sku.category,
                "warehouse": sku.warehouse
            },
        })

    for exit_order, sku in exits:
        movements.append({
            "id": exit_order.id,
            "movement_type": "outbound",
            "quantity": exit_order.quantity,
            "created_at": exit_order.created_at,
            "user_uuid": exit_order.user_uuid,
            "sku": {
                "id": sku.id,
                "name": sku.name,
                "sku": sku.sku,
                "client_name": sku.client_name,
                "category": sku.category,
                "warehouse": sku.warehouse
            },
        })

    movements.sort(
        key=lambda movement: movement["created_at"]
    )

    return movements
