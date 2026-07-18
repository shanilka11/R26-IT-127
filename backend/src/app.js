import express from "express";
import cors from "cors";
import morgan from "morgan";
import trainsRoute from "./routes/trains.js";
import telemetryRoute from "./routes/telemetry.js";
import predictionsRoute from "./routes/predictions.js";
import journeyRoute from "./routes/journey.js";
import ingestRoute from "./routes/ingest.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/trains", trainsRoute);
app.use("/api/telemetry", telemetryRoute);
app.use("/api/predictions", predictionsRoute);
app.use("/api/journey", journeyRoute);
app.use("/api/ingest", ingestRoute);

app.use((err, _req, res, _next) => res.status(500).json({ message: err.message }));

export default app;
