import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.auth.routes import get_current_user, require_admin_user
from data.process import rag


router = APIRouter(
    prefix="/api/knowledge",
    tags=["knowledge"],
    dependencies=[Depends(require_admin_user)],
)


class KnowledgeQueryRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    question: str = Field(min_length=1, max_length=4000)


class KnowledgeQueryResponse(BaseModel):
    answer: str


@router.post("/query", response_model=KnowledgeQueryResponse)
def knowledge_query(
    request: KnowledgeQueryRequest,
    current_user: dict = Depends(get_current_user),
) -> KnowledgeQueryResponse:
    try:
        return KnowledgeQueryResponse(answer=rag.query(request.question))
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El servicio RAG no está disponible. Inténtalo de nuevo más tarde.",
        ) from error
    except (RuntimeError, ValueError, FileNotFoundError) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
