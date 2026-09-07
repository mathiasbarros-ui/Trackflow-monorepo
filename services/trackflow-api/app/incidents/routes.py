from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query as ApiQuery, status
from tinydb import Query

from app.auth.routes import get_current_user
from app.incidents.database import get_incidents_table
from app.incidents.models import (
    IncidentCreateRequest,
    IncidentResponse,
    IncidentStatusUpdateRequest,
    IncidentSummaryResponse,
)
from app.incidents.rules import validate_incident_data, validate_status_transition


router = APIRouter(
    prefix="/api/incidents",
    tags=["incidents"],
)

incident_query = Query()


def current_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_incident_response(incident_data: dict) -> IncidentResponse:
    return IncidentResponse(**incident_data)


def get_next_incident_id(incidents: list[dict]) -> int:
    return 1 if not incidents else max(incident["id"] for incident in incidents) + 1


def validation_error(*, field: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "error": "validation_error",
            "field": field,
            "message": message,
        },
    )


def field_from_validation_message(message: str) -> str:
    for field in ["title", "description", "category", "status", "origin", "branch"]:
        if field in message:
            return field

    return "unknown"


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreateRequest,
    current_user: dict = Depends(get_current_user),
) -> IncidentResponse:
    try:
        clean_data = validate_incident_data(**payload.model_dump())
    except ValueError as error:
        message = str(error)
        raise validation_error(
            field=field_from_validation_message(message),
            message=message,
        ) from error

    db, incidents_table = get_incidents_table()
    try:
        now = current_timestamp()
        incident_data = {
            "id": get_next_incident_id(incidents_table.all()),
            **clean_data,
            "reported_by_user_id": current_user["id"],
            "legacy_id": None,
            "created_at": now,
            "updated_at": now,
        }
        incidents_table.insert(incident_data)
        return build_incident_response(incident_data)
    finally:
        db.close()


@router.get("", response_model=list[IncidentResponse])
def list_incidents(
    status_filter: str | None = ApiQuery(default=None, alias="status"),
    origin: str | None = None,
    branch: str | None = None,
    category: str | None = None,
    current_user: dict = Depends(get_current_user),
) -> list[IncidentResponse]:
    db, incidents_table = get_incidents_table()
    try:
        records = incidents_table.all()

        if status_filter:
            records = [item for item in records if item["status"] == status_filter]

        if origin:
            records = [item for item in records if item["origin"] == origin]

        if branch:
            records = [item for item in records if item["branch"] == branch]

        if category:
            records = [item for item in records if item["category"] == category]

        return [build_incident_response(item) for item in records]
    finally:
        db.close()


@router.get("/summary", response_model=IncidentSummaryResponse)
def incidents_summary(
    current_user: dict = Depends(get_current_user),
) -> IncidentSummaryResponse:
    db, incidents_table = get_incidents_table()
    try:
        records = incidents_table.all()
    finally:
        db.close()

    by_status: dict[str, int] = {}
    by_category: dict[str, int] = {}
    by_origin: dict[str, int] = {}
    by_branch: dict[str, int] = {}

    for item in records:
        by_status[item["status"]] = by_status.get(item["status"], 0) + 1
        by_category[item["category"]] = by_category.get(item["category"], 0) + 1
        by_origin[item["origin"]] = by_origin.get(item["origin"], 0) + 1
        by_branch[item["branch"]] = by_branch.get(item["branch"], 0) + 1

    return IncidentSummaryResponse(
        total=len(records),
        by_status=by_status,
        by_category=by_category,
        by_origin=by_origin,
        by_branch=by_branch,
    )


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: int,
    current_user: dict = Depends(get_current_user),
) -> IncidentResponse:
    db, incidents_table = get_incidents_table()
    try:
        incident = incidents_table.get(incident_query.id == incident_id)
        if incident is None:
            raise HTTPException(status_code=404, detail="Incidencia no encontrada")

        return build_incident_response(incident)
    finally:
        db.close()


@router.patch("/{incident_id}/status", response_model=IncidentResponse)
def update_incident_status(
    incident_id: int,
    payload: IncidentStatusUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> IncidentResponse:
    db, incidents_table = get_incidents_table()
    try:
        incident = incidents_table.get(incident_query.id == incident_id)
        if incident is None:
            raise HTTPException(status_code=404, detail="Incidencia no encontrada")

        try:
            validate_status_transition(
                current_status=incident["status"],
                new_status=payload.status,
            )
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "invalid_status_transition",
                    "field": "status",
                    "message": str(error),
                },
            ) from error

        incidents_table.update(
            {
                "status": payload.status,
                "updated_at": current_timestamp(),
            },
            incident_query.id == incident_id,
        )
        updated_incident = incidents_table.get(incident_query.id == incident_id)
        return build_incident_response(updated_incident)
    finally:
        db.close()