import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Map, ListChecks, MessageCircle, FlaskConical,
  Trophy, TrendingUp, Zap, Star, Medal, Flame,
} from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import {
  Card, PageHeader, FitnessRings, Spinner, ErrorBanner, Badge, ProgressBar,
} from "../components/ui";

// ─── Animated number counter ─────────────────────────────────────────────────
function StatValue({ n, suffix = "" }: { n: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = n / 40;
    const id = setInterval(() => {
      start += step;
      if (start >= n) { setDisplay(n); clearInterval(id); }
      else setDisplay(Math.round(start));
    }, 20);
    return () => clearInterval(id);
  }, [n]);
  return <>{display}{suffix}</>;
}

// ─── Quick Action Tile ───────────────────────────────────────────────────────
function QuickTile({
  to, label, icon: Icon, color,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 py-5 rounded-2xl text-center group"
      style={{ background: "var(--color-surface-2)" }}
    >
      <Icon size={20} strokeWidth={1.75} style={{ color }} />
      <span className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
        {label}
      </span>
    </Link>
  );
}

// ─── Skill Bar ───────────────────────────────────────────────────────────────
function SkillBar({ name, value, delay }: { name: string; value: number; delay: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const color =
    value >= 75 ? "#00FF66" :
    value >= 30 ? "#00E5FF" :
    "#FF0055";

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs capitalize" style={{ color: "var(--color-muted)" }}>
          {name.replaceAll("_", " ")}
        </span>
        <span className="text-xs font-mono" style={{ color }}>
          {Math.round(value)}%
        </span>
      </div>
      <div className="w-full h-px rounded-full overflow-hidden" style={{ background: "var(--color-surface-3)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: shown ? `${Math.min(100, value)}%` : "0%",
            background: color,
            transitionDuration: `${0.5 + value / 200}s`,
            transitionTimingFunction: "cubic-bezier(0.34,1.2,0.64,1)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Today Plan Block ────────────────────────────────────────────────────────
function PlanBlock({ activity, minutes, index }: { activity: string; minutes: number; index: number }) {
  const [done, setDone] = useState(false);
  const colors = ["#FF0055", "#00FF66", "#00E5FF", "#FF6B35"];
  const c = colors[index % colors.length];

  return (
    <li
      className="flex items-center gap-3 py-2.5 cursor-pointer"
      style={{
        borderBottom: "1px solid var(--color-border)",
        opacity: done ? 0.4 : 1,
      }}
      onClick={() => setDone((d) => !d)}
    >
      <div
        className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center"
        style={{
          border: `1.5px solid ${c}`,
          background: done ? c : "transparent",
        }}
      >
        {done && <span style={{ color: "white", fontSize: 8, lineHeight: 1 }}>✓</span>}
      </div>
      <span
        className="flex-1 text-sm"
        style={{
          color: "var(--color-text)",
          textDecoration: done ? "line-through" : "none",
        }}
      >
        {activity}
      </span>
      <span className="text-xs font-mono shrink-0" style={{ color: "var(--color-subtle)" }}>
        {minutes}m
      </span>
    </li>
  );
}

// ─── Achievement Badge ───────────────────────────────────────────────────────
function AchievementBadge({
  icon: Icon, label, sublabel, color, glow, unlocked,
}: {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  color: string;
  glow: string;
  unlocked: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 py-3"
      style={{
        borderBottom: "1px solid var(--color-border)",
        opacity: unlocked ? 1 : 0.3,
      }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: unlocked ? `${color}18` : "var(--color-surface-3)",
          boxShadow: unlocked ? `0 0 12px ${glow}` : "none",
        }}
      >
        <Icon size={16} style={{ color: unlocked ? color : "var(--color-subtle)" }} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{label}</div>
        <div className="text-xs" style={{ color: "var(--color-muted)" }}>{sublabel}</div>
      </div>
      {unlocked && (
        <div className="w-1.5 h-1.5 rounded-full ml-auto shrink-0" style={{ background: color }} />
      )}
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { userId } = useApp();
  const [data, setData] = useState<any | null>(null);
  const [today, setToday] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.dashboard(userId), api.todayPlan(userId)])
      .then(([d, t]) => { setData(d); setToday(t); })
      .catch((e) => setError(e.message));
  }, [userId]);

  if (error) return <div className="p-8"><ErrorBanner message={error} /></div>;
  if (!data) return <Spinner />;

  const skillEntries = Object.entries(data.skill_progress).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  const completedPct =
    data.total_roadmap_resources > 0
      ? Math.round((data.completed_resources / data.total_roadmap_resources) * 100)
      : 0;

  const streakDays = data.learning_streak_days ?? 0;
  const careerScore = data.career_readiness ?? 0;
  const outerPct  = completedPct;
  const middlePct = Math.min(100, streakDays * 10);
  const innerPct  = Math.min(100, careerScore);

  const achievements = [
    {
      icon: Flame,
      label: "Streak",
      sublabel: `${streakDays} days`,
      color: "#FF0055",
      glow: "rgba(255,0,85,0.5)",
      unlocked: streakDays >= 1,
    },
    {
      icon: Star,
      label: "First Step",
      sublabel: "Profile built",
      color: "#00E5FF",
      glow: "rgba(0,229,255,0.5)",
      unlocked: true,
    },
    {
      icon: Trophy,
      label: "Milestone",
      sublabel: data.upcoming_milestone ? "Upcoming" : "None yet",
      color: "#00FF66",
      glow: "rgba(0,255,102,0.5)",
      unlocked: !!data.upcoming_milestone,
    },
    {
      icon: Medal,
      label: "Path Pro",
      sublabel: `${completedPct}% complete`,
      color: "#FF6B35",
      glow: "rgba(255,107,53,0.5)",
      unlocked: completedPct >= 50,
    },
  ];

  return (
    <div className="min-h-screen px-8 py-10" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-5xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-10 animate-fade-up">
          <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: "var(--color-subtle)" }}>
            {data.target_role || "Machine Learning Engineer"}
          </p>
          <h1 className="text-4xl font-display font-bold tracking-tight" style={{ color: "#FFFFFF", letterSpacing: "-0.02em" }}>
            Activity
          </h1>
        </div>

        {/* ── Hero: Rings + Stats ─────────────────────────────────────── */}
        <div
          className="rounded-2xl p-8 mb-5 flex flex-col md:flex-row items-center gap-10 animate-fade-up"
          style={{ background: "var(--color-surface)", animationDelay: "60ms" }}
        >
          {/* Rings */}
          <div className="shrink-0 relative">
            <FitnessRings outer={outerPct} middle={middlePct} inner={innerPct} size={180} />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ pointerEvents: "none" }}
            >
              <div className="text-3xl font-mono font-bold" style={{ color: "#FFFFFF", lineHeight: 1 }}>
                <StatValue n={careerScore} />
              </div>
              <div className="text-xs font-mono mt-1" style={{ color: "var(--color-subtle)", letterSpacing: "0.1em" }}>
                READY
              </div>
            </div>
          </div>

          {/* Stats — 3 columns, no dividers */}
          <div className="flex-1 grid grid-cols-3 gap-8 w-full">
            <div>
              <div className="text-4xl font-mono font-bold mb-1" style={{ color: "#FF0055" }}>
                <StatValue n={completedPct} suffix="%" />
              </div>
              <div className="text-xs uppercase tracking-widest font-mono" style={{ color: "var(--color-subtle)" }}>Complete</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                {data.completed_resources}/{data.total_roadmap_resources} resources
              </div>
            </div>
            <div>
              <div className="text-4xl font-mono font-bold mb-1" style={{ color: "#00FF66" }}>
                <StatValue n={streakDays} suffix="d" />
              </div>
              <div className="text-xs uppercase tracking-widest font-mono" style={{ color: "var(--color-subtle)" }}>Streak</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>days active</div>
            </div>
            <div>
              <div className="text-4xl font-mono font-bold mb-1" style={{ color: "#00E5FF" }}>
                <StatValue n={careerScore} />
              </div>
              <div className="text-xs uppercase tracking-widest font-mono" style={{ color: "var(--color-subtle)" }}>Readiness</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>out of 100</div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ───────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2 mb-5 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <QuickTile to="/roadmap"    label="Roadmap"    icon={Map}           color="#FF0055" />
          <QuickTile to="/assessment" label="Assessment" icon={ListChecks}    color="#00FF66" />
          <QuickTile to="/tutor"      label="AI Tutor"   icon={MessageCircle} color="#00E5FF" />
          <QuickTile to="/simulator"  label="Simulator"  icon={FlaskConical}  color="#FF6B35" />
        </div>

        {/* ── Main Grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 animate-fade-up" style={{ animationDelay: "160ms" }}>

          {/* Skill Progress — 2/3 */}
          <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: "var(--color-surface)" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                Skills
              </h2>
              <div className="flex items-center gap-3 text-xs" style={{ color: "var(--color-subtle)" }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00FF66" }} />mastered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00E5FF" }} />partial
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#FF0055" }} />low
                </span>
              </div>
            </div>
            <div className="space-y-3.5 max-h-72 overflow-y-auto">
              {skillEntries
                .sort((a, b) => b.value - a.value)
                .map((entry, i) => (
                  <SkillBar key={entry.name} name={entry.name} value={entry.value} delay={i * 30} />
                ))}
            </div>
          </div>

          {/* Today — 1/3 */}
          <div className="rounded-2xl p-6" style={{ background: "var(--color-surface)" }}>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Today</h2>
              {today?.total_minutes && (
                <span className="text-xs font-mono" style={{ color: "var(--color-subtle)" }}>
                  {today.total_minutes} min
                </span>
              )}
            </div>
            {today?.phase_title && (
              <p className="text-xs mb-3" style={{ color: "var(--color-subtle)" }}>
                {today.phase_title}
              </p>
            )}
            {today?.blocks?.length ? (
              <ul>
                {today.blocks.map((b: any, i: number) => (
                  <PlanBlock key={i} index={i} activity={b.activity} minutes={b.minutes} />
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                Generate a roadmap to see your plan.
              </p>
            )}
          </div>
        </div>

        {/* ── Bottom: Active Phase + Achievements ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: "220ms" }}>

          {/* Active Phase */}
          <div className="rounded-2xl p-6" style={{ background: "var(--color-surface)" }}>
            <h2 className="text-sm font-semibold mb-5" style={{ color: "var(--color-text)" }}>Active Phase</h2>

            {data.biggest_gap && (
              <div className="mb-5">
                <p className="text-xs uppercase tracking-widest font-mono mb-1" style={{ color: "var(--color-subtle)" }}>Focus next</p>
                <p className="text-lg font-semibold capitalize" style={{ color: "#00E5FF", letterSpacing: "-0.01em" }}>
                  {data.biggest_gap.replaceAll("_", " ")}
                </p>
              </div>
            )}

            {data.active_phase && (
              <p className="text-sm capitalize mb-5" style={{ color: "var(--color-muted)" }}>
                {data.active_phase}
              </p>
            )}

            <ProgressBar value={completedPct} tone="gap" animate />
            <p className="text-xs mt-1.5 text-right font-mono" style={{ color: "var(--color-subtle)" }}>
              {completedPct}%
            </p>

            {data.upcoming_milestone && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
                <p className="text-xs uppercase tracking-widest font-mono mb-1.5" style={{ color: "var(--color-subtle)" }}>Milestone</p>
                <p className="text-sm" style={{ color: "var(--color-text)" }}>{data.upcoming_milestone}</p>
              </div>
            )}

            <Link
              to="/roadmap"
              className="inline-flex items-center gap-1.5 text-sm font-medium mt-5"
              style={{ color: "#FF0055" }}
            >
              Full roadmap <ArrowRight size={13} />
            </Link>
          </div>

          {/* Achievements */}
          <div className="rounded-2xl p-6" style={{ background: "var(--color-surface)" }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text)" }}>Achievements</h2>
            <div>
              {achievements.map((a, i) => (
                <AchievementBadge key={a.label} {...a} />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
