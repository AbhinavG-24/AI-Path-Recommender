from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ProfileIn
from app import crud, models
from ml.skill_graph import get_skill_graph

router = APIRouter(tags=["profile"])


@router.post("/api/profile")
def create_or_update_profile(payload: ProfileIn, db: Session = Depends(get_db)):
    graph = get_skill_graph()
    if payload.target_role not in graph.roles:
        raise HTTPException(400, f"Unknown target_role. Valid roles: {list(graph.roles.keys())}")

    crud.get_or_create_user(db, payload.user_id)
    profile = crud.get_or_create_profile(db, payload.user_id)

    profile.raw_goal_text = payload.goal_text or profile.raw_goal_text
    profile.target_role = payload.target_role
    profile.experience_level = payload.experience_level
    profile.interests = payload.interests
    profile.hours_per_week = payload.hours_per_week
    profile.deadline_months = payload.deadline_months
    profile.learning_preference = payload.learning_preference
    profile.preferred_resource_type = payload.preferred_resource_type
    db.commit()
    db.refresh(profile)

    for skill_id, proficiency in payload.skills.items():
        crud.upsert_user_skill(db, payload.user_id, skill_id, float(proficiency))

    return {
        "profile": crud.profile_to_dict(profile),
        "skills": crud.get_user_skills_dict(db, payload.user_id),
    }


@router.get("/api/profile/{user_id}")
def get_profile(user_id: int, db: Session = Depends(get_db)):
    profile = crud.get_or_create_profile(db, user_id)
    return {
        "profile": crud.profile_to_dict(profile),
        "skills": crud.get_user_skills_dict(db, user_id),
    }
