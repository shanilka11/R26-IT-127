import { Router } from "express";
import { Telemetry } from "../models/Telemetry.js";
import { pullFromHttpProvider, pullFromSimulationProvider } from "../services/ingestionProviders.js";

const router = Router();

let lastIngest = { ok: true, source: "none", count: 0, at: null, message: "No ingestion yet" };
let scheduler = {
  running: false,
  intervalMinutes: 0,
  mode: "simulation",
  providerUrl: "",
  providerToken: "",
  nextRunAt: null,
  timer: null
};

const runPull = async ({ mode, providerUrl, providerToken }) => {
  let rows = [];
  if (mode === "http") {
    if (!providerUrl) throw new Error("providerUrl required for http mode");
    rows = await pullFromHttpProvider(providerUrl, providerToken);
  } else {
    rows = await pullFromSimulationProvider();
  }

  if (!rows.length) {
    lastIngest = { ok: false, source: mode, count: 0, at: new Date().toISOString(), message: "No rows received" };
    return lastIngest;
  }

  const docs = await Telemetry.insertMany(rows, { ordered: false });
  lastIngest = { ok: true, source: mode, count: docs.length, at: new Date().toISOString(), message: "Ingested successfully" };
  return lastIngest;
};

router.get("/status", (_req, res) => {
  const { timer, ...safeScheduler } = scheduler;
  res.json({ lastIngest, scheduler: safeScheduler });
});

router.post("/pull", async (req, res, next) => {
  try {
    const mode = String(req.body?.mode || process.env.INGEST_MODE || "simulation").toLowerCase();
    const providerUrl = req.body?.providerUrl || process.env.INGEST_PROVIDER_URL;
    const providerToken = req.body?.providerToken || process.env.INGEST_PROVIDER_TOKEN;
    const result = await runPull({ mode, providerUrl, providerToken });
    return res.json(result);
  } catch (error) {
    lastIngest = { ok: false, source: "error", count: 0, at: new Date().toISOString(), message: error.message };
    return next(error);
  }
});

router.post("/start", async (req, res, next) => {
  try {
    const intervalMinutes = Math.max(Number(req.body?.intervalMinutes || 5), 1);
    const mode = String(req.body?.mode || process.env.INGEST_MODE || "simulation").toLowerCase();
    const providerUrl = req.body?.providerUrl || process.env.INGEST_PROVIDER_URL || "";
    const providerToken = req.body?.providerToken || process.env.INGEST_PROVIDER_TOKEN || "";

    if (scheduler.timer) {
      clearInterval(scheduler.timer);
    }

    await runPull({ mode, providerUrl, providerToken });

    const intervalMs = intervalMinutes * 60 * 1000;
    scheduler.timer = setInterval(async () => {
      try {
        await runPull({ mode, providerUrl, providerToken });
        scheduler.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
      } catch (error) {
        lastIngest = { ok: false, source: "scheduler", count: 0, at: new Date().toISOString(), message: error.message };
      }
    }, intervalMs);

    scheduler.running = true;
    scheduler.intervalMinutes = intervalMinutes;
    scheduler.mode = mode;
    scheduler.providerUrl = providerUrl;
    scheduler.providerToken = providerToken ? "***" : "";
    scheduler.nextRunAt = new Date(Date.now() + intervalMs).toISOString();

    const { timer, ...safeScheduler } = scheduler;
    return res.json({ ok: true, message: "Ingestion scheduler started", scheduler: safeScheduler, lastIngest });
  } catch (error) {
    lastIngest = { ok: false, source: "error", count: 0, at: new Date().toISOString(), message: error.message };
    return next(error);
  }
});

router.post("/stop", (_req, res) => {
  if (scheduler.timer) clearInterval(scheduler.timer);
  scheduler = {
    running: false,
    intervalMinutes: 0,
    mode: scheduler.mode,
    providerUrl: scheduler.providerUrl,
    providerToken: scheduler.providerToken,
    nextRunAt: null,
    timer: null
  };
  const { timer, ...safeScheduler } = scheduler;
  return res.json({ ok: true, message: "Ingestion scheduler stopped", scheduler: safeScheduler });
});

export default router;
