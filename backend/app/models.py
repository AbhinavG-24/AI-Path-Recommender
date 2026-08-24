import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


def now():
    return datetime.datetime.utcnow()


class User(Base):
    """Minimal user record. Hackathon scope: no password/JWT auth, single demo
    user is created automatically. Structured so real auth can be dropped in later."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="Demo Learner")
    created_at = Column(DateTime, default=now)

    profile = relationship("LearnerProfile", back_populates="user", uselist=False)
    user_skills = relationship("UserSkill", back_populates="user")
    paths = relationship("LearningPath", back_populates="user")
    attempts = relationship("AssessmentAttempt", back_populates="user")
    feedback = relationship("Feedback", back_populates="user")


class LearnerProfile(Base):
    __tablename__ = "learner_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)

    raw_goal_text = Column(Text, default="")
    target_role = Column(String, default="")
    experience_level = Column(String, default="Beginner")  # Beginner/Intermediate/Advanced
    interests = Column(JSON, default=list)
    completed_resource_ids = Column(JSON, default=list)
    preferred_resource_type = Column(String, default="course")
    learning_preference = Column(String, default="Project Based")  # Project Based / Theory First / Video / Reading
    hours_per_week = Column(Float, default=6.0)
    deadline_months = Column(Float, default=6.0)

    # Adaptive preference weights, tuned over time by the feedback loop (see ml/adaptive.py)
    difficulty_bias = Column(Float, default=0.0)   # negative = prefers easier, positive = prefers harder
    project_preference = Column(Float, default=0.0)  # increases when learner favors project-based resources

    updated_at = Column(DateTime, default=now, onupdate=now)

    user = relationship("User", back_populates="profile")


class UserSkill(Base):
    """Learner's proficiency (0-100) in a given skill id from the skill graph."""
    __tablename__ = "user_skills"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    skill_id = Column(String, index=True)
    proficiency = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=now, onupdate=now)

    user = relationship("User", back_populates="user_skills")


class LearningPath(Base):
    __tablename__ = "learning_paths"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    label = Column(String, default="Primary Roadmap")  # e.g. "Primary Roadmap" or "Simulation: 5h/week"
    target_role = Column(String, default="")
    total_estimated_hours = Column(Float, default=0.0)
    available_hours = Column(Float, default=0.0)
    created_at = Column(DateTime, default=now)

    user = relationship("User", back_populates="paths")
    items = relationship("LearningPathItem", back_populates="path", cascade="all, delete-orphan")


class LearningPathItem(Base):
    __tablename__ = "learning_path_items"

    id = Column(Integer, primary_key=True, index=True)
    path_id = Column(Integer, ForeignKey("learning_paths.id"))
    phase_index = Column(Integer)
    phase_title = Column(String)
    phase_objective = Column(String)
    skill_id = Column(String)
    resource_id = Column(String)
    order_in_phase = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False)
    milestone = Column(String, default="")

    path = relationship("LearningPath", back_populates="items")


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    skill_id = Column(String, index=True)
    score = Column(Float)  # 0-100
    difficulty = Column(String, default="intermediate")
    num_questions = Column(Integer, default=5)
    num_correct = Column(Integer, default=0)
    answers = Column(JSON, default=dict)
    created_at = Column(DateTime, default=now)

    user = relationship("User", back_populates="attempts")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    resource_id = Column(String, index=True)
    signal = Column(String)  # useful/not_useful/too_difficult/too_easy/already_know/not_interested/too_time_consuming
    created_at = Column(DateTime, default=now)

    user = relationship("User", back_populates="feedback")
