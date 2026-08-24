"""
Skill knowledge graph.

Builds a directed graph where an edge (prereq -> skill) means "prereq is a
prerequisite of skill". This graph is not just for visualization -- it drives
prerequisite-aware ranking (ml/ranking.py) and roadmap ordering (ml/roadmap_gen.py)
via topological sort.
"""
import json
from pathlib import Path
from functools import lru_cache
import networkx as nx

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class SkillGraph:
    def __init__(self, skills_path: Path = DATA_DIR / "skills.json"):
        raw = json.loads(skills_path.read_text())
        self.skills = {s["id"]: s for s in raw["skills"]}
        self.roles = raw["roles"]

        self.graph = nx.DiGraph()
        for skill_id, skill in self.skills.items():
            self.graph.add_node(skill_id, **skill)
        for edge in raw["prerequisites"]:
            # requires -> skill : "requires" must come before "skill"
            self.graph.add_edge(edge["requires"], edge["skill"], relation="prerequisite_of")

        if not nx.is_directed_acyclic_graph(self.graph):
            raise ValueError("Skill graph contains a cycle -- fix data/skills.json")

    def all_skill_ids(self):
        return list(self.skills.keys())

    def skill_name(self, skill_id: str) -> str:
        return self.skills.get(skill_id, {}).get("name", skill_id)

    def skill_difficulty(self, skill_id: str) -> int:
        return self.skills.get(skill_id, {}).get("difficulty", 3)

    def direct_prerequisites(self, skill_id: str):
        return list(self.graph.predecessors(skill_id))

    def all_prerequisites(self, skill_id: str):
        """All ancestor skills (transitive prerequisites), in no particular order."""
        return list(nx.ancestors(self.graph, skill_id)) if skill_id in self.graph else []

    def role_required_skills(self, role: str):
        return self.roles.get(role, [])

    def topological_order(self, skill_ids):
        """
        Return skill_ids ordered so that every prerequisite appears before the
        skills that depend on it. Skills outside the subgraph induced by
        skill_ids are ignored gracefully.
        """
        sub = self.graph.subgraph(skill_ids)
        try:
            order = list(nx.topological_sort(sub))
        except nx.NetworkXUnfeasible:
            order = list(skill_ids)
        # topological_sort only returns nodes present in `sub`; keep any stray ids at the end
        missing = [s for s in skill_ids if s not in order]
        return order + missing

    def prerequisite_satisfaction(self, skill_id: str, mastered_skill_ids: set) -> float:
        """
        Fraction (0-1) of a skill's *direct* prerequisites that the learner has
        already mastered. A skill with no prerequisites is always 1.0 (satisfied).
        """
        prereqs = self.direct_prerequisites(skill_id)
        if not prereqs:
            return 1.0
        satisfied = sum(1 for p in prereqs if p in mastered_skill_ids)
        return satisfied / len(prereqs)

    def category_of(self, skill_id: str) -> str:
        return self.skills.get(skill_id, {}).get("category", "General")

    def as_visualization_payload(self):
        nodes = [
            {
                "id": sid,
                "name": s["name"],
                "category": s["category"],
                "difficulty": s["difficulty"],
                "description": s["description"],
            }
            for sid, s in self.skills.items()
        ]
        edges = [
            {"source": u, "target": v, "relation": d.get("relation", "prerequisite_of")}
            for u, v, d in self.graph.edges(data=True)
        ]
        return {"nodes": nodes, "edges": edges}


@lru_cache()
def get_skill_graph() -> "SkillGraph":
    return SkillGraph()
