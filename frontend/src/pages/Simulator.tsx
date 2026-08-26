import { useState } from "react";
import { FlaskConical, ArrowRight, Zap } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Spinner, ErrorBanner, Badge } from "../components/ui";

const SCENARIOS = [
  { key: "hours_per_week",    label: "Hours / week",       inputType: "number", placeholder: "5" },
  { key: "deadline_months",   label: "Deadline (months)",  inputType: "number", placeholder: "3" },
  { key: "target_role",       label: "Target role",        inputType: "text",   placeholder: "Data Scientist" },
];

export default function Simulator() {
  const { userId } = useApp();
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [value, setValue]       = useState("");
  const [result, setResult]     = useState<any | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function run() {
    if (!value.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const parsedValue = scenario.inputType === "number" ? Number(value) : value;
      const res = await api.simulate(userId, { [scenario.key]: parsedValue });
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-10 py-16">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="mb-10 animate-fade-up">
        <h1 className="text-3xl font-display font-bold tracking-tight mb-2" style={{ color: "#FFFFFF" }}>
          Simulator
        </h1>
        <p className="text-base" style={{ color: "var(--color-muted)" }}>
          Ask "what if?" to recalculate gaps and timelines without changing your real roadmap.
        </p>
      </div>

      {/* ── Scenario Picker ─────────────────────────────────────────── */}
      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="flex flex-wrap gap-2 mb-6">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              onClick={() => { setScenario(s); setValue(""); setResult(null); }}
              className={`pill-btn ${scenario.key === s.key ? "active" : ""}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mb-10">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={scenario.placeholder}
            type={scenario.inputType}
            className="flex-1 text-base px-5 py-4 rounded-2xl outline-none transition-all"
            style={{
              background: "var(--color-surface)",
              color: "var(--color-text)",
            }}
            onFocus={e => (e.currentTarget.style.boxShadow = "0 0 0 1px #FF6B35")}
            onBlur={e => (e.currentTarget.style.boxShadow = "none")}
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
          <button
            onClick={run}
            disabled={loading || !value.trim()}
            className="flex items-center justify-center w-14 rounded-2xl transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #FF6B35 0%, #FF8C60 100%)",
              color: "white",
            }}
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {loading && <Spinner />}
      {error && <ErrorBanner message={error} />}

      {/* ── Results ─────────────────────────────────────────────────── */}
      {result && !loading && (
        <div className="space-y-6 animate-fade-up" style={{ animationDelay: "120ms" }}>
          {/* Gap result */}
          <div className="rounded-3xl p-8" style={{ background: "var(--color-surface)" }}>
            <div className="flex items-center gap-3 mb-6">
              <Zap size={18} style={{ color: "#00E5FF" }} />
              <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                Recalculated Gap
              </h2>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center gap-8 mb-8">
              <div className="shrink-0">
                <div
                  className="text-6xl font-mono font-bold leading-none mb-1"
                  style={{ color: result.gap.gap_score > 50 ? "#FF0055" : "#00FF66" }}
                >
                  {result.gap.gap_score}
                </div>
                <div className="text-xs font-mono tracking-widest uppercase" style={{ color: "var(--color-subtle)" }}>
                  Gap Score
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
                  A lower score means you are closer to the requirements of the role.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {result.gap.missing.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--color-subtle)" }}>Missing Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.gap.missing.slice(0, 8).map((s: any) => (
                      <Badge key={s.skill_id} tone="path">{s.skill_name.replaceAll("_", " ")}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {result.gap.strong.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--color-subtle)" }}>Strong Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.gap.strong.slice(0, 8).map((s: any) => (
                      <Badge key={s.skill_id} tone="mastered">{s.skill_name.replaceAll("_", " ")}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Roadmap result */}
          {result.roadmap && (
            <div className="rounded-3xl p-8" style={{ background: "var(--color-surface)" }}>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                  Timeline Impact
                </h2>
                {result.roadmap.over_budget && <Badge tone="missing">Over budget</Badge>}
              </div>
              
              <div className="flex items-end gap-3 mb-8 pb-8" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <div>
                  <div className="font-mono font-bold text-4xl leading-none mb-1" style={{ color: result.roadmap.over_budget ? "#FF0055" : "#00FF66" }}>
                    {result.roadmap.total_estimated_hours}h
                  </div>
                  <div className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--color-subtle)" }}>Needed</div>
                </div>
                <div className="text-xl px-2 pb-1" style={{ color: "var(--color-border)" }}>/</div>
                <div>
                  <div className="font-mono font-bold text-2xl leading-none mb-1" style={{ color: "var(--color-text)" }}>
                    {result.roadmap.available_hours}h
                  </div>
                  <div className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--color-subtle)" }}>Available</div>
                </div>
              </div>

              <div className="space-y-1">
                {result.roadmap.phases.map((p: any) => (
                  <div
                    key={p.phase_index}
                    className="flex items-center justify-between py-3"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                  >
                    <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{p.title}</span>
                    <span className="font-mono text-sm" style={{ color: "var(--color-muted)" }}>{p.estimated_hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
