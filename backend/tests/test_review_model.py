import os
import pytest
import pandas as pd

from ml.review_model import ReviewSimilarityModel, split_sentences

HERE = os.path.dirname(os.path.abspath(__file__))
TRAIN_PATH = os.path.join(HERE, "..", "data", "reviews", "train.csv")

pytestmark = pytest.mark.skipif(
    not os.path.exists(TRAIN_PATH),
    reason="Round 1 dataset not present in data/reviews/ -- skipping review-model tests",
)


@pytest.fixture(scope="module")
def small_model():
    """Fit on a small slice of the real data so tests run fast."""
    df = pd.read_csv(TRAIN_PATH).head(2000)
    return ReviewSimilarityModel().fit(df)


def test_split_sentences_basic():
    assert split_sentences("Hello world. This is great!") == ["Hello world.", "This is great!"]


def test_fit_builds_vectorizer_and_matrix(small_model):
    assert small_model.vectorizer is not None
    assert small_model.train_matrix.shape[0] == 2000


def test_course_list_matches_training_data(small_model):
    courses = small_model.course_list()
    assert len(courses) > 0
    assert sum(c["review_count"] for c in courses) == 2000


def test_top_k_similar_returns_k_results(small_model):
    results, _ = small_model.top_k_similar("great course, learned a lot about the topic", k=5)
    assert len(results) == 5
    assert all("similarity" in r for r in results)
    # results should be sorted by descending similarity
    sims = [r["similarity"] for r in results]
    assert sims == sorted(sims, reverse=True)


def test_top_k_similar_relevant_to_query(small_model):
    # querying with a course name should surface reviews of that course near the top
    sample_course = small_model.course_list()[0]["course"]
    results, _ = small_model.top_k_similar(f"I really enjoyed {sample_course}", k=10)
    top_courses = [r["course"] for r in results[:3]]
    assert sample_course in top_courses


def test_batch_matches_single_query(small_model):
    query = "Great hands-on projects and clear explanations throughout the course."
    single, _ = small_model.top_k_similar(query, k=5)
    batch, _ = small_model.top_k_similar_batch([query], k=5)
    assert [r["train_index"] for r in single] == [r["train_index"] for r in batch[0]]


def test_save_and_load_roundtrip(small_model, tmp_path):
    path = str(tmp_path / "model.joblib")
    small_model.save(path)
    loaded = ReviewSimilarityModel.load(path)
    results, _ = loaded.top_k_similar("solid course with good instructor", k=3)
    assert len(results) == 3
