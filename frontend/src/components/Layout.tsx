import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Network,
  Map,
  Sparkles,
  ListChecks,
  MessageCircle,
  FlaskConical,
  GraduationCap,
  Sun,
  Moon,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const NAV = [
  { to: "/dashboard",       label: "Dashboard",      icon: LayoutDashboard, color: "#FF0055" },
  { to: "/skill-graph",     label: "Skill Graph",    icon: Network,          color: "#00E5FF" },
  { to: "/roadmap",         label: "Roadmap",         icon: Map,              color: "#FF0055" },
  { to: "/recommendations", label: "Recommendations", icon: Sparkles,         color: "#00E5FF" },
  { to: "/assessment",      label: "Assessment",      icon: ListChecks,       color: "#00FF66" },
  { to: "/tutor",           label: "AI Tutor",        icon: MessageCircle,    color: "#00E5FF" },
  { to: "/simulator",       label: "Simulator",       icon: FlaskConical,     color: "#FF6B35" },
  { to: "/course-insights", label: "Course Insights", icon: GraduationCap,    color: "#00FF66" },
];

// Apple Fitness ring SVG logo
function FitnessLogo({ size = 32 }: { size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const rings = [
    { r: cx - 3,  color: "#FF0055", pct: 80 },
    { r: cx - 8,  color: "#00FF66", pct: 65 },
    { r: cx - 13, color: "#00E5FF", pct: 90 },
  ];

  return (
    <svg width={size} height={size} className="-rotate-90">
      {rings.map((ring, i) => {
        const c = 2 * Math.PI * ring.r;
        return (
          <g key={i}>
            <circle
              cx={cx} cy={cy} r={ring.r}
              stroke="rgba(255,255,255,0.08)" strokeWidth={3} fill="none"
            />
            <circle
              cx={cx} cy={cy} r={ring.r}
              stroke={ring.color} strokeWidth={3} fill="none"
              strokeDasharray={`${(ring.pct / 100) * c} ${c}`}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 3px ${ring.color}90)` }}
            />
          </g>
        );
      })}
    </svg>
  );
}

export default function Layout() {
  const { theme, toggleTheme } = useApp();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className="w-56 shrink-0 flex flex-col"
        style={{
          background: "linear-gradient(180deg, #111111 0%, #0A0A0A 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* ── Logo ──────────────────────────────────────────────────────── */}
        <div
          className="px-4 py-5 flex items-center gap-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Animated fitness-ring logo mark */}
          <div className="shrink-0 animate-glow-pulse" style={{ borderRadius: "50%" }}>
            <FitnessLogo size={34} />
          </div>

          {/* Wordmark */}
          <div>
            <div
              className="font-display font-extrabold text-sm tracking-tight leading-none"
              style={{
                background: "linear-gradient(90deg, #FF0055 0%, #FF6B35 60%, #00E5FF 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              LearnPath
            </div>
            <div
              className="text-xs font-mono mt-0.5"
              style={{ color: "#636366", letterSpacing: "0.12em" }}
            >
              AI
            </div>
          </div>
        </div>

        {/* ── Nav ───────────────────────────────────────────────────────── */}
        <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon, color }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? "active-nav-item" : "inactive-nav-item"
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      background: `${color}16`,
                      color: color,
                      boxShadow: `inset 0 0 0 1px ${color}28, 0 0 12px ${color}18`,
                    }
                  : {
                      color: "#636366",
                    }
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2.5 : 2}
                    style={isActive ? { filter: `drop-shadow(0 0 4px ${color}80)` } : {}}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div
          className="px-4 py-4 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            {/* Live green dot */}
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: "#00FF66",
                boxShadow: "0 0 6px rgba(0,255,102,0.9), 0 0 12px rgba(0,255,102,0.4)",
              }}
            />
            <span className="text-xs font-mono" style={{ color: "#48484A" }}>
              demo · offline
            </span>
          </div>

          {/* Theme toggle */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#636366",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
              (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLElement).style.color = "#636366";
            }}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle colour theme"
          >
            {theme === "dark" ? (
              <Sun size={14} strokeWidth={2} />
            ) : (
              <Moon size={14} strokeWidth={2} />
            )}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
