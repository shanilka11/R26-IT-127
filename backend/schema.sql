CREATE DATABASE IF NOT EXISTS ceylonrail;
USE ceylonrail;

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
);

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
);

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
);
