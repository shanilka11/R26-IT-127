import { Router } from "express";
import { Prediction } from "../models/Prediction.js";
import { Telemetry } from "../models/Telemetry.js";
import { predictDelay } from "../services/mlClient.js";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await Prediction.find().sort({ createdAt: -1 }).limit(100).lean();
  res.json(rows);
});

router.post("/:trainId", async (req, res) => {
  const trainId = req.params.trainId;
  const latest = await Telemetry.find({ trainId }).sort({ eventTime: -1 }).limit(12).lean();
  if (!latest.length) return res.status(400).json({ message: "No telemetry for this train" });
  const features = latest.map((x) => ({ speedKmh: x.speedKmh, observedDelayMin: x.observedDelayMin || 0 }));
  const ml = await predictDelay({ trainId, sequence: features });
  const saved = await Prediction.create({ trainId, ...ml });
  res.json(saved);
});

export default router;
