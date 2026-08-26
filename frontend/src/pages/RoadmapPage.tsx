import React, { useEffect, useState } from "react";
import {
  Flag, Clock, CheckCircle2, Circle, ChevronRight, BookOpen, Video,
  FileText, Layers, ExternalLink, Star, Zap, BarChart2, RefreshCw,
  Trophy, Lock, PlayCircle,
} from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Spinner, ErrorBanner, Badge, ProgressBar } from "../components/ui";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function resourceIcon(type: string) {
  switch ((type ?? "").toLowerCase()) {
    case "video":   return <Video size={14} />;
    case "course":  return <Layers size={14} />;
    case "article": return <FileText size={14} />;
    case "project": return <Zap size={14} />;
    default:        return <BookOpen size={14} />;
  }
}

function difficultyColor(d: string) {
  switch ((d ?? "").toLowerCase()) {
    case "beginner":     return "#00FF66";
    case "intermediate": return "#00E5FF";
    case "advanced":     return "#FF0055";
    default:             return "var(--color-muted)";
  }
}

function scoreGrade(score: number) {
  if (score >= 80) return { label: "Excellent", color: "#00FF66" };
  if (score >= 60) return { label: "Good",      color: "#00E5FF" };
  return              { label: "Fair",      color: "#FF0055" };
}

