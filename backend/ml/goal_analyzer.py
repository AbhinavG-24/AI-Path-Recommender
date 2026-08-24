"""
Natural Language Goal Understanding.

Converts free text like:
  "I want to become an ML engineer. I know Python and SQL but haven't
   learned machine learning. I have 8 hours per week and want to be
   ready in 6 months."

into structured fields: target_role, known_skills, missing_skills,
hours_per_week, deadline_months, learning_preference, experience_level.

Runs fully offline via keyword/regex rules by default (DEMO_MODE). If
ANTHROPIC_API_KEY is set and DEMO_MODE is false, an LLM call refines the
same structured output -- but the deterministic parse is always computed
first and used as a fallback if the LLM call fails or returns malformed data.
"""
import os
import re
import json

from ml.skill_graph import get_skill_graph

ROLE_KEYWORDS = {
    "Machine Learning Engineer": ["ml engineer", "machine learning engineer", "ai engineer", "ml developer"],
    "Data Scientist": ["data scientist", "data science"],
    "Data Analyst": ["data analyst", "business analyst", "analytics"],
}

SKILL_KEYWORDS = {
    "python": ["python"],
    "sql": ["sql"],
    "sql_advanced": ["advanced sql", "window functions"],
    "numpy": ["numpy"],
    "pandas": ["pandas"],
    "statistics": ["statistics", "stats"],
    "probability": ["probability"],
    "linear_algebra": ["linear algebra"],
    "calculus": ["calculus"],
    "machine_learning_fundamentals": ["machine learning"],
    "deep_learning": ["deep learning"],
    "neural_networks": ["neural network", "neural nets"],
    "nlp": ["nlp", "natural language processing"],
    "computer_vision": ["computer vision", "cv "],
    "docker": ["docker"],
    "mlops": ["mlops"],
    "data_visualization": ["data visualization", "dataviz", "matplotlib", "tableau", "power bi"],
    "data_cleaning": ["data cleaning", "data wrangling"],
    "git": ["git", "github"],
}

TIME_RE = re.compile(r"(\d+(?:\.\d+)?)\s*hours?\s*(?:per|/|a)\s*week", re.IGNORECASE)
MONTHS_RE = re.compile(r"(\d+(?:\.\d+)?)\s*months?", re.IGNORECASE)
WEEKS_RE = re.compile(r"(\d+(?:\.\d+)?)\s*weeks?", re.IGNORECASE)
YEARS_RE = re.compile(r"(\d+(?:\.\d+)?)\s*years?", re.IGNORECASE)

EXPERIENCE_KEYWORDS = {
    "Beginner": ["beginner", "new to", "just starting", "no experience", "haven't learned", "never coded"],
    "Advanced": ["advanced", "expert", "senior", "years of experience", "professional"],
}

PREFERENCE_KEYWORDS = {
    "Project Based": ["project", "hands-on", "hands on", "build things", "practical"],
    "Video": ["video", "watch", "youtube"],
    "Theory First": ["theory", "concepts first", "fundamentals first", "understand deeply"],
    "Reading": ["read", "articles", "documentation"],
}


def _contains_word(text_lower: str, phrase: str) -> bool:
    """Whole-word/phrase match to avoid false positives like 'read' inside 'ready'."""
    pattern = r"\b" + re.escape(phrase.strip()) + r"\b"
    return re.search(pattern, text_lower) is not None


def _detect_role(text_lower: str) -> str:
    for role, keywords in ROLE_KEYWORDS.items():
        if any(_contains_word(text_lower, k) for k in keywords):
            return role
    return "Machine Learning Engineer"  # sensible default for this product


def _detect_known_skills(text_lower: str) -> list[str]:
    known = []
    # crude negation handling: split on common negation markers first
    negation_markers = ["haven't", "have not", "don't know", "no experience with", "not learned", "never used"]
    negative_segment = ""
    for marker in negation_markers:
        idx = text_lower.find(marker)
        if idx != -1:
            negative_segment += text_lower[idx:]

    for skill_id, keywords in SKILL_KEYWORDS.items():
        for kw in keywords:
            k = kw.strip()
            pattern = re.compile(r"\b" + re.escape(k) + r"\b")
            total_count = len(pattern.findall(text_lower))
            if total_count == 0:
                continue
            negated_count = len(pattern.findall(negative_segment))
            if negated_count >= total_count:
                # every mention of this keyword occurs after a negation marker
                continue
            known.append(skill_id)
            break
    return list(dict.fromkeys(known))


