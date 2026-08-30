import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Spinner, ErrorBanner, Badge, Card } from "../components/ui";

const STATUS_COLOR: Record<string, string> = {
  mastered: "#00FF66",
  partial:  "#00E5FF",
  missing:  "#3A3A3C",
};

function layout(nodes: any[], edges: any[]) {
  const children = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  nodes.forEach((n) => {
    indeg.set(n.id, 0);
    children.set(n.id, []);
  });
  edges.forEach((e) => {
    children.get(e.source)?.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  });

  const depth = new Map<string, number>();
  const queue: string[] = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  queue.forEach((id) => depth.set(id, 0));
  const indegCopy = new Map(indeg);

  while (queue.length) {
    const id = queue.shift()!;
    const d = depth.get(id) ?? 0;
    for (const child of children.get(id) ?? []) {
      depth.set(child, Math.max(depth.get(child) ?? 0, d + 1));
      indegCopy.set(child, (indegCopy.get(child) ?? 1) - 1);
      if ((indegCopy.get(child) ?? 0) <= 0) queue.push(child);
    }
  }

  const perDepth = new Map<number, number>();
  return nodes.map((n) => {
    const d = depth.get(n.id) ?? 0;
    const idx = perDepth.get(d) ?? 0;
    perDepth.set(d, idx + 1);
    return { ...n, depth: d, indexInDepth: idx };
  });
}

export default function SkillGraphPage() {
  const { userId } = useApp();
  const [graphData, setGraphData] = useState<any | null>(null);
  const [gap, setGap] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    Promise.all([api.skillGraph(), api.skillGap(userId).catch(() => null)])
      .then(([g, gp]) => {
        setGraphData(g);
        setGap(gp);
      })
      .catch((e) => setError(e.message));
  }, [userId]);

  const statusBySkill = useMemo(() => {
    const map: Record<string, string> = {};
    if (gap) {
      gap.strong.forEach((s: any) => (map[s.skill_id] = "mastered"));
      gap.partial.forEach((s: any) => (map[s.skill_id] = "partial"));
      gap.missing.forEach((s: any) => (map[s.skill_id] = "missing"));
    }
    return map;
  }, [gap]);

  const { nodes, edges } = useMemo(() => {
    if (!graphData) return { nodes: [] as Node[], edges: [] as Edge[] };
    const positioned = layout(graphData.nodes, graphData.edges);
    const rfNodes: Node[] = positioned.map((n) => {
      const status = statusBySkill[n.id];
      const color = status ? STATUS_COLOR[status] : "#3A3A3C";
      const glowColor =
        status === "mastered" ? "rgba(0,255,102,0.35)" :
        status === "partial"  ? "rgba(0,229,255,0.35)" : "none";
      return {
        id: n.id,
        position: { x: n.depth * 210, y: n.indexInDepth * 78 },
        data: { label: n.name.replaceAll("_", " "), raw: n },
        style: {
          background: "#111111",
          border: `1px solid ${color}`,
          borderRadius: 8,
          color: status === "mastered" ? "#00FF66" : status === "partial" ? "#00E5FF" : "#636366",
          fontSize: 12,
          fontFamily: "Inter, sans-serif",
          fontWeight: 500,
          padding: "8px 12px",
          width: 170,
          boxShadow: glowColor !== "none" ? `0 0 12px ${glowColor}` : "none",
          textTransform: "capitalize",
        },
      };
    });
    const rfEdges: Edge[] = graphData.edges.map((e: any, i: number) => ({
      id: `e${i}`,
      source: e.source,
      target: e.target,
      animated: false,
      style: { stroke: "#3A3A3C", strokeWidth: 1 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#3A3A3C", width: 14, height: 14 },
    }));
    return { nodes: rfNodes, edges: rfEdges };
  }, [graphData, statusBySkill]);

  if (error) return <div className="p-10"><ErrorBanner message={error} /></div>;
  if (!graphData) return <Spinner />;

  return (
    <div className="flex flex-col h-screen">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="shrink-0 px-8 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg)" }}>
        <div>
          <h1 className="font-display font-bold text-xl tracking-tight" style={{ color: "var(--color-text)" }}>
            Skill Graph
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>
            The prerequisite graph driving roadmap ordering.
          </p>
        </div>

        <div className="flex gap-5 text-xs font-mono shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#00FF66" }} />
            <span style={{ color: "#00FF66" }}>Mastered</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#00E5FF" }} />
            <span style={{ color: "#00E5FF" }}>Partial</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#3A3A3C" }} />
            <span style={{ color: "var(--color-muted)" }}>Missing</span>
          </span>
        </div>
      </div>

      <div className="flex-1 relative bg-black">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={(_, node) => setSelected(node.data.raw)}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1C1C1E" gap={24} />
          <Controls />
        </ReactFlow>

        {selected && (
          <div
            className="absolute top-6 right-6 w-80 p-6 rounded-2xl z-10 animate-fade-up"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
          >
            <h4 className="font-display font-semibold mb-2 capitalize text-lg" style={{ color: "var(--color-text)" }}>
              {selected.name.replaceAll("_", " ")}
            </h4>
            <Badge tone="path">{selected.category}</Badge>
            <p className="text-sm mt-4 leading-relaxed" style={{ color: "var(--color-muted)" }}>
              {selected.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
