import mongoose from "mongoose";

const telemetrySchema = new mongoose.Schema({
  trainId: { type: String, required: true, index: true },
  routeId: { type: String, required: true },
  latitude: Number,
  longitude: Number,
  speedKmh: Number,
  observedDelayMin: Number,
  source: { type: String, default: "GPS" },
  eventTime: { type: Date, default: Date.now }
}, { timestamps: true });

export const Telemetry = mongoose.model("Telemetry", telemetrySchema);