def _detect_time(text: str):
    hours_match = TIME_RE.search(text)
    hours_per_week = float(hours_match.group(1)) if hours_match else None

    months_match = MONTHS_RE.search(text)
    if months_match:
        deadline_months = float(months_match.group(1))
    else:
        years_match = YEARS_RE.search(text)
        weeks_match = WEEKS_RE.search(text)
        if years_match:
            deadline_months = float(years_match.group(1)) * 12
        elif weeks_match:
            deadline_months = round(float(weeks_match.group(1)) / 4.33, 1)
        else:
            deadline_months = None

    return hours_per_week, deadline_months


def _detect_experience(text_lower: str) -> str:
    for level, keywords in EXPERIENCE_KEYWORDS.items():
        if any(_contains_word(text_lower, k) for k in keywords):
            return level
    return "Intermediate"


def _detect_preference(text_lower: str) -> str:
    for pref, keywords in PREFERENCE_KEYWORDS.items():
        if any(_contains_word(text_lower, k) for k in keywords):
            return pref
    return "Project Based"


def rule_based_parse(text: str) -> dict:
    graph = get_skill_graph()
    text_lower = f" {text.lower()} "

    target_role = _detect_role(text_lower)
    known_skills = _detect_known_skills(text_lower)
    hours_per_week, deadline_months = _detect_time(text)
    experience_level = _detect_experience(text_lower)
    learning_preference = _detect_preference(text_lower)

    required = set(graph.role_required_skills(target_role))
    missing_skills = sorted(required - set(known_skills))

    return {
        "target_role": target_role,
        "known_skills": known_skills,
        "missing_skills": missing_skills,
        "hours_per_week": hours_per_week if hours_per_week is not None else 6.0,
        "deadline_months": deadline_months if deadline_months is not None else 6.0,
        "learning_preference": learning_preference,
        "experience_level": experience_level,
        "confidence": 0.7 if (hours_per_week and deadline_months) else 0.5,
        "method": "rule_based",
    }


def _try_llm_parse(text: str) -> dict | None:
    """Optional enhancement path. Only runs if DEMO_MODE=false and an API key exists."""
    if os.getenv("DEMO_MODE", "true").lower() == "true":
        return None
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        import anthropic  # imported lazily so the app works without the package installed

        graph = get_skill_graph()
        valid_skills = graph.all_skill_ids()
        valid_roles = list(graph.roles.keys())

        client = anthropic.Anthropic(api_key=api_key)
        prompt = f"""Extract structured learning-goal data from this text as JSON only, no prose.
Valid target_role values: {valid_roles}
Valid skill ids: {valid_skills}
Text: "{text}"
Return JSON with keys: target_role, known_skills (list of skill ids), hours_per_week (number or null),
deadline_months (number or null), learning_preference (one of "Project Based","Video","Theory First","Reading"),
experience_level (one of "Beginner","Intermediate","Advanced")."""

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = "".join(b.text for b in response.content if getattr(b, "type", "") == "text")
        cleaned = raw_text.strip().strip("`").replace("json\n", "", 1)
        parsed = json.loads(cleaned)

        graph_local = get_skill_graph()
        required = set(graph_local.role_required_skills(parsed.get("target_role", "")))
        known = [s for s in parsed.get("known_skills", []) if s in valid_skills]
        parsed["missing_skills"] = sorted(required - set(known))
        parsed["known_skills"] = known
        parsed.setdefault("hours_per_week", 6.0)
        parsed.setdefault("deadline_months", 6.0)
        parsed["confidence"] = 0.9
        parsed["method"] = "llm"
        return parsed
    except Exception:
        return None


def analyze_goal(text: str) -> dict:
    fallback = rule_based_parse(text)
    llm_result = _try_llm_parse(text)
    return llm_result or fallback
