"""
Hybrid Recommendation Engine.

Stage 1 (ml/retrieval.py):  TF-IDF + BM25 + semantic candidate retrieval
Stage 2 (this file):        per-candidate feature calculation
Stage 3 (this file):        configurable weighted ranking, normalized 0-100

final_score =
    0.25 * goal_similarity
  + 0.20 * skill_gap_coverage
  + 0.15 * prerequisite_score
  + 0.15 * semantic_similarity
  + 0.10 * difficulty_match
  + 0.05 * preference_match
  + 0.05 * time_match
  + 0.05 * interest_match
"""
from dataclasses import dataclass, field

from ml.retrieval import get_resource_index
from ml.skill_graph import get_skill_graph

DEFAULT_WEIGHTS = {
    "goal_similarity": 0.25,
    "skill_gap_coverage": 0.20,
    "prerequisite_score": 0.15,
    "semantic_similarity": 0.15,
    "difficulty_match": 0.10,
    "preference_match": 0.05,
    "time_match": 0.05,
    "interest_match": 0.05,
}

DIFFICULTY_RANK = {"beginner": 1, "intermediate": 2, "advanced": 3}
EXPERIENCE_TO_BAND = {"Beginner": 1, "Intermediate": 2, "Advanced": 3}


@dataclass
class ScoredResource:
    resource: dict
    features: dict
    overall_score: float
    reason: str


def _difficulty_match(resource_band: str, experience_level: str, difficulty_bias: float) -> float:
    target = EXPERIENCE_TO_BAND.get(experience_level, 2) + difficulty_bias  # bias shifts preferred band
    diff = abs(DIFFICULTY_RANK.get(resource_band, 2) - target)
    return max(0.0, 1.0 - diff / 2.0)


def _preference_match(resource: dict, learning_preference: str, preferred_type: str, project_preference: float) -> float:
    score = 0.0
    if resource.get("resource_type") == preferred_type:
        score += 0.5
    pref = learning_preference.lower()
    if "project" in pref and resource.get("project_based"):
        score += 0.5
    elif "video" in pref and resource.get("resource_type") == "video":
        score += 0.5
    elif "theory" in pref and resource.get("resource_type") in ("course", "documentation"):
        score += 0.5
    elif "reading" in pref and resource.get("resource_type") == "article":
        score += 0.5
    else:
        score += 0.15
    # adaptive nudge from repeated feedback
    if resource.get("project_based"):
        score += max(0.0, project_preference) * 0.3
    return min(1.0, score)


def _time_match(resource_hours: float, remaining_weekly_hours: float) -> float:
    if remaining_weekly_hours <= 0:
        return 0.2
    ratio = resource_hours / remaining_weekly_hours
    if ratio <= 1.0:
        return 1.0
    return max(0.0, 1.0 - (ratio - 1.0) * 0.5)


def _interest_match(resource: dict, interests: list[str]) -> float:
    if not interests:
        return 0.5
    text = (resource["title"] + " " + resource["description"] + " " + " ".join(resource.get("tags", []))).lower()
    hits = sum(1 for i in interests if i.lower() in text)
    return min(1.0, hits / max(1, len(interests)) + (0.2 if hits else 0.0))


def _build_reason(resource: dict, features: dict, gap_status: str | None) -> str:
    graph = get_skill_graph()
    skill_names = [graph.skill_name(s) for s in resource.get("skills", [])]
    lead = f"Covers {', '.join(skill_names)}" if skill_names else "General resource"

    clauses = [lead]
    if gap_status == "missing":
        clauses.append("directly addresses a skill you haven't started yet")
    elif gap_status == "partial":
        clauses.append("reinforces a skill you're still building")

    if features["prerequisite_score"] >= 0.99:
        clauses.append("all prerequisites are already satisfied")
    elif features["prerequisite_score"] > 0:
        clauses.append("some prerequisites are still outstanding")

    if features["difficulty_match"] >= 0.75:
        clauses.append(f"difficulty ({resource['difficulty']}) matches your current level")

    if features["time_match"] >= 0.75:
        clauses.append("fits comfortably in your weekly time budget")

    return "; ".join(clauses).capitalize() + "."


