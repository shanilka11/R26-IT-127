import { Router } from "express";
import {
  buildRailPath,
  findAlternativeBoardingStations,
  findBoardingOption,
  findDestinationStation,
  findNearestStation,
  haversineKm,
  listStations
} from "../services/journeyService.js";
import { Telemetry } from "../models/Telemetry.js";
import { predictDelay } from "../services/mlClient.js";

const router = Router();

router.get("/stations", (_req, res) => res.json(listStations()));
router.get("/nearest-station", (req, res) => {
  const lat = Number(req.query.lat); const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ message: "lat and lon required" });
  res.json(findNearestStation(lat, lon));
});

router.post("/plan", async (req, res) => {
  const { lat, lon, destination } = req.body;
  const origin = findNearestStation(Number(lat), Number(lon));
  const destinationStation = findDestinationStation(destination);
  if (!destinationStation) return res.status(404).json({ message: "Destination not found" });
  const boarding = await findBoardingOption(Number(lat), Number(lon), destinationStation);
  const alternatives = await findAlternativeBoardingStations(Number(lat), Number(lon), destinationStation, 4);
  const trains = boarding.trains || [];
  const latest = await Telemetry.find({ trainId: { $in: trains.map((t) => t.trainId) } }).sort({ eventTime: -1 }).lean();
  const map = new Map();
  latest.forEach((t) => { if (!map.has(t.trainId)) map.set(t.trainId, t); });
  const trainEtasRaw = trains.map((t) => {
    const gps = map.get(t.trainId);
    const speed = Math.max(Number(gps?.speedKmh || 45), 20);
    const sLat = gps?.latitude ?? boarding.boardingStation.lat;
    const sLon = gps?.longitude ?? boarding.boardingStation.lon;
    const toBoardKm = haversineKm(sLat, sLon, boarding.boardingStation.lat, boarding.boardingStation.lon);
    const toDestKm = haversineKm(boarding.boardingStation.lat, boarding.boardingStation.lon, destinationStation.lat, destinationStation.lon);
    const minsBoard = (toBoardKm / speed) * 60;
    const minsTrip = (toDestKm / speed) * 60;
    const delay = Number((gps?.observedDelayMin || 0).toFixed(1));
    return {
      trainId: t.trainId,
      hasLiveGps: Boolean(gps),
      etaBoardingIso: new Date(Date.now() + minsBoard * 60000).toISOString(),
      etaDestinationIso: new Date(Date.now() + (minsBoard + minsTrip) * 60000).toISOString(),
      minutesToBoarding: Number(minsBoard.toFixed(1)),
      tripMinutesBoardingToDestination: Number(minsTrip.toFixed(1)),
      estimatedDelayMin: delay,
      rankingScore: Number((100 - minsBoard * 1.2 - delay * 2 - minsTrip * 0.25).toFixed(2)),
      source: gps ? "LIVE_GPS" : "DISTANCE_FALLBACK"
    };
  });

  const mlByTrain = {};
  await Promise.all(trains.map(async (t) => {
    try {
      const seqRows = await Telemetry.find({ trainId: t.trainId }).sort({ eventTime: -1 }).limit(12).lean();
      if (!seqRows.length) return;
      const sequence = [...seqRows].reverse().map((r) => ({
        speedKmh: Number(r.speedKmh || 0),
        observedDelayMin: Number(r.observedDelayMin || 0)
      }));
      const ml = await predictDelay({ trainId: t.trainId, sequence });
      mlByTrain[t.trainId] = ml;
    } catch (_e) {
      mlByTrain[t.trainId] = null;
    }
  }));

  const trainEtas = trainEtasRaw
    .map((eta) => {
      const ml = mlByTrain[eta.trainId];
      const mlRisk = Number(ml?.probabilityDelayed ?? Math.min(1, (eta.estimatedDelayMin || 0) / 30));
      const mlPredictedDelayMin = Number(ml?.predictedDelayMin ?? eta.estimatedDelayMin ?? 0);
      const blendedScore = Number((eta.rankingScore - mlRisk * 18 - mlPredictedDelayMin * 0.35).toFixed(2));
      return {
        ...eta,
        mlRisk,
        mlPredictedDelayMin,
        mlConfidenceLow: Number(ml?.confidenceLow ?? Math.max(0, mlPredictedDelayMin - 3)),
        mlConfidenceHigh: Number(ml?.confidenceHigh ?? mlPredictedDelayMin + 3),
        rankingScore: blendedScore
      };
    })
    .sort((a, b) => (b.rankingScore ?? -999) - (a.rankingScore ?? -999));

  const rankedTrains = trains
    .map((t) => ({ ...t, eta: trainEtas.find((e) => e.trainId === t.trainId) }))
    .sort((a, b) => (b.eta?.rankingScore ?? -999) - (a.eta?.rankingScore ?? -999));
  res.json({
    origin: boarding.boardingStation,
    userNearestStation: boarding.userNearestStation,
    boardingStation: boarding.boardingStation,
    destinationStation,
    trains,
    rankedTrains,
    trainEtas,
    trainPositions: [...map.values()],
    alternativeBoardingStations: alternatives,
    path: buildRailPath(boarding.boardingStation, destinationStation),
    pathSource: "FALLBACK_STATION_ORDER"
  });
});

export default router;
