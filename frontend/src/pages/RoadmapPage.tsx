import { useEffect, useState } from "react";
import { Flag, Clock, CheckCircle2, Circle } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Card, PageHeader, Spinner, ErrorBanner, Badge, Button } from "../components/ui";

export default function RoadmapPage() {
  const { userId } = useApp();
  const [roadmap, setRoadmap] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const data = await api.roadmap(userId);
      setRoadmap(data);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [userId]);

  async function markComplete(resourceId: string) {
    setCompleting(resourceId);
    try {
      await api.completeResource(userId, resourceId);
    } catch {
      /* best-effort in demo */
    } finally {
      setCompleting(null);
    }
  }

  if (error) return <div className="p-8"><ErrorBanner message={error} /></div>;
  if (!roadmap) return <Spinner />;

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <PageHeader
        title="Your Roadmap"
        subtitle={`Prerequisite-ordered path toward ${roadmap.target_role}.`}
      />

      <div className="flex items-center justify-between mb-8 text-sm">
        <span className="font-mono text-(--color-muted)">
          {roadmap.total_estimated_hours}h estimated · {roadmap.available_hours}h available
        </span>
        {roadmap.over_budget && <Badge tone="gap">compressed to fit your time budget</Badge>}
      </div>

      {roadmap.budget_message && (
        <div className="mb-8">
          <ErrorBanner message={roadmap.budget_message} />
        </div>
      )}

      {roadmap.phases.length === 0 && (
        <Card>
          <p className="text-(--color-muted)">
            All required skills for this role are already mastered. Nice work.
          </p>
        </Card>
      )}

      <div className="relative">
        {roadmap.phases.length > 1 && (
          <div
            className="absolute left-[15px] top-8 bottom-8 w-px"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, var(--color-path) 0, var(--color-path) 4px, transparent 4px, transparent 10px)",
            }}
          />
        )}

        <div className="space-y-10">
          {roadmap.phases.map((phase: any) => (
            <div key={phase.phase_index} className="relative pl-12">
              <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-(--color-path) text-white flex items-center justify-center font-mono text-sm font-semibold">
                {phase.phase_index}
              </div>

              <Card>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-display font-semibold text-lg">{phase.title}</h3>
                    <p className="text-sm text-(--color-muted) mt-1">{phase.objective}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-mono text-(--color-muted) shrink-0">
                    <Clock size={13} /> {phase.estimated_hours}h
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4 text-xs text-(--color-path)">
                  <Flag size={13} />
                  <span>{phase.milestone}</span>
                </div>

                <div className="space-y-2">
                  {phase.resources.map((r: any) => (
                    <div
                      key={r.resource_id}
                      className="flex items-center justify-between gap-3 bg-(--color-surface-2) rounded-lg px-3 py-2.5"
                    >
                      <button
                        onClick={() => markComplete(r.resource_id)}
                        disabled={completing === r.resource_id}
                        className="text-(--color-muted) hover:text-(--color-mastered) shrink-0"
                        aria-label="Mark complete"
                      >
                        {completing === r.resource_id ? (
                          <Circle size={17} className="animate-pulse" />
                        ) : (
                          <Circle size={17} />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{r.title}</div>
                        <div className="text-xs text-(--color-muted) font-mono mt-0.5">
                          {r.resource_type} · {r.duration_hours}h · score {r.overall_score}
                        </div>
                      </div>
                      <Badge tone="path">{r.difficulty}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {roadmap.phases.length > 0 && (
        <div className="flex justify-center mt-10">
          <div className="flex items-center gap-2 text-(--color-mastered) text-sm">
            <CheckCircle2 size={16} /> Career-ready
          </div>
        </div>
      )}

      <div className="flex justify-end mt-6">
        <Button variant="outline" onClick={load}>
          Regenerate roadmap
        </Button>
      </div>
    </div>
  );
}
