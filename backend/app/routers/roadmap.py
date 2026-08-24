from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import RoadmapRequest, SimulateRequest
from app import crud
from ml.roadmap_gen import generate_roadmap
from ml.simulator import simulate

router = APIRouter(tags=["roadmap"])


@router.post("/api/roadmap")
def create_roadmap(payload: RoadmapRequest, db: Session = Depends(get_db)):
    profile = crud.get_or_create_profile(db, payload.user_id)
    user_skills = crud.get_user_skills_dict(db, payload.user_id)

    roadmap = generate_roadmap(
        target_role=profile.target_role,
        user_skills=user_skills,
        experience_level=profile.experience_level,
        learning_preference=profile.learning_preference,
        preferred_type=profile.preferred_resource_type,
        interests=profile.interests or [],
        hours_per_week=profile.hours_per_week,
        deadline_months=profile.deadline_months,
        difficulty_bias=profile.difficulty_bias,
        project_preference=profile.project_preference,
    )
    crud.save_roadmap(db, payload.user_id, roadmap, label=payload.label or "Primary Roadmap")
    return crud.roadmap_dict_to_response(roadmap)


@router.get("/api/roadmap/{user_id}")
def get_roadmap(user_id: int, db: Session = Depends(get_db)):
    path = crud.get_active_roadmap(db, user_id)
    if not path:
        raise HTTPException(404, "No roadmap yet. POST /api/roadmap first.")

    from ml.skill_graph import get_skill_graph
    from ml.retrieval import get_resource_index
    graph = get_skill_graph()
    index = get_resource_index()

    phases_map = {}
    for item in sorted(path.items, key=lambda i: (i.phase_index, i.order_in_phase)):
        phase = phases_map.setdefault(item.phase_index, {
            "phase_index": item.phase_index,
            "title": item.phase_title,
            "objective": item.phase_objective,
            "skills": [],
            "resources": [],
            "milestone": item.milestone,
        })
        resource = index.get(item.resource_id)
        if resource and resource["skills"][0] not in phase["skills"]:
            for s in resource["skills"]:
                if s not in phase["skills"]:
                    phase["skills"].append(s)
        if resource:
            phase["resources"].append({
                "resource_id": resource["id"],
                "title": resource["title"],
                "resource_type": resource["resource_type"],
                "skills": resource["skills"],
                "difficulty": resource["difficulty"],
                "duration_hours": resource["duration_hours"],
                "rating": resource["rating"],
                "is_completed": item.is_completed,
            })

    phases = []
    for p in sorted(phases_map.values(), key=lambda p: p["phase_index"]):
        est_hours = sum(r["duration_hours"] for r in p["resources"])
        p["estimated_hours"] = round(est_hours, 1)
        phases.append(p)

    return {
        "target_role": path.target_role,
        "phases": phases,
        "total_estimated_hours": path.total_estimated_hours,
        "available_hours": path.available_hours,
        "over_budget": path.total_estimated_hours > path.available_hours,
    }


@router.post("/api/roadmap/simulate")
def simulate_roadmap(payload: SimulateRequest, db: Session = Depends(get_db)):
    profile = crud.get_or_create_profile(db, payload.user_id)
    user_skills = crud.get_user_skills_dict(db, payload.user_id)

    result = simulate(
        base_profile=crud.profile_to_dict(profile),
        base_user_skills=user_skills,
        hours_per_week=payload.hours_per_week,
        deadline_months=payload.deadline_months,
        target_role=payload.target_role,
        assume_known_skills=payload.assume_known_skills,
    )
    result["roadmap"] = crud.roadmap_dict_to_response(result["roadmap"])
    return result
