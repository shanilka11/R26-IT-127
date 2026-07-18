import axios from "axios";

const nowIso = () => new Date().toISOString();

const normalizeRow = (row) => ({
  trainId: String(row.trainId || row.id || "").trim(),
  routeId: String(row.routeId || row.route || "LIVE").trim(),
  latitude: Number(row.latitude ?? row.lat),
  longitude: Number(row.longitude ?? row.lon),
  speedKmh: Number(row.speedKmh ?? row.speed ?? 0),
  observedDelayMin: Number(row.observedDelayMin ?? row.delayMin ?? row.delay ?? 0),
  eventTime: row.eventTime ? new Date(row.eventTime) : new Date(),
  source: String(row.source || "LIVE_API")
});

export const pullFromHttpProvider = async (providerUrl, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axios.get(providerUrl, { headers, timeout: 15000 });
  const rows = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.items) ? res.data.items : [];
  return rows.map(normalizeRow).filter((x) => x.trainId && Number.isFinite(x.latitude) && Number.isFinite(x.longitude));
};

export const pullFromSimulationProvider = async () => {
  const demo = [
    { trainId: "1001", routeId: "MAIN_1", latitude: 6.98, longitude: 79.92, speedKmh: 42, observedDelayMin: 4 },
    { trainId: "2002", routeId: "COASTAL_1", latitude: 6.47, longitude: 80.03, speedKmh: 55, observedDelayMin: 2 },
    { trainId: "3003", routeId: "NORTHERN_1", latitude: 7.48, longitude: 80.33, speedKmh: 38, observedDelayMin: 10 }
  ];
  return demo.map((r) => normalizeRow({ ...r, eventTime: nowIso(), source: "SIM_PROVIDER" }));
};

