import stations from "../data/stations.lanka.json" assert { type: "json" };
import { Train } from "../models/Train.js";

const STATIONS = stations;
const LINE_ORDER = {
  MAIN: ["Colombo Fort", "Maradana", "Ragama", "Gampaha", "Polgahawela", "Kandy"],
  COASTAL: ["Colombo Fort", "Galle", "Matara"],
  NORTHERN: ["Ragama", "Polgahawela", "Anuradhapura", "Jaffna"]
};
const LINE_GEOMETRY = {
  MAIN: [
    { name: "Colombo Fort", lat: 6.9344, lon: 79.8428 }, { name: "Maradana", lat: 6.9271, lon: 79.8643 },
    { lat: 6.955, lon: 79.89 }, { name: "Ragama", lat: 7.029, lon: 79.922 },
    { name: "Gampaha", lat: 7.0917, lon: 79.9999 }, { lat: 7.22, lon: 80.13 },
    { name: "Polgahawela", lat: 7.3327, lon: 80.295 }, { lat: 7.31, lon: 80.47 },
    { name: "Kandy", lat: 7.2906, lon: 80.6337 }
  ],
  COASTAL: [
    { name: "Colombo Fort", lat: 6.9344, lon: 79.8428 }, { lat: 6.74, lon: 79.9 }, { lat: 6.55, lon: 79.98 },
    { lat: 6.31, lon: 80.04 }, { lat: 6.12, lon: 80.14 }, { name: "Galle", lat: 6.0535, lon: 80.221 },
    { lat: 5.99, lon: 80.37 }, { name: "Matara", lat: 5.9549, lon: 80.555 }
  ],
  NORTHERN: [
    { name: "Ragama", lat: 7.029, lon: 79.922 }, { name: "Polgahawela", lat: 7.3327, lon: 80.295 },
    { lat: 7.72, lon: 80.35 }, { name: "Anuradhapura", lat: 8.3114, lon: 80.4037 },
    { lat: 8.95, lon: 80.2 }, { name: "Jaffna", lat: 9.6615, lon: 80.0255 }
  ]
};
const toRad = (v) => (v * Math.PI) / 180;
export const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

export const listStations = () => STATIONS;
export const findNearestStation = (lat, lon) => STATIONS.map(s => ({...s, distanceKm: haversineKm(lat,lon,s.lat,s.lon)})).sort((a,b)=>a.distanceKm-b.distanceKm)[0];
export const findDestinationStation = (text) => STATIONS.find(s => s.name.toLowerCase().includes(String(text).toLowerCase()));
export const findCandidateTrains = async () => Train.find().limit(20).lean();

const stationToken = (name) => String(name || "").split(" ")[0].toLowerCase();

const routeHas = (train, stationName) => {
  const route = String(train.routeName || "").toLowerCase();
  return route.includes(stationToken(stationName));
};

export const buildRailPath = (fromStation, toStation) => {
  if (!fromStation || !toStation) return [];
  for (const [line, order] of Object.entries(LINE_ORDER)) {
    const i = order.indexOf(fromStation.name);
    const j = order.indexOf(toStation.name);
    if (i >= 0 && j >= 0) {
      const geometry = LINE_GEOMETRY[line] || [];
      const gi = geometry.findIndex((p) => p.name === fromStation.name);
      const gj = geometry.findIndex((p) => p.name === toStation.name);
      if (gi >= 0 && gj >= 0) {
        const segment = gi <= gj ? geometry.slice(gi, gj + 1) : geometry.slice(gj, gi + 1).reverse();
        return segment.map((p) => ({ name: p.name || `${line}_SEGMENT`, lat: p.lat, lon: p.lon, line }));
      }
      const slice = i <= j ? order.slice(i, j + 1) : order.slice(j, i + 1).reverse();
      return slice.map((name) => STATIONS.find((s) => s.name === name)).filter(Boolean);
    }
  }
  return [fromStation, toStation];
};

export const findBoardingOption = async (lat, lon, destinationStation) => {
  const nearest = findNearestStation(lat, lon);
  const trains = await findCandidateTrains();
  const toDestination = trains.filter((t) => routeHas(t, destinationStation.name));
  const stationsByDistance = STATIONS.map((s) => ({
    ...s,
    distanceKm: haversineKm(lat, lon, s.lat, s.lon),
    hasPath: buildRailPath(s, destinationStation).length >= 2
  }))
    .filter((s) => s.hasPath)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  for (const station of stationsByDistance) {
    const trainSet = toDestination.filter((t) => routeHas(t, station.name));
    if (trainSet.length) {
      return { userNearestStation: nearest, boardingStation: station, trains: trainSet.slice(0, 10) };
    }
  }

  return { userNearestStation: nearest, boardingStation: nearest, trains: toDestination.slice(0, 10) };
};

export const findAlternativeBoardingStations = async (lat, lon, destinationStation, limit = 4) => {
  const trains = await findCandidateTrains();
  const toDestination = trains.filter((t) => routeHas(t, destinationStation.name));
  return STATIONS.map((s) => {
    const stopsHere = toDestination.filter((t) => routeHas(t, s.name));
    return {
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      line: s.line,
      distanceKm: haversineKm(lat, lon, s.lat, s.lon),
      trainCount: stopsHere.length,
      trains: stopsHere.slice(0, 3).map((t) => ({ trainId: t.trainId, name: t.name }))
    };
  })
    .filter((s) => s.trainCount > 0 && buildRailPath(s, destinationStation).length >= 2)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
};
