import { useEffect, useMemo, useState } from "react";
import {
  getPredictions,
  getTrainTelemetry,
  getTrains,
  predictTrainDelay,
  seedTrains,
  simulateTelemetry,
  pullIngest,
  startIngestScheduler,
  stopIngestScheduler,
  getIngestStatus
} from "../api/client";
import { TrainCard } from "../components/TrainCard";
import { TelemetryTable } from "../components/TelemetryTable";
import train3dRealistic from "../assets/train-3d-realistic.png";

function Sparkline({ values = [], color = "#0f766e" }) {
  if (!values.length) return null;
  const width = 180;
  const height = 44;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / span) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-11 w-full">
      <polyline fill="none" stroke={color} strokeWidth="3" points={points} />
    </svg>
  );
}

export function Dashboard() {
  const [trains, setTrains] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [selectedTrainId, setSelectedTrainId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ingestState, setIngestState] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [trainsRes, predRes, ingestRes] = await Promise.all([getTrains(), getPredictions(), getIngestStatus()]);
      setTrains(trainsRes.data);
      setPredictions(predRes.data);
      setIngestState(ingestRes.data);
      if (!selectedTrainId && trainsRes.data.length) setSelectedTrainId(trainsRes.data[0].trainId);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!selectedTrainId) return;
    getTrainTelemetry(selectedTrainId)
      .then((res) => setTelemetry(res.data))
      .catch((err) => {
        setTelemetry([]);
        setError(err?.response?.data?.message || err.message || "Failed to load telemetry.");
      });
  }, [selectedTrainId]);

  const onSeed = async () => {
    await seedTrains();
    await refresh();
  };
  const onSimulateOne = async (trainId, routeId) => {
    await simulateTelemetry(trainId, routeId);
    if (selectedTrainId === trainId) {
      const res = await getTrainTelemetry(trainId);
      setTelemetry(res.data);
    }
  };
  const onPredict = async (trainId) => {
    await predictTrainDelay(trainId);
    await refresh();
  };

  const adminStats = useMemo(() => {
    const delayed = trains.filter((t) => Number(t.latestPrediction?.probabilityDelayed || 0) >= 0.6).length;
    return { trains: trains.length, predictions: predictions.length, highRiskDelayed: delayed };
  }, [trains, predictions]);

  const trendData = useMemo(() => {
    const recent = [...predictions].slice(0, 20).reverse();
    return {
      delays: recent.map((p) => Number(p.predictedDelayMin || 0)),
      risk: recent.map((p) => Number((p.probabilityDelayed || 0) * 100)),
      throughput: recent.map((_p, i) => 50 + ((i * 7) % 35))
    };
  }, [predictions]);

  const avgDelay = useMemo(() => {
    if (!predictions.length) return 0;
    return predictions.reduce((sum, p) => sum + Number(p.predictedDelayMin || 0), 0) / predictions.length;
  }, [predictions]);

  const onTimePercent = useMemo(() => {
    if (!trains.length) return 0;
    const onTime = trains.filter((t) => Number(t.latestPrediction?.probabilityDelayed || 0) < 0.4).length;
    return (onTime / trains.length) * 100;
  }, [trains]);

  const recentEvents = useMemo(() => {
    const events = [];
    if (ingestState?.lastIngest?.at) {
      events.push({
        type: "Ingestion",
        message: `${ingestState.lastIngest.count || 0} telemetry rows`,
        at: ingestState.lastIngest.at
      });
    }
    predictions.slice(0, 4).forEach((p) => {
      events.push({
        type: "Prediction",
        message: `${p.trainId} delay ${Number(p.predictedDelayMin || 0).toFixed(1)} min`,
        at: p.createdAt || new Date().toISOString()
      });
    });
    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 6);
  }, [ingestState, predictions]);

  return (
    <section className="mt-4">
      {error ? <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}

      <div className="relative mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-5 shadow-xl dark:border-slate-700">
        <div className="absolute -left-10 top-6 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="absolute right-10 top-10 h-36 w-36 rounded-full bg-teal-400/20 blur-2xl" />
        <div className="relative grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-xs text-slate-300">On-Time Performance</p><p className="text-2xl font-bold text-white">{onTimePercent.toFixed(1)}%</p></div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-xs text-slate-300">Average Predicted Delay</p><p className="text-2xl font-bold text-white">{avgDelay.toFixed(1)} min</p></div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-xs text-slate-300">Active Trains</p><p className="text-2xl font-bold text-white">{adminStats.trains}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-xs text-slate-300">High-Risk Alerts</p><p className="text-2xl font-bold text-white">{adminStats.highRiskDelayed}</p></div>
        </div>
      </div>

      <section className="mb-4 grid grid-cols-1 gap-3">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <img className="h-56 w-full object-cover" src={train3dRealistic} alt="Realistic 3D train visual" />
          <div className="p-3"><p className="text-sm font-semibold dark:text-slate-100">AI Operations Visualization</p><p className="text-xs text-slate-500 dark:text-slate-400">Real-time command center concept for rail intelligence.</p></div>
        </article>
      </section>

      <section className="mb-4 flex flex-wrap items-center gap-2">
        <button className="btn-secondary px-3 py-2" onClick={onSeed}>Seed Trains</button>
        <button className="btn-secondary px-3 py-2" onClick={async () => { await pullIngest({ mode: "simulation" }); await refresh(); }}>Pull Ingest Now</button>
        <button className="btn-secondary px-3 py-2" onClick={async () => { await startIngestScheduler({ intervalMinutes: 1, mode: "simulation" }); await refresh(); }}>Start Auto Ingest</button>
        <button className="btn-secondary px-3 py-2" onClick={async () => { await stopIngestScheduler(); await refresh(); }}>Stop Auto Ingest</button>
        <button className="btn-primary px-3 py-2" onClick={refresh} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
        <select className="select-field px-3 py-2" value={selectedTrainId} onChange={(e) => setSelectedTrainId(e.target.value)}>{trains.map((t) => <option key={t.trainId} value={t.trainId}>{t.trainId}</option>)}</select>
      </section>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        Scheduler: {ingestState?.scheduler?.running ? `Running every ${ingestState.scheduler.intervalMinutes}m` : "Stopped"} | Last ingest: {ingestState?.lastIngest?.at ? new Date(ingestState.lastIngest.at).toLocaleTimeString() : "N/A"} | Count: {ingestState?.lastIngest?.count ?? 0}
      </section>

      <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Trains</h4><strong className="mt-1 block text-2xl font-bold text-slate-900 dark:text-slate-100">{adminStats.trains}</strong></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Predictions</h4><strong className="mt-1 block text-2xl font-bold text-slate-900 dark:text-slate-100">{adminStats.predictions}</strong></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400">High Delay Risk</h4><strong className="mt-1 block text-2xl font-bold text-slate-900 dark:text-slate-100">{adminStats.highRiskDelayed}</strong></article>
      </section>

      <section className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Delay Trend (min)</p><Sparkline values={trendData.delays} color="#0f766e" /></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Risk Trend (%)</p><Sparkline values={trendData.risk} color="#dc2626" /></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Network Throughput</p><Sparkline values={trendData.throughput} color="#2563eb" /></article>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {loading && !trains.length ? Array.from({ length: 3 }).map((_, i) => <div key={`sk-${i}`} className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />) : null}
        {!loading && !trains.length ? <article className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">No trains yet. Click <strong>Seed Trains</strong> and then <strong>Pull Ingest Now</strong>.</article> : null}
        {trains.map((train) => <div key={train.trainId} onClick={() => setSelectedTrainId(train.trainId)}><TrainCard train={train} onSimulate={onSimulateOne} onPredict={onPredict} /></div>)}
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="mb-2 text-lg font-semibold dark:text-slate-100">Recent Telemetry ({selectedTrainId || "select train"})</h2><TelemetryTable telemetry={telemetry} /></section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-lg font-semibold dark:text-slate-100">Live Event Timeline</h2>
        <ul className="space-y-2 text-sm">
          {recentEvents.length ? recentEvents.map((e, i) => (
            <li key={`${e.type}-${i}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
              <span className="mr-2 inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white dark:bg-slate-700">{e.type}</span>
              <span>{e.message}</span>
              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{new Date(e.at).toLocaleTimeString()}</span>
            </li>
          )) : <li className="text-slate-500 dark:text-slate-400">No events yet.</li>}
        </ul>
      </section>
    </section>
  );
}
