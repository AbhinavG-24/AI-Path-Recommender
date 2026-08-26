from sqlalchemy.orm import Session
from sqlalchemy import select

from app import models
from ml.ranking import ScoredResource


def get_or_create_user(db: Session, user_id: int = 1) -> models.User:
    user = db.get(models.User, user_id)
    if not user:
        user = models.User(id=user_id, name="Demo Learner")
        db.add(user)
        db.commit()
        db.refresh(user)
        profile = models.LearnerProfile(user_id=user.id, target_role="Machine Learning Engineer")
        db.add(profile)
        db.commit()
    return user


def get_or_create_profile(db: Session, user_id: int = 1) -> models.LearnerProfile:
    get_or_create_user(db, user_id)
    profile = db.execute(
        select(models.LearnerProfile).where(models.LearnerProfile.user_id == user_id)
    ).scalar_one_or_none()
    if not profile:
        profile = models.LearnerProfile(user_id=user_id, target_role="Machine Learning Engineer")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def profile_to_dict(profile: models.LearnerProfile) -> dict:
    return {
        "target_role": profile.target_role,
        "experience_level": profile.experience_level,
        "interests": profile.interests or [],
        "hours_per_week": profile.hours_per_week,
        "deadline_months": profile.deadline_months,
        "learning_preference": profile.learning_preference,
        "preferred_resource_type": profile.preferred_resource_type,
        "difficulty_bias": profile.difficulty_bias,
        "project_preference": profile.project_preference,
        "completed_resource_ids": profile.completed_resource_ids or [],
    }


def get_user_skills_dict(db: Session, user_id: int) -> dict:
    rows = db.execute(select(models.UserSkill).where(models.UserSkill.user_id == user_id)).scalars().all()
    return {r.skill_id: r.proficiency for r in rows}


def upsert_user_skill(db: Session, user_id: int, skill_id: str, proficiency: float):
    row = db.execute(
        select(models.UserSkill).where(models.UserSkill.user_id == user_id, models.UserSkill.skill_id == skill_id)
    ).scalar_one_or_none()
    if row:
        row.proficiency = proficiency
    else:
        row = models.UserSkill(user_id=user_id, skill_id=skill_id, proficiency=proficiency)
        db.add(row)
    db.commit()
    return row


def scored_resource_to_dict(item: ScoredResource) -> dict:
    r = item.resource
    return {
        "resource_id": r["id"],
        "title": r["title"],
        "resource_type": r["resource_type"],
        "skills": r["skills"],
        "difficulty": r["difficulty"],
        "duration_hours": r["duration_hours"],
        "rating": r["rating"],
        "overall_score": item.overall_score,
        "goal_similarity": item.features["goal_similarity"],
        "skill_gap_coverage": item.features["skill_gap_coverage"],
        "prerequisite_score": item.features["prerequisite_score"],
        "semantic_similarity": item.features["semantic_similarity"],
        "difficulty_match": item.features["difficulty_match"],
        "preference_match": item.features["preference_match"],
        "time_match": item.features["time_match"],
        "interest_match": item.features["interest_match"],
        "reason": item.reason,
    }


def roadmap_dict_to_response(roadmap: dict) -> dict:
    phases = []
    for phase in roadmap["phases"]:
        phases.append({
            "phase_index": phase["phase_index"],
            "title": phase["title"],
            "objective": phase["objective"],
            "skills": phase["skills"],
            "resources": [scored_resource_to_dict(r) for r in phase["resources"]],
            "estimated_hours": phase["estimated_hours"],
            "milestone": phase["milestone"],
        })
    return {
        "target_role": roadmap["target_role"],
        "phases": phases,
        "total_estimated_hours": roadmap["total_estimated_hours"],
        "available_hours": roadmap["available_hours"],
        "over_budget": roadmap["over_budget"],
        "budget_message": roadmap.get("budget_message"),
    }


def save_roadmap(db: Session, user_id: int, roadmap: dict, label: str = "Primary Roadmap") -> models.LearningPath:
    # deactivate previous active roadmap with the same label
    existing = db.execute(
        select(models.LearningPath).where(
            models.LearningPath.user_id == user_id,
            models.LearningPath.label == label,
            models.LearningPath.is_active == True,  # noqa: E712
        )
    ).scalars().all()
    for e in existing:
        e.is_active = False

    path = models.LearningPath(
        user_id=user_id,
        label=label,
        target_role=roadmap["target_role"],
        total_estimated_hours=roadmap["total_estimated_hours"],
        available_hours=roadmap["available_hours"],
        is_active=True,
    )
    db.add(path)
    db.flush()

    for phase in roadmap["phases"]:
        for order, r in enumerate(phase["resources"]):
            db.add(models.LearningPathItem(
                path_id=path.id,
                phase_index=phase["phase_index"],
                phase_title=phase["title"],
                phase_objective=phase["objective"],
                skill_id=r.resource["skills"][0] if r.resource.get("skills") else "",
                resource_id=r.resource["id"],
                order_in_phase=order,
                milestone=phase["milestone"],
            ))
    db.commit()
    db.refresh(path)
    return path


def get_active_roadmap(db: Session, user_id: int, label: str = "Primary Roadmap"):
    return db.execute(
        select(models.LearningPath).where(
            models.LearningPath.user_id == user_id,
            models.LearningPath.label == label,
            models.LearningPath.is_active == True,  # noqa: E712
        ).order_by(models.LearningPath.id.desc())
    ).scalars().first()
