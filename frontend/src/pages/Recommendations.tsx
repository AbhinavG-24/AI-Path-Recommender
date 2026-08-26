import { useEffect, useState } from "react";
import { ChevronDown, ThumbsUp, ThumbsDown, Gauge, Zap, BookOpen, Video, Layers, FileText } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { ProgressBar, Spinner, ErrorBanner, Badge } from "../components/ui";

const FACTOR_LABELS: Record<string, string> = {
  goal_similarity:    "Goal similarity",
  skill_gap_coverage: "Skill-gap coverage",
  prerequisite_score: "Prerequisite match",
  semantic_similarity:"Semantic similarity",
  difficulty_match:   "Difficulty match",
  preference_match:   "Preference match",
  time_match:         "Time compatibility",
  interest_match:     "Interest match",
};

const FEEDBACK_OPTIONS = [
  { signal: "useful",        label: "Useful" },
  { signal: "too_difficult", label: "Too difficult" },
  { signal: "too_easy",      label: "Too easy" },
  { signal: "already_know",  label: "Already know" },
  { signal: "not_interested",label: "Not interested" },
];

const FILTER_TYPES = ["All", "Video", "Course", "Article", "Project"];

function typeIcon(type: string) {
  switch ((type ?? "").toLowerCase()) {
    case "video":   return <Video size={13} />;
    case "course":  return <Layers size={13} />;
    case "article": return <FileText size={13} />;
    case "project": return <Zap size={13} />;
    default:        return <BookOpen size={13} />;
  }
}

export default function Recommendations() {
  const { userId } = useApp();
  const [recs, setRecs]             = useState<any[] | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter]   = useState("All");

  useEffect(() => {
    api
      .recommendations(userId, 10)
      .then((d) => setRecs(d.recommendations))
      .catch((e) => setError(e.message));
  }, [userId]);

  async function sendFeedback(resourceId: string, signal: string) {
    setFeedbackGiven((prev) => ({ ...prev, [resourceId]: signal }));
    try {
      await api.feedback(userId, resourceId, signal);
    } catch {
      /* demo: keep optimistic UI even on failure */
    }
  }

  if (error) return <div className="p-10"><ErrorBanner message={error} /></div>;
  if (!recs) return <Spinner />;

  const filtered = activeFilter === "All"
    ? recs
    : recs.filter((r) => r.resource_type?.toLowerCase() === activeFilter.toLowerCase());

  return (
    <div className="max-w-3xl mx-auto px-10 py-16">
      <div className="animate-fade-up">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-10">
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2" style={{ color: "#FFFFFF" }}>Recommended</h1>
          <p className="text-base" style={{ color: "var(--color-muted)" }}>
            Hybrid-ranked by TF-IDF, BM25, and semantic retrieval based on your active skill gaps.
          </p>
        </div>

        {/* ── Filter Pills ────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-10">
          {FILTER_TYPES.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`pill-btn shrink-0 ${activeFilter === f ? "active" : ""}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Rec Cards ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {filtered.map((r, idx) => {
          const isOpen  = expanded === r.resource_id;
          const given   = feedbackGiven[r.resource_id];
          const score   = r.overall_score ?? 0;
          const scoreColor =
            score >= 80 ? "#00FF66" :
            score >= 60 ? "#00E5FF" :
            "#FF0055";

          return (
            <div
              key={r.resource_id}
              className="rounded-3xl transition-all duration-200 animate-fade-up"
              style={{
                background: "var(--color-surface)",
                animationDelay: `${idx * 40}ms`,
              }}
            >
              <div className="p-8">
                <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    {/* Meta */}
                    <div className="flex items-center gap-3 mb-4">
                      <span
                        className="flex items-center gap-1.5 text-xs font-mono font-medium tracking-wide uppercase"
                        style={{ color: "var(--color-subtle)" }}
                      >
                        {typeIcon(r.resource_type)}
                        {r.resource_type}
                      </span>
                      <Badge tone="gap">{r.difficulty ?? "—"}</Badge>
                    </div>
                    {/* Title */}
                    <h3 className="font-display font-semibold text-xl leading-snug mb-3" style={{ color: "#FFFFFF" }}>
                      {r.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
                      {r.reason}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="shrink-0 flex items-center md:flex-col gap-3 md:gap-1">
                    <div className="text-4xl font-mono font-bold leading-none" style={{ color: scoreColor }}>
                      {Math.round(score)}
                    </div>
                    <div className="text-xs font-mono tracking-widest uppercase" style={{ color: "var(--color-subtle)" }}>match</div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between mt-6 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : r.resource_id)}
                    className="flex items-center gap-2 text-sm font-semibold transition-all hover:brightness-110"
                    style={{ color: "#00E5FF" }}
                  >
                    <Gauge size={14} />
                    Breakdown
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  <div className="flex items-center gap-2">
                    {FEEDBACK_OPTIONS.slice(0, 2).map((opt) => (
                      <button
                        key={opt.signal}
                        onClick={() => sendFeedback(r.resource_id, opt.signal)}
                        className="p-2 rounded-xl transition-all duration-200"
                        style={
                          given === opt.signal
                            ? { background: "rgba(255,0,85,0.1)", color: "#FF0055" }
                            : { color: "var(--color-muted)" }
                        }
                        onMouseEnter={e => { if (given !== opt.signal) (e.currentTarget as HTMLElement).style.color = "#FFFFFF"; }}
                        onMouseLeave={e => { if (given !== opt.signal) (e.currentTarget as HTMLElement).style.color = "var(--color-muted)"; }}
                        title={opt.label}
                      >
                        {opt.signal === "useful" ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expanded score breakdown */}
              {isOpen && (
                <div className="px-8 pb-8">
                  <div className="space-y-4 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                    {Object.entries(FACTOR_LABELS).map(([key, label]) => {
                      const val = (r[key] ?? 0) * 100;
                      if (val === 0) return null;
                      const tone = val >= 70 ? "mastered" : val >= 40 ? "gap" : "path";
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-sm mb-2">
                            <span style={{ color: "var(--color-text)" }}>{label}</span>
                            <span className="font-mono font-bold" style={{ color: tone === "mastered" ? "#00FF66" : tone === "gap" ? "#00E5FF" : "#FF0055" }}>
                              {Math.round(val)}
                            </span>
                          </div>
                          <ProgressBar value={val} tone={tone} />
                        </div>
                      );
                    })}
                    <div className="flex flex-wrap gap-2 mt-6">
                      {FEEDBACK_OPTIONS.map((opt) => (
                        <button
                          key={opt.signal}
                          onClick={() => sendFeedback(r.resource_id, opt.signal)}
                          className="px-4 py-2 rounded-full text-xs font-medium transition-all duration-200"
                          style={
                            given === opt.signal
                              ? { background: "rgba(255,0,85,0.1)", color: "#FF0055" }
                              : { background: "var(--color-surface-2)", color: "var(--color-muted)" }
                          }
                          onMouseEnter={e => { if (given !== opt.signal) (e.currentTarget as HTMLElement).style.background = "var(--color-surface-3)"; }}
                          onMouseLeave={e => { if (given !== opt.signal) (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Zap size={32} className="mx-auto mb-4" style={{ color: "var(--color-subtle)" }} />
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            {recs.length === 0
              ? "No recommendations yet — build your profile first."
              : `No ${activeFilter} resources found. Try a different filter.`}
          </p>
        </div>
      )}
    </div>
  );
}
