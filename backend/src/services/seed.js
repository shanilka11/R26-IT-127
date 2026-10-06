import dotenv from "dotenv";
import { initDatabase, closeDatabase } from "../config/database.js";
import { Train } from "../models/Train.js";

dotenv.config();

const seed = [
  { trainId: "1001", name: "Udarata Menike", routeId: "MAIN_1", routeName: "Colombo Fort - Kandy", currentStation: "Maradana", nextStation: "Ragama", status: "ON_TIME" },
  { trainId: "2002", name: "Ruhunu Kumari", routeId: "COASTAL_1", routeName: "Colombo Fort - Matara", currentStation: "Colombo Fort", nextStation: "Panadura", status: "ON_TIME" },
  { trainId: "3003", name: "Yal Devi", routeId: "NORTHERN_1", routeName: "Colombo Fort - Jaffna", currentStation: "Ragama", nextStation: "Polgahawela", status: "DELAYED" }
];

await initDatabase();

for (const train of seed) {
  await Train.updateOne({ trainId: train.trainId }, train, { upsert: true });
}

console.log(`Seeded ${seed.length} trains`);
await closeDatabase();
