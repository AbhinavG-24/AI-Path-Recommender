"""
Assessment Engine.

Generates short skill-check quizzes deterministically from a per-skill
question bank (no LLM required) and scores submitted answers into a 0-100
proficiency figure with a simple, explainable formula:

    score = 100 * num_correct / num_questions
"""
import random
import hashlib

from ml.skill_graph import get_skill_graph

# A compact hand-authored question bank covering representative skills.
# Each question: text, type, options (for MCQ), correct answer.
QUESTION_BANK = {
    "python": [
        {"q": "What does `len([1,2,3])` return?", "type": "mcq", "options": ["2", "3", "4", "Error"], "answer": "3"},
        {"q": "Which keyword defines a function in Python?", "type": "mcq", "options": ["func", "def", "function", "lambda"], "answer": "def"},
        {"q": "What is the output type of `3 / 2` in Python 3?", "type": "mcq", "options": ["int", "float", "str", "Error"], "answer": "float"},
        {"q": "Which data structure is ordered and mutable: list or tuple?", "type": "mcq", "options": ["list", "tuple", "both", "neither"], "answer": "list"},
        {"q": "What does `range(3)` produce?", "type": "mcq", "options": ["0,1,2", "1,2,3", "0,1,2,3", "1,2"], "answer": "0,1,2"},
    ],
    "statistics": [
        {"q": "What does the mean measure?", "type": "mcq", "options": ["Central tendency", "Spread", "Skewness", "Correlation"], "answer": "Central tendency"},
        {"q": "What does standard deviation measure?", "type": "mcq", "options": ["Central tendency", "Spread", "Median", "Mode"], "answer": "Spread"},
        {"q": "A p-value below the significance threshold suggests?", "type": "mcq", "options": ["Reject null hypothesis", "Accept null hypothesis", "No conclusion", "Increase sample size"], "answer": "Reject null hypothesis"},
        {"q": "Which measure is robust to outliers?", "type": "mcq", "options": ["Mean", "Median", "Range", "Variance"], "answer": "Median"},
        {"q": "What does correlation measure?", "type": "mcq", "options": ["Linear relationship", "Causation", "Variance", "Central tendency"], "answer": "Linear relationship"},
    ],
    "machine_learning_fundamentals": [
        {"q": "What is overfitting?", "type": "mcq", "options": ["Model fits training data too closely and generalizes poorly", "Model underperforms on training data", "Model trains too slowly", "Model has too few parameters"], "answer": "Model fits training data too closely and generalizes poorly"},
        {"q": "What is the purpose of a train/test split?", "type": "mcq", "options": ["Estimate generalization performance", "Speed up training", "Reduce data size", "Improve accuracy automatically"], "answer": "Estimate generalization performance"},
        {"q": "Which is a supervised learning task?", "type": "mcq", "options": ["Classification", "Clustering", "Dimensionality reduction", "Anomaly detection without labels"], "answer": "Classification"},
        {"q": "What does 'loss function' measure?", "type": "mcq", "options": ["Error between predictions and true values", "Training speed", "Model size", "Data quality"], "answer": "Error between predictions and true values"},
        {"q": "What is regularization used for?", "type": "mcq", "options": ["Preventing overfitting", "Speeding up inference", "Cleaning data", "Visualizing results"], "answer": "Preventing overfitting"},
    ],
    "regression": [
        {"q": "Linear regression predicts what kind of target?", "type": "mcq", "options": ["Continuous", "Categorical", "Binary only", "Text"], "answer": "Continuous"},
        {"q": "Which metric is commonly used to evaluate regression?", "type": "mcq", "options": ["RMSE", "Accuracy", "Precision", "F1 score"], "answer": "RMSE"},
        {"q": "What does R-squared represent?", "type": "mcq", "options": ["Proportion of variance explained", "Model speed", "Number of features", "Error count"], "answer": "Proportion of variance explained"},
        {"q": "Multicollinearity refers to?", "type": "mcq", "options": ["High correlation between predictors", "Missing data", "Non-linear targets", "Small sample size"], "answer": "High correlation between predictors"},
    ],
    "classification": [
        {"q": "What does precision measure?", "type": "mcq", "options": ["True positives / predicted positives", "True positives / actual positives", "Overall accuracy", "Error rate"], "answer": "True positives / predicted positives"},
        {"q": "What does recall measure?", "type": "mcq", "options": ["True positives / actual positives", "True positives / predicted positives", "Overall accuracy", "F1 score"], "answer": "True positives / actual positives"},
        {"q": "Which algorithm is a classic classifier?", "type": "mcq", "options": ["Logistic Regression", "Linear Regression", "K-Means", "PCA"], "answer": "Logistic Regression"},
        {"q": "What is a confusion matrix used for?", "type": "mcq", "options": ["Summarizing classification performance", "Reducing dimensions", "Clustering data", "Feature scaling"], "answer": "Summarizing classification performance"},
    ],
    "neural_networks": [
        {"q": "What is backpropagation used for?", "type": "mcq", "options": ["Computing gradients to update weights", "Initializing weights", "Normalizing inputs", "Selecting features"], "answer": "Computing gradients to update weights"},
        {"q": "What does an activation function introduce?", "type": "mcq", "options": ["Non-linearity", "More data", "Faster I/O", "Regularization only"], "answer": "Non-linearity"},
        {"q": "What is a common cause of vanishing gradients?", "type": "mcq", "options": ["Saturating activations in deep networks", "Too much data", "Too few layers", "High learning rate only"], "answer": "Saturating activations in deep networks"},
        {"q": "What does a learning rate control?", "type": "mcq", "options": ["Step size of weight updates", "Number of layers", "Batch size", "Number of epochs directly"], "answer": "Step size of weight updates"},
    ],
    "docker": [
        {"q": "What is a Docker image?", "type": "mcq", "options": ["A blueprint for creating containers", "A running process", "A virtual machine", "A network protocol"], "answer": "A blueprint for creating containers"},
        {"q": "What command builds an image from a Dockerfile?", "type": "mcq", "options": ["docker build", "docker run", "docker start", "docker compose"], "answer": "docker build"},
        {"q": "What is the purpose of docker-compose?", "type": "mcq", "options": ["Orchestrate multiple containers", "Compile code", "Manage git branches", "Train ML models"], "answer": "Orchestrate multiple containers"},
    ],
    "sql": [
        {"q": "Which clause filters rows before aggregation?", "type": "mcq", "options": ["WHERE", "HAVING", "GROUP BY", "ORDER BY"], "answer": "WHERE"},
        {"q": "Which clause filters after aggregation?", "type": "mcq", "options": ["HAVING", "WHERE", "SELECT", "FROM"], "answer": "HAVING"},
        {"q": "Which JOIN returns unmatched rows from both tables?", "type": "mcq", "options": ["FULL OUTER JOIN", "INNER JOIN", "LEFT JOIN", "CROSS JOIN"], "answer": "FULL OUTER JOIN"},
        {"q": "What does GROUP BY do?", "type": "mcq", "options": ["Groups rows sharing a value for aggregation", "Sorts rows", "Filters rows", "Joins tables"], "answer": "Groups rows sharing a value for aggregation"},
    ],
}

