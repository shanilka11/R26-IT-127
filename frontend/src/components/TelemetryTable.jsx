const asNumber = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

export function TelemetryTable({ telemetry }) {
  if (!telemetry.length) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No telemetry records loaded.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-slate-100 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <tr>
            <th className="px-3 py-2 font-semibold">Time</th>
            <th className="px-3 py-2 font-semibold">Speed (km/h)</th>
            <th className="px-3 py-2 font-semibold">Observed Delay</th>
            <th className="px-3 py-2 font-semibold">Coordinates</th>
          </tr>
        </thead>
        <tbody>
          {telemetry.map((t) => (
            <tr key={t._id || `${t.trainId}-${t.eventTime}`} className="border-t border-slate-200 dark:border-slate-700 dark:text-slate-200">
              <td className="px-3 py-2">{t.eventTime ? new Date(t.eventTime).toLocaleString() : "N/A"}</td>
              <td className="px-3 py-2">{asNumber(t.speedKmh).toFixed(2)}</td>
              <td className="px-3 py-2">{asNumber(t.observedDelayMin).toFixed(2)}</td>
              <td className="px-3 py-2">{asNumber(t.latitude).toFixed(4)}, {asNumber(t.longitude).toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
