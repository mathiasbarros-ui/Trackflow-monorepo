from pydantic import BaseModel, ConfigDict


class IncidentCreateRequest(BaseModel):
    title: str
    description: str
    category: str
    status: str = "open"
    origin: str
    branch: str


class IncidentStatusUpdateRequest(BaseModel):
    status: str


class IncidentResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: int
    title: str
    description: str
    category: str
    status: str
    origin: str
    branch: str
    reported_by_user_id: str | None
    legacy_id: str | None
    created_at: str
    updated_at: str


class IncidentSummaryResponse(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: dict[str, int]
    by_origin: dict[str, int]
    by_branch: dict[str, int]