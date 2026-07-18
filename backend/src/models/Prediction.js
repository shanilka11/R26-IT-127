import mongoose from "mongoose";

const predictionSchema = new mongoose.Schema({
  trainId: { type: String, required: true, index: true },
  predictedDelayMin: Number,
  probabilityDelayed: Number,
  confidenceLow: Number,
  confidenceHigh: Number,
  source: { type: String, default: "ML_SERVICE" },
  createdAt: { type: Date, default: Date.now }
});

export const Prediction = mongoose.model("Prediction", predictionSchema);
