from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import AssessmentRequest, AssessmentSubmitRequest, AssessmentOut, AssessmentResult
from app import crud, models
from ml.assessment_engine import generate_assessment, score_submission, guidance_for_score
from ml.adaptive import update_proficiency, unlocked_skills
from ml.skill_graph import get_skill_graph

router = APIRouter(tags=["assessment"])


@router.post("/api/assessment", response_model=AssessmentOut)
def create_assessment(payload: AssessmentRequest):
    graph = get_skill_graph()
    if payload.skill_id not in graph.skills:
        raise HTTPException(404, f"Unknown skill_id: {payload.skill_id}")
    difficulty = payload.difficulty or "intermediate"
    assessment, _correct_answers = generate_assessment(payload.skill_id, difficulty)
    return assessment


@router.post("/api/assessment/submit", response_model=AssessmentResult)
def submit_assessment(payload: AssessmentSubmitRequest, db: Session = Depends(get_db)):
    graph = get_skill_graph()
    if payload.skill_id not in graph.skills:
        raise HTTPException(404, f"Unknown skill_id: {payload.skill_id}")

    _assessment, correct_answers = generate_assessment(payload.skill_id, payload.difficulty)
    score, num_correct, num_questions = score_submission(payload.answers, correct_answers)

    user_skills = crud.get_user_skills_dict(db, payload.user_id)
    previous_proficiency = user_skills.get(payload.skill_id, 0.0)
    new_proficiency = update_proficiency(previous_proficiency, score)
    crud.upsert_user_skill(db, payload.user_id, payload.skill_id, new_proficiency)

    db.add(models.AssessmentAttempt(
        user_id=payload.user_id,
        skill_id=payload.skill_id,
        score=score,
        difficulty=payload.difficulty,
        num_questions=num_questions,
        num_correct=num_correct,
        answers=payload.answers,
    ))
    db.commit()

    mastered_ids = {sid for sid, p in user_skills.items() if p >= 75.0}
    unlocked = unlocked_skills(payload.skill_id, new_proficiency, mastered_ids)

    return {
        "skill_id": payload.skill_id,
        "score": score,
        "num_correct": num_correct,
        "num_questions": num_questions,
        "new_proficiency": new_proficiency,
        "previous_proficiency": previous_proficiency,
        "guidance": guidance_for_score(score),
        "unlocked_skills": unlocked,
    }
