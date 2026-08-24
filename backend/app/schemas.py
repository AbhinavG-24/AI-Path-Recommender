from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class GoalAnalyzeRequest(BaseModel):
    text: str = Field(..., description="Free-text goal, e.g. 'I want to become an ML engineer...'")


class GoalAnalyzeResponse(BaseModel):
    target_role: str
    known_skills: List[str]
    missing_skills: List[str]
    hours_per_week: Optional[float]
    deadline_months: Optional[float]
    learning_preference: Optional[str]
    experience_level: str
    confidence: float
    method: str  # "llm" or "rule_based"


class ProfileIn(BaseModel):
    user_id: int = 1
    goal_text: Optional[str] = None
    target_role: str
    experience_level: str = "Beginner"
    skills: Dict[str, float] = Field(default_factory=dict, description="skill_id -> proficiency 0-100")
    interests: List[str] = Field(default_factory=list)
    hours_per_week: float = 6.0
    deadline_months: float = 6.0
    learning_preference: str = "Project Based"
    preferred_resource_type: str = "course"


class SkillGapItem(BaseModel):
    skill_id: str
    skill_name: str
    proficiency: float
    status: str  # mastered / partial / missing
    is_prerequisite_gap: bool


class SkillGapResponse(BaseModel):
    target_role: str
    strong: List[SkillGapItem]
    partial: List[SkillGapItem]
    missing: List[SkillGapItem]
    gap_score: float  # 0-100, higher = bigger gap


class RecommendationRequest(BaseModel):
    user_id: int = 1
    top_k: int = 10
    skill_id: Optional[str] = None  # optionally focus recommendations on one skill


class RecommendationItem(BaseModel):
    resource_id: str
    title: str
    resource_type: str
    skills: List[str]
    difficulty: str
    duration_hours: float
    rating: float
    overall_score: float
    goal_similarity: float
    skill_gap_coverage: float
    prerequisite_score: float
    semantic_similarity: float
    difficulty_match: float
    preference_match: float
    time_match: float
    interest_match: float
    reason: str


class RoadmapRequest(BaseModel):
    user_id: int = 1
    label: Optional[str] = "Primary Roadmap"


class RoadmapPhase(BaseModel):
    phase_index: int
    title: str
    objective: str
    skills: List[str]
    resources: List[RecommendationItem]
    estimated_hours: float
    milestone: str


class RoadmapResponse(BaseModel):
    target_role: str
    phases: List[RoadmapPhase]
    total_estimated_hours: float
    available_hours: float
    over_budget: bool
    budget_message: Optional[str]


class AssessmentRequest(BaseModel):
    user_id: int = 1
    skill_id: str
    difficulty: Optional[str] = None


class AssessmentQuestionOut(BaseModel):
    id: str
    question: str
    type: str
    options: Optional[List[str]] = None


class AssessmentOut(BaseModel):
    skill_id: str
    difficulty: str
    questions: List[AssessmentQuestionOut]


class AssessmentSubmitRequest(BaseModel):
    user_id: int = 1
    skill_id: str
    difficulty: str = "intermediate"
    answers: Dict[str, str]  # question_id -> selected answer
    # NOTE: correct answers are NOT sent by the client. Assessment generation is
    # deterministic per (skill_id, difficulty), so the backend regenerates the
    # same question set + answer key to score the submission server-side.


class AssessmentResult(BaseModel):
    skill_id: str
    score: float
    num_correct: int
    num_questions: int
    new_proficiency: float
    previous_proficiency: float
    guidance: str
    unlocked_skills: List[str]


class FeedbackRequest(BaseModel):
    user_id: int = 1
    resource_id: str
    signal: str


class ChatRequest(BaseModel):
    user_id: int = 1
    message: str


class ChatResponse(BaseModel):
    answer: str
    grounded_on: List[str]
    method: str


class SimulateRequest(BaseModel):
    user_id: int = 1
    hours_per_week: Optional[float] = None
    deadline_months: Optional[float] = None
    target_role: Optional[str] = None
    assume_known_skills: Optional[List[str]] = None


class DashboardResponse(BaseModel):
    career_readiness: float
    skill_progress: Dict[str, float]
    biggest_gap: Optional[str]
    active_phase: Optional[str]
    completed_resources: int
    total_roadmap_resources: int
    upcoming_milestone: Optional[str]
    assessment_history: List[Dict[str, Any]]
    learning_streak_days: int
