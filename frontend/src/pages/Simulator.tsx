import { useState } from "react";
import { FlaskConical, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Card, PageHeader, Spinner, ErrorBanner, Badge, Button } from "../components/ui";

const SCENARIOS = [
  { key: "hours_per_week", label: "Change hours/week", inputType: "number", placeholder: "5" },
  { key: "deadline_months", label: "Change deadline (months)", inputType: "number", placeholder: "3" },
  { key: "target_role", label: "Change target role", inputType: "text", placeholder: "Data Scientist" },
];

export default function Simulator() {
  const { userId } = useApp();
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
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
    <div className="max-w-3xl mx-auto px-8 py-10">
      <PageHeader
        title="Roadmap Simulator"
        subtitle="Ask 'what if?' — recalculates gaps, ranking, and timeline without touching your real roadmap."
      />

      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4 text-(--color-path)">
          <FlaskConical size={16} />
          <span className="text-sm font-medium">Scenario</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setScenario(s);
                setValue("");
                setResult(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                scenario.key === s.key
                  ? "border-(--color-path) bg-(--color-path-soft) text-(--color-path)"
                  : "border-(--color-border) text-(--color-muted)"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={scenario.placeholder}
            type={scenario.inputType}
            className="flex-1 bg-(--color-surface-2) border border-(--color-border) rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-(--color-path)"
          />
          <Button onClick={run} disabled={loading || !value.trim()}>
            <span className="flex items-center gap-2">
              Simulate <ArrowRight size={14} />
            </span>
          </Button>
        </div>
      </Card>

      {loading && <Spinner />}
      {error && <ErrorBanner message={error} />}

      {result && !loading && (
        <div className="space-y-5">
          <Card>
            <h3 className="font-display font-semibold mb-3">Recalculated gap</h3>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-mono font-semibold text-(--color-path)">
                {result.gap.gap_score}
              </span>
              <span className="text-sm text-(--color-muted)">gap score (0-100, lower is better)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.gap.missing.slice(0, 8).map((s: any) => (
                <Badge key={s.skill_id} tone="gap">
                  {s.skill_name}
                </Badge>
              ))}
              {result.gap.strong.map((s: any) => (
                <Badge key={s.skill_id} tone="mastered">
                  {s.skill_name}
                </Badge>
              ))}
            </div>
          </Card>

          {result.roadmap && (
            <Card>
              <h3 className="font-display font-semibold mb-3">Recalculated roadmap</h3>
              <div className="flex items-center gap-4 text-sm mb-3">
                <span className="font-mono">{result.roadmap.total_estimated_hours}h needed</span>
                <span className="font-mono text-(--color-muted)">
                  {result.roadmap.available_hours}h available
                </span>
                {result.roadmap.over_budget && <Badge tone="gap">over budget</Badge>}
              </div>
              <div className="space-y-2">
                {result.roadmap.phases.map((p: any) => (
                  <div
                    key={p.phase_index}
                    className="flex items-center justify-between bg-(--color-surface-2) rounded-lg px-3 py-2 text-sm"
                  >
                    <span>{p.title}</span>
                    <span className="font-mono text-(--color-muted)">{p.estimated_hours}h</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
