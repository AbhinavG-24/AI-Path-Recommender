import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Unlock, Zap } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Spinner, ErrorBanner, Badge } from "../components/ui";

export default function AssessmentPage() {
  const { userId } = useApp();
  const [skills, setSkills]   = useState<any[] | null>(null);
  const [skillId, setSkillId] = useState<string | null>(null);
  const [quiz, setQuiz]       = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult]   = useState<any | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.skillGap(userId).then((gap) => {
      const candidates = [...gap.partial, ...gap.missing].slice(0, 12);
      setSkills(candidates);
    });
  }, [userId]);

  async function startQuiz(id: string) {
    setLoading(true); setError(null); setResult(null); setAnswers({});
    try {
      const q = await api.createAssessment(userId, id);
      setQuiz(q); setSkillId(id);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function submit() {
    if (!skillId) return;
    setLoading(true); setError(null);
    try {
      const r = await api.submitAssessment(userId, skillId, answers);
      setResult(r);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  if (!skills) return <Spinner />;

  return (
    <div className="max-w-2xl mx-auto px-10 py-16">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="mb-10 animate-fade-up">
        <h1 className="text-3xl font-display font-bold tracking-tight mb-2" style={{ color: "#FFFFFF" }}>
          Assessment
        </h1>
        <p className="text-base" style={{ color: "var(--color-muted)" }}>
          Test your skills to update your proficiency and rerank your roadmap.
        </p>
      </div>

      {error && <div className="mb-8 animate-fade-up"><ErrorBanner message={error} /></div>}

      {/* ── Skill Selector ──────────────────────────────────────────── */}
      {!quiz && (
        <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
          <h2 className="text-sm font-semibold mb-5" style={{ color: "var(--color-text)" }}>
            Select a skill to test
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {skills.map((s) => {
              const pct = Math.round(s.proficiency);
              const color = pct >= 75 ? "#00FF66" : pct >= 30 ? "#00E5FF" : "#FF0055";
              return (
                <button
                  key={s.skill_id}
                  onClick={() => startQuiz(s.skill_id)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
                  style={{
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                  }}
                >
                  {s.skill_name.replaceAll("_", " ")}
                  <span className="font-mono text-xs font-bold" style={{ color }}>
                    {pct}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading && <Spinner />}

      {/* ── Quiz ────────────────────────────────────────────────────── */}
      {quiz && !result && !loading && (
        <div className="animate-fade-up">
          <div className="flex items-center justify-between mb-8 pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <div>
              <h2 className="font-display font-bold text-2xl capitalize" style={{ color: "#FFFFFF" }}>
                {skillId?.replaceAll("_", " ")}
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--color-subtle)" }}>
                {quiz.questions.length} questions
              </p>
            </div>
            <Badge tone="path">{quiz.difficulty}</Badge>
          </div>

          <div className="space-y-10">
            {quiz.questions.map((q: any, i: number) => (
              <div key={q.id}>
                <p className="text-base font-semibold mb-4 leading-relaxed" style={{ color: "#FFFFFF" }}>
                  <span className="font-mono text-xs mr-3 tracking-widest" style={{ color: "var(--color-subtle)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {q.question}
                </p>
                <div className="grid grid-cols-1 gap-2 pl-7">
                  {q.options.map((opt: string) => {
                    const selected = answers[q.id] === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                        className="text-left px-5 py-3.5 rounded-xl text-sm transition-all"
                        style={{
                          background: selected ? "rgba(0,229,255,0.1)" : "var(--color-surface)",
                          color: selected ? "#00E5FF" : "var(--color-text)",
                          fontWeight: selected ? 600 : 400,
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-12 pt-6" style={{ borderTop: "1px solid var(--color-border)" }}>
            <button
              onClick={submit}
              disabled={Object.keys(answers).length < quiz.questions.length}
              className="px-8 py-3 rounded-full font-semibold text-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #FF0055 0%, #FF3366 100%)",
                color: "white",
              }}
            >
              Submit test
            </button>
          </div>
        </div>
      )}

      {/* ── Result ──────────────────────────────────────────────────── */}
      {result && (
        <div className="animate-fade-up">
          <div className="flex flex-col items-center text-center mb-10 pb-10" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{
                background: result.score >= 60 ? "rgba(0,255,102,0.12)" : "rgba(255,107,53,0.12)",
              }}
            >
              {result.score >= 60 ? (
                <CheckCircle2 size={36} style={{ color: "#00FF66" }} />
              ) : (
                <XCircle size={36} style={{ color: "#FF6B35" }} />
              )}
            </div>
            
            <div className="text-6xl font-mono font-bold mb-2" style={{ color: result.score >= 60 ? "#00FF66" : "#FF6B35" }}>
              {result.score}%
            </div>
            <div className="text-sm font-mono" style={{ color: "var(--color-muted)" }}>
              {result.num_correct}/{result.num_questions} correct
            </div>
          </div>

          <div className="grid gap-4 mb-8">
            <div className="rounded-2xl p-6" style={{ background: "var(--color-surface)" }}>
              <div className="flex items-center gap-3 mb-2">
                <Zap size={16} style={{ color: "#00E5FF" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Proficiency updated</span>
              </div>
              <div className="font-mono text-lg font-bold" style={{ color: "#00E5FF" }}>
                {result.previous_proficiency} <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>→</span> {result.new_proficiency}
              </div>
            </div>

            <div className="rounded-2xl p-6" style={{ background: "var(--color-surface)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {result.guidance}
              </p>
            </div>

            {result.unlocked_skills?.length > 0 && (
              <div className="rounded-2xl p-6" style={{ background: "rgba(0,255,102,0.08)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <Unlock size={16} style={{ color: "#00FF66" }} />
                  <span className="text-sm font-semibold" style={{ color: "#00FF66" }}>Unlocked</span>
                </div>
                <div className="text-sm" style={{ color: "#00FF66" }}>
                  {result.unlocked_skills.join(", ")}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => { setQuiz(null); setResult(null); setSkillId(null); }}
              className="px-6 py-2.5 rounded-full font-semibold text-sm transition-all hover:bg-white/10"
              style={{ color: "var(--color-text)" }}
            >
              Test another skill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
