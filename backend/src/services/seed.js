import { Train } from "../models/Train.js";

await Train.updateOne({ trainId: "1001" }, { trainId: "1001", name: "Udarata Menike", routeId: "MAIN_1", routeName: "Colombo Fort - Kandy" }, { upsert: true });
await Train.updateOne({ trainId: "2002" }, { trainId: "2002", name: "Ruhunu Kumari", routeId: "COASTAL_1", routeName: "Colombo Fort - Matara" }, { upsert: true });
await Train.updateOne({ trainId: "3003" }, { trainId: "3003", name: "Yal Devi", routeId: "NORTHERN_1", routeName: "Colombo Fort - Jaffna" }, { upsert: true });
console.log("Seed done");
process.exit(0);
