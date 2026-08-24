from fastapi import APIRouter

from app.schemas import GoalAnalyzeRequest, GoalAnalyzeResponse
from ml.goal_analyzer import analyze_goal

router = APIRouter(tags=["goal"])


@router.post("/api/analyze-goal", response_model=GoalAnalyzeResponse)
def analyze_goal_endpoint(payload: GoalAnalyzeRequest):
    result = analyze_goal(payload.text)
    return result
