export function TopNav({ page, onChange, theme, onToggleTheme }) {
  return (
    <aside className="relative flex flex-row gap-2 overflow-x-auto border-b border-slate-700 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-3 text-slate-100 md:flex-col md:gap-5 md:overflow-visible md:border-b-0 md:border-r md:border-r-slate-800 md:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.15),_transparent_45%)]" />
      <div className="hidden md:block">
        <p className="text-xs uppercase tracking-[0.24em] text-teal-300">Ceylonrail</p>
        <h1 className="mt-1 text-xl font-extrabold text-white">Control Center</h1>
        <p className="mt-2 max-w-[220px] text-xs leading-relaxed text-slate-400">Operations and passenger experience in one workspace.</p>
      </div>
      <div className="relative flex gap-2 md:flex-col">
        <button
          className={`rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ${
            page === "dashboard"
              ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-900/40 ring-1 ring-teal-300/40"
              : "bg-slate-900/80 text-slate-200 ring-1 ring-slate-700/70 hover:bg-slate-800"
          }`}
          onClick={() => onChange("dashboard")}
        >
          Operations Dashboard
        </button>
        <button
          className={`rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ${
            page === "journey"
              ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-900/40 ring-1 ring-teal-300/40"
              : "bg-slate-900/80 text-slate-200 ring-1 ring-slate-700/70 hover:bg-slate-800"
          }`}
          onClick={() => onChange("journey")}
        >
          Journey Planner Map
        </button>
      </div>
      <button className="btn-ghost-dark relative text-left ring-1 ring-slate-700/80 hover:ring-teal-500/40" onClick={onToggleTheme}>
        Switch to {theme === "dark" ? "Light" : "Dark"} Mode
      </button>
      <div className="hidden md:mt-auto md:block">
        <p className="text-xs text-slate-400">System Status</p>
        <div className="mt-1 inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs shadow-inner shadow-slate-950/70">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Live Services Connected
        </div>
      </div>
    </aside>
  );
}
