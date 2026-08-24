import { useEffect, useState } from "react";
import { Search, GraduationCap, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { Card, PageHeader, Spinner, ErrorBanner, Badge, Button } from "../components/ui";

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
    <div className="max-w-3xl mx-auto px-8 py-10">
      <PageHeader
        title="Course Insights"
        subtitle="A TF-IDF retrieval model trained on 109,776 real course reviews (80 courses) — the Round 1 dataset — finds the most similar learner feedback for any query."
      />

      <Card className="mb-6">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe what you're looking for, or paste a review..."
            className="flex-1 bg-(--color-surface-2) border border-(--color-border) rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-(--color-path)"
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <Button onClick={search} disabled={loading || !query.trim()}>
            <span className="flex items-center gap-2">
              <Search size={14} />
              Search
            </span>
          </Button>
        </div>
        {courses && (
          <p className="text-xs text-(--color-muted) font-mono mt-3">
            trained on {courses.length} courses ·{" "}
            {courses.reduce((sum, c) => sum + c.review_count, 0).toLocaleString()} reviews
          </p>
        )}
      </Card>

      {loading && <Spinner />}
      {error && <ErrorBanner message={error} />}

      {results && !loading && (
        <div>
          {detectedCourse && (
            <div className="flex items-center gap-2 mb-4 text-sm text-(--color-path)">
              <GraduationCap size={15} />
              Detected course: <Badge tone="path">{detectedCourse}</Badge>
            </div>
          )}
          <div className="space-y-3">
            {results.map((r, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between mb-2">
                  <Badge>{r.course}</Badge>
                  <span className="text-xs font-mono text-(--color-muted) flex items-center gap-1">
                    <Sparkles size={11} />
                    similarity {r.similarity}
                  </span>
                </div>
                <p className="text-sm text-(--color-muted) leading-relaxed">{r.review}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
