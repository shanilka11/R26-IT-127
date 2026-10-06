import { pool } from "../config/database.js";
import { SqlQuery } from "../utils/sqlQuery.js";

const toSqlDate = (value = new Date()) => new Date(value).toISOString().slice(0, 19).replace("T", " ");

const mapTelemetry = (row) => ({
  id: row.id,
  trainId: row.train_id,
  routeId: row.route_id,
  latitude: Number(row.latitude || 0),
  longitude: Number(row.longitude || 0),
  speedKmh: Number(row.speed_kmh || 0),
  observedDelayMin: Number(row.observed_delay_min || 0),
  source: row.source || "GPS",
  eventTime: row.event_time,
  createdAt: row.created_at
});

const whereFromFilter = (filter = {}) => {
  if (filter.trainId?.$in) {
    const ids = filter.trainId.$in.filter(Boolean);
    if (!ids.length) return { sql: "WHERE 1 = 0", params: [] };
    return { sql: `WHERE train_id IN (${ids.map(() => "?").join(",")})`, params: ids };
  }

  if (filter.trainId) {
    return { sql: "WHERE train_id = ?", params: [filter.trainId] };
  }

  return { sql: "", params: [] };
};

const orderBy = (sort) => {
  if (sort?.eventTime) return `ORDER BY event_time ${sort.eventTime < 0 ? "DESC" : "ASC"}`;
  return "ORDER BY event_time DESC";
};

const insertTelemetry = async (row) => {
  const [result] = await pool.query(
    `
      INSERT INTO telemetry
        (train_id, route_id, latitude, longitude, speed_kmh, observed_delay_min, source, event_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      row.trainId,
      row.routeId || "SIM",
      Number(row.latitude || 0),
      Number(row.longitude || 0),
      Number(row.speedKmh || 0),
      Number(row.observedDelayMin || 0),
      row.source || "GPS",
      toSqlDate(row.eventTime)
    ]
  );

  return { id: result.insertId, ...row, eventTime: row.eventTime || new Date() };
};

export const Telemetry = {
  find(filter = {}) {
    return new SqlQuery(async ({ sort, limit }) => {
      const where = whereFromFilter(filter);
      const limitSql = limit ? "LIMIT ?" : "";
      const params = limit ? [...where.params, Number(limit)] : where.params;
      const [rows] = await pool.query(`SELECT * FROM telemetry ${where.sql} ${orderBy(sort)} ${limitSql}`, params);
      return rows.map(mapTelemetry);
    });
  },

  create(row) {
    return insertTelemetry(row);
  },

  async insertMany(rows) {
    const saved = [];
    for (const row of rows) {
      saved.push(await insertTelemetry(row));
    }
    return saved;
  }
};
