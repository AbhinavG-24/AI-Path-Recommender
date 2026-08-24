import { useNavigate } from "react-router-dom";
import { Compass, GitBranch, Sparkles, Target } from "lucide-react";
import { Button } from "../components/ui";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-(--color-bg) text-(--color-text) relative overflow-hidden">
      {/* trail motif */}
      <svg
        className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
        preserveAspectRatio="none"
      >
        <path
          d="M -50 120 Q 200 60, 400 180 T 900 140 T 1400 220"
          className="trail-line"
          strokeWidth={2}
        />
        <path
          d="M -50 500 Q 250 420, 500 540 T 1000 480 T 1500 560"
          className="trail-line"
          strokeWidth={2}
        />
      </svg>

      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Compass className="text-(--color-path)" size={22} />
          <span className="font-display font-semibold text-lg">LearnPath AI</span>
        </div>
        <Button variant="outline" onClick={() => navigate("/onboarding")}>
          Launch demo
        </Button>
      </header>

      <section className="relative z-10 max-w-4xl mx-auto px-8 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-(--color-border) text-xs font-mono text-(--color-muted) mb-6">
          <Sparkles size={12} className="text-(--color-path)" />
          hybrid recommender · skill graph · adaptive engine
        </div>
        <h1 className="font-display text-5xl font-semibold tracking-tight leading-[1.1] mb-6">
          Every skill has a path.
          <br />
          <span className="text-(--color-path)">We compute yours.</span>
        </h1>
        <p className="text-(--color-muted) text-lg max-w-2xl mx-auto mb-10">
          Tell LearnPath your goal in plain English. It decomposes it into skills, finds your
          gaps against a real prerequisite graph, and ranks resources with a hybrid TF-IDF ×
          BM25 × semantic engine — then adapts every time you take an assessment.
        </p>
        <Button onClick={() => navigate("/onboarding")} className="text-base px-6 py-3">
          Start your roadmap →
        </Button>
      </section>

      <section className="relative z-10 max-w-5xl mx-auto px-8 pb-24 grid grid-cols-1 md:grid-cols-3 gap-5">
        <FeatureCard
          icon={Target}
          title="Goal → structured plan"
          body="Natural language parsing extracts your target role, known skills, hours per week, and deadline — no forms required."
        />
        <FeatureCard
          icon={GitBranch}
          title="Prerequisite-aware"
          body="A NetworkX skill graph topologically orders your roadmap so nothing is scheduled before its prerequisite."
        />
        <FeatureCard
          icon={Sparkles}
          title="Explainable & adaptive"
          body="Every recommendation shows its score breakdown. Every assessment reshapes your skill profile and reranks what's next."
        />
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Target;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
      <Icon className="text-(--color-path) mb-3" size={20} />
      <h3 className="font-display font-semibold mb-2">{title}</h3>
      <p className="text-sm text-(--color-muted) leading-relaxed">{body}</p>
    </div>
  );
}
