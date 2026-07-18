import dotenv from "dotenv";
import http from "http";
import app from "./app.js";
import mongoose from "mongoose";

dotenv.config();

const port = Number(process.env.PORT || 5000);
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ceylonrail";

await mongoose.connect(mongoUri);
const server = http.createServer(app);
server.listen(port, () => console.log(`Backend running on http://127.0.0.1:${port}`));
