import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Wand2 } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Button, Card, ErrorBanner, PageHeader, Spinner, Badge } from "../components/ui";

const EXAMPLE =
  "I want to become a Machine Learning Engineer. I know Python, SQL and Pandas. " +
  "I have 8 hours per week and want to be job-ready in 6 months. I prefer learning through projects.";

const KNOWN_SKILL_DEFAULT = 80;

export default function Onboarding() {
  const { userId, refreshProfile } = useApp();
  const navigate = useNavigate();
  const [text, setText] = useState(EXAMPLE);
  const [parsed, setParsed] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.analyzeGoal(text);
      setParsed(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!parsed) return;
    setSaving(true);
    setError(null);
    try {
      const skills: Record<string, number> = {};
      for (const s of parsed.known_skills) skills[s] = KNOWN_SKILL_DEFAULT;
      await api.saveProfile({
        user_id: userId,
        goal_text: text,
        target_role: parsed.target_role,
        experience_level: parsed.experience_level,
        skills,
        interests: [],
        hours_per_week: parsed.hours_per_week ?? 6,
        deadline_months: parsed.deadline_months ?? 6,
        learning_preference: parsed.learning_preference ?? "Project Based",
      });
      await refreshProfile();
      navigate("/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-12">
      <PageHeader
        title="What do you want to learn?"
        subtitle="Describe your goal in your own words. LearnPath extracts the structure — role, known skills, time budget, deadline."
      />

      <Card>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full bg-(--color-surface-2) border border-(--color-border) rounded-lg p-4 text-sm resize-none focus:outline-none focus:border-(--color-path)"
          placeholder="I want to become a..."
        />
        <div className="flex justify-end mt-3">
          <Button onClick={handleAnalyze} disabled={loading || !text.trim()}>
            <span className="flex items-center gap-2">
              <Wand2 size={15} />
              {loading ? "Analyzing..." : "Analyze goal"}
            </span>
          </Button>
        </div>
      </Card>

      {loading && <Spinner />}
      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {parsed && !loading && (
        <Card className="mt-6">
          <h3 className="font-display font-semibold mb-4">
            Here's what I understood{" "}
            <span className="text-xs font-mono text-(--color-muted) ml-1">
              ({parsed.method === "llm" ? "LLM-enhanced" : "rule-based, offline"})
            </span>
          </h3>

          <div className="space-y-4">
            <Row label="Target role">
              <span className="font-medium">{parsed.target_role}</span>
            </Row>
            <Row label="Experience level">
              <Badge tone="path">{parsed.experience_level}</Badge>
            </Row>
            <Row label="Known skills">
              <div className="flex flex-wrap gap-1.5">
                {parsed.known_skills.length === 0 && (
                  <span className="text-(--color-muted) text-sm">none detected</span>
                )}
                {parsed.known_skills.map((s: string) => (
                  <Badge key={s} tone="mastered">
                    {s.replaceAll("_", " ")}
                  </Badge>
                ))}
              </div>
            </Row>
            <Row label="Missing / to learn">
              <div className="flex flex-wrap gap-1.5">
                {parsed.missing_skills.slice(0, 10).map((s: string) => (
                  <Badge key={s} tone="gap">
                    {s.replaceAll("_", " ")}
                  </Badge>
                ))}
                {parsed.missing_skills.length > 10 && (
                  <Badge>+{parsed.missing_skills.length - 10} more</Badge>
                )}
              </div>
            </Row>
            <Row label="Availability">
              <span className="font-mono text-sm">{parsed.hours_per_week ?? "?"} hrs/week</span>
            </Row>
            <Row label="Deadline">
              <span className="font-mono text-sm">{parsed.deadline_months ?? "?"} months</span>
            </Row>
            <Row label="Learning preference">
              <span className="text-sm">{parsed.learning_preference ?? "No preference detected"}</span>
            </Row>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-(--color-border)">
            <Button onClick={handleConfirm} disabled={saving}>
              <span className="flex items-center gap-2">
                {saving ? "Building your profile..." : "Confirm & build my roadmap"}
                {!saving && <ArrowRight size={15} />}
              </span>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-3">
      <span className="text-xs uppercase tracking-wide text-(--color-muted) font-mono pt-0.5">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}
