import dotenv from "dotenv";
import http from "http";
import app from "./app.js";
import { initDatabase } from "./config/database.js";

dotenv.config();

const port = Number(process.env.PORT || 5000);

await initDatabase();
const server = http.createServer(app);
server.listen(port, () => console.log(`Backend running on http://127.0.0.1:${port}`));
