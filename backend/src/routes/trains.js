import { Router } from "express";
import { Train } from "../models/Train.js";
import { Prediction } from "../models/Prediction.js";

const router = Router();

router.get("/", async (_req, res) => {
  const trains = await Train.find().sort({ trainId: 1 }).lean();
  const preds = await Prediction.find().sort({ createdAt: -1 }).lean();
  const byTrain = new Map();
  for (const p of preds) {
    if (!byTrain.has(p.trainId)) byTrain.set(p.trainId, p);
  }
  res.json(trains.map((t) => ({ ...t, latestPrediction: byTrain.get(t.trainId) || null })));
});

router.post("/seed", async (_req, res) => {
  const seed = [
    { trainId: "1001", name: "Udarata Menike", routeId: "MAIN_1", routeName: "Colombo Fort - Kandy", currentStation: "Maradana", nextStation: "Ragama", status: "ON_TIME" },
    { trainId: "2002", name: "Ruhunu Kumari", routeId: "COASTAL_1", routeName: "Colombo Fort - Matara", currentStation: "Colombo Fort", nextStation: "Panadura", status: "ON_TIME" },
    { trainId: "3003", name: "Yal Devi", routeId: "NORTHERN_1", routeName: "Colombo Fort - Jaffna", currentStation: "Ragama", nextStation: "Polgahawela", status: "DELAYED" }
  ];
  for (const t of seed) await Train.updateOne({ trainId: t.trainId }, t, { upsert: true });
  res.json({ ok: true, count: seed.length });
});

export default router;
