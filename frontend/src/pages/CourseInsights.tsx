import { useEffect, useState } from "react";
import { Search, GraduationCap, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { Spinner, ErrorBanner, Badge } from "../components/ui";

export default function CourseInsights() {
  const [query, setQuery] = useState(
    "The instructor explained neural networks and backpropagation really clearly with hands-on projects"
  );
  const [results, setResults] = useState<any[] | null>(null);
  const [detectedCourse, setDetectedCourse] = useState<string | null>(null);
  const [courses, setCourses] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .reviewCourses()
      .then((d) => setCourses(d.courses))
      .catch((e) => setError(e.message));
  }, []);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.similarReviews(query, 6);
      setResults(res.results);
      setDetectedCourse(res.detected_course);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-10 py-16">
      
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="mb-10 animate-fade-up">
        <h1 className="text-3xl font-display font-bold tracking-tight mb-2" style={{ color: "#FFFFFF" }}>
          Review Intelligence
        </h1>
        <p className="text-base" style={{ color: "var(--color-muted)" }}>
          Find specific learning outcomes by searching through 109,776 real student reviews.
        </p>
      </div>

      {/* ── Search Input ────────────────────────────────────────────── */}
      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="relative mb-8">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe what you're looking for, or paste a review..."
            className="w-full text-base px-5 py-4 pl-12 rounded-2xl outline-none transition-all shadow-sm"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            onFocus={e => {
              (e.currentTarget.style.borderColor = "#00E5FF");
              (e.currentTarget.style.boxShadow = "0 0 0 1px #00E5FF");
            }}
            onBlur={e => {
              (e.currentTarget.style.borderColor = "var(--color-border)");
              (e.currentTarget.style.boxShadow = "none");
            }}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" />
          
          <button
            onClick={search}
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-xl font-semibold text-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #00E5FF 0%, #00BFEA 100%)",
              color: "#000000",
            }}
          >
            Search
          </button>
        </div>

        {courses && (
          <p className="text-xs font-mono mb-8" style={{ color: "var(--color-subtle)" }}>
            trained on {courses.length} courses ·{" "}
            {courses.reduce((sum: number, c: any) => sum + c.review_count, 0).toLocaleString()} reviews
          </p>
        )}
      </div>

      {/* ── Results ─────────────────────────────────────────────────── */}
      {loading && <Spinner />}
      {error && <ErrorBanner message={error} />}

      {results && !loading && (
        <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
          {detectedCourse && (
            <div className="flex items-center gap-2 mb-6 pb-6 text-sm" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <GraduationCap size={16} style={{ color: "var(--color-path)" }} />
              <span style={{ color: "var(--color-text)" }}>Identified target course:</span>
              <span className="font-semibold" style={{ color: "var(--color-path)" }}>{detectedCourse}</span>
            </div>
          )}

          <div className="space-y-4">
            {results.map((r, i) => (
              <div key={i} className="rounded-2xl p-6" style={{ background: "var(--color-surface)" }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{r.course}</span>
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono font-medium" style={{ background: "rgba(0,229,255,0.1)", color: "#00E5FF" }}>
                    <Sparkles size={11} />
                    {r.similarity} match
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>{r.review}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
