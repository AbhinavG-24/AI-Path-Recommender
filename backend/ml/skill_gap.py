"""
Skill Gap Analysis.

Given a learner's current proficiency per skill and a target role, classify
each required skill as mastered / partial / missing, flag skills that are
blocked on unmet prerequisites, and compute a single 0-100 gap score.
"""
from ml.skill_graph import get_skill_graph

MASTERED_THRESHOLD = 75.0
PARTIAL_THRESHOLD = 30.0


def classify(proficiency: float) -> str:
    if proficiency >= MASTERED_THRESHOLD:
        return "mastered"
    if proficiency >= PARTIAL_THRESHOLD:
        return "partial"
    return "missing"


def analyze_skill_gap(target_role: str, user_skills: dict):
    """
    user_skills: dict of skill_id -> proficiency (0-100)
    Returns a structured breakdown plus a 0-100 gap_score (higher = more work needed).
    """
    graph = get_skill_graph()
    required = graph.role_required_skills(target_role)
    if not required:
        raise ValueError(f"Unknown target role: {target_role}")

    mastered_ids = {sid for sid, p in user_skills.items() if p >= MASTERED_THRESHOLD}

    strong, partial, missing = [], [], []
    weighted_gap_sum = 0.0
    weight_total = 0.0

    for skill_id in required:
        proficiency = user_skills.get(skill_id, 0.0)
        status = classify(proficiency)
        difficulty_weight = graph.skill_difficulty(skill_id)  # harder skills count more toward the gap
        weight_total += difficulty_weight
        weighted_gap_sum += difficulty_weight * (100 - proficiency) / 100.0

        prereq_satisfaction = graph.prerequisite_satisfaction(skill_id, mastered_ids)
        item = {
            "skill_id": skill_id,
            "skill_name": graph.skill_name(skill_id),
            "proficiency": round(proficiency, 1),
            "status": status,
            "is_prerequisite_gap": prereq_satisfaction < 1.0 and status != "mastered",
        }
        if status == "mastered":
            strong.append(item)
        elif status == "partial":
            partial.append(item)
        else:
            missing.append(item)

    gap_score = round(100 * weighted_gap_sum / weight_total, 1) if weight_total else 0.0

    return {
        "target_role": target_role,
        "strong": strong,
        "partial": partial,
        "missing": missing,
        "gap_score": gap_score,
    }


def biggest_gap(target_role: str, user_skills: dict) -> str | None:
    """Returns the human-readable name of the single highest-impact missing/partial skill."""
    graph = get_skill_graph()
    result = analyze_skill_gap(target_role, user_skills)
    candidates = result["missing"] + result["partial"]
    if not candidates:
        return None
    # Prioritize skills that unlock the most downstream skills (highest graph out-degree)
    candidates.sort(key=lambda c: (-graph.graph.out_degree(c["skill_id"]), c["proficiency"]))
    return candidates[0]["skill_name"]
