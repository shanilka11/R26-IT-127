import { Router } from "express";
import axios from "axios";
import { pool } from "../config/database.js";

const router = Router();

const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const round = (value, digits = 3) => Number(number(value).toFixed(digits));

const matchPredictionsWithActuals = (predictions, telemetry) => {
  const orderedTelemetry = [...telemetry].sort(
    (a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
  );
  return predictions.map((prediction) => {
  const actual = orderedTelemetry.find((row) =>
    row.train_id === prediction.train_id &&
    new Date(row.event_time).getTime() >= new Date(prediction.created_at).getTime()
  );
  if (!actual) return { ...prediction, actual_delay_min: null, absolute_error_min: null };
  const actualDelay = number(actual.observed_delay_min);
  return {
    ...prediction,
    route_id: actual.route_id,
    actual_delay_min: actualDelay,
    actual_event_time: actual.event_time,
    absolute_error_min: Math.abs(number(prediction.predicted_delay_min) - actualDelay)
  };
  });
};

const summarizeErrors = (rows) => {
  const evaluated = rows.filter((row) => row.actual_delay_min !== null);
  if (!evaluated.length) return { evaluatedCount: 0, maeMinutes: null, rmseMinutes: null, meanBiasMinutes: null };
  const errors = evaluated.map((row) => number(row.predicted_delay_min) - number(row.actual_delay_min));
  return {
    evaluatedCount: evaluated.length,
    maeMinutes: round(errors.reduce((sum, value) => sum + Math.abs(value), 0) / errors.length),
    rmseMinutes: round(Math.sqrt(errors.reduce((sum, value) => sum + value ** 2, 0) / errors.length)),
    meanBiasMinutes: round(errors.reduce((sum, value) => sum + value, 0) / errors.length)
  };
};

const explainPrediction = (prediction, telemetry) => {
  const speed = number(telemetry?.speed_kmh);
  const observedDelay = number(telemetry?.observed_delay_min);
  const speedContribution = Math.max(0, 60 - speed) * 0.22;
  const delayContribution = observedDelay * 0.55;
  const combined = speedContribution + delayContribution || 1;
  return {
    trainId: prediction.train_id,
    predictedDelayMin: number(prediction.predicted_delay_min),
    probabilityDelayed: number(prediction.probability_delayed),
    confidenceLow: number(prediction.confidence_low),
    confidenceHigh: number(prediction.confidence_high),
    inputs: {
      latestSpeedKmh: speed,
      latestObservedDelayMin: observedDelay,
      telemetrySource: telemetry?.source || "UNAVAILABLE",
      telemetryTime: telemetry?.event_time || null
    },
    factors: [
      {
        name: "Existing observed delay",
        contributionPercent: round((delayContribution / combined) * 100, 1),
        direction: observedDelay > 0 ? "increases delay" : "neutral",
        detail: `${observedDelay.toFixed(1)} minutes currently observed`
      },
      {
        name: "Current operating speed",
        contributionPercent: round((speedContribution / combined) * 100, 1),
        direction: speed < 60 ? "increases delay" : "reduces delay",
        detail: `${speed.toFixed(1)} km/h latest speed`
      }
    ],
    method: "Transparent feature attribution based on the model input features and training target relationship. This is an approximation, not a SHAP explanation."
  };
};

router.get("/overview", async (_req, res) => {
  const [predictionResult, telemetryResult] = await Promise.all([
    pool.query("SELECT * FROM predictions ORDER BY created_at DESC LIMIT 250"),
    pool.query("SELECT * FROM telemetry ORDER BY event_time DESC LIMIT 5000")
  ]);
  const predictions = predictionResult[0];
  const telemetry = telemetryResult[0];
  const matched = matchPredictionsWithActuals(predictions, telemetry);
  const metrics = summarizeErrors(matched);

  const routeGroups = new Map();
  matched.filter((row) => row.actual_delay_min !== null).forEach((row) => {
    const routeId = row.route_id || "UNKNOWN";
    if (!routeGroups.has(routeId)) routeGroups.set(routeId, []);
    routeGroups.get(routeId).push(row);
  });
  const routePerformance = [...routeGroups.entries()].map(([routeId, rows]) => ({
    routeId,
    ...summarizeErrors(rows)
  })).sort((a, b) => b.evaluatedCount - a.evaluatedCount);

  const latestTelemetry = new Map();
  telemetry.forEach((row) => {
    if (!latestTelemetry.has(row.train_id)) latestTelemetry.set(row.train_id, row);
  });
  const explanations = predictions.slice(0, 8).map((prediction) =>
    explainPrediction(prediction, latestTelemetry.get(prediction.train_id))
  );

  let mlHealth = { ok: false, modelLoaded: false };
  try {
    const response = await axios.get(`${process.env.ML_SERVICE_URL || "http://127.0.0.1:8000"}/health`, { timeout: 2500 });
    mlHealth = response.data;
  } catch (_error) {
    mlHealth = { ok: false, modelLoaded: false };
  }

  const recentEvaluated = matched.filter((row) => row.actual_delay_min !== null);
  const midpoint = Math.floor(recentEvaluated.length / 2);
  const newer = summarizeErrors(recentEvaluated.slice(0, midpoint));
  const older = summarizeErrors(recentEvaluated.slice(midpoint));
  const driftPercent = newer.maeMinutes !== null && older.maeMinutes
    ? round(((newer.maeMinutes - older.maeMinutes) / older.maeMinutes) * 100, 1)
    : null;

  res.json({
    generatedAt: new Date().toISOString(),
    model: {
      name: "LSTM Delay Predictor",
      framework: "TensorFlow / Keras",
      task: "Delay-minute regression",
      sequenceLength: 12,
      features: ["speedKmh", "observedDelayMin"],
      modelLoaded: Boolean(mlHealth.modelLoaded),
      health: mlHealth.ok ? "AVAILABLE" : "UNAVAILABLE",
      routeSpecificModels: {
        available: false,
        count: 0,
        message: "Only the general LSTM model is currently trained. Route-specific scores are not fabricated."
      }
    },
    dataQuality: {
      predictionsStored: predictions.length,
      telemetryRecordsScanned: telemetry.length,
      predictionsWithActualOutcome: metrics.evaluatedCount,
      evaluationCoveragePercent: predictions.length ? round((metrics.evaluatedCount / predictions.length) * 100, 1) : 0
    },
    performance: metrics,
    routePerformance,
    monitoring: {
      status: metrics.evaluatedCount < 10 ? "INSUFFICIENT_DATA" : driftPercent > 20 ? "REVIEW_REQUIRED" : "STABLE",
      recentMaeMinutes: newer.maeMinutes,
      previousMaeMinutes: older.maeMinutes,
      maeChangePercent: driftPercent,
      message: metrics.evaluatedCount < 10
        ? "At least 10 matched predictions are required for meaningful drift monitoring."
        : "Recent and previous prediction errors are compared using the same matching method."
    },
    weather: {
      configured: Boolean(process.env.WEATHER_API_URL),
      includedInModel: false,
      status: process.env.WEATHER_API_URL ? "CONTEXT_ONLY" : "NOT_CONFIGURED",
      message: "Weather is not an input to the trained LSTM. It must not be presented as influencing predictions until the model is retrained and evaluated with weather features."
    },
    explanations,
    evaluations: matched.slice(0, 100).map((row) => ({
      predictionId: row.id,
      trainId: row.train_id,
      routeId: row.route_id || null,
      predictedDelayMin: number(row.predicted_delay_min),
      actualDelayMin: row.actual_delay_min,
      absoluteErrorMin: row.absolute_error_min === null ? null : round(row.absolute_error_min),
      probabilityDelayed: number(row.probability_delayed),
      confidenceLow: number(row.confidence_low),
      confidenceHigh: number(row.confidence_high),
      predictedAt: row.created_at,
      actualAt: row.actual_event_time || null
    }))
  });
});

export default router;
