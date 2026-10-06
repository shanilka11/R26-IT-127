import { pool } from "../config/database.js";
import { SqlQuery } from "../utils/sqlQuery.js";

const mapTrain = (row) => ({
  id: row.id,
  trainId: row.train_id,
  name: row.name,
  routeId: row.route_id,
  routeName: row.route_name,
  currentStation: row.current_station || "",
  nextStation: row.next_station || "",
  status: row.status || "ON_TIME",
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const orderBy = (sort) => {
  if (sort?.trainId) return `ORDER BY train_id ${sort.trainId < 0 ? "DESC" : "ASC"}`;
  return "ORDER BY train_id ASC";
};

export const Train = {
  find() {
    return new SqlQuery(async ({ sort, limit }) => {
      const limitSql = limit ? "LIMIT ?" : "";
      const params = limit ? [Number(limit)] : [];
      const [rows] = await pool.query(`SELECT * FROM trains ${orderBy(sort)} ${limitSql}`, params);
      return rows.map(mapTrain);
    });
  },

  async updateOne(filter, data, options = {}) {
    if (!options.upsert) {
      throw new Error("Train.updateOne currently supports upsert operations only");
    }

    await pool.query(
      `
        INSERT INTO trains
          (train_id, name, route_id, route_name, current_station, next_station, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          route_id = VALUES(route_id),
          route_name = VALUES(route_name),
          current_station = VALUES(current_station),
          next_station = VALUES(next_station),
          status = VALUES(status)
      `,
      [
        filter.trainId || data.trainId,
        data.name,
        data.routeId,
        data.routeName,
        data.currentStation || "",
        data.nextStation || "",
        data.status || "ON_TIME"
      ]
    );

    return { acknowledged: true };
  }
};
