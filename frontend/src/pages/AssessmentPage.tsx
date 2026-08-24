import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Unlock } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Card, PageHeader, Spinner, ErrorBanner, Badge, Button } from "../components/ui";

export default function AssessmentPage() {
  const { userId } = useApp();
  const [skills, setSkills] = useState<any[] | null>(null);
  const [skillId, setSkillId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.skillGap(userId).then((gap) => {
      const candidates = [...gap.partial, ...gap.missing].slice(0, 12);
      setSkills(candidates);
    });
  }, [userId]);

  async function startQuiz(id: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswers({});
    try {
      const q = await api.createAssessment(userId, id);
      setQuiz(q);
      setSkillId(id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!skillId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.submitAssessment(userId, skillId, answers);
      setResult(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!skills) return <Spinner />;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <PageHeader
        title="Assessment"
        subtitle="Test a skill. Your score updates proficiency, unlocks prerequisites, and reranks your roadmap."
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {!quiz && (
        <Card>
          <h3 className="font-display font-semibold mb-3">Pick a skill to test</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <button
                key={s.skill_id}
                onClick={() => startQuiz(s.skill_id)}
                disabled={loading}
                className="px-3 py-2 rounded-lg border border-(--color-border) text-sm hover:border-(--color-path) transition-colors"
              >
                {s.skill_name}
                <span className="ml-2 text-xs font-mono text-(--color-muted)">
                  {Math.round(s.proficiency)}%
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {loading && <Spinner />}

      {quiz && !result && !loading && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold capitalize">
              {skillId?.replaceAll("_", " ")} assessment
            </h3>
            <Badge tone="path">{quiz.difficulty}</Badge>
          </div>
          <div className="space-y-5">
            {quiz.questions.map((q: any, i: number) => (
              <div key={q.id}>
                <p className="text-sm font-medium mb-2">
                  {i + 1}. {q.question}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((opt: string) => (
                    <button
                      key={opt}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      className={`text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                        answers[q.id] === opt
                          ? "border-(--color-path) bg-(--color-path-soft)"
                          : "border-(--color-border) hover:border-(--color-muted)"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={submit} disabled={Object.keys(answers).length < quiz.questions.length}>
              Submit answers
            </Button>
          </div>
        </Card>
      )}

      {result && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            {result.score >= 60 ? (
              <CheckCircle2 className="text-(--color-mastered)" size={28} />
            ) : (
              <XCircle className="text-(--color-missing)" size={28} />
            )}
            <div>
              <div className="text-2xl font-mono font-semibold">{result.score}%</div>
              <div className="text-sm text-(--color-muted)">
                {result.num_correct}/{result.num_questions} correct
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="text-(--color-muted)">
              Proficiency: {result.previous_proficiency} →{" "}
              <span className="font-mono text-(--color-text)">{result.new_proficiency}</span>
            </span>
          </div>

          <p className="text-sm bg-(--color-surface-2) rounded-lg p-3">{result.guidance}</p>

          {result.unlocked_skills?.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-(--color-mastered) text-sm">
              <Unlock size={15} />
              Unlocked: {result.unlocked_skills.join(", ")}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setQuiz(null);
                setResult(null);
                setSkillId(null);
              }}
            >
              Test another skill
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
