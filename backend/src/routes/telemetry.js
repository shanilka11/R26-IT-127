import { Router } from "express";
import { Telemetry } from "../models/Telemetry.js";

const router = Router();

router.get("/export/csv", async (_req, res) => {
  const rows = await Telemetry.find().sort({ eventTime: 1 }).lean();
  const header = "trainId,routeId,eventTime,speedKmh,observedDelayMin,latitude,longitude,source";
  const lines = rows.map((r) => [
    r.trainId,
    r.routeId,
    new Date(r.eventTime).toISOString(),
    Number(r.speedKmh || 0),
    Number(r.observedDelayMin || 0),
    Number(r.latitude || 0),
    Number(r.longitude || 0),
    r.source || "GPS"
  ].join(","));
  res.setHeader("Content-Type", "text/csv");
  res.send([header, ...lines].join("\n"));
});

router.get("/:trainId", async (req, res) => {
  const rows = await Telemetry.find({ trainId: req.params.trainId }).sort({ eventTime: -1 }).limit(50).lean();
  res.json(rows);
});

router.post("/simulate", async (req, res) => {
  const { trainId, routeId, latitude, longitude } = req.body;
  const row = await Telemetry.create({
    trainId,
    routeId: routeId || "SIM",
    latitude: latitude ?? 6.93 + Math.random() * 0.5,
    longitude: longitude ?? 79.84 + Math.random() * 0.8,
    speedKmh: 35 + Math.random() * 45,
    observedDelayMin: Math.round(Math.random() * 20),
    source: "GPS",
    eventTime: new Date()
  });
  res.status(201).json(row);
});

export default router;
