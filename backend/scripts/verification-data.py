"""Validate all research input before emitting a JSON import batch. Never edits CSVs."""
import csv
import hashlib
import json
import math
import sys
from datetime import datetime
from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'public' / 'models'
raw_path = root / 'ticket_fraud_dataset_2020_2024.csv'
score_path = root / 'risk_scored_transactions_2024.csv'
meta = json.loads((root / 'artifact_meta.json').read_text())
threshold = float(meta['recommended_risk_threshold'])
if not math.isfinite(threshold) or not 0 <= threshold <= 100:
    raise ValueError('Invalid saved flagging threshold')
source_hash = hashlib.sha256(raw_path.read_bytes() + score_path.read_bytes()).hexdigest()

def unique_rows(path):
    result = {}
    with path.open(newline='', encoding='utf-8-sig') as source:
        for row in csv.DictReader(source):
            key = row['transaction_id'].strip().upper()
            if not key or len(key) > 64 or not key.isascii() or key in result:
                raise ValueError('Invalid or duplicate transaction ID')
            row['transaction_id'] = key
            result[key] = row
    return result

raw, scored = unique_rows(raw_path), unique_rows(score_path)
if not set(scored).issubset(raw):
    raise ValueError('Every assessment must match a raw transaction')
rows = []
for key, row in raw.items():
    row['date'] = datetime.fromisoformat(row['date']).date().isoformat()
    datetime.strptime(row['time'], '%H:%M')
    for field in ['ticket_scan_count', 'is_fraud']:
        row[field] = int(row[field])
    if row['ticket_scan_count'] < 1 or row['is_fraud'] not in (0, 1):
        raise ValueError('Invalid scan count or fraud label')
    if row['inspection_status'] not in ('Inspected', 'Not Inspected'):
        raise ValueError('Invalid inspection status')
    for field in ['fare_paid_lkr', 'standard_fare_lkr']:
        row[field] = float(row[field])
        if not math.isfinite(row[field]) or row[field] < 0:
            raise ValueError('Invalid fare')
    if row['standard_fare_lkr'] <= 0:
        raise ValueError('Invalid standard fare')
    for field in ['route', 'passenger_id', 'passenger_name', 'ticket_type', 'travel_class']:
        if not row[field].strip():
            raise ValueError('Missing ' + field)
    if len(row['route']) > 200 or row['ticket_scan_count'] > 4294967295:
        raise ValueError('Ticket exceeds database field limits')
    seat = row['seat_number'].strip()
    row['seat_number'] = str(int(float(seat))) if seat and seat.lower() != 'nan' else None
    row['fraud_type'] = row['fraud_type'] if row['fraud_type'] not in ('', 'None', 'nan') else None
    assessment = None
    if key in scored:
        saved = scored[key]
        score = float(saved['risk_score'])
        if not math.isfinite(score) or not 0 <= score <= 100 or saved['risk_category'] not in ('High', 'Medium', 'Low'):
            raise ValueError('Invalid saved assessment')
        assessment = {k: saved[k] for k in ['risk_category', 'suspected_fraud_type', 'reason_for_flagging']}
        assessment.update(risk_score=score, is_flagged_fraud=score >= threshold, risk_threshold=threshold)
    rows.append([key, row['route'], row['date'], json.dumps(row, allow_nan=False), source_hash,
                 json.dumps(assessment, allow_nan=False) if assessment else None,
                 row['ticket_scan_count'], row['inspection_status']])
json.dump(rows, sys.stdout, allow_nan=False)
