import { useEffect, useState } from "react";
import { ChevronDown, ThumbsUp, ThumbsDown, Gauge, Zap } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Card, PageHeader, ProgressBar, Spinner, ErrorBanner, Badge, Button } from "../components/ui";

const FACTOR_LABELS: Record<string, string> = {
  goal_similarity: "Goal similarity",
  skill_gap_coverage: "Skill-gap coverage",
  prerequisite_score: "Prerequisite match",
  semantic_similarity: "Semantic similarity",
  difficulty_match: "Difficulty match",
  preference_match: "Preference match",
  time_match: "Time compatibility",
  interest_match: "Interest match",
};

const FEEDBACK_OPTIONS = [
  { signal: "useful", label: "Useful" },
  { signal: "too_difficult", label: "Too difficult" },
  { signal: "too_easy", label: "Too easy" },
  { signal: "already_know", label: "Already know" },
  { signal: "not_interested", label: "Not interested" },
];

export default function Recommendations() {
  const { userId } = useApp();
  const [recs, setRecs] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, string>>({});

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

  if (error) return <div className="p-8"><ErrorBanner message={error} /></div>;
  if (!recs) return <Spinner />;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <PageHeader
        title="Recommended for you"
        subtitle="Ranked by a hybrid engine: TF-IDF + BM25 + semantic retrieval, then scored on 8 weighted factors."
      />

      <div className="space-y-3">
        {recs.map((r) => {
          const isOpen = expanded === r.resource_id;
          const given = feedbackGiven[r.resource_id];
          return (
            <Card key={r.resource_id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-semibold truncate">{r.title}</h3>
                    <Badge>{r.resource_type}</Badge>
                  </div>
                  <p className="text-sm text-(--color-muted)">{r.reason}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-mono font-semibold text-(--color-path)">
                    {r.overall_score}
                  </div>
                  <div className="text-xs text-(--color-muted) font-mono">score</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => setExpanded(isOpen ? null : r.resource_id)}
                  className="flex items-center gap-1 text-xs text-(--color-path) hover:underline"
                >
                  <Gauge size={13} />
                  Why this?
                  <ChevronDown
                    size={13}
                    className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <div className="flex items-center gap-1.5">
                  {FEEDBACK_OPTIONS.slice(0, 2).map((opt) => (
                    <button
                      key={opt.signal}
                      onClick={() => sendFeedback(r.resource_id, opt.signal)}
                      className={`p-1.5 rounded-md transition-colors ${
                        given === opt.signal
                          ? "bg-(--color-path-soft) text-(--color-path)"
                          : "text-(--color-muted) hover:text-(--color-text) hover:bg-(--color-surface-2)"
                      }`}
                      title={opt.label}
                    >
                      {opt.signal === "useful" ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 pt-4 border-t border-(--color-border) space-y-2.5">
                  {Object.entries(FACTOR_LABELS).map(([key, label]) => {
                    const val = (r[key] ?? 0) * 100;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-(--color-muted)">{label}</span>
                          <span className="font-mono">{Math.round(val)}</span>
                        </div>
                        <ProgressBar value={val} tone="path" />
                      </div>
                    );
                  })}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {FEEDBACK_OPTIONS.map((opt) => (
                      <Button
                        key={opt.signal}
                        variant={given === opt.signal ? "primary" : "outline"}
                        className="!px-2.5 !py-1 !text-xs"
                        onClick={() => sendFeedback(r.resource_id, opt.signal)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {recs.length === 0 && (
        <Card>
          <div className="flex items-center gap-2 text-(--color-muted)">
            <Zap size={16} />
            No recommendations yet — build your profile first.
          </div>
        </Card>
      )}
    </div>
  );
}
