from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ChatRequest, ChatResponse
from app import crud
from ml.assistant import answer_question, maybe_enhance_with_llm
from ml.roadmap_gen import generate_roadmap

router = APIRouter(tags=["chat"])


@router.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    profile_row = crud.get_or_create_profile(db, payload.user_id)
    profile = crud.profile_to_dict(profile_row)
    user_skills = crud.get_user_skills_dict(db, payload.user_id)

    path = crud.get_active_roadmap(db, payload.user_id)
    if path:
        roadmap = generate_roadmap(
            target_role=profile["target_role"],
            user_skills=user_skills,
            experience_level=profile["experience_level"],
            learning_preference=profile["learning_preference"],
            preferred_type=profile["preferred_resource_type"],
            interests=profile["interests"],
            hours_per_week=profile["hours_per_week"],
            deadline_months=profile["deadline_months"],
            difficulty_bias=profile["difficulty_bias"],
            project_preference=profile["project_preference"],
        )
    else:
        roadmap = None

    result = answer_question(payload.message, profile=profile, roadmap=roadmap, user_skills=user_skills)
    enhanced = maybe_enhance_with_llm(payload.message, result["answer"], result["grounded_on"])
    return {"answer": enhanced, "grounded_on": result["grounded_on"], "method": result["method"]}
