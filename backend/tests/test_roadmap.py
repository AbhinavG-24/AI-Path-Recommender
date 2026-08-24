from ml.roadmap_gen import generate_roadmap, total_learning_budget
from ml.skill_graph import get_skill_graph


def _base_roadmap(**overrides):
    params = dict(
        target_role="Machine Learning Engineer",
        user_skills={"python": 90, "sql": 85, "pandas": 75, "statistics": 40},
        experience_level="Intermediate",
        learning_preference="Project Based",
        preferred_type="course",
        interests=["Artificial Intelligence"],
        hours_per_week=8,
        deadline_months=6,
    )
    params.update(overrides)
    return generate_roadmap(**params)


def test_roadmap_has_phases_in_prerequisite_order():
    graph = get_skill_graph()
    roadmap = _base_roadmap()
    assert len(roadmap["phases"]) > 0

    skill_to_phase = {}
    for phase in roadmap["phases"]:
        for s in phase["skills"]:
            skill_to_phase[s] = phase["phase_index"]

    for skill_id, phase_idx in skill_to_phase.items():
        for prereq in graph.direct_prerequisites(skill_id):
            if prereq in skill_to_phase:
                assert skill_to_phase[prereq] <= phase_idx, (
                    f"{prereq} scheduled after dependent {skill_id}"
                )


def test_roadmap_phases_contain_required_fields():
    roadmap = _base_roadmap()
    for phase in roadmap["phases"]:
        assert phase["title"]
        assert phase["objective"]
        assert phase["skills"]
        assert phase["milestone"]
        assert phase["estimated_hours"] >= 0
        assert isinstance(phase["resources"], list)


def test_time_budget_matches_formula():
    assert total_learning_budget(8, 6) == round(8 * 6 * 4.33, 1)


def test_tight_deadline_triggers_compression_and_message():
    roadmap = _base_roadmap(hours_per_week=1, deadline_months=1)
    assert roadmap["over_budget"] is True
    assert "hours" in roadmap["budget_message"]


def test_already_mastered_role_returns_empty_roadmap():
    all_mastered = {s: 100 for s in get_skill_graph().all_skill_ids()}
    roadmap = generate_roadmap(
        target_role="Machine Learning Engineer",
        user_skills=all_mastered,
        experience_level="Advanced",
        learning_preference="Project Based",
        preferred_type="course",
        interests=[],
        hours_per_week=8,
        deadline_months=6,
    )
    assert roadmap["phases"] == []
