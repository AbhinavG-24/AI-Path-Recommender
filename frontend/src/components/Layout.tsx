import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Network,
  Map,
  Sparkles,
  ListChecks,
  MessageCircle,
  FlaskConical,
  Compass,
  GraduationCap,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/skill-graph", label: "Skill Graph", icon: Network },
  { to: "/roadmap", label: "Roadmap", icon: Map },
  { to: "/recommendations", label: "Recommendations", icon: Sparkles },
  { to: "/assessment", label: "Assessment", icon: ListChecks },
  { to: "/tutor", label: "AI Tutor", icon: MessageCircle },
  { to: "/simulator", label: "Simulator", icon: FlaskConical },
  { to: "/course-insights", label: "Course Insights", icon: GraduationCap },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-(--color-bg)">
      <aside className="w-60 shrink-0 border-r border-(--color-border) bg-(--color-surface) flex flex-col">
        <div className="px-5 py-6 flex items-center gap-2 border-b border-(--color-border)">
          <Compass className="text-(--color-path)" size={22} />
          <span className="font-display font-semibold text-lg tracking-tight">LearnPath AI</span>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-(--color-path-soft) text-(--color-path)"
                    : "text-(--color-muted) hover:text-(--color-text) hover:bg-(--color-surface-2)"
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-(--color-border) text-xs text-(--color-muted) font-mono">
          demo_mode: offline
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
