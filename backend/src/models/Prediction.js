import { pool } from "../config/database.js";
import { SqlQuery } from "../utils/sqlQuery.js";

const mapPrediction = (row) => ({
  id: row.id,
  trainId: row.train_id,
  predictedDelayMin: Number(row.predicted_delay_min || 0),
  probabilityDelayed: Number(row.probability_delayed || 0),
  confidenceLow: Number(row.confidence_low || 0),
  confidenceHigh: Number(row.confidence_high || 0),
  source: row.source || "ML_SERVICE",
  createdAt: row.created_at
});

const orderBy = (sort) => {
  if (sort?.createdAt) return `ORDER BY created_at ${sort.createdAt < 0 ? "DESC" : "ASC"}`;
  return "ORDER BY created_at DESC";
};

export const Prediction = {
  find() {
    return new SqlQuery(async ({ sort, limit }) => {
      const limitSql = limit ? "LIMIT ?" : "";
      const params = limit ? [Number(limit)] : [];
      const [rows] = await pool.query(`SELECT * FROM predictions ${orderBy(sort)} ${limitSql}`, params);
      return rows.map(mapPrediction);
    });
  },

  async create(row) {
    const [result] = await pool.query(
      `
        INSERT INTO predictions
          (train_id, predicted_delay_min, probability_delayed, confidence_low, confidence_high, source)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        row.trainId,
        Number(row.predictedDelayMin || 0),
        Number(row.probabilityDelayed || 0),
        Number(row.confidenceLow || 0),
        Number(row.confidenceHigh || 0),
        row.source || "ML_SERVICE"
      ]
    );

    return { id: result.insertId, ...row, source: row.source || "ML_SERVICE", createdAt: new Date() };
  }
};
