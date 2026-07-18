import { useEffect, useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { JourneyPlanner } from "./pages/JourneyPlanner";
import { TopNav } from "./components/TopNav";
import { PageHeader } from "./components/PageHeader";
import { PageFooter } from "./components/PageFooter";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

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
            title={page === "dashboard" ? "Intelligent Rail Operations" : "AI Journey Planner"}
            subtitle={page === "dashboard" ? "Real-time train tracking, probabilistic delay prediction, and operational visibility." : "Find nearest boarding station, best train ranking, ETA, delay risk, and live map tracking."}
          />
          {page === "dashboard" ? <Dashboard /> : <JourneyPlanner />}
          <PageFooter />
        </main>
      </div>
    </div>
  );
}
