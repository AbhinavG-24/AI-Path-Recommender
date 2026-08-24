"""
Generates data/resources.json: a local dataset of 100+ learning resources
mapped to the skill ontology in skills.json. No external calls, no fake URLs
(a resource either has demo_url = null, or a clearly marked "demo://" link).

Run: python generate_resources.py
"""
import json
import random
from pathlib import Path

random.seed(42)

HERE = Path(__file__).parent
skills_data = json.loads((HERE / "skills.json").read_text())
skills = skills_data["skills"]
prereq_edges = skills_data["prerequisites"]

prereq_map = {}
for edge in prereq_edges:
    prereq_map.setdefault(edge["skill"], []).append(edge["requires"])

SOURCES = ["Coursera", "YouTube", "freeCodeCamp", "Official Docs", "Kaggle Learn",
           "fast.ai", "DeepLearning.AI", "Real Python", "Towards Data Science", "MIT OpenCourseWare"]

RESOURCE_TEMPLATES = {
    "course": [
        ("{name}: Complete Course", "A structured, from-scratch course covering the fundamentals and practical use of {name_lower}.", 8, 20),
        ("{name} for Practitioners", "A hands-on course that builds {name_lower} skills through guided exercises.", 6, 15),
    ],
    "video": [
        ("{name} in 60 Minutes", "A fast-paced video walkthrough of the core ideas behind {name_lower}.", 1, 2),
        ("{name} Crash Course", "A visual, example-driven crash course on {name_lower}.", 1, 3),
    ],
    "article": [
        ("A Practical Guide to {name}", "A written guide explaining {name_lower} with worked examples.", 0.5, 1),
        ("{name}: Concepts and Intuition", "An article building intuition for {name_lower} before diving into code.", 0.5, 1),
    ],
    "documentation": [
        ("{name} Reference Documentation", "Official reference material for {name_lower} APIs and usage patterns.", 1, 4),
    ],
    "project": [
        ("Applied Project: {name}", "A project-based exercise that applies {name_lower} to a realistic dataset or problem.", 4, 12),
    ],
    "quiz": [
        ("{name} Knowledge Check", "A short quiz to test conceptual understanding of {name_lower}.", 0.25, 0.5),
    ],
}

TAGS_BY_CATEGORY = {
    "Programming": ["coding", "fundamentals"],
    "Tools": ["tooling", "workflow"],
    "Data": ["data", "wrangling"],
    "Math": ["math", "theory"],
    "ML": ["machine-learning", "modeling"],
    "Deep Learning": ["deep-learning", "neural-networks"],
    "Applied AI": ["applied-ai", "capstone"],
    "MLOps": ["mlops", "production"],
}


def difficulty_band(skill_difficulty: int) -> str:
    if skill_difficulty <= 2:
        return "beginner"
    if skill_difficulty <= 3:
        return "intermediate"
    return "advanced"


def build_resources():
    resources = []
    rid = 1
    for skill in skills:
        prereqs = prereq_map.get(skill["id"], [])
        band = difficulty_band(skill["difficulty"])
        tags = TAGS_BY_CATEGORY.get(skill["category"], [])

        # Every skill gets: 1 course, 1 video, 1 article, 1 quiz.
        # Skills of difficulty >= 3 also get a project (project-based learning path).
        plan = ["course", "video", "article", "quiz"]
        if skill["difficulty"] >= 3:
            plan.append("project")
        if skill["difficulty"] <= 2:
            plan.append("documentation")

        for rtype in plan:
            template = random.choice(RESOURCE_TEMPLATES[rtype])
            title_tpl, desc_tpl, dmin, dmax = template
            title = title_tpl.format(name=skill["name"])
            desc = desc_tpl.format(name_lower=skill["name"].lower())
            duration = round(random.uniform(dmin, dmax), 1)
            rating = round(random.uniform(3.7, 4.9), 1)
            source = random.choice(SOURCES)
            project_based = rtype == "project"

            resources.append({
                "id": f"res_{rid:04d}",
                "title": title,
                "description": desc,
                "resource_type": rtype,
                "category": skill["category"],
                "skills": [skill["id"]],
                "prerequisites": prereqs,
                "difficulty": band,
                "duration_hours": duration,
                "rating": rating,
                "source": source,
                "project_based": project_based,
                "tags": tags + [rtype],
                "demo_url": None,
            })
            rid += 1

    # A handful of larger capstone projects that span multiple related skills,
    # so the recommender has some genuinely multi-skill candidates to work with.
    capstones = [
        ("Customer Churn Prediction", ["regression", "classification", "feature_engineering", "model_evaluation"], "intermediate", 10),
        ("Image Classification App", ["cnn", "computer_vision", "model_deployment"], "advanced", 14),
        ("End-to-End ML Pipeline with CI/CD", ["mlops", "docker", "ci_cd", "model_deployment"], "advanced", 16),
        ("Sales Dashboard & Insight Report", ["pandas", "data_visualization", "data_storytelling"], "beginner", 6),
        ("A/B Test Analysis for a Product Launch", ["ab_testing", "statistics", "data_storytelling"], "intermediate", 5),
        ("Sentiment Analysis with Transformers", ["nlp", "transformers"], "advanced", 12),
        ("SQL Analytics Case Study", ["sql", "sql_advanced", "data_cleaning"], "beginner", 5),
    ]
    for title, skill_ids, band, dur in capstones:
        resources.append({
            "id": f"res_{rid:04d}",
            "title": title,
            "description": f"A capstone project combining {', '.join(skill_ids)} into a single deliverable.",
            "resource_type": "project",
            "category": "Capstone",
            "skills": skill_ids,
            "prerequisites": list({p for s in skill_ids for p in prereq_map.get(s, [])}),
            "difficulty": band,
            "duration_hours": dur,
            "rating": round(random.uniform(4.2, 4.9), 1),
            "source": "LearnPath Projects",
            "project_based": True,
            "tags": ["capstone", "project"],
            "demo_url": None,
        })
        rid += 1

    return resources


if __name__ == "__main__":
    resources = build_resources()
    out = {"resources": resources}
    (HERE / "resources.json").write_text(json.dumps(out, indent=2))
    print(f"Generated {len(resources)} resources -> resources.json")
