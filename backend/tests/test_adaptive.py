from ml.adaptive import update_proficiency, unlocked_skills, apply_feedback_to_bias


def test_high_score_raises_proficiency():
    updated = update_proficiency(40, 90)
    assert updated > 40


def test_low_score_lowers_proficiency():
    updated = update_proficiency(70, 20)
    assert updated < 70


def test_proficiency_clamped_0_to_100():
    assert update_proficiency(95, 100) <= 100
    assert update_proficiency(5, 0) >= 0


def test_unlocked_skills_empty_below_mastery_threshold():
    assert unlocked_skills("statistics", 50, set()) == []


def test_unlocked_skills_returns_list_at_mastery():
    result = unlocked_skills("python", 90, set())
    assert isinstance(result, list)


def test_feedback_too_difficult_decreases_bias():
    bias, proj = apply_feedback_to_bias(0.0, 0.0, "too_difficult", was_project_based=False)
    assert bias < 0.0


def test_feedback_too_easy_increases_bias():
    bias, proj = apply_feedback_to_bias(0.0, 0.0, "too_easy", was_project_based=False)
    assert bias > 0.0


def test_feedback_useful_project_increases_project_preference():
    bias, proj = apply_feedback_to_bias(0.0, 0.0, "useful", was_project_based=True)
    assert proj > 0.0


def test_bias_is_clamped():
    bias = 0.0
    for _ in range(20):
        bias, _ = apply_feedback_to_bias(bias, 0.0, "too_difficult", was_project_based=False)
    assert bias >= -1.5
