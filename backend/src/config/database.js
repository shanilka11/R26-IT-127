import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "ceylonrail",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10)
};

export const pool = mysql.createPool(dbConfig);

export const initDatabase = async () => {
  const bootstrap = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    port: dbConfig.port
  });

  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
  await bootstrap.end();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trains (
      id INT AUTO_INCREMENT PRIMARY KEY,
      train_id VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      route_id VARCHAR(80) NOT NULL,
      route_name VARCHAR(180) NOT NULL,
      current_station VARCHAR(120) DEFAULT '',
      next_station VARCHAR(120) DEFAULT '',
      status VARCHAR(40) DEFAULT 'ON_TIME',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_trains_train_id (train_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS telemetry (
      id INT AUTO_INCREMENT PRIMARY KEY,
      train_id VARCHAR(50) NOT NULL,
      route_id VARCHAR(80) NOT NULL,
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      speed_kmh DECIMAL(8,2),
      observed_delay_min DECIMAL(8,2),
      source VARCHAR(80) DEFAULT 'GPS',
      event_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_telemetry_train_time (train_id, event_time),
      INDEX idx_telemetry_route_time (route_id, event_time)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      train_id VARCHAR(50) NOT NULL,
      predicted_delay_min DECIMAL(8,2),
      probability_delayed DECIMAL(6,4),
      confidence_low DECIMAL(8,2),
      confidence_high DECIMAL(8,2),
      source VARCHAR(80) DEFAULT 'ML_SERVICE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_predictions_train_created (train_id, created_at)
    )
  `);
};

export const closeDatabase = () => pool.end();
