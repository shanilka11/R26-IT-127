import mongoose from "mongoose";

const trainSchema = new mongoose.Schema({
  trainId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  routeId: { type: String, required: true },
  routeName: { type: String, required: true },
  currentStation: { type: String, default: "" },
  nextStation: { type: String, default: "" },
  status: { type: String, default: "ON_TIME" }
}, { timestamps: true });

export const Train = mongoose.model("Train", trainSchema);
