import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app import crud, models
from ml.skill_gap import analyze_skill_gap, biggest_gap
from ml.skill_graph import get_skill_graph
from ml.roadmap_gen import generate_roadmap

router = APIRouter(tags=["dashboard"])


@router.get("/api/dashboard/{user_id}")
def dashboard(user_id: int, db: Session = Depends(get_db)):
    graph = get_skill_graph()
    profile = crud.get_or_create_profile(db, user_id)
    user_skills = crud.get_user_skills_dict(db, user_id)
    required = graph.role_required_skills(profile.target_role)

    skill_progress = {graph.skill_name(s): round(user_skills.get(s, 0.0), 1) for s in required}
    career_readiness = round(sum(skill_progress.values()) / len(skill_progress), 1) if skill_progress else 0.0
    gap_skill = biggest_gap(profile.target_role, user_skills)

    path = crud.get_active_roadmap(db, user_id)
    completed = 0
    total_items = 0
    active_phase = None
    upcoming_milestone = None
    if path:
        items = sorted(path.items, key=lambda i: (i.phase_index, i.order_in_phase))
        total_items = len(items)
        completed = sum(1 for i in items if i.is_completed)
        incomplete = [i for i in items if not i.is_completed]
        if incomplete:
            active_phase = incomplete[0].phase_title
            upcoming_milestone = incomplete[0].milestone
        elif items:
            active_phase = "Roadmap complete"

    attempts = db.execute(
        select(models.AssessmentAttempt).where(models.AssessmentAttempt.user_id == user_id)
        .order_by(models.AssessmentAttempt.created_at.desc()).limit(10)
    ).scalars().all()
    assessment_history = [
        {"skill": graph.skill_name(a.skill_id), "score": a.score, "date": a.created_at.isoformat()}
        for a in attempts
    ]

    # simple streak: count consecutive days (from today backwards) with at least one attempt or feedback event
    events = db.execute(
        select(models.AssessmentAttempt.created_at).where(models.AssessmentAttempt.user_id == user_id)
    ).scalars().all()
    event_dates = {e.date() for e in events}
    streak = 0
    cursor = datetime.date.today()
    while cursor in event_dates:
        streak += 1
        cursor -= datetime.timedelta(days=1)

    return {
        "career_readiness": career_readiness,
        "skill_progress": skill_progress,
        "biggest_gap": gap_skill,
        "active_phase": active_phase,
        "completed_resources": completed,
        "total_roadmap_resources": total_items,
        "upcoming_milestone": upcoming_milestone,
        "assessment_history": assessment_history,
        "learning_streak_days": streak,
    }


@router.get("/api/today-plan")
def today_plan(user_id: int = 1, db: Session = Depends(get_db)):
    graph = get_skill_graph()
    profile = crud.get_or_create_profile(db, user_id)
    user_skills = crud.get_user_skills_dict(db, user_id)

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
        resources_per_phase=2,
    )
    if not roadmap["phases"]:
        return {"total_minutes": 0, "blocks": [], "message": "No active gaps -- you're on track!"}

    phase = roadmap["phases"][0]
    total_minutes = round((profile.hours_per_week / 7) * 60)
    resources = phase["resources"][:3] or []

    blocks = []
    if resources:
        share = max(10, total_minutes // (len(resources) + 1))
        remaining = total_minutes
        for r in resources:
            minutes = min(share, remaining)
            blocks.append({
                "minutes": minutes,
                "activity": f"Study: {r.resource['title']}",
                "skill": graph.skill_name(r.resource['skills'][0]) if r.resource.get('skills') else None,
            })
            remaining -= minutes
        blocks.append({"minutes": max(10, remaining), "activity": f"Mini self-check on {graph.skill_name(phase['skills'][0])}", "skill": graph.skill_name(phase['skills'][0])})

    return {"total_minutes": total_minutes, "phase_title": phase["title"], "blocks": blocks}
