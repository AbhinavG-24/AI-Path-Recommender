import os
from functools import lru_cache

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ml.review_model import ReviewSimilarityModel

router = APIRouter(tags=["reviews"])

HERE = os.path.dirname(os.path.abspath(__file__))
ARTIFACT_PATH = os.path.join(HERE, "..", "..", "ml", "artifacts", "review_model.joblib")


@lru_cache(maxsize=1)
def _get_model() -> ReviewSimilarityModel:
    if not os.path.exists(ARTIFACT_PATH):
        raise HTTPException(
            status_code=503,
            detail=(
                "Review model not trained yet. Run `python -m ml.train_review_model` "
                "from the backend/ directory (needs data/reviews/train.csv)."
            ),
        )
    return ReviewSimilarityModel.load(ARTIFACT_PATH)


class SimilarReviewsRequest(BaseModel):
    query: str
    k: int = 5
    course_hint: str | None = None


@router.get("/api/reviews/courses")
def list_courses():
    model = _get_model()
    return {"courses": model.course_list()}


@router.post("/api/reviews/similar")
def similar_reviews(payload: SimilarReviewsRequest):
    model = _get_model()
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")

    results, detected_course = model.top_k_similar(
        payload.query, k=min(payload.k, 20), course_hint=payload.course_hint
    )
    return {
        "detected_course": detected_course,
        "results": results,
        "trained_on": "HCL Round 1 dataset (109,776 reviews, 80 courses)",
    }
