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
import { PageHeader, Spinner, ErrorBanner, Badge, Card } from "../components/ui";

const STATUS_COLOR: Record<string, string> = {
  mastered: "#34d8c0",
  partial: "#ffb454",
  missing: "#26314a",
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
      const color = status ? STATUS_COLOR[status] : "#3a4460";
      return {
        id: n.id,
        position: { x: n.depth * 210, y: n.indexInDepth * 78 },
        data: { label: n.name, raw: n },
        style: {
          background: "#121927",
          border: `1.5px solid ${color}`,
          borderRadius: 10,
          color: "#edf1f7",
          fontSize: 12,
          fontFamily: "IBM Plex Mono, monospace",
          padding: "8px 12px",
          width: 170,
        },
      };
    });
    const rfEdges: Edge[] = graphData.edges.map((e: any, i: number) => ({
      id: `e${i}`,
      source: e.source,
      target: e.target,
      animated: false,
      style: { stroke: "#26314a", strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#26314a", width: 14, height: 14 },
    }));
    return { nodes: rfNodes, edges: rfEdges };
  }, [graphData, statusBySkill]);

  if (error) return <div className="p-8"><ErrorBanner message={error} /></div>;
  if (!graphData) return <Spinner />;

  return (
    <div className="px-8 py-10 h-screen flex flex-col">
      <PageHeader
        title="Skill Graph"
        subtitle="The prerequisite graph driving roadmap ordering — not just a picture, the actual scheduling logic."
      />
      <div className="flex gap-4 mb-4 text-xs font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: STATUS_COLOR.mastered }} /> mastered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: STATUS_COLOR.partial }} /> partial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block bg-(--color-surface-2)" /> missing / not required
        </span>
      </div>

      <div className="flex-1 rounded-xl border border-(--color-border) overflow-hidden relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={(_, node) => setSelected(node.data.raw)}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1a2335" gap={20} />
          <Controls />
          <MiniMap
            nodeColor={() => "#26314a"}
            maskColor="rgba(10,14,23,0.8)"
            style={{ background: "#121927" }}
          />
        </ReactFlow>

        {selected && (
          <Card className="absolute top-4 right-4 w-72 z-10">
            <h4 className="font-display font-semibold mb-1">{selected.name}</h4>
            <Badge>{selected.category}</Badge>
            <p className="text-sm text-(--color-muted) mt-3 leading-relaxed">
              {selected.description}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
