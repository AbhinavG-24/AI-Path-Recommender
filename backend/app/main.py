import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.database import Base, engine
from app import models  # noqa: F401 ensures models are registered before create_all
from app.routers import goal, profile, skills, recommendations, roadmap, assessment, feedback, dashboard, chat, progress, reviews

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LearnPath AI",
    description="Adaptive Personalized Learning Path Recommender",
    version="0.1.0",
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(goal.router)
app.include_router(profile.router)
app.include_router(skills.router)
app.include_router(recommendations.router)
app.include_router(roadmap.router)
app.include_router(assessment.router)
app.include_router(feedback.router)
app.include_router(dashboard.router)
app.include_router(chat.router)
app.include_router(progress.router)
app.include_router(reviews.router)


@app.get("/")
def root():
    return {
        "service": "LearnPath AI",
        "demo_mode": os.getenv("DEMO_MODE", "true"),
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}