def score_resource(
    resource: dict,
    *,
    goal_similarity: float,
    semantic_similarity: float,
    gap_status: str | None,
    mastered_skill_ids: set,
    experience_level: str,
    learning_preference: str,
    preferred_type: str,
    interests: list[str],
    remaining_weekly_hours: float,
    difficulty_bias: float = 0.0,
    project_preference: float = 0.0,
    weights: dict | None = None,
) -> ScoredResource:
    weights = weights or DEFAULT_WEIGHTS
    graph = get_skill_graph()

    # skill_gap_coverage: how much this resource helps close the current gap
    if gap_status == "missing":
        skill_gap_coverage = 1.0
    elif gap_status == "partial":
        skill_gap_coverage = 0.6
    else:
        skill_gap_coverage = 0.1

    # prerequisite_score: average prerequisite satisfaction across the resource's skills
    if resource.get("skills"):
        prereq_scores = [graph.prerequisite_satisfaction(s, mastered_skill_ids) for s in resource["skills"]]
        prerequisite_score = sum(prereq_scores) / len(prereq_scores)
    else:
        prerequisite_score = 1.0

    difficulty_match = _difficulty_match(resource["difficulty"], experience_level, difficulty_bias)
    preference_match = _preference_match(resource, learning_preference, preferred_type, project_preference)
    time_match = _time_match(resource["duration_hours"], remaining_weekly_hours)
    interest_match = _interest_match(resource, interests)

    features = {
        "goal_similarity": round(goal_similarity, 3),
        "skill_gap_coverage": round(skill_gap_coverage, 3),
        "prerequisite_score": round(prerequisite_score, 3),
        "semantic_similarity": round(semantic_similarity, 3),
        "difficulty_match": round(difficulty_match, 3),
        "preference_match": round(preference_match, 3),
        "time_match": round(time_match, 3),
        "interest_match": round(interest_match, 3),
    }

    overall = sum(weights[k] * features[k] for k in weights)
    overall_100 = round(overall * 100, 1)

    reason = _build_reason(resource, features, gap_status)

    return ScoredResource(resource=resource, features=features, overall_score=overall_100, reason=reason)


def rank_resources(
    *,
    query_text: str,
    candidate_skill_ids: list[str],
    gap_by_skill: dict,
    mastered_skill_ids: set,
    experience_level: str,
    learning_preference: str,
    preferred_type: str,
    interests: list[str],
    remaining_weekly_hours: float,
    difficulty_bias: float = 0.0,
    project_preference: float = 0.0,
    top_k: int = 10,
    exclude_ids: set | None = None,
    weights: dict | None = None,
) -> list[ScoredResource]:
    """
    Full pipeline: retrieve candidates for the given skills, score them with the
    hybrid formula, and return the top_k ranked ScoredResource objects.
    """
    index = get_resource_index()
    exclude_ids = exclude_ids or set()

    candidates = index.candidates_for_skills(candidate_skill_ids)
    if not candidates:
        candidates = index.resources

    tfidf = index.tfidf_scores(query_text)
    bm25 = index.bm25_scores(query_text)
    semantic = index.semantic_scores(query_text)

    scored = []
    for r in candidates:
        if r["id"] in exclude_ids:
            continue
        # goal_similarity blends lexical (TF-IDF + BM25) signals from stage 1
        goal_similarity = 0.5 * tfidf.get(r["id"], 0.0) + 0.5 * bm25.get(r["id"], 0.0)
        semantic_similarity = semantic.get(r["id"], 0.0)

        # a resource may cover several skills; use the "worst" (most useful) gap status
        statuses = [gap_by_skill.get(s) for s in r.get("skills", []) if s in gap_by_skill]
        if "missing" in statuses:
            gap_status = "missing"
        elif "partial" in statuses:
            gap_status = "partial"
        elif statuses:
            gap_status = "mastered"
        else:
            gap_status = None

        scored.append(
            score_resource(
                r,
                goal_similarity=goal_similarity,
                semantic_similarity=semantic_similarity,
                gap_status=gap_status,
                mastered_skill_ids=mastered_skill_ids,
                experience_level=experience_level,
                learning_preference=learning_preference,
                preferred_type=preferred_type,
                interests=interests,
                remaining_weekly_hours=remaining_weekly_hours,
                difficulty_bias=difficulty_bias,
                project_preference=project_preference,
                weights=weights,
            )
        )

    scored.sort(key=lambda s: s.overall_score, reverse=True)
    return scored[:top_k]
