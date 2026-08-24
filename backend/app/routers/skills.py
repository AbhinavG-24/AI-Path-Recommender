from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import SkillGapResponse
from app import crud
from ml.skill_graph import get_skill_graph
from ml.skill_gap import analyze_skill_gap

router = APIRouter(tags=["skills"])


@router.get("/api/skills")
def list_skills():
    graph = get_skill_graph()
    return {"skills": list(graph.skills.values()), "roles": list(graph.roles.keys())}


@router.get("/api/skill-graph")
def skill_graph_payload():
    graph = get_skill_graph()
    return graph.as_visualization_payload()


@router.post("/api/skill-gap", response_model=SkillGapResponse)
def skill_gap(user_id: int = 1, db: Session = Depends(get_db)):
    profile = crud.get_or_create_profile(db, user_id)
    user_skills = crud.get_user_skills_dict(db, user_id)
    result = analyze_skill_gap(profile.target_role, user_skills)
    return result
