"""
AI Assistant with Retrieval-Augmented Generation.

Pipeline:
  question -> classify intent -> retrieve grounding context from the
  learner's profile, active roadmap, skill graph and resource index ->
  build a deterministic, template-based answer from that context (default) ->
  optionally hand the same context + question to an LLM for more natural
  phrasing (never allowed to invent facts outside the retrieved context).

If no API key / DEMO_MODE=true, the deterministic answer is returned as-is,
so the assistant always works offline.
"""
import os
import re

from ml.skill_graph import get_skill_graph
from ml.retrieval import get_resource_index
from ml.skill_gap import analyze_skill_gap, biggest_gap


def _match_intent(message: str) -> str:
    m = message.lower()
    if "why" in m and ("recommend" in m or "suggest" in m):
        return "why_recommended"
    if "what should i learn next" in m or "next" in m and "learn" in m:
        return "next_step"
    if "why" in m and "need" in m:
        return "why_needed"
    if "skip" in m:
        return "can_skip"
    if "project" in m and ("build" in m or "recommend" in m or "should" in m):
        return "project_suggestion"
    if "how much time" in m or "how long" in m:
        return "time_estimate"
    if "biggest" in m and "gap" in m or "weakest" in m:
        return "biggest_gap"
    if "today" in m:
        return "today_plan"
    return "general"


def _extract_skill_mention(message: str):
    graph = get_skill_graph()
    m = message.lower()
    best = None
    for skill_id, skill in graph.skills.items():
        if skill["name"].lower() in m or skill_id.replace("_", " ") in m:
            best = skill_id
            break
    return best


def answer_question(message: str, *, profile: dict, roadmap: dict | None, user_skills: dict) -> dict:
    graph = get_skill_graph()
    intent = _match_intent(message)
    skill_mention = _extract_skill_mention(message)
    grounded_on = []

    if intent == "why_needed" and skill_mention:
        grounded_on.append(f"skill:{skill_mention}")
        dependents = list(graph.graph.successors(skill_mention))
        dep_names = ", ".join(graph.skill_name(d) for d in dependents[:4]) or "advanced topics in this track"
        answer = (
            f"{graph.skill_name(skill_mention)} is a prerequisite for {dep_names}. "
            f"Without it, those downstream topics will be much harder to learn correctly."
        )
        return {"answer": answer, "grounded_on": grounded_on, "method": "rule_based"}

    if intent == "can_skip" and skill_mention:
        grounded_on.append(f"skill:{skill_mention}")
        prof = user_skills.get(skill_mention, 0.0)
        if prof >= 75:
            answer = f"You've already demonstrated {graph.skill_name(skill_mention)} at a strong level ({prof:.0f}%), so you can skip ahead."
        else:
            prereqs = graph.direct_prerequisites(skill_mention)
            names = ", ".join(graph.skill_name(p) for p in prereqs) if prereqs else "no formal prerequisites"
            answer = (
                f"You could skip {graph.skill_name(skill_mention)} if you can already apply it confidently, "
                f"but it depends on: {names}. Your current proficiency is {prof:.0f}%, so we'd recommend at least "
                f"a quick self-assessment before skipping."
            )
        return {"answer": answer, "grounded_on": grounded_on, "method": "rule_based"}

    if intent == "biggest_gap":
        target_role = profile.get("target_role", "Machine Learning Engineer")
        gap = biggest_gap(target_role, user_skills)
        grounded_on.append(f"skill_gap:{target_role}")
        answer = (
            f"Your biggest current gap toward {target_role} is {gap}."
            if gap else f"You've covered all core skills required for {target_role}."
        )
        return {"answer": answer, "grounded_on": grounded_on, "method": "rule_based"}

    if intent == "time_estimate" and roadmap:
        grounded_on.append("roadmap")
        answer = (
            f"Your current roadmap is estimated at {roadmap['total_estimated_hours']} hours in total, "
            f"against a budget of {roadmap['available_hours']} hours given your availability. "
        )
        answer += "That fits your timeline." if not roadmap.get("over_budget") else "That's over budget -- consider the compressed plan or extending your deadline."
        return {"answer": answer, "grounded_on": grounded_on, "method": "rule_based"}

    if intent == "next_step" and roadmap and roadmap.get("phases"):
        phase = roadmap["phases"][0]
        grounded_on.append("roadmap:phase_1")
        skill_names = ", ".join(graph.skill_name(s) for s in phase["skills"])
        top_resource = phase["resources"][0] if phase.get("resources") else None
        answer = f"Focus next on {skill_names}."
        if top_resource:
            title = top_resource.resource["title"] if hasattr(top_resource, "resource") else top_resource["title"]
            answer += f" Start with \"{title}\"."
        return {"answer": answer, "grounded_on": grounded_on, "method": "rule_based"}

    if intent == "project_suggestion":
        index = get_resource_index()
        projects = [r for r in index.resources if r["resource_type"] == "project"]
        target_role = profile.get("target_role", "Machine Learning Engineer")
        gap = analyze_skill_gap(target_role, user_skills)
        gap_skill_ids = {i["skill_id"] for i in gap["missing"] + gap["partial"]}
        relevant = [p for p in projects if gap_skill_ids.intersection(p.get("skills", []))]
        pick = (relevant or projects)[0] if (relevant or projects) else None
        grounded_on.append("resource_index:projects")
        if pick:
            answer = f"Try \"{pick['title']}\" -- it practices {', '.join(graph.skill_name(s) for s in pick['skills'])}, which lines up with your current skill gaps."
        else:
            answer = "No project resources are available in the local dataset right now."
        return {"answer": answer, "grounded_on": grounded_on, "method": "rule_based"}

    if intent == "today_plan" and roadmap and roadmap.get("phases"):
        grounded_on.append("roadmap:today")
        hours = profile.get("hours_per_week", 6.0)
        daily_minutes = round((hours / 7) * 60)
        phase = roadmap["phases"][0]
        skill_names = ", ".join(graph.skill_name(s) for s in phase["skills"][:2])
        answer = f"Today, spend about {daily_minutes} minutes on {skill_names} from your current phase. Check the 'Today's Plan' card on your dashboard for a full breakdown."
        return {"answer": answer, "grounded_on": grounded_on, "method": "rule_based"}

    # Fallback: general grounded summary
    target_role = profile.get("target_role", "your goal")
    grounded_on.append("profile")
    answer = (
        f"I can help with your path to {target_role}. Ask me things like "
        f"\"why do I need statistics?\", \"what should I learn next?\", \"what project should I build?\", "
        f"or \"what's my biggest skill gap?\" and I'll answer using your actual profile and roadmap data."
    )
    return {"answer": answer, "grounded_on": grounded_on, "method": "rule_based"}


def maybe_enhance_with_llm(question: str, deterministic_answer: str, context_snippets: list[str]) -> str:
    """Optionally polish phrasing via LLM while staying grounded in the deterministic answer/context."""
    if os.getenv("DEMO_MODE", "true").lower() == "true":
        return deterministic_answer
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return deterministic_answer
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        context = "\n".join(context_snippets)
        prompt = (
            "You are a learning assistant. Rephrase the following grounded answer to be warmer and clearer, "
            "WITHOUT adding any new facts, course names, or numbers not present in it.\n\n"
            f"Question: {question}\nGrounded answer: {deterministic_answer}\nContext: {context}"
        )
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(b.text for b in response.content if getattr(b, "type", "") == "text").strip()
        return text or deterministic_answer
    except Exception:
        return deterministic_answer
