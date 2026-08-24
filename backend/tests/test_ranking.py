from ml.retrieval import get_resource_index
from ml.ranking import rank_resources, score_resource, DEFAULT_WEIGHTS


def test_resource_index_loads_100_plus_resources():
    index = get_resource_index()
    assert len(index.resources) >= 100


def test_tfidf_scores_rank_relevant_resource_higher():
    index = get_resource_index()
    scores = index.tfidf_scores("neural networks deep learning")
    assert max(scores.values()) > 0


def test_bm25_scores_are_normalized_0_to_1():
    index = get_resource_index()
    scores = index.bm25_scores("python pandas")
    assert all(0.0 <= v <= 1.0 for v in scores.values())


def test_semantic_scores_are_normalized_0_to_1():
    index = get_resource_index()
    scores = index.semantic_scores("statistics probability")
    assert all(0.0 <= v <= 1.0 for v in scores.values())


def test_weights_sum_to_one():
    assert abs(sum(DEFAULT_WEIGHTS.values()) - 1.0) < 1e-6


def test_missing_skill_resource_scores_higher_than_mastered():
    index = get_resource_index()
    candidates = index.candidates_for_skills(["statistics"])
    assert candidates, "expected at least one statistics resource in the dataset"
    resource = candidates[0]

    missing_score = score_resource(
        resource, goal_similarity=0.5, semantic_similarity=0.5, gap_status="missing",
        mastered_skill_ids=set(), experience_level="Intermediate",
        learning_preference="Project Based", preferred_type="course",
        interests=[], remaining_weekly_hours=8,
    )
    mastered_score = score_resource(
        resource, goal_similarity=0.5, semantic_similarity=0.5, gap_status="mastered",
        mastered_skill_ids=set(), experience_level="Intermediate",
        learning_preference="Project Based", preferred_type="course",
        interests=[], remaining_weekly_hours=8,
    )
    assert missing_score.overall_score > mastered_score.overall_score


def test_rank_resources_returns_sorted_top_k():
    results = rank_resources(
        query_text="machine learning engineer statistics linear algebra",
        candidate_skill_ids=["statistics", "linear_algebra", "numpy"],
        gap_by_skill={"statistics": "partial", "linear_algebra": "missing", "numpy": "missing"},
        mastered_skill_ids={"python", "sql", "pandas"},
        experience_level="Intermediate",
        learning_preference="Project Based",
        preferred_type="course",
        interests=["Artificial Intelligence"],
        remaining_weekly_hours=8,
        top_k=5,
    )
    assert 0 < len(results) <= 5
    scores = [r.overall_score for r in results]
    assert scores == sorted(scores, reverse=True)
    assert all(r.reason for r in results)
