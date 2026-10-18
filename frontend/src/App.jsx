import { useEffect, useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { JourneyPlanner } from "./pages/JourneyPlanner";
import { AIResearch } from "./pages/AIResearch";
import { TopNav } from "./components/TopNav";
import { PageHeader } from "./components/PageHeader";
import { PageFooter } from "./components/PageFooter";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const pageCopy = {
    dashboard: {
      title: "Intelligent Rail Operations",
      subtitle: "Real-time train tracking, probabilistic delay prediction, and operational visibility."
    },
    journey: {
      title: "AI Journey Planner",
      subtitle: "Find the best boarding station, compare trains, and follow your journey live."
    },
    research: {
      title: "AI Research Lab",
      subtitle: "Explainability, confidence, model performance, drift monitoring, and reproducible evidence."
    }
  };
  const currentPage = pageCopy[page] || pageCopy.dashboard;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="grid min-h-screen md:grid-cols-[280px_1fr]">
        <TopNav page={page} onChange={setPage} theme={theme} onToggleTheme={() => setTheme((v) => (v === "dark" ? "light" : "dark"))} />
        <main className="p-4 md:p-6">
          <PageHeader
            title={currentPage.title}
            subtitle={currentPage.subtitle}
          />
          {page === "dashboard" ? <Dashboard /> : page === "journey" ? <JourneyPlanner /> : <AIResearch />}
          <PageFooter />
        </main>
      </div>
    </div>
  );
}
