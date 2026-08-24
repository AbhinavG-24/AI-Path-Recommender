const BASE = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail || "Request failed");
  }
  return res.json();
}

export const api = {
  analyzeGoal: (text: string) =>
    request<any>("/analyze-goal", { method: "POST", body: JSON.stringify({ text }) }),

  saveProfile: (payload: any) =>
    request<any>("/profile", { method: "POST", body: JSON.stringify(payload) }),

  getProfile: (userId: number) => request<any>(`/profile/${userId}`),

  skillGap: (userId: number) =>
    request<any>("/skill-gap", { method: "POST", body: JSON.stringify({ user_id: userId }) }),

  recommendations: (userId: number, topK = 8, skillId?: string) =>
    request<any>("/recommendations", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, top_k: topK, skill_id: skillId }),
    }),

  roadmap: (userId: number) =>
    request<any>("/roadmap", { method: "POST", body: JSON.stringify({ user_id: userId }) }),

  getRoadmap: (userId: number) => request<any>(`/roadmap/${userId}`),

  dashboard: (userId: number) => request<any>(`/dashboard/${userId}`),

  skillGraph: () => request<any>("/skill-graph"),

  skills: () => request<any>("/skills"),

  createAssessment: (userId: number, skillId: string) =>
    request<any>("/assessment", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, skill_id: skillId }),
    }),

  submitAssessment: (userId: number, skillId: string, answers: Record<string, string>) =>
    request<any>("/assessment/submit", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, skill_id: skillId, answers }),
    }),

  feedback: (userId: number, resourceId: string, signal: string) =>
    request<any>("/feedback", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, resource_id: resourceId, signal }),
    }),

  chat: (userId: number, message: string) =>
    request<any>("/chat", { method: "POST", body: JSON.stringify({ user_id: userId, message }) }),

  simulate: (
    userId: number,
    overrides: {
      hours_per_week?: number;
      deadline_months?: number;
      target_role?: string;
      assume_known_skills?: string[];
    }
  ) =>
    request<any>("/roadmap/simulate", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, ...overrides }),
    }),

  todayPlan: (userId: number) => request<any>(`/today-plan?user_id=${userId}`),

  completeResource: (userId: number, resourceId: string) =>
    request<any>("/progress/complete", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, resource_id: resourceId }),
    }),

  similarReviews: (query: string, k = 5, courseHint?: string) =>
    request<any>("/reviews/similar", {
      method: "POST",
      body: JSON.stringify({ query, k, course_hint: courseHint }),
    }),

  reviewCourses: () => request<any>("/reviews/courses"),
};
