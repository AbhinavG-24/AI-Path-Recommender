"""
Roadmap Simulator ("What if?").

Every function here is pure: it takes the learner's current state plus a set
of hypothetical overrides and returns a freshly computed gap/roadmap, without
writing to the database or mutating the caller's dicts. The real, saved
roadmap is completely unaffected.
"""
import copy

from ml.skill_gap import analyze_skill_gap
from ml.roadmap_gen import generate_roadmap


def simulate(
    *,
    base_profile: dict,
    base_user_skills: dict,
    hours_per_week: float | None = None,
    deadline_months: float | None = None,
    target_role: str | None = None,
    assume_known_skills: list[str] | None = None,
):
    profile = copy.deepcopy(base_profile)
    user_skills = copy.deepcopy(base_user_skills)

    if hours_per_week is not None:
        profile["hours_per_week"] = hours_per_week
    if deadline_months is not None:
        profile["deadline_months"] = deadline_months
    if target_role is not None:
        profile["target_role"] = target_role
    if assume_known_skills:
        for skill_id in assume_known_skills:
            user_skills[skill_id] = max(user_skills.get(skill_id, 0.0), 90.0)

    gap = analyze_skill_gap(profile["target_role"], user_skills)
    roadmap = generate_roadmap(
        target_role=profile["target_role"],
        user_skills=user_skills,
        experience_level=profile.get("experience_level", "Intermediate"),
        learning_preference=profile.get("learning_preference", "Project Based"),
        preferred_type=profile.get("preferred_resource_type", "course"),
        interests=profile.get("interests", []),
        hours_per_week=profile["hours_per_week"],
        deadline_months=profile["deadline_months"],
        difficulty_bias=profile.get("difficulty_bias", 0.0),
        project_preference=profile.get("project_preference", 0.0),
    )

    return {
        "assumptions": {
            "hours_per_week": profile["hours_per_week"],
            "deadline_months": profile["deadline_months"],
            "target_role": profile["target_role"],
            "assumed_known_skills": assume_known_skills or [],
        },
        "gap": gap,
        "roadmap": roadmap,
    }