// ─── Resource Detail Panel ───────────────────────────────────────────────────
function ResourcePanel({
  resource,
  onComplete,
  completing,
}: {
  resource: any;
  onComplete: (id: string) => void;
  completing: string | null;
}) {
  if (!resource) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-12">
        <PlayCircle size={32} style={{ color: "var(--color-surface-3)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--color-muted)" }}>
          Select a resource to see details
        </p>
      </div>
    );
  }

  const grade = scoreGrade(resource.overall_score ?? 0);

  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
      {/* Title & meta */}
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono mb-3" style={{ color: "var(--color-subtle)" }}>
          <span className="flex items-center gap-1">
            {resourceIcon(resource.resource_type)}
            {resource.resource_type}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1"><Clock size={12} />{resource.duration_hours}h</span>
          <span>·</span>
          <span style={{ color: difficultyColor(resource.difficulty) }}>
            {resource.difficulty}
          </span>
        </div>
        
        <div className="flex items-start justify-between gap-4 mb-2">
          <h2 className="font-display font-semibold text-2xl leading-tight" style={{ color: "var(--color-text)" }}>
            {resource.title}
          </h2>
          <button
            onClick={() => onComplete(resource.resource_id)}
            disabled={completing === resource.resource_id}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-50"
            style={{ background: "#00FF66", color: "#000000" }}
          >
            <CheckCircle2 size={14} />
            {completing === resource.resource_id ? "Saving" : "Mark done"}
          </button>
        </div>
      </div>

      {/* Score ring + grade */}
      <div className="flex items-center gap-4 py-5" style={{ borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 64 64" className="-rotate-90 w-14 h-14">
            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-surface-3)" strokeWidth="4" />
            <circle
              cx="32" cy="32" r="26" fill="none"
              stroke={grade.color} strokeWidth="4"
              strokeDasharray={`${(resource.overall_score / 100) * 163.4} 163.4`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.34,1.2,0.64,1)" }}
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center font-mono font-bold text-sm"
            style={{ color: "var(--color-text)" }}
          >
            {Math.round(resource.overall_score ?? 0)}
          </span>
        </div>
        <div>
          <div className="font-semibold text-sm" style={{ color: grade.color }}>{grade.label} match</div>
          <div className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
            Relevance score out of 100
          </div>
        </div>
      </div>

      {/* Why this resource */}
      {resource.reason && (
        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text)" }}>Why this?</h3>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
            {resource.reason}
          </p>
        </div>
      )}

      {/* Score breakdown */}
      {resource.score_breakdown && (
        <div className="mt-2">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text)" }}>Score breakdown</h3>
          <div className="space-y-3">
            {Object.entries(resource.score_breakdown).map(([key, val]: [string, any]) => (
              <ProgressBar
                key={key}
                label={key.replaceAll("_", " ")}
                value={Math.round((val as number) * 100)}
                tone={val >= 0.7 ? "mastered" : val >= 0.4 ? "gap" : "path"}
                animate
              />
            ))}
          </div>
        </div>
      )}

      {/* Skills & Prerequisites */}
      <div className="grid grid-cols-2 gap-6 mt-4">
        {resource.skills?.length > 0 && (
          <div>
            <h3 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--color-subtle)" }}>Skills covered</h3>
            <div className="flex flex-wrap gap-1.5">
              {resource.skills.map((s: string) => (
                <Badge key={s} tone="mastered">{s.replaceAll("_", " ")}</Badge>
              ))}
            </div>
          </div>
        )}
        {resource.prerequisites?.length > 0 && (
          <div>
            <h3 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--color-subtle)" }}>Prerequisites</h3>
            <div className="flex flex-wrap gap-1.5">
              {resource.prerequisites.map((p: string) => (
                <Badge key={p} tone="gap">{p.replaceAll("_", " ")}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Open resource link */}
      {resource.url && (
        <div className="mt-8">
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
              border: "1px solid var(--color-border)"
            }}
          >
            <ExternalLink size={14} /> Open external resource
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Phase Timeline (left panel) ─────────────────────────────────────────────
function PhaseTracker({
  phases,
  activePhaseIdx,
  activeResourceId,
  completing,
  onSelectPhase,
  onSelectResource,
  onMarkComplete,
}: {
  phases: any[];
  activePhaseIdx: number;
  activeResourceId: string | null;
  completing: string | null;
  onSelectPhase: (i: number) => void;
  onSelectResource: (r: any) => void;
  onMarkComplete: (id: string) => void;
}) {
  const totalResources = phases.reduce((s, p) => s + (p.resources?.length ?? 0), 0);
  const donePhases = phases.slice(0, activePhaseIdx).length;

  return (
    <div
      className="w-[340px] shrink-0 overflow-y-auto flex flex-col"
      style={{ borderRight: "1px solid var(--color-border)", background: "var(--color-surface)" }}
    >
      {/* Overall progress */}
      <div className="p-6 pb-4">
        <div className="flex justify-between text-xs mb-3" style={{ color: "var(--color-muted)" }}>
          <span className="font-semibold" style={{ color: "var(--color-text)" }}>Roadmap progress</span>
          <span className="font-mono">{donePhases}/{phases.length}</span>
        </div>
        <ProgressBar
          value={phases.length ? (donePhases / phases.length) * 100 : 0}
          tone="path"
          animate
        />
        <div className="text-xs mt-3 font-mono text-right" style={{ color: "var(--color-subtle)" }}>
          {totalResources} items total
        </div>
      </div>

      {/* Phase list */}
      <div className="flex-1 px-4 pb-6 space-y-1 relative">
        {phases.length > 1 && (
          <div
            className="absolute left-[38px] top-6 bottom-6 w-px pointer-events-none"
            style={{ background: "var(--color-border)" }}
          />
        )}

        {phases.map((phase, i) => {
          const isActive = i === activePhaseIdx;
          const isDone   = i < activePhaseIdx;
          const isLocked = i > activePhaseIdx + 1;

          return (
            <div key={phase.phase_index} className="relative py-2">
              <button
                onClick={() => onSelectPhase(i)}
                className="w-full flex items-center gap-4 text-left transition-all"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-mono text-xs font-bold transition-all relative z-10"
                  style={{
                    background: isDone ? "#00FF66" : isActive ? "#FF0055" : "var(--color-surface-2)",
                    color: isDone || isActive ? "#000000" : "var(--color-muted)",
                    boxShadow: isActive ? "0 0 14px rgba(255,0,85,0.4)" : "none",
                  }}
                >
                  {isDone ? <CheckCircle2 size={12} /> : isLocked ? <Lock size={10} /> : phase.phase_index}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ color: isActive ? "var(--color-text)" : isDone ? "var(--color-muted)" : "var(--color-muted)" }}
                  >
                    {phase.title}
                  </div>
                </div>
              </button>

              {isActive && phase.resources?.length > 0 && (
                <div className="ml-10 mt-3 mb-2 space-y-1">
                  {phase.resources.map((r: any) => {
                    const isSelected = r.resource_id === activeResourceId;
                    return (
                      <button
                        key={r.resource_id}
                        onClick={() => onSelectResource(r)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group"
                        style={{
                          background: isSelected ? "var(--color-surface-2)" : "transparent",
                        }}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); onMarkComplete(r.resource_id); }}
                          disabled={completing === r.resource_id}
                          className="shrink-0 transition-colors"
                          style={{ color: "var(--color-muted)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#00FF66")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-muted)")}
                        >
                          <Circle size={14} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-xs truncate leading-snug"
                            style={{ color: isSelected ? "var(--color-text)" : "var(--color-muted)", fontWeight: isSelected ? 500 : 400 }}
                          >
                            {r.title}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RoadmapPage() {
  const { userId } = useApp();
  const [roadmap, setRoadmap] = useState<any | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [activePhaseIdx, setActivePhaseIdx]     = useState(0);
  const [selectedResource, setSelectedResource] = useState<any | null>(null);
  const [completing, setCompleting]             = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.roadmap(userId);
      setRoadmap(data);
      const first = data.phases?.[0]?.resources?.[0] ?? null;
      setSelectedResource(first);
      setActivePhaseIdx(0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [userId]);

  async function markComplete(resourceId: string) {
    setCompleting(resourceId);
    try {
      await api.completeResource(userId, resourceId);
    } catch { /* best-effort */ }
    finally { setCompleting(null); }
  }

  if (error) return <div className="p-8"><ErrorBanner message={error} /></div>;
  if (loading || !roadmap) return <Spinner />;

  const phases = roadmap.phases ?? [];

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--color-bg)" }}>
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-8 py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg)" }}
      >
        <div className="flex items-baseline gap-4">
          <h1 className="font-display font-bold text-xl tracking-tight" style={{ color: "var(--color-text)" }}>
            Roadmap
          </h1>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            {roadmap.target_role}
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-full transition-colors"
          style={{ color: "var(--color-muted)", background: "var(--color-surface-2)" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--color-text)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--color-muted)"}
          title="Regenerate"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {phases.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CheckCircle2 size={32} className="mx-auto mb-4" style={{ color: "#00FF66" }} />
            <h3 className="font-display font-semibold mb-2" style={{ color: "var(--color-text)" }}>All skills mastered</h3>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>You have met all requirements.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <PhaseTracker
            phases={phases}
            activePhaseIdx={activePhaseIdx}
            activeResourceId={selectedResource?.resource_id ?? null}
            completing={completing}
            onSelectPhase={(i) => {
              setActivePhaseIdx(i);
              const first = phases[i]?.resources?.[0] ?? null;
              setSelectedResource(first);
            }}
            onSelectResource={setSelectedResource}
            onMarkComplete={markComplete}
          />
          <ResourcePanel
            resource={selectedResource}
            onComplete={markComplete}
            completing={completing}
          />
        </div>
      )}
    </div>
  );
}