GENERIC_TEMPLATE = [
    {"q": "How confident are you applying {skill} without guidance?", "type": "mcq",
     "options": ["Not confident", "Somewhat confident", "Confident", "Very confident"], "answer": "Confident"},
    {"q": "Have you completed a hands-on exercise involving {skill}?", "type": "mcq",
     "options": ["Never", "Once", "A few times", "Regularly"], "answer": "A few times"},
    {"q": "Could you explain {skill} to a beginner right now?", "type": "mcq",
     "options": ["No", "Partially", "Mostly", "Fully"], "answer": "Mostly"},
]


def _questions_for_skill(skill_id: str, num_questions: int):
    graph = get_skill_graph()
    skill_name = graph.skill_name(skill_id)
    bank = QUESTION_BANK.get(skill_id)
    if not bank:
        # deterministic generic self-assessment questions for skills without a curated bank
        bank = [
            {**q, "q": q["q"].format(skill=skill_name)} for q in GENERIC_TEMPLATE
        ]

    # deterministic shuffle per skill so results are stable/reproducible but varied across skills
    seed = int(hashlib.sha256(skill_id.encode()).hexdigest(), 16) % (2**32)
    rng = random.Random(seed)
    pool = bank.copy()
    rng.shuffle(pool)
    selected = pool[: min(num_questions, len(pool))]

    questions = []
    correct_answers = {}
    for i, item in enumerate(selected):
        qid = f"{skill_id}_q{i+1}"
        questions.append({"id": qid, "question": item["q"], "type": item["type"], "options": item.get("options")})
        correct_answers[qid] = item["answer"]
    return questions, correct_answers


def generate_assessment(skill_id: str, difficulty: str = "intermediate", num_questions: int = 5):
    questions, correct_answers = _questions_for_skill(skill_id, num_questions)
    return {
        "skill_id": skill_id,
        "difficulty": difficulty,
        "questions": questions,
    }, correct_answers


def score_submission(answers: dict, correct_answers: dict):
    total = len(correct_answers)
    correct = sum(1 for qid, expected in correct_answers.items() if answers.get(qid) == expected)
    score = round(100 * correct / total, 1) if total else 0.0
    return score, correct, total


def guidance_for_score(score: float) -> str:
    if score >= 80:
        return "Strong result — you're ready to progress to the next prerequisite stage."
    if score >= 60:
        return "Solid grasp, but a bit more practice will make this skill reliable before moving on."
    if score >= 40:
        return "Partial understanding — revisit the core material and redo the exercises before advancing."
    return "This skill needs focused revision. We'll surface easier resources and a retry before unlocking dependents."
