# LearnPath AI — Adaptive Personalized Learning Path Recommender

A learning-path recommender that actually implements the recommendation logic in
code — hybrid retrieval (TF-IDF + BM25 + semantic), a prerequisite skill graph
built with NetworkX, and an adaptive engine that reshapes your roadmap every
time you take an assessment. Runs fully **offline**: no LLM API key required.

Built for the HCL hackathon.

---

## 1. Problem statement

Given a learner's goal, current skills, experience, interests, time budget and
deadline, generate a structured, prerequisite-aware roadmap (courses, videos,
articles, projects, assessments, milestones), explain *why* each resource was
recommended, and adapt the plan as the learner progresses.

This is **not** "ask an LLM for course recommendations." The ranking,
sequencing, and adaptation are deterministic ML/graph algorithms; an LLM is an
optional enhancement layered on top, never a requirement.

## 2. Product flow

```
Natural language goal
      ↓
Rule-based / LLM goal parsing  →  target role, known skills, hours/week, deadline
      ↓
Learner profile (SQLite/Postgres)
      ↓
Skill-gap analysis (vs. skill knowledge graph)
      ↓
Hybrid retrieval  (TF-IDF + BM25 + semantic)  — 100+ resource dataset
      ↓
8-factor weighted ranking  →  explainable "why this?" reasons
      ↓
Prerequisite-aware roadmap  (topological sort over the skill graph, phased,
                              time-budget-aware, auto-compressed if over budget)
      ↓
Assessments  →  adaptive engine updates proficiency, unlocks/relocks skills,
                 reranks recommendations, reshapes the roadmap
      ↓
Feedback signals (too hard / too easy / already know / not interested)
      →  shift difficulty bias & project-preference used in future ranking
```

## 3. Architecture

```
LearnPath-AI/
  backend/
    app/            FastAPI app: routers, SQLAlchemy models, Pydantic schemas, CRUD
    ml/              all the actual ML/graph logic, framework-agnostic
      skill_graph.py     NetworkX prerequisite graph
      goal_analyzer.py   NL goal parsing (rule-based, optional LLM)
      skill_gap.py       gap analysis + weighted gap score
      retrieval.py       TF-IDF, BM25, semantic (LSA fallback) candidate retrieval
      ranking.py         8-factor hybrid scoring + explanations
      roadmap_gen.py      topological phase sequencing + time-budget compression
      assessment_engine.py deterministic MCQ generation + scoring
      adaptive.py         proficiency updates, unlock logic, feedback→bias
      simulator.py        non-destructive "what if?" recalculation
      assistant.py         RAG-lite grounded chat over profile+graph+resources
    data/            skills.json (graph+roles), resources.json (172 resources)
    tests/           pytest suite (44 tests)
  frontend/
    src/pages/       Landing, Onboarding, Dashboard, Skill Graph (React Flow),
                      Roadmap, Recommendations, Assessment, AI Tutor, Simulator
    src/components/  shared UI kit, layout
    src/lib/api.ts   typed fetch client
  docker-compose.yml
```

## 4. AI/ML approach

**Retrieval (stage 1)** — three signals computed over the local resource
corpus, no external API:
- TF-IDF cosine similarity (scikit-learn)
- BM25 (`rank_bm25`)
- Semantic similarity: TruncatedSVD (LSA) projection of the TF-IDF space as an
  offline-friendly stand-in for dense embeddings — this environment has no
  network access to download a sentence-transformers model, so `retrieval.py`
  tries `sentence-transformers` first and transparently falls back to LSA if
  it's unavailable. Either way, semantic similarity captures topical overlap
  beyond exact keyword matching.

**Ranking (stage 2 & 3)** — every candidate resource gets 8 features and a
configurable weighted score, normalized 0–100:

```
final_score =
    0.25 * goal_similarity
  + 0.20 * skill_gap_coverage
  + 0.15 * prerequisite_score
  + 0.15 * semantic_similarity
  + 0.10 * difficulty_match
  + 0.05 * preference_match
  + 0.05 * time_match
  + 0.05 * interest_match
```

Weights live in `ml/ranking.py::DEFAULT_WEIGHTS`. Every recommendation ships
with its full feature breakdown and a generated natural-language reason.

**Skill graph** — `ml/skill_graph.py` builds a directed graph
(`prerequisite → skill`) over 33 skills across 3 target roles (Machine
Learning Engineer, Data Scientist, Data Analyst) using NetworkX. This graph
isn't decorative — `roadmap_gen.py` topologically sorts the learner's skill
gaps through it and groups them into phases by graph depth, so a resource is
never scheduled before its prerequisite.

**Adaptive engine** — `ml/adaptive.py`. An assessment score updates skill
proficiency via an EMA blend (`0.4 * old + 0.6 * new`), which flows straight
back into the skill-gap → ranking → roadmap pipeline on the next read (no
separate "recompute" step needed — everything reads current DB state).
Crossing the mastery threshold (75%) unlocks dependent skills whose
prerequisites are now satisfied; falling below it surfaces revision resources
instead of progression.

**Feedback loop** — signals like `too_difficult` / `too_easy` /
`already_know` shift a per-learner `difficulty_bias` and `project_preference`
that feed back into the `difficulty_match` and `preference_match` ranking
factors.

**Time-aware planning** — `total_learning_budget = hours_per_week *
deadline_months * 4.33`. If the roadmap's estimated hours exceed the budget,
the response includes an explicit over-budget message and
`_compress_phases()` trims to the highest-scoring resource per skill so
prerequisite coverage is preserved instead of dropping whole phases.

## 5. Recommendation formula — see above. Fully configurable via `weights=` param on `rank_resources()`.

