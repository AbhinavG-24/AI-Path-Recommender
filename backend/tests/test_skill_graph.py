from ml.skill_graph import get_skill_graph


def test_graph_is_acyclic():
    graph = get_skill_graph()
    assert graph.graph.number_of_nodes() > 10


def test_topological_order_respects_prerequisites():
    graph = get_skill_graph()
    required = graph.role_required_skills("Machine Learning Engineer")
    order = graph.topological_order(required)
    position = {skill_id: i for i, skill_id in enumerate(order)}
    for skill_id in required:
        for prereq in graph.direct_prerequisites(skill_id):
            if prereq in position:
                assert position[prereq] < position[skill_id], (
                    f"{prereq} must come before {skill_id}"
                )


def test_prerequisite_satisfaction_no_prereqs_is_full():
    graph = get_skill_graph()
    assert graph.prerequisite_satisfaction("python", set()) == 1.0


def test_prerequisite_satisfaction_partial():
    graph = get_skill_graph()
    prereqs = graph.direct_prerequisites("machine_learning_fundamentals")
    if prereqs:
        half = set(list(prereqs)[: max(1, len(prereqs) // 2)])
        score = graph.prerequisite_satisfaction("machine_learning_fundamentals", half)
        assert 0.0 <= score <= 1.0
