"""
Personalized Roadmap Generation.

Unlike a plain "sort by score" list, the roadmap is built by:
  1. Taking the skill-gap (missing + partial) skills for the target role
  2. Topologically ordering them via the prerequisite graph so nothing is
     scheduled before its prerequisites
  3. Grouping the ordered skills into phases (by graph "wave" / depth)
  4. Filling each phase with the top-ranked resources for its skills
  5. Tracking a running time budget (hours_per_week * weeks-to-deadline) and
     flagging + compressing the plan if it doesn't fit
"""
import math

from ml.skill_graph import get_skill_graph
from ml.skill_gap import analyze_skill_gap
from ml.ranking import rank_resources


def _phase_waves(graph, ordered_skills: list[str]) -> list[list[str]]:
    """
    Group a topologically-sorted skill list into phases such that a skill is
    placed in the earliest phase after all of its (in-scope) prerequisites.
    This gives learners a small number of coherent phases instead of one
    skill per phase.
    """
    depth = {}
    for skill_id in ordered_skills:
        prereqs_in_scope = [p for p in graph.direct_prerequisites(skill_id) if p in ordered_skills]
        depth[skill_id] = 0 if not prereqs_in_scope else 1 + max(depth[p] for p in prereqs_in_scope)

    max_depth = max(depth.values()) if depth else 0
    waves = [[] for _ in range(max_depth + 1)]
    for skill_id in ordered_skills:
        waves[depth[skill_id]].append(skill_id)
    return [w for w in waves if w]


def _milestone_for_phase(graph, skills_in_phase: list[str]) -> str:
    names = [graph.skill_name(s) for s in skills_in_phase]
    if len(names) == 1:
        return f"Demonstrate working knowledge of {names[0]}"
    return f"Complete a mini-project combining {', '.join(names[:3])}" + (" and more" if len(names) > 3 else "")


def generate_roadmap(
    *,
    target_role: str,
    user_skills: dict,
    experience_level: str,
    learning_preference: str,
    preferred_type: str,
    interests: list[str],
    hours_per_week: float,
    deadline_months: float,
    difficulty_bias: float = 0.0,
    project_preference: float = 0.0,
    resources_per_phase: int = 3,
):
    graph = get_skill_graph()
    gap = analyze_skill_gap(target_role, user_skills)

    mastered_ids = {i["skill_id"] for i in gap["strong"]}
    gap_by_skill = {i["skill_id"]: i["status"] for i in gap["missing"] + gap["partial"] + gap["strong"]}
    skills_to_learn = [i["skill_id"] for i in gap["missing"] + gap["partial"]]

    if not skills_to_learn:
        return {
            "target_role": target_role,
            "phases": [],
            "total_estimated_hours": 0.0,
            "available_hours": round(hours_per_week * deadline_months * 4.33, 1),
            "over_budget": False,
            "budget_message": "All required skills for this role are already mastered.",
        }

    ordered = graph.topological_order(skills_to_learn)
    waves = _phase_waves(graph, ordered)

    weeks_available = deadline_months * 4.33
    available_hours = round(hours_per_week * weeks_available, 1)

    used_resource_ids = set()
    phases = []
    running_total = 0.0

    for i, wave_skills in enumerate(waves):
        query_text = " ".join(graph.skill_name(s) for s in wave_skills)
        ranked = rank_resources(
            query_text=query_text,
            candidate_skill_ids=wave_skills,
            gap_by_skill=gap_by_skill,
            mastered_skill_ids=mastered_ids,
            experience_level=experience_level,
            learning_preference=learning_preference,
            preferred_type=preferred_type,
            interests=interests,
            remaining_weekly_hours=hours_per_week,
            difficulty_bias=difficulty_bias,
            project_preference=project_preference,
            top_k=resources_per_phase,
            exclude_ids=used_resource_ids,
        )
        for r in ranked:
            used_resource_ids.add(r.resource["id"])

        phase_hours = round(sum(r.resource["duration_hours"] for r in ranked), 1)
        running_total += phase_hours

        # As each phase's skills are "completed" for planning purposes, promote them
        # to mastered so later phases correctly see prerequisites satisfied.
        mastered_ids.update(wave_skills)

        phases.append({
            "phase_index": i + 1,
            "title": f"Phase {i + 1}: {', '.join(graph.skill_name(s) for s in wave_skills)}",
            "objective": f"Build competency in {', '.join(graph.skill_name(s) for s in wave_skills)}",
            "skills": wave_skills,
            "resources": ranked,
            "estimated_hours": phase_hours,
            "milestone": _milestone_for_phase(graph, wave_skills),
        })

    total_estimated_hours = round(running_total, 1)
    over_budget = total_estimated_hours > available_hours

    budget_message = None
    if over_budget:
        budget_message = (
            f"Your current goal requires approximately {total_estimated_hours} hours, "
            f"while your available learning budget is {available_hours} hours."
        )
        phases = _compress_phases(phases, available_hours)

    return {
        "target_role": target_role,
        "phases": phases,
        "total_estimated_hours": total_estimated_hours,
        "available_hours": available_hours,
        "over_budget": over_budget,
        "budget_message": budget_message,
    }


def _compress_phases(phases: list[dict], available_hours: float) -> list[dict]:
    """
    If the full roadmap exceeds the time budget, keep the highest-scoring
    resource per skill in each phase (drop secondary/optional resources)
    rather than dropping entire phases, preserving prerequisite coverage.
    """
    compressed = []
    running = 0.0
    for phase in phases:
        ranked = sorted(phase["resources"], key=lambda r: r.overall_score, reverse=True)
        kept = []
        for r in ranked:
            if running + r.resource["duration_hours"] <= available_hours or not kept:
                kept.append(r)
                running += r.resource["duration_hours"]
            if len(kept) >= 1 and running >= available_hours:
                break
        phase = dict(phase)
        phase["resources"] = kept if kept else ranked[:1]
        phase["estimated_hours"] = round(sum(r.resource["duration_hours"] for r in phase["resources"]), 1)
        compressed.append(phase)
    return compressed


def total_learning_budget(hours_per_week: float, deadline_months: float) -> float:
    return round(hours_per_week * deadline_months * 4.33, 1)
