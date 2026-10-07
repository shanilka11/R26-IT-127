CREATE TABLE IF NOT EXISTS tickets (
  transaction_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  route VARCHAR(200) NOT NULL,
  recorded_date DATE NOT NULL,
  source_data JSON NOT NULL,
  source_hash CHAR(64) NOT NULL,
  historical_assessment JSON NULL,
  ticket_scan_count INT UNSIGNED NOT NULL,
  inspection_status VARCHAR(32) NOT NULL,
  decision_status VARCHAR(20) NOT NULL DEFAULT 'Clear',
  operational_fraud_type VARCHAR(120) NULL,
  state_version INT UNSIGNED NOT NULL DEFAULT 0,
  imported_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX ticket_journey (route, recorded_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticket_verifications (
  verification_id CHAR(36) PRIMARY KEY,
  sequence_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
  transaction_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_id CHAR(36) NOT NULL UNIQUE,
  request_hash CHAR(64) NOT NULL,
  actor_user_id INT NOT NULL,
  actor_name VARCHAR(510) NOT NULL,
  inspector_action VARCHAR(16) NOT NULL,
  verification_status VARCHAR(20) NOT NULL,
  eligibility_result VARCHAR(20) NOT NULL,
  reason VARCHAR(120) NULL,
  remarks TEXT NOT NULL,
  verification_result JSON NOT NULL,
  before_state JSON NOT NULL,
  after_state JSON NOT NULL,
  verified_at DATETIME(3) NOT NULL,
  voided_at DATETIME(3) NULL,
  voided_by INT NULL,
  voided_by_name VARCHAR(510) NULL,
  void_reason TEXT NULL,
  FOREIGN KEY (transaction_id) REFERENCES tickets(transaction_id),
  INDEX verification_history (transaction_id, sequence_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS journey_predictions (
  prediction_id CHAR(36) PRIMARY KEY,
  sequence_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
  request_id CHAR(36) NOT NULL UNIQUE,
  request_hash CHAR(64) NOT NULL,
  route VARCHAR(200) NOT NULL,
  recorded_date DATE NOT NULL,
  mode VARCHAR(24) NOT NULL,
  passenger_count INT NOT NULL,
  mean_risk_score DOUBLE NOT NULL,
  risk_tier VARCHAR(10) NOT NULL,
  model_provenance JSON NOT NULL,
  result_data JSON NOT NULL,
  actor_user_id INT NOT NULL,
  actor_name VARCHAR(510) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  INDEX prediction_journey (route, recorded_date, sequence_id)
) ENGINE=InnoDB;
