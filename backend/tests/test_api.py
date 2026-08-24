"""
Integration tests hitting the FastAPI app directly (in-process, no server needed),
covering the full spec section 38 demo flow: profile -> skill-gap -> recommendations
-> roadmap -> assessment -> adaptive update -> dashboard -> chat.

Uses a dedicated on-disk SQLite file so it never touches a developer's real
learnpath.db, and cleans up after itself.
"""
import os
import sys
from pathlib import Path

TEST_DB_PATH = Path(__file__).resolve().parent / "test_api.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"

if TEST_DB_PATH.exists():
    TEST_DB_PATH.unlink()

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

PROFILE_PAYLOAD = {
    "user_id": 42,
    "target_role": "Machine Learning Engineer",
    "experience_level": "Intermediate",
    "skills": {"python": 90, "sql": 85, "pandas": 75, "statistics": 40},
    "interests": ["Artificial Intelligence"],
    "hours_per_week": 8,
    "deadline_months": 6,
    "learning_preference": "Project Based",
}


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200


def test_analyze_goal_extracts_structured_info():
    resp = client.post("/api/analyze-goal", json={
        "text": "I want to become a Machine Learning Engineer. I know Python, SQL and Pandas. "
                "I have 8 hours per week and want to be job-ready in 6 months."
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["target_role"] == "Machine Learning Engineer"
    assert "python" in data["known_skills"]
    assert data["hours_per_week"] == 8.0


def test_create_profile():
    resp = client.post("/api/profile", json=PROFILE_PAYLOAD)
    assert resp.status_code == 200
    data = resp.json()
    assert data["skills"]["python"] == 90.0


def test_skill_gap_endpoint():
    resp = client.post("/api/skill-gap", json={"user_id": 42})
    assert resp.status_code == 200
    data = resp.json()
    assert data["target_role"] == "Machine Learning Engineer"
    assert 0 <= data["gap_score"] <= 100


def test_recommendations_endpoint():
    resp = client.post("/api/recommendations", json={"user_id": 42, "top_k": 5})
    assert resp.status_code == 200
    recs = resp.json()["recommendations"]
    assert len(recs) > 0
    assert "reason" in recs[0]


def test_roadmap_generation_endpoint():
    resp = client.post("/api/roadmap", json={"user_id": 42})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["phases"]) > 0


def test_roadmap_fetch_by_user():
    resp = client.get("/api/roadmap/42")
    assert resp.status_code == 200


def test_dashboard_endpoint():
    resp = client.get("/api/dashboard/42")
    assert resp.status_code == 200
    data = resp.json()
    assert "career_readiness" in data
    assert "biggest_gap" in data


def test_assessment_generation_and_adaptive_submission():
    gen = client.post("/api/assessment", json={"user_id": 42, "skill_id": "statistics"})
    assert gen.status_code == 200
    questions = gen.json()["questions"]
    assert len(questions) > 0

    # Deliberately wrong answers -> low score -> proficiency should drop
    wrong_answers = {q["id"]: "__definitely_wrong__" for q in questions}
    submit = client.post("/api/assessment/submit", json={
        "user_id": 42, "skill_id": "statistics", "answers": wrong_answers,
    })
    assert submit.status_code == 200
    result = submit.json()
    assert result["new_proficiency"] < result["previous_proficiency"]


def test_feedback_endpoint():
    resp = client.post("/api/feedback", json={
        "user_id": 42, "resource_id": "res_0051", "signal": "too_difficult",
    })
    assert resp.status_code == 200


def test_chat_endpoint_is_grounded():
    resp = client.post("/api/chat", json={"user_id": 42, "message": "Why do I need statistics?"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"]
    assert data["grounded_on"]


def test_simulate_endpoint_does_not_mutate_real_roadmap():
    before = client.get("/api/roadmap/42").json()
    resp = client.post("/api/roadmap/simulate", json={
        "user_id": 42, "scenario": "hours_per_week", "value": 3,
    })
    assert resp.status_code == 200
    after = client.get("/api/roadmap/42").json()
    assert before == after  # simulation must not persist changes


def test_skill_graph_endpoint():
    resp = client.get("/api/skill-graph")
    assert resp.status_code == 200
    data = resp.json()
    assert "nodes" in data and "edges" in data


def test_today_plan_endpoint():
    resp = client.get("/api/today-plan", params={"user_id": 42})
    assert resp.status_code == 200
    assert "blocks" in resp.json()
