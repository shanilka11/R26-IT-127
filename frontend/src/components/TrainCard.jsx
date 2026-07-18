const asNumber = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

export function TrainCard({ train, onSimulate, onPredict }) {
  const p = train.latestPrediction;
  const status = (train.status || "ON_TIME").toLowerCase();
  const predictedDelay = asNumber(p?.predictedDelayMin);
  const probabilityDelayed = asNumber(p?.probabilityDelayed);
  const confidenceLow = asNumber(p?.confidenceLow);
  const confidenceHigh = asNumber(p?.confidenceHigh);
  const statusBadge =
    status === "delayed" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700";
  const cardTheme =
    status === "delayed"
      ? "from-red-50 via-white to-orange-50 dark:from-red-950/30 dark:via-slate-900 dark:to-orange-950/20"
      : "from-teal-50 via-white to-cyan-50 dark:from-teal-950/20 dark:via-slate-900 dark:to-cyan-950/20";
  const riskChip =
    probabilityDelayed >= 0.7
      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
      : probabilityDelayed >= 0.4
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";

  return (
    <article className={`rounded-xl border border-slate-200 bg-gradient-to-br p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 ${cardTheme}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold dark:text-slate-100">{train.name || train.trainId || "Unknown Train"}</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge}`}>
          {train.status || "ON_TIME"}
        </span>
      </div>
      <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/60">
        <div
          className={`h-full rounded-full ${
            probabilityDelayed >= 0.7
              ? "bg-gradient-to-r from-red-500 to-rose-600"
              : probabilityDelayed >= 0.4
                ? "bg-gradient-to-r from-amber-400 to-orange-500"
                : "bg-gradient-to-r from-emerald-400 to-teal-500"
          }`}
          style={{ width: `${Math.max(8, Math.min(100, probabilityDelayed * 100))}%` }}
        />
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">{train.trainId || "N/A"}</p>
      <p className="text-sm text-slate-600 dark:text-slate-300">{train.routeName || "Unknown route"}</p>
      <p className="text-sm text-slate-700 dark:text-slate-200">
        {train.currentStation || "Unknown"} {"->"} {train.nextStation || "Unknown"}
      </p>
      {p ? (
        <div className="my-2 flex flex-col gap-1 text-sm">
          <strong className="text-slate-900 dark:text-slate-100">{predictedDelay.toFixed(2)} min</strong>
          <span className="text-slate-700 dark:text-slate-300">Delay probability: {(probabilityDelayed * 100).toFixed(1)}%</span>
          <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${riskChip}`}>
            {probabilityDelayed >= 0.7 ? "Critical Risk" : probabilityDelayed >= 0.4 ? "Moderate Risk" : "Low Risk"}
          </span>
          <span className="text-slate-700 dark:text-slate-300">
            CI: {confidenceLow.toFixed(2)} - {confidenceHigh.toFixed(2)} min
          </span>
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">No predictions yet</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-secondary px-3 py-2" onClick={() => onSimulate(train.trainId, train.routeId)}>
          Simulate GPS
        </button>
        <button className="btn-primary px-3 py-2" onClick={() => onPredict(train.trainId)}>
          Predict Delay
        </button>
      </div>
    </article>
  );
}
