"""
Adaptive Learning Engine.

score -> update skill proficiency -> recalculate skill gaps -> check
prerequisites -> rerank recommendations -> modify roadmap.

This module implements the "update proficiency" and "update preference bias"
steps; the recalculation/reranking happens naturally the next time
ml.skill_gap / ml.ranking / ml.roadmap_gen are called with the updated values,
since they always read current DB state.
"""
from ml.skill_graph import get_skill_graph

# Exponential-moving-average blend: new evidence matters, but doesn't erase history.
PROFICIENCY_LEARNING_RATE = 0.6


def update_proficiency(previous_proficiency: float, assessment_score: float) -> float:
    """Blend prior proficiency with the new assessment score."""
    updated = (1 - PROFICIENCY_LEARNING_RATE) * previous_proficiency + PROFICIENCY_LEARNING_RATE * assessment_score
    return round(min(100.0, max(0.0, updated)), 1)


def unlocked_skills(skill_id: str, new_proficiency: float, mastered_skill_ids: set) -> list[str]:
    """
    If this skill just crossed the mastery threshold, return the direct
    dependent skills whose prerequisites are now fully satisfied.
    """
    graph = get_skill_graph()
    if new_proficiency < 75.0:
        return []
    updated_mastered = mastered_skill_ids | {skill_id}
    unlocked = []
    for dependent in graph.graph.successors(skill_id):
        if graph.prerequisite_satisfaction(dependent, updated_mastered) >= 1.0:
            unlocked.append(graph.skill_name(dependent))
    return unlocked


# --- Feedback-driven preference adaptation (spec section 17) ---

FEEDBACK_DIFFICULTY_DELTA = {
    "too_difficult": -0.4,
    "too_easy": +0.4,
}
PROJECT_PREFERENCE_DELTA = {
    "useful": +0.15,     # applied when the liked resource was project-based (checked by caller)
    "not_useful": -0.1,
}
BIAS_CLAMP = 1.5


def apply_feedback_to_bias(current_difficulty_bias: float, current_project_preference: float,
                            signal: str, was_project_based: bool) -> tuple[float, float]:
    """
    Returns updated (difficulty_bias, project_preference) after a single feedback signal.
    difficulty_bias: negative nudges toward easier resources, positive toward harder ones.
    project_preference: higher values favor project-based resources in ranking.
    """
    new_difficulty_bias = current_difficulty_bias + FEEDBACK_DIFFICULTY_DELTA.get(signal, 0.0)
    new_difficulty_bias = max(-BIAS_CLAMP, min(BIAS_CLAMP, new_difficulty_bias))

    new_project_preference = current_project_preference
    if was_project_based and signal in PROJECT_PREFERENCE_DELTA:
        new_project_preference += PROJECT_PREFERENCE_DELTA[signal]
    if signal == "not_interested":
        new_project_preference -= 0.05
    new_project_preference = max(-1.0, min(1.0, new_project_preference))

    return round(new_difficulty_bias, 3), round(new_project_preference, 3)
