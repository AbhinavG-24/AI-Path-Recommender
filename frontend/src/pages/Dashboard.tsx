import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { Flame, Target, Clock, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Card, PageHeader, ScoreRing, Spinner, ErrorBanner, Badge } from "../components/ui";

export default function Dashboard() {
  const { userId } = useApp();
  const [data, setData] = useState<any | null>(null);
  const [today, setToday] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.dashboard(userId), api.todayPlan(userId)])
      .then(([d, t]) => {
        setData(d);
        setToday(t);
      })
      .catch((e) => setError(e.message));
  }, [userId]);

  if (error) return <div className="p-8"><ErrorBanner message={error} /></div>;
  if (!data) return <Spinner />;

  const chartData = Object.entries(data.skill_progress).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <PageHeader title="Dashboard" subtitle="Your learning journey at a glance." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <Card className="flex items-center gap-4">
          <ScoreRing value={data.career_readiness} size={80} />
          <div>
            <div className="text-xs font-mono text-(--color-muted) uppercase">
              Career readiness
            </div>
            <div className="text-sm text-(--color-muted) mt-1">
              {data.learning_streak_days > 0
                ? `${data.learning_streak_days}-day streak`
                : "toward your target role"}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-(--color-gap) mb-2">
            <Target size={16} />
            <span className="text-xs font-mono uppercase">Biggest gap</span>
          </div>
          <div className="text-xl font-display font-semibold">{data.biggest_gap ?? "—"}</div>
          <div className="text-sm text-(--color-muted) mt-1">Highest-impact skill to focus on</div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-(--color-path) mb-2">
            <Flame size={16} />
            <span className="text-xs font-mono uppercase">Progress</span>
          </div>
          <div className="text-xl font-display font-semibold">
            {data.completed_resources}/{data.total_roadmap_resources}
          </div>
          <div className="text-sm text-(--color-muted) mt-1">Resources completed</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <h3 className="font-display font-semibold mb-4">Skill progress</h3>
          <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 28)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fill: "#8a97b3", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={12}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.value >= 75
                        ? "#34d8c0"
                        : entry.value >= 30
                        ? "#ffb454"
                        : "#26314a"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-(--color-path)" />
              <h3 className="font-display font-semibold">Today's plan</h3>
            </div>
            {today?.blocks?.length ? (
              <>
                <div className="text-xs font-mono text-(--color-muted) mb-3">
                  {today.total_minutes} min · {today.phase_title}
                </div>
                <ul className="space-y-2">
                  {today.blocks.map((b: any, i: number) => (
                    <li key={i} className="flex justify-between text-sm">
                      <span>{b.activity}</span>
                      <span className="font-mono text-(--color-muted)">{b.minutes}m</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-(--color-muted)">No plan yet — generate a roadmap first.</p>
            )}
          </Card>

          <Card>
            <h3 className="font-display font-semibold mb-2">Active phase</h3>
            <p className="text-sm mb-3">{data.active_phase ?? "—"}</p>
            {data.upcoming_milestone && (
              <div className="mb-3">
                <Badge tone="path">milestone</Badge>
                <p className="text-sm text-(--color-muted) mt-2">{data.upcoming_milestone}</p>
              </div>
            )}
            <Link
              to="/roadmap"
              className="inline-flex items-center gap-1 text-sm text-(--color-path) hover:underline"
            >
              View full roadmap <ArrowRight size={13} />
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
