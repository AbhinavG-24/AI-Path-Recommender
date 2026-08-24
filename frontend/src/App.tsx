import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import SkillGraphPage from "./pages/SkillGraphPage";
import RoadmapPage from "./pages/RoadmapPage";
import Recommendations from "./pages/Recommendations";
import AssessmentPage from "./pages/AssessmentPage";
import Tutor from "./pages/Tutor";
import Simulator from "./pages/Simulator";
import CourseInsights from "./pages/CourseInsights";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/skill-graph" element={<SkillGraphPage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/assessment" element={<AssessmentPage />} />
            <Route path="/tutor" element={<Tutor />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/course-insights" element={<CourseInsights />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