## 6. Database schema

SQLAlchemy models (`backend/app/models.py`): `User`, `LearnerProfile`,
`UserSkill`, `LearningPath`, `LearningPathItem`, `AssessmentAttempt`,
`Feedback`. SQLite by default (zero setup); swap `DATABASE_URL` for Postgres
in production (the provided `docker-compose.yml` does this automatically).

## 7. Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
python data/generate_resources.py   # regenerate the 100+ resource dataset (idempotent)
cp .env.example .env                 # DEMO_MODE=true by default, no key needed
uvicorn app.main:app --reload --port 8000
```

Docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173, proxies /api to localhost:8000
```

### Evaluation

```bash
cd backend
python -m ml.eval
```

Runs 3 learner scenarios through the live ranking + roadmap pipeline and
reports Precision@8 / Recall@8 / NDCG@8 (relevance = "resource teaches a
skill in the learner's gap set"), catalog coverage, and roadmap structural
validity (prerequisite violations, gap coverage, time-budget adherence).

### Tests

```bash
cd backend
pytest -q
```

44 tests covering skill-graph topology, skill-gap math, hybrid ranking,
prerequisite-ordered roadmap generation, the adaptive engine, and a full
API integration flow (profile → skill-gap → recommendations → roadmap →
assessment → adaptive update → dashboard → chat → simulate).

### Docker

```bash
docker compose up --build
```

Starts Postgres, the FastAPI backend (`:8000`), and the frontend behind
nginx (`:5173`, proxying `/api` to the backend on the compose network).
Note: this repo's sandbox couldn't run Docker itself to verify the build
end-to-end (no Docker daemon available in this environment) — the compose
file and Dockerfiles follow standard patterns, but give the first
`docker compose up --build` a careful look before your demo.

## 8. Environment variables (`backend/.env.example`)

```
DEMO_MODE=true                 # forces deterministic offline behavior
ANTHROPIC_API_KEY=             # optional — enables LLM-enhanced goal parsing & explanations
DATABASE_URL=sqlite:///./learnpath.db
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## 9. Offline / demo mode

The app runs completely offline by default. `DEMO_MODE=true` forces
deterministic goal parsing, local retrieval/ranking, and template-based
assessment generation even if an API key is present. If `ANTHROPIC_API_KEY`
is set, `goal_analyzer.py` and `assistant.py` opportunistically use it for
richer parsing/explanations, with a clean fallback to the rule-based path on
any failure.

## 9b. Course Insights — trained on the Round 1 dataset

`ml/review_model.py` wraps the Round 1 submission's approach (course
detection via sentence fingerprinting, opener restoration, TF-IDF + cosine
similarity retrieval) into a proper trainable model class:

```python
model = ReviewSimilarityModel().fit(train_df)   # ~8s on 109,776 reviews
model.top_k_similar("great course, learned a lot about deep learning", k=5)
model.save("ml/artifacts/review_model.joblib")  # persisted, no retrain on server start
```

**To use it:**

1. Place `train.csv` (and optionally `test.csv`) from Round 1 into
   `backend/data/reviews/`.
2. From `backend/`, run:
   ```bash
   python -m ml.train_review_model          # fits + saves the model, ~8s
   python -m ml.train_review_model --full    # also regenerates the full
                                              # Round 1 submission.csv (~5 min)
   ```
3. Start the backend as usual. Two new endpoints become live:
   - `GET /api/reviews/courses` — the 80 trained course names + review counts
   - `POST /api/reviews/similar` `{query, k, course_hint?}` — top-K most
     similar real learner reviews, with course label and cosine similarity
     score
4. In the frontend, the **Course Insights** page
   (`/course-insights`) is a live demo: type anything and see the most
   similar real reviews the model retrieves, with the detected course.

The `.joblib` artifact (~150MB, since it holds the full TF-IDF matrix over
109k documents) and the raw CSVs are **not** included in this zip to keep it
small — regenerate them with the command above.

## 10. Demo script (matches spec section 38)

1. Go to **Onboarding**, paste: *"I want to become a Machine Learning
   Engineer. I know Python, SQL and Pandas. I have 8 hours per week and want
   to be job-ready in 6 months. I prefer learning through projects."*
2. Confirm the extracted profile → redirected to **Dashboard**.
3. **Skill Graph** — see the prerequisite graph with your mastered/partial
   skills highlighted.
4. **Roadmap** — prerequisite-ordered phases with resources, milestones, and
   time estimates.
5. **Recommendations** — expand "Why this?" to see the 8-factor score
   breakdown.
6. **Assessment** — take a quiz on Statistics, answer badly on purpose, watch
   proficiency drop and the roadmap adapt.
7. **Simulator** — try "what if I only had 3 months?" without touching your
   real roadmap.
8. **AI Tutor** — ask "why do I need statistics?" and get an answer grounded
   in the skill graph.

## 11. Limitations

- Semantic retrieval uses an LSA/TF-IDF projection rather than a trained
  sentence embedding model (no network access to download one in this
  environment); swap in `sentence-transformers` by installing it — the code
  already prefers it when available.
- No authentication layer — the demo uses a single hardcoded user id for
  speed. `models.User` exists and is ready for a real auth flow.
- Docker Compose setup was not build-verified in this sandbox (no Docker
  daemon available here).

## 12. Future improvements

- Real embedding model + FAISS/pgvector for semantic retrieval at scale.
- JWT auth + multi-user support in the frontend (backend models already
  support it).
- Expand the resource dataset and skill graph beyond the 3 seeded roles.
- A/B test ranking weight configurations against the eval harness.
