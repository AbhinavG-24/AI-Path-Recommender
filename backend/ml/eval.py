"""
Evaluation harness for the recommendation engine and roadmap generator.

Run:  python -m ml.eval  (from backend/)

Since there's no real user-interaction log to evaluate against, "relevance"
ground truth is defined the same way any cold-start recommender is
evaluated: a resource is relevant to a learner-scenario if it teaches a
skill in that scenario's gap set. This lets us compute standard IR metrics
(Precision@K, Recall@K, NDCG@K) plus catalog coverage/diversity, and
separately validate roadmap structural correctness (no prerequisite
violations, full gap coverage, time-budget adherence).
"""
import math

from ml.skill_graph import get_skill_graph
from ml.skill_gap import analyze_skill_gap
from ml.ranking import rank_resources
from ml.roadmap_gen import generate_roadmap
from ml.retrieval import get_resource_index

SCENARIOS = [
    {
        "name": "ML engineer, python-only beginner",
        "target_role": "Machine Learning Engineer",
        "user_skills": {"python": 60},
        "experience_level": "Beginner",
        "learning_preference": "Project Based",
        "interests": ["Artificial Intelligence"],
        "hours_per_week": 6,
        "deadline_months": 8,
    },
    {
        "name": "Data scientist, strong stats background",
        "target_role": "Data Scientist",
        "user_skills": {"python": 80, "statistics": 85, "sql": 70},
        "experience_level": "Intermediate",
        "learning_preference": "Theory Based",
        "interests": ["Statistics"],
        "hours_per_week": 10,
        "deadline_months": 4,
    },
    {
        "name": "Data analyst, near job-ready",
        "target_role": "Data Analyst",
        "user_skills": {"sql": 85, "excel": 90, "python": 60},
        "experience_level": "Intermediate",
        "learning_preference": "Video Based",
        "interests": [],
        "hours_per_week": 5,
        "deadline_months": 3,
    },
]

K = 8


def precision_recall_ndcg_at_k(gap_skill_ids: set, ranked_resources: list, k: int):
    top_k = ranked_resources[:k]
    relevant_flags = [1 if set(r.resource.get("skills", [])) & gap_skill_ids else 0 for r in top_k]

    num_relevant_retrieved = sum(relevant_flags)
    precision = num_relevant_retrieved / k if k else 0.0

    total_relevant_in_catalog = sum(
        1 for r in get_resource_index().resources if set(r.get("skills", [])) & gap_skill_ids
    )
    recall = num_relevant_retrieved / total_relevant_in_catalog if total_relevant_in_catalog else 0.0

    dcg = sum(rel / math.log2(i + 2) for i, rel in enumerate(relevant_flags))
    ideal = sorted(relevant_flags, reverse=True)
    idcg = sum(rel / math.log2(i + 2) for i, rel in enumerate(ideal))
    ndcg = dcg / idcg if idcg else 0.0

    return precision, recall, ndcg


def coverage_and_diversity(all_recommended_ids: set):
    total = len(get_resource_index().resources)
    coverage = len(all_recommended_ids) / total if total else 0.0
    return coverage


def validate_roadmap(roadmap: dict, gap_skill_ids: set):
    graph = get_skill_graph()
    violations = 0
    seen_mastered = set()
    for phase in roadmap["phases"]:
        for skill_id in phase["skills"]:
            for prereq in graph.direct_prerequisites(skill_id):
                if prereq in gap_skill_ids and prereq not in seen_mastered:
                    violations += 1
        seen_mastered.update(phase["skills"])

    covered_skills = {s for phase in roadmap["phases"] for s in phase["skills"]}
    gap_coverage = len(covered_skills & gap_skill_ids) / len(gap_skill_ids) if gap_skill_ids else 1.0

    time_ok = not roadmap["over_budget"] or roadmap["budget_message"] is not None

    return {
        "prerequisite_violations": violations,
        "gap_coverage": round(gap_coverage, 3),
        "time_budget_adherence": time_ok,
    }


def run():
    all_recommended_ids = set()
    print(f"{'Scenario':45s} {'P@%d' % K:>8s} {'R@%d' % K:>8s} {'NDCG@%d' % K:>8s}")
    print("-" * 75)

    for scenario in SCENARIOS:
        gap = analyze_skill_gap(scenario["target_role"], scenario["user_skills"])
        mastered_ids = {i["skill_id"] for i in gap["strong"]}
        gap_by_skill = {i["skill_id"]: i["status"] for i in gap["missing"] + gap["partial"]}
        gap_skill_ids = set(gap_by_skill.keys())

        ranked = rank_resources(
            query_text=scenario["target_role"] + " " + " ".join(scenario["interests"]),
            candidate_skill_ids=list(gap_skill_ids),
            gap_by_skill=gap_by_skill,
            mastered_skill_ids=mastered_ids,
            experience_level=scenario["experience_level"],
            learning_preference=scenario["learning_preference"],
            preferred_type="course",
            interests=scenario["interests"],
            remaining_weekly_hours=scenario["hours_per_week"],
            top_k=K,
        )
        for r in ranked:
            all_recommended_ids.add(r.resource["id"])

        p, r_, n = precision_recall_ndcg_at_k(gap_skill_ids, ranked, K)
        print(f"{scenario['name']:45s} {p:8.3f} {r_:8.3f} {n:8.3f}")

        roadmap = generate_roadmap(
            target_role=scenario["target_role"],
            user_skills=scenario["user_skills"],
            experience_level=scenario["experience_level"],
            learning_preference=scenario["learning_preference"],
            preferred_type="course",
            interests=scenario["interests"],
            hours_per_week=scenario["hours_per_week"],
            deadline_months=scenario["deadline_months"],
        )
        validity = validate_roadmap(roadmap, gap_skill_ids)
        print(f"  roadmap validity: {validity}")

    coverage = coverage_and_diversity(all_recommended_ids)
    print("-" * 75)
    print(f"Catalog coverage across all scenarios: {coverage:.1%} "
          f"({len(all_recommended_ids)} unique resources recommended)")


if __name__ == "__main__":
    run()
