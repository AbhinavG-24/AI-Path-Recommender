import { useState, type ReactNode, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Wand2, Plus } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Spinner, Badge } from "../components/ui";

const EXAMPLE =
  "I want to become a Machine Learning Engineer. I know Python, SQL and Pandas. " +
  "I have 8 hours per week and want to be job-ready in 6 months. I prefer learning through projects.";

const KNOWN_SKILL_DEFAULT = 80;

const ROLES = ["Machine Learning Engineer", "Data Scientist", "Data Analyst"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const PREFS = ["Project Based", "Video Courses", "Reading", "Mixed"];

// ─── Segment Button ───────────────────────────────────────────────────────────
function SegmentGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`pill-btn capitalize ${value === opt ? "active" : ""}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Tag Editor ───────────────────────────────────────────────────────────────
function TagEditor({
  tags,
  onChange,
  tone,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  tone: "mastered" | "gap";
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag() {
    const v = input.trim().toLowerCase().replace(/\s+/g, "_");
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((t) => (
        <Badge key={t} tone={tone} onRemove={() => onChange(tags.filter((x) => x !== t))}>
          {t.replaceAll("_", " ")}
        </Badge>
      ))}
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addTag(); }
          }}
          placeholder="Add skill..."
          className="px-3 py-1 rounded-full text-xs w-28 focus:outline-none transition-colors"
          style={{
            background: "var(--color-surface-3)",
            color: "var(--color-text)",
          }}
        />
        <button
          type="button"
          onClick={addTag}
          className="w-6 h-6 flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
          style={{ background: "#3A3A3C", color: "white" }}
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Editable Row ─────────────────────────────────────────────────────────────
function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-4 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
      <span className="text-sm font-medium" style={{ color: "var(--color-muted)" }}>
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

// ─── Main Onboarding Page ─────────────────────────────────────────────────────
export default function Onboarding() {
  const { userId, refreshProfile } = useApp();
  const navigate = useNavigate();

  const [text, setText] = useState(EXAMPLE);
  const [parsed, setParsed] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable parsed fields
  const [editRole, setEditRole] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editKnown, setEditKnown] = useState<string[]>([]);
  const [editMissing, setEditMissing] = useState<string[]>([]);
  const [editHours, setEditHours] = useState<number>(6);
  const [editMonths, setEditMonths] = useState<number>(6);
  const [editPref, setEditPref] = useState("");

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.analyzeGoal(text);
      setParsed(result);
      setEditRole(result.target_role ?? "Machine Learning Engineer");
      setEditLevel(result.experience_level ?? "beginner");
      setEditKnown(result.known_skills ?? []);
      setEditMissing(result.missing_skills ?? []);
      setEditHours(result.hours_per_week ?? 6);
      setEditMonths(result.deadline_months ?? 6);
      setEditPref(result.learning_preference ?? "Mixed");
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
      for (const s of editKnown) skills[s] = KNOWN_SKILL_DEFAULT;
      await api.saveProfile({
        user_id: userId,
        goal_text: text,
        target_role: editRole,
        experience_level: editLevel,
        skills,
        interests: [],
        hours_per_week: editHours,
        deadline_months: editMonths,
        learning_preference: editPref,
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
    <div className="min-h-screen py-16" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-3xl mx-auto px-10">
        
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-10 animate-fade-up">
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2" style={{ color: "#FFFFFF" }}>
            Set your goal
          </h1>
          <p className="text-base" style={{ color: "var(--color-muted)" }}>
            Describe what you want to achieve. We'll extract your target role, known skills, and constraints.
          </p>
        </div>

        {/* ── Input ───────────────────────────────────────────────────── */}
        <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div
            className="rounded-2xl p-6 mb-8"
            style={{ background: "var(--color-surface)" }}
          >
            <textarea
              id="goal-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full text-base resize-none focus:outline-none bg-transparent"
              placeholder="I want to become a..."
              style={{ color: "var(--color-text)" }}
            />
            <div className="flex justify-end mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
              <button
                onClick={handleAnalyze}
                disabled={loading || !text.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #FF0055 0%, #FF3366 100%)",
                  color: "white",
                  boxShadow: "0 4px 20px rgba(255,0,85,0.4)",
                }}
              >
                {loading ? <Spinner /> : <Wand2 size={16} />}
                {loading ? "Analyzing..." : "Analyze"}
              </button>
            </div>
          </div>
        </div>

        {error && <div className="text-sm px-4 py-3 rounded-xl mb-6 bg-red-950/30 text-red-400 border border-red-900/50">{error}</div>}

        {/* ── Review & Edit ───────────────────────────────────────────── */}
        {parsed && !loading && (
          <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
            <h2 className="text-xl font-display font-bold tracking-tight mb-6" style={{ color: "#FFFFFF" }}>
              Review your profile
            </h2>

            <div className="rounded-2xl p-6 mb-8" style={{ background: "var(--color-surface)" }}>
              <div className="space-y-1">
                <Row label="Target role">
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="px-3 py-2 rounded-lg text-sm focus:outline-none w-64"
                    style={{ background: "var(--color-surface-3)", color: "var(--color-text)" }}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Row>

                <Row label="Experience">
                  <SegmentGroup options={LEVELS} value={editLevel} onChange={setEditLevel} />
                </Row>

                <Row label="Known skills">
                  <TagEditor tags={editKnown} onChange={setEditKnown} tone="mastered" />
                </Row>

                <Row label="To learn">
                  <TagEditor tags={editMissing} onChange={setEditMissing} tone="gap" />
                </Row>

                <Row label="Availability">
                  <div className="flex items-center gap-3">
                    <input
                      type="number" min={1} max={80}
                      value={editHours}
                      onChange={(e) => setEditHours(Number(e.target.value))}
                      className="w-16 px-3 py-1.5 rounded-lg text-sm text-center focus:outline-none"
                      style={{ background: "var(--color-surface-3)", color: "var(--color-text)" }}
                    />
                    <span className="text-sm" style={{ color: "var(--color-muted)" }}>hrs / week</span>
                  </div>
                </Row>

                <Row label="Deadline">
                  <div className="flex items-center gap-3">
                    <input
                      type="number" min={1} max={36}
                      value={editMonths}
                      onChange={(e) => setEditMonths(Number(e.target.value))}
                      className="w-16 px-3 py-1.5 rounded-lg text-sm text-center focus:outline-none"
                      style={{ background: "var(--color-surface-3)", color: "var(--color-text)" }}
                    />
                    <span className="text-sm" style={{ color: "var(--color-muted)" }}>months</span>
                  </div>
                </Row>

                <Row label="Preference">
                  <SegmentGroup options={PREFS} value={editPref} onChange={setEditPref} />
                </Row>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-base transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, #00E5FF 0%, #00BFEA 100%)",
                    color: "#000000",
                    boxShadow: "0 6px 24px rgba(0,229,255,0.3)",
                  }}
                >
                  {saving ? "Building..." : "Confirm profile"}
                  {!saving && <ArrowRight size={16} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
