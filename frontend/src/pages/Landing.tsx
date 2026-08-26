import { useNavigate } from "react-router-dom";
import { GitBranch, Sparkles, Target, ArrowRight } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "#000000", color: "#FFFFFF" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 15% 35%, rgba(255,0,85,0.07) 0%, transparent 65%)," +
            "radial-gradient(ellipse 45% 40% at 85% 65%, rgba(0,229,255,0.05) 0%, transparent 65%)",
        }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-10 py-7 max-w-6xl mx-auto">
        <span className="font-display font-bold text-base tracking-tight" style={{ color: "#FFFFFF" }}>
          LearnPath
        </span>
        <button
          onClick={() => navigate("/onboarding")}
          className="text-sm font-medium"
          style={{ color: "#8E8E93" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#FFFFFF"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#8E8E93"}
        >
          Launch demo →
        </button>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-3xl mx-auto px-10 pt-20 pb-28 text-center">
        <h1
          className="font-display font-bold leading-[1.05] mb-5"
          style={{ fontSize: "clamp(2.8rem, 6vw, 5rem)", color: "#FFFFFF", letterSpacing: "-0.03em" }}
        >
          Every skill has a path.
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #FF0055 0%, #FF6B35 45%, #00E5FF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            We compute yours.
          </span>
        </h1>

        <p className="text-lg mb-10 leading-relaxed" style={{ color: "#636366", maxWidth: "30rem", margin: "0 auto 2.5rem" }}>
          Describe your goal. Get a personalized, prerequisite-ordered roadmap with adaptive recommendations.
        </p>

        <button
          onClick={() => navigate("/onboarding")}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-base"
          style={{
            background: "linear-gradient(135deg, #FF0055 0%, #FF3366 100%)",
            color: "white",
            boxShadow: "0 6px 28px rgba(255,0,85,0.35)",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 36px rgba(255,0,85,0.5)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px rgba(255,0,85,0.35)"}
        >
          Start your roadmap <ArrowRight size={15} />
        </button>
      </section>

      {/* ── Feature cards ────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-10 pb-28 grid grid-cols-1 md:grid-cols-3 gap-3">
        <FeatureCard
          icon={Target}
          color="#FF0055"
          title="Goal to plan"
          body="Plain-English input. No forms. Extracts role, skills, hours, and deadline automatically."
        />
        <FeatureCard
          icon={GitBranch}
          color="#00E5FF"
          title="Prerequisite-aware"
          body="A skill graph topologically orders your roadmap — nothing is scheduled before its prerequisites."
        />
        <FeatureCard
          icon={Sparkles}
          color="#00FF66"
          title="Adaptive scoring"
          body="Every assessment reshapes your profile and reranks resources in real time."
        />
      </section>

      {/* Decorative rings */}
      <div className="absolute bottom-8 right-8 opacity-15 pointer-events-none">
        <svg width="110" height="110" className="-rotate-90">
          {[
            { r: 48, color: "#FF0055", pct: 72 },
            { r: 35, color: "#00FF66", pct: 55 },
            { r: 22, color: "#00E5FF", pct: 40 },
          ].map((ring, i) => {
            const c = 2 * Math.PI * ring.r;
            return (
              <g key={i}>
                <circle cx={55} cy={55} r={ring.r} stroke="rgba(255,255,255,0.06)" strokeWidth={8} fill="none" />
                <circle
                  cx={55} cy={55} r={ring.r}
                  stroke={ring.color} strokeWidth={8} fill="none"
                  strokeDasharray={`${(ring.pct / 100) * c} ${c}`}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon, title, body, color,
}: {
  icon: typeof Target;
  title: string;
  body: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "#111111" }}
    >
      <Icon size={20} style={{ color }} strokeWidth={1.75} className="mb-4" />
      <h3 className="font-semibold mb-1.5" style={{ color: "#FFFFFF", fontSize: "15px" }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "#636366" }}>{body}</p>
    </div>
  );
}
