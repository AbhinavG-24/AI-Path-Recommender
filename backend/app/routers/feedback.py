from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import FeedbackRequest
from app import crud, models
from ml.adaptive import apply_feedback_to_bias
from ml.retrieval import get_resource_index

VALID_SIGNALS = {
    "useful", "not_useful", "too_difficult", "too_easy",
    "already_know", "not_interested", "too_time_consuming",
}

router = APIRouter(tags=["feedback"])


@router.post("/api/feedback")
def submit_feedback(payload: FeedbackRequest, db: Session = Depends(get_db)):
    if payload.signal not in VALID_SIGNALS:
        raise HTTPException(400, f"signal must be one of {sorted(VALID_SIGNALS)}")

    index = get_resource_index()
    resource = index.get(payload.resource_id)
    if not resource:
        raise HTTPException(404, "Unknown resource_id")

    profile = crud.get_or_create_profile(db, payload.user_id)
    db.add(models.Feedback(user_id=payload.user_id, resource_id=payload.resource_id, signal=payload.signal))

    new_bias, new_pref = apply_feedback_to_bias(
        profile.difficulty_bias, profile.project_preference, payload.signal, resource.get("project_based", False)
    )
    profile.difficulty_bias = new_bias
    profile.project_preference = new_pref

    if payload.signal == "already_know" and resource.get("skills"):
        ids = list(profile.completed_resource_ids or [])
        if payload.resource_id not in ids:
            ids.append(payload.resource_id)
            profile.completed_resource_ids = ids

    db.commit()
    return {
        "status": "recorded",
        "updated_difficulty_bias": new_bias,
        "updated_project_preference": new_pref,
    }
