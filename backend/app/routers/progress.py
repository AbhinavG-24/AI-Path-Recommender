from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app import crud, models

router = APIRouter(tags=["progress"])


class CompleteResourceRequest(BaseModel):
    user_id: int = 1
    resource_id: str
    label: str = "Primary Roadmap"


@router.post("/api/progress/complete")
def complete_resource(payload: CompleteResourceRequest, db: Session = Depends(get_db)):
    path = crud.get_active_roadmap(db, payload.user_id, payload.label)
    if not path:
        raise HTTPException(404, "No active roadmap")

    item = db.execute(
        select(models.LearningPathItem).where(
            models.LearningPathItem.path_id == path.id,
            models.LearningPathItem.resource_id == payload.resource_id,
        )
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Resource not found in active roadmap")

    item.is_completed = True
    profile = crud.get_or_create_profile(db, payload.user_id)
    ids = list(profile.completed_resource_ids or [])
    if payload.resource_id not in ids:
        ids.append(payload.resource_id)
        profile.completed_resource_ids = ids

    db.commit()
    return {"status": "completed", "resource_id": payload.resource_id}
