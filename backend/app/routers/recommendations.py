from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import RecommendationRequest
from app import crud
from ml.skill_gap import analyze_skill_gap
from ml.ranking import rank_resources
from ml.skill_graph import get_skill_graph

router = APIRouter(tags=["recommendations"])


@router.post("/api/recommendations")
def get_recommendations(payload: RecommendationRequest, db: Session = Depends(get_db)):
    graph = get_skill_graph()
    profile = crud.get_or_create_profile(db, payload.user_id)
    user_skills = crud.get_user_skills_dict(db, payload.user_id)
    gap = analyze_skill_gap(profile.target_role, user_skills)

    mastered_ids = {i["skill_id"] for i in gap["strong"]}
    gap_by_skill = {i["skill_id"]: i["status"] for i in gap["missing"] + gap["partial"] + gap["strong"]}

    if payload.skill_id:
        target_skills = [payload.skill_id]
        query_text = graph.skill_name(payload.skill_id)
    else:
        target_skills = [i["skill_id"] for i in gap["missing"] + gap["partial"]] or list(user_skills.keys())
        query_text = f"{profile.target_role} " + " ".join(graph.skill_name(s) for s in target_skills[:6])

    ranked = rank_resources(
        query_text=query_text,
        candidate_skill_ids=target_skills,
        gap_by_skill=gap_by_skill,
        mastered_skill_ids=mastered_ids,
        experience_level=profile.experience_level,
        learning_preference=profile.learning_preference,
        preferred_type=profile.preferred_resource_type,
        interests=profile.interests or [],
        remaining_weekly_hours=profile.hours_per_week,
        difficulty_bias=profile.difficulty_bias,
        project_preference=profile.project_preference,
        top_k=payload.top_k,
        exclude_ids=set(profile.completed_resource_ids or []),
    )
    return {"recommendations": [crud.scored_resource_to_dict(r) for r in ranked]}
