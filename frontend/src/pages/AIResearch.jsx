import { useEffect, useMemo, useState } from "react";
import { getResearchOverview } from "../api/client";

const number = (value, digits = 1) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : "N/A";
const time = (value) => value ? new Date(value).toLocaleString() : "Pending";

function StatusBadge({ status }) {
  const positive = ["AVAILABLE", "STABLE", "CONTEXT_ONLY"].includes(status);
  const warning = ["INSUFFICIENT_DATA", "NOT_CONFIGURED"].includes(status);
  const css = positive
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
    : warning
      ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900"
      : "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ring-1 ring-inset ${css}`}>{String(status || "UNKNOWN").replaceAll("_", " ")}</span>;
}

function MetricCard({ label, value, unit, detail, accent = "teal" }) {
  const colors = {
    teal: "from-teal-500 to-emerald-500",
    blue: "from-blue-500 to-cyan-500",
    amber: "from-amber-400 to-orange-500",
    rose: "from-rose-500 to-red-500"
  };
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${colors[accent]}`} />
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}<span className="ml-1 text-sm font-bold text-slate-400">{unit}</span></p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
    </article>
  );
}

function ErrorBars({ evaluations }) {
  const rows = evaluations.filter((row) => row.actualDelayMin !== null).slice(0, 16).reverse();
  const max = Math.max(1, ...rows.flatMap((row) => [row.actualDelayMin, row.predictedDelayMin]));
  if (!rows.length) return <p className="py-10 text-center text-sm text-slate-500">No matched prediction outcomes yet.</p>;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.predictionId} className="grid grid-cols-[70px_1fr] items-center gap-3">
          <span className="truncate text-xs font-bold text-slate-500">{row.trainId}</span>
          <div>
            <div className="mb-1 flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <span className="h-full bg-teal-500" style={{ width: `${Math.max(2, (row.predictedDelayMin / max) * 100)}%` }} />
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <span className="h-full bg-amber-400" style={{ width: `${Math.max(2, (row.actualDelayMin / max) * 100)}%` }} />
            </div>
          </div>
        </div>
      ))}
      <div className="flex gap-4 pt-2 text-[10px] font-bold text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-teal-500" />Predicted</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />Actual</span></div>
    </div>
  );
}

function ExplanationCard({ explanation }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="text-sm font-extrabold text-slate-950 dark:text-white">Train {explanation.trainId}</p><p className="text-xs text-slate-500 dark:text-slate-400">Predicted {number(explanation.predictedDelayMin)} min delay</p></div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-300">{number(explanation.probabilityDelayed * 100, 0)}% risk</span>
      </div>
      <div className="mt-4 space-y-3">
        {explanation.factors.map((factor) => (
          <div key={factor.name}>
            <div className="mb-1 flex justify-between text-[11px]"><span className="font-bold text-slate-700 dark:text-slate-200">{factor.name}</span><span className="text-slate-500">{number(factor.contributionPercent, 0)}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" style={{ width: `${factor.contributionPercent}%` }} /></div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{factor.detail} / {factor.direction}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-white p-2 dark:bg-slate-900"><span className="text-slate-400">Confidence range</span><p className="font-extrabold text-slate-900 dark:text-white">{number(explanation.confidenceLow)}-{number(explanation.confidenceHigh)} min</p></div>
        <div className="rounded-lg bg-white p-2 dark:bg-slate-900"><span className="text-slate-400">Telemetry</span><p className="font-extrabold text-slate-900 dark:text-white">{explanation.inputs.telemetrySource}</p></div>
      </div>
    </article>
  );
}

export function AIResearch() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getResearchOverview();
      setData(response.data);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || "Research metrics could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  const coverage = data?.dataQuality?.evaluationCoveragePercent || 0;
  const routes = useMemo(() => data?.routePerformance || [], [data]);

  if (loading) return <div className="mt-4 grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />)}</div>;

  return (
    <section className="mt-4 space-y-4">
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}<button className="ml-3 font-bold underline" onClick={load}>Retry</button></div> : null}
      {!data ? null : <>
        <div className="overflow-hidden rounded-2xl bg-slate-950 p-6 text-white shadow-xl ring-1 ring-white/10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-teal-300">Research observability</p><h2 className="mt-2 text-2xl font-black">Model intelligence and evidence</h2><p className="mt-1 max-w-2xl text-sm text-slate-400">Transparent performance monitoring from stored predictions and subsequent telemetry outcomes.</p></div>
            <div className="flex gap-2"><StatusBadge status={data.model.health} /><button className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold hover:bg-white/15" onClick={load}>Refresh evidence</button></div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {[["Framework", data.model.framework], ["Task", data.model.task], ["Sequence", `${data.model.sequenceLength} updates`], ["Generated", time(data.generatedAt)]].map(([label, value]) => <div key={label} className="rounded-xl bg-white/5 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-sm font-extrabold">{value}</p></div>)}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Mean absolute error" value={number(data.performance.maeMinutes)} unit="min" detail={`${data.performance.evaluatedCount} matched outcomes`} />
          <MetricCard label="Root mean squared error" value={number(data.performance.rmseMinutes)} unit="min" detail="Penalizes larger prediction errors" accent="blue" />
          <MetricCard label="Evaluation coverage" value={number(coverage, 0)} unit="%" detail={`${data.dataQuality.predictionsStored} predictions scanned`} accent="amber" />
          <MetricCard label="Mean prediction bias" value={number(data.performance.meanBiasMinutes)} unit="min" detail="Positive means over-prediction" accent="rose" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-teal-600">Prediction versus reality</p><h3 className="text-lg font-extrabold text-slate-950 dark:text-white">Recent delay comparison</h3></div>
            <ErrorBars evaluations={data.evaluations} />
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-600">Performance monitoring</p><h3 className="text-lg font-extrabold text-slate-950 dark:text-white">Model drift signal</h3></div><StatusBadge status={data.monitoring.status} /></div>
            <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-[10px] uppercase text-slate-400">Recent MAE</p><p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{number(data.monitoring.recentMaeMinutes)}<small className="ml-1 text-xs text-slate-400">min</small></p></div><div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-[10px] uppercase text-slate-400">Previous MAE</p><p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{number(data.monitoring.previousMaeMinutes)}<small className="ml-1 text-xs text-slate-400">min</small></p></div></div>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{data.monitoring.message}</p>
          </article>
        </div>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-teal-600">Explainable AI</p><h3 className="text-lg font-extrabold text-slate-950 dark:text-white">Why the model predicts a delay</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Approximate feature attribution from the model inputs. These values are interpretations, not causal claims.</p></div>
          <div className="grid gap-3 lg:grid-cols-2">{data.explanations.length ? data.explanations.map((item, index) => <ExplanationCard key={`${item.trainId}-${index}`} explanation={item} />) : <p className="text-sm text-slate-500">Generate predictions from the dashboard to see explanations.</p>}</div>
        </article>

        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-extrabold text-slate-950 dark:text-white">Route-level performance</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Same matching method used for every route.</p>
            <div className="mt-4 space-y-2">{routes.length ? routes.map((route) => <div key={route.routeId} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div><p className="text-sm font-bold text-slate-900 dark:text-white">{route.routeId}</p><p className="text-[10px] text-slate-500">{route.evaluatedCount} outcomes</p></div><div className="text-right"><p className="text-sm font-extrabold text-teal-700 dark:text-teal-300">{number(route.maeMinutes)} min</p><p className="text-[9px] uppercase text-slate-400">MAE</p></div></div>) : <p className="mt-4 text-sm text-slate-500">No route outcomes are matched yet.</p>}</div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-2"><h3 className="font-extrabold text-slate-950 dark:text-white">Route-specific models</h3><StatusBadge status={data.model.routeSpecificModels.available ? "AVAILABLE" : "NOT_CONFIGURED"} /></div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{data.model.routeSpecificModels.message}</p>
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">A fair comparison requires route models trained on the same training partition and evaluated on the same untouched test partition. No scores are invented here.</div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-2"><h3 className="font-extrabold text-slate-950 dark:text-white">Weather context</h3><StatusBadge status={data.weather.status} /></div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{data.weather.message}</p>
            <div className="mt-4 rounded-xl bg-amber-50 p-4 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Weather must be added to the training dataset and the model must be retrained and evaluated before claiming weather-aware predictions.</div>
          </article>
        </div>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800"><h3 className="font-extrabold text-slate-950 dark:text-white">Prediction audit trail</h3><p className="text-xs text-slate-500 dark:text-slate-400">Stored predictions matched to the first subsequent telemetry outcome.</p></div>
          <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-800"><tr>{["Train", "Route", "Predicted", "Actual", "Absolute error", "Confidence", "Predicted at"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody>{data.evaluations.slice(0, 30).map((row) => <tr key={row.predictionId} className="border-t border-slate-100 dark:border-slate-800"><td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{row.trainId}</td><td className="px-4 py-3 text-slate-500">{row.routeId || "Pending"}</td><td className="px-4 py-3">{number(row.predictedDelayMin)} min</td><td className="px-4 py-3">{row.actualDelayMin === null ? "Pending" : `${number(row.actualDelayMin)} min`}</td><td className="px-4 py-3 font-bold">{row.absoluteErrorMin === null ? "Pending" : `${number(row.absoluteErrorMin)} min`}</td><td className="px-4 py-3">{number(row.confidenceLow)}-{number(row.confidenceHigh)}</td><td className="px-4 py-3 text-slate-500">{time(row.predictedAt)}</td></tr>)}</tbody></table></div>
        </article>
      </>}
    </section>
  );
}
