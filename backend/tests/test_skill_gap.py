from ml.skill_gap import analyze_skill_gap, biggest_gap, classify


def test_classify_thresholds():
    assert classify(90) == "mastered"
    assert classify(50) == "partial"
    assert classify(10) == "missing"


def test_analyze_skill_gap_buckets_correctly():
    user_skills = {"python": 90, "sql": 85, "pandas": 75, "statistics": 40}
    result = analyze_skill_gap("Machine Learning Engineer", user_skills)

    strong_ids = {s["skill_id"] for s in result["strong"]}
    partial_ids = {s["skill_id"] for s in result["partial"]}
    missing_ids = {s["skill_id"] for s in result["missing"]}

    assert "python" in strong_ids
    assert "statistics" in partial_ids
    assert missing_ids  # ML engineer role should have several unmet skills
    assert 0 <= result["gap_score"] <= 100


def test_gap_score_decreases_as_skills_improve():
    weak = analyze_skill_gap("Machine Learning Engineer", {"python": 10})
    strong = analyze_skill_gap(
        "Machine Learning Engineer",
        {"python": 95, "sql": 95, "pandas": 95, "statistics": 95, "numpy": 95},
    )
    assert strong["gap_score"] < weak["gap_score"]


def test_unknown_role_raises():
    try:
        analyze_skill_gap("Underwater Basket Weaver", {})
        assert False, "expected ValueError for unknown role"
    except ValueError:
        pass


def test_biggest_gap_returns_a_skill_name():
    result = biggest_gap("Machine Learning Engineer", {"python": 90})
    assert isinstance(result, str)
    assert len(result) > 0
