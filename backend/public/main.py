import os
import json
import random
from datetime import datetime

import numpy as np
import pandas as pd
import joblib
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

MODEL_DIR = os.environ.get('FRAUD_MODEL_DIR', 'models')
HISTORY_CSV = os.path.join(MODEL_DIR, 'risk_scored_transactions_2024.csv')

print('Loading fraud detection artifacts...')
iso_forest = joblib.load(os.path.join(MODEL_DIR, 'isolation_forest.joblib'))
ocsvm = joblib.load(os.path.join(MODEL_DIR, 'one_class_svm.joblib'))
autoencoder = joblib.load(os.path.join(MODEL_DIR, 'autoencoder.joblib'))
scaler = joblib.load(os.path.join(MODEL_DIR, 'scaler.joblib'))

with open(os.path.join(MODEL_DIR, 'artifact_meta.json')) as f:
    META = json.load(f)

RECOMMENDED_THRESHOLD = float(META.get('recommended_risk_threshold', 50))
MODEL_PERFORMANCE = META.get('model_performance')  # None unless notebook patch applied

history_df = pd.read_csv(HISTORY_CSV, parse_dates=['date'])
HAS_PER_MODEL_SCORES = {'iso_score', 'ocsvm_score', 'autoencoder_score'}.issubset(history_df.columns)
print(f'Loaded {len(history_df):,} historical scored transactions.')
print('Per-model score columns present:', HAS_PER_MODEL_SCORES)

ROUTES = sorted(META['route_freq'].keys())
TICKET_TYPES = list(META['official_ratio'].keys())
TRAVEL_CLASSES = ['1st Class', '2nd Class', '3rd Class']
PAYMENT_METHODS = ['Cash', 'Card', 'Online', 'Mobile Wallet']
BOOKING_CHANNELS = ['Station Counter', 'Online', 'Mobile App', 'Travel Agent']
DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


class InvalidRequestError(ValueError):
    pass

def _engineer_features(txn_df, passenger_history=None):
    d = txn_df.copy()
    official_ratio = META['official_ratio']

    d['expected_ratio'] = d['ticket_type'].map(official_ratio)
    d['paid_ratio'] = d['fare_paid_lkr'] / d['standard_fare_lkr']
    d['ratio_deviation'] = (d['paid_ratio'] - d['expected_ratio']).abs()

    d['multi_scan_flag'] = (d['ticket_scan_count'] > 1).astype(int)
    d['is_online'] = (d['booking_channel'] == 'Online').astype(int)
    d['online_missing_seat'] = ((d['is_online'] == 1) & (d['seat_number'].isna())).astype(int)

    d['hour'] = d['time'].astype(str).str.split(':').str[0].astype(int)
    d['is_night'] = ((d['hour'] < 6) | (d['hour'] >= 19)).astype(int)
    d['is_weekend'] = d['day_of_week'].isin(['Saturday', 'Sunday']).astype(int)

    passenger_history = passenger_history or {}
    d['passenger_txn_number'] = d['passenger_id'].map(
        lambda p: passenger_history.get(p, {}).get('txn_count', 0) + 1)
    d['passenger_prior_fraud_count'] = d['passenger_id'].map(
        lambda p: passenger_history.get(p, {}).get('fraud_count', 0))
    d['passenger_prior_fraud_rate'] = (
        d['passenger_prior_fraud_count'] / (d['passenger_txn_number'] - 1)
    ).replace([np.inf, -np.inf], 0).fillna(0)

    d['route_freq'] = d['route'].map(META['route_freq']).fillna(min(META['route_freq'].values()))

    d_enc = pd.get_dummies(d, columns=['travel_class', 'ticket_type', 'payment_method', 'booking_channel'])
    for col in META['feature_cols']:
        if col not in d_enc.columns:
            d_enc[col] = 0
    X = d_enc[META['feature_cols']].astype(float)
    return d, X


def predict_fraud_risk(txn_df, passenger_history=None):
    """Single entry point: raw ticket transaction rows in -> full risk assessment out."""
    d, X = _engineer_features(txn_df, passenger_history)
    X_scaled = scaler.transform(X)

    iso_s = -iso_forest.score_samples(X_scaled)
    ocsvm_s = -ocsvm.decision_function(X_scaled)
    ae_s = np.mean((X_scaled - autoencoder.predict(X_scaled)) ** 2, axis=1)

    def _norm(score, bounds):
        lo, hi = bounds
        return np.clip((score - lo) / (hi - lo + 1e-9), 0, 1)

    n_iso = _norm(iso_s, META['score_bounds']['iso'])
    n_ocsvm = _norm(ocsvm_s, META['score_bounds']['ocsvm'])
    n_ae = _norm(ae_s, META['score_bounds']['ae'])
    risk_score = np.round(100 * (n_iso + n_ocsvm + n_ae) / 3, 1)

    def _category(s):
        return 'High' if s >= 66 else ('Medium' if s >= 40 else 'Low')

    def _reason(row):
        reasons = []
        if row['multi_scan_flag'] == 1:
            reasons.append('Ticket scanned multiple times (possible reuse)')
        if row['online_missing_seat'] == 1:
            reasons.append('Online booking with no assigned seat (possible resale)')
        if row['ratio_deviation'] > 0.03:
            reasons.append('Fare paid does not match official concession rate')
        if row['passenger_prior_fraud_count'] >= 2:
            reasons.append('Passenger has multiple prior fraud incidents')
        if row['is_night'] == 1 and row['ratio_deviation'] > 0:
            reasons.append('Irregular fare during off-peak/night hours')
        return '; '.join(reasons) if reasons else 'Flagged by model anomaly score only'

    def _suspected_type(row):
        if row['multi_scan_flag'] == 1:
            return 'Ticket Reuse'
        if row['online_missing_seat'] == 1:
            return 'Suspicious Resale'
        if row['ratio_deviation'] > 0.03:
            return 'Abnormal Concession Usage'
        return 'Unclassified'

    out = txn_df.copy()
    out['risk_score'] = risk_score
    out['risk_category'] = [_category(s) for s in risk_score]
    out['suspected_fraud_type'] = d.apply(_suspected_type, axis=1).values
    out['reason_for_flagging'] = d.apply(_reason, axis=1).values
    out['recommended_action'] = np.where(
        out['risk_category'] == 'High', 'Priority inspection',
        np.where(out['risk_category'] == 'Medium', 'Random spot-check', 'No action needed'))
    out['iso_score'] = np.round(n_iso, 3)
    out['ocsvm_score'] = np.round(n_ocsvm, 3)
    out['autoencoder_score'] = np.round(n_ae, 3)
    return out

def _simulate_transactions(route, date_str, n_passengers, fraud_bias=0.12):
    """There's no real ticketing data for a date that hasn't happened yet, so we
    generate n_passengers plausible transactions for the given route/date and run
    them through the same trained models. Seeded on (route, date, n) so re-running
    the same query gives the same simulated batch instead of new random noise
    every time."""
    rng = random.Random(f'{route}|{date_str}|{n_passengers}')
    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
    day_name = DAY_NAMES[date_obj.weekday()]
    fare_by_class = {'1st Class': 950, '2nd Class': 420, '3rd Class': 180}

    rows = []
    for i in range(n_passengers):
        ticket_type = rng.choices(
            TICKET_TYPES,
            weights=[55, 15, 12, 8, 6, 4][:len(TICKET_TYPES)] or None,
        )[0]
        travel_class = rng.choices(TRAVEL_CLASSES, weights=[10, 35, 55])[0]
        booking_channel = rng.choice(BOOKING_CHANNELS)
        payment_method = rng.choice(PAYMENT_METHODS)
        standard_fare = fare_by_class[travel_class]
        expected_ratio = META['official_ratio'].get(ticket_type, 1.0)

        seat_number = rng.randint(1, 80)
        scan_count = 1

        if rng.random() < fraud_bias:
            pattern = rng.choice(['fare', 'scan', 'resale'])
            if pattern == 'fare':
                skewed_ratio = expected_ratio + rng.uniform(0.15, 0.5) * rng.choice([-1, 1])
                fare_paid = round(max(standard_fare * skewed_ratio, 0))
            elif pattern == 'scan':
                fare_paid = round(standard_fare * expected_ratio)
                scan_count = rng.randint(2, 5)
            else:  # resale
                booking_channel = 'Online'
                fare_paid = round(standard_fare * expected_ratio)
                seat_number = None
        else:
            fare_paid = round(standard_fare * expected_ratio)
            if booking_channel == 'Online' and rng.random() < 0.2:
                seat_number = None

        hour = rng.randint(5, 22)
        rows.append({
            'transaction_id': f'SIM{date_obj.strftime("%Y%m%d")}{i + 1:04d}',
            'passenger_id': f'SIMPSG{i + 1:05d}',
            'passenger_name': f'Passenger {i + 1}',
            'date': date_str,
            'time': f'{hour:02d}:{rng.randint(0, 59):02d}',
            'day_of_week': day_name,
            'route': route,
            'travel_class': travel_class,
            'ticket_type': ticket_type,
            'standard_fare_lkr': standard_fare,
            'fare_paid_lkr': fare_paid,
            'payment_method': payment_method,
            'booking_channel': booking_channel,
            'seat_number': seat_number,
            'ticket_scan_count': scan_count,
        })
    return pd.DataFrame(rows), day_name

def _flagged_mask(df, threshold=None):
    threshold = RECOMMENDED_THRESHOLD if threshold is None else threshold
    return df['risk_score'] >= threshold


def _risk_tier_breakdown(df):
    counts = df['risk_category'].value_counts()
    return {tier: int(counts.get(tier, 0)) for tier in ['High', 'Medium', 'Low']}


def _fraud_type_breakdown(df, col='suspected_fraud_type', only_flagged=True):
    d = df[_flagged_mask(df)] if only_flagged else df
    return d[col].value_counts().to_dict()


def _paginate(df, page, page_size):
    total = len(df)
    start = (page - 1) * page_size
    end = start + page_size
    return df.iloc[start:end], total


@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response


@app.errorhandler(InvalidRequestError)
def handle_invalid_request(e):
    return jsonify({"success": False, "error": str(e)}), 400


@app.errorhandler(Exception)
def handle_generic_error(e):
    return jsonify({"success": False, "error": str(e)}), 400

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "historical_records": len(history_df),
        "recommended_risk_threshold": RECOMMENDED_THRESHOLD,
        "per_model_scores_available": HAS_PER_MODEL_SCORES,
        "model_performance_available": MODEL_PERFORMANCE is not None,
    })


@app.route('/meta/options', methods=['GET'])
def meta_options():
    """Everything the frontend needs to populate dropdowns."""
    return jsonify({
        "success": True,
        "routes": ROUTES,
        "ticket_types": TICKET_TYPES,
        "travel_classes": TRAVEL_CLASSES,
        "payment_methods": PAYMENT_METHODS,
        "booking_channels": BOOKING_CHANNELS,
    })

@app.route('/dashboard/summary', methods=['GET'])
def dashboard_summary():
    df = history_df
    flagged = df[_flagged_mask(df)]
    fraud_actual = df[df['is_fraud'] == 1]
    detected = fraud_actual[_flagged_mask(fraud_actual)]

    detection_rate = round(100 * len(detected) / len(fraud_actual), 2) if len(fraud_actual) else 0.0

    return jsonify({
        "success": True,
        "total_ticket_transactions": int(len(df)),
        "suspicious_transactions": int(len(flagged)),
        "high_risk_passengers": int(df.loc[df['risk_category'] == 'High', 'passenger_id'].nunique()),
        "fraud_detection_rate_pct": detection_rate,
        "average_risk_score": round(float(df['risk_score'].mean()), 2),
        "passengers_flagged_for_inspection": int(flagged['passenger_id'].nunique()),
        "recommended_risk_threshold": RECOMMENDED_THRESHOLD,
    })

@app.route('/fraud-detection/overview', methods=['GET'])
def fraud_detection_overview():
    df = history_df.copy()
    flagged_mask = _flagged_mask(df)

    normal_vs_suspicious = {
        "normal": int((~flagged_mask).sum()),
        "suspicious": int(flagged_mask.sum()),
    }

    fraud_type_distribution = _fraud_type_breakdown(df, only_flagged=True)

    trend = (
        df.assign(month=df['date'].dt.to_period('M').astype(str))
        .groupby('month')
        .apply(lambda g: pd.Series({
            "total_transactions": int(len(g)),
            "flagged_suspicious": int(_flagged_mask(g).sum()),
            "actual_fraud": int((g['is_fraud'] == 1).sum()),
        }))
        .reset_index()
        .sort_values('month')
    )
    fraud_detection_trend = trend.to_dict(orient='records')

    recent_fraud_alerts = (
        df[df['risk_category'] == 'High']
        .sort_values('date', ascending=False)
        .head(15)
        [['transaction_id', 'passenger_id', 'passenger_name', 'date', 'route',
          'risk_score', 'suspected_fraud_type', 'reason_for_flagging']]
    )
    recent_fraud_alerts['date'] = recent_fraud_alerts['date'].dt.strftime('%Y-%m-%d')

    fraud_by_route = (
        df.groupby('route')
        .apply(lambda g: pd.Series({
            "total": int(len(g)),
            "flagged": int(_flagged_mask(g).sum()),
            "fraud_rate_pct": round(100 * _flagged_mask(g).sum() / len(g), 2),
        }))
        .reset_index()
        .sort_values('fraud_rate_pct', ascending=False)
    )

    return jsonify({
        "success": True,
        "normal_vs_suspicious": normal_vs_suspicious,
        "fraud_type_distribution": fraud_type_distribution,
        "fraud_detection_trend": fraud_detection_trend,
        "recent_fraud_alerts": recent_fraud_alerts.to_dict(orient='records'),
        "fraud_by_route": fraud_by_route.to_dict(orient='records'),
    })

@app.route('/anomaly-detection/overview', methods=['GET'])
def anomaly_detection_overview():
    df = history_df

    def _model_block(score_col, pred_col_threshold=0.5, label=None):
        if score_col not in df.columns:
            return None
        scores = df[score_col]
        flagged = scores >= pred_col_threshold
        block = {
            "flagged_count": int(flagged.sum()),
            "mean_score": round(float(scores.mean()), 3),
        }
        if 'is_fraud' in df.columns and flagged.any() and (df['is_fraud'] == 1).any():
            tp = int(((flagged) & (df['is_fraud'] == 1)).sum())
            block["true_positives_at_0.5"] = tp
        return block

    if HAS_PER_MODEL_SCORES:
        isolation_forest_results = _model_block('iso_score')
        one_class_svm_results = _model_block('ocsvm_score')
        autoencoder_results = _model_block('autoencoder_score')
        score_dist_source = df[['iso_score', 'ocsvm_score', 'autoencoder_score']]
    else:
        isolation_forest_results = one_class_svm_results = autoencoder_results = None
        score_dist_source = None

    bins = list(range(0, 101, 10))
    hist, _ = np.histogram(df['risk_score'], bins=bins)
    ensemble_distribution = [
        {"bucket": f"{bins[i]}-{bins[i+1]}", "count": int(hist[i])} for i in range(len(hist))
    ]

    per_model_distribution = None
    if score_dist_source is not None:
        pm_bins = [b / 100 for b in bins]
        per_model_distribution = {}
        for col in ['iso_score', 'ocsvm_score', 'autoencoder_score']:
            h, _ = np.histogram(score_dist_source[col], bins=pm_bins)
            per_model_distribution[col] = [
                {"bucket": f"{bins[i]}-{bins[i+1]}", "count": int(h[i])} for i in range(len(h))
            ]

    return jsonify({
        "success": True,
        "isolation_forest_results": isolation_forest_results,
        "one_class_svm_results": one_class_svm_results,
        "autoencoder_results": autoencoder_results,
        "model_performance_comparison": MODEL_PERFORMANCE,  # None until notebook patch applied
        "anomaly_score_distribution": {
            "ensemble": ensemble_distribution,
            "per_model": per_model_distribution,
        },
        "note": None if HAS_PER_MODEL_SCORES else (
            "Per-model (Isolation Forest / One-Class SVM / Autoencoder) breakdowns need "
            "iso_score/ocsvm_score/autoencoder_score columns in the historical CSV -- "
            "see notebook_patch_instructions.md."
        ),
    })

@app.route('/risk-analysis/overview', methods=['GET'])
def risk_analysis_overview():
    df = history_df

    risk_tiers = _risk_tier_breakdown(df)

    bins = list(range(0, 101, 10))
    hist, _ = np.histogram(df['risk_score'], bins=bins)
    risk_score_distribution = [
        {"bucket": f"{bins[i]}-{bins[i+1]}", "count": int(hist[i])} for i in range(len(hist))
    ]

    reason_counts = {}
    for reasons in df.loc[_flagged_mask(df), 'reason_for_flagging'].dropna():
        for r in str(reasons).split(';'):
            r = r.strip()
            if r and 'anomaly score only' not in r.lower():
                reason_counts[r] = reason_counts.get(r, 0) + 1
    top_risk_factors = sorted(
        [{"reason": k, "count": v} for k, v in reason_counts.items()],
        key=lambda x: x['count'], reverse=True
    )[:10]

    risk_by_fraud_type = (
        df[_flagged_mask(df)]
        .groupby('suspected_fraud_type')['risk_score']
        .agg(['mean', 'count'])
        .reset_index()
        .rename(columns={'mean': 'avg_risk_score', 'count': 'transaction_count'})
    )
    risk_by_fraud_type['avg_risk_score'] = risk_by_fraud_type['avg_risk_score'].round(2)

    return jsonify({
        "success": True,
        "risk_tier_breakdown": risk_tiers,
        "risk_score_distribution": risk_score_distribution,
        "top_risk_factors": top_risk_factors,
        "risk_by_fraud_type": risk_by_fraud_type.to_dict(orient='records'),
    })

@app.route('/passenger-verification/list', methods=['GET'])
def passenger_verification_list():
    df = history_df.copy()

    risk_tier = request.args.get('risk_tier')  # High / Medium / Low / None = all
    search = request.args.get('search', '').strip()
    page = max(int(request.args.get('page', 1)), 1)
    page_size = min(max(int(request.args.get('page_size', 20)), 1), 200)
    only_flagged = request.args.get('only_flagged', 'true').lower() == 'true'

    if only_flagged:
        df = df[_flagged_mask(df)]
    if risk_tier:
        df = df[df['risk_category'] == risk_tier]
    if search:
        s = search.lower()
        df = df[
            df['passenger_id'].astype(str).str.lower().str.contains(s) |
            df['passenger_name'].astype(str).str.lower().str.contains(s) |
            df['transaction_id'].astype(str).str.lower().str.contains(s)
        ]

    df = df.sort_values('risk_score', ascending=False)
    page_df, total = _paginate(df, page, page_size)

    verification_status_default = 'Pending Review'
    records = page_df[[
        'transaction_id', 'passenger_id', 'passenger_name', 'date', 'route',
        'ticket_type', 'fare_paid_lkr', 'risk_score', 'risk_category',
        'suspected_fraud_type', 'reason_for_flagging', 'recommended_action',
    ]].copy()
    records['date'] = records['date'].dt.strftime('%Y-%m-%d')
    records['verification_status'] = verification_status_default

    return jsonify({
        "success": True,
        "total": int(total),
        "page": page,
        "page_size": page_size,
        "passengers": records.to_dict(orient='records'),
    })

@app.route('/inspection-workload/overview', methods=['GET'])
def inspection_workload_overview():
    df = history_df

    thresholds = list(range(0, 101, 5))
    curve = []
    for t in thresholds:
        flagged = df['risk_score'] >= t
        inspection_rate = flagged.mean()
        fraud_df = df[df['is_fraud'] == 1]
        detection_rate = (fraud_df['risk_score'] >= t).mean() if len(fraud_df) else 0.0
        curve.append({
            "threshold": t,
            "inspection_rate_pct": round(100 * inspection_rate, 2),
            "detection_rate_pct": round(100 * detection_rate, 2),
        })

    at_recommended = df[_flagged_mask(df)]
    fraud_df = df[df['is_fraud'] == 1]
    detection_rate_at_recommended = (
        round(100 * (fraud_df['risk_score'] >= RECOMMENDED_THRESHOLD).mean(), 2)
        if len(fraud_df) else 0.0
    )

    return jsonify({
        "success": True,
        "passengers_flagged_for_inspection": int(at_recommended['passenger_id'].nunique()),
        "inspection_rate_pct": round(100 * len(at_recommended) / len(df), 2),
        "fraud_detection_rate_pct": detection_rate_at_recommended,
        "recommended_risk_threshold": RECOMMENDED_THRESHOLD,
        "workload_vs_detection_curve": curve,
    })

@app.route('/predict_batch', methods=['POST'])
def predict_batch():
    """
    Body (JSON):
    {
        "train_route": "Colombo Fort - Kandy",
        "date": "2026-09-14",          # can be a future date
        "n_passengers": 40
    }
    """
    body = request.get_json()
    if body is None:
        raise InvalidRequestError("Request body must be JSON.")

    required = ["train_route", "date", "n_passengers"]
    missing = [f for f in required if f not in body]
    if missing:
        raise InvalidRequestError(f"Missing required field(s): {missing}")

    route = body['train_route']
    date_str = body['date']
    n_passengers = int(body['n_passengers'])

    if route not in ROUTES:
        raise InvalidRequestError(f"Unknown route '{route}'. Known routes: {ROUTES}")
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        raise InvalidRequestError(f"Invalid date '{date_str}'. Expected format: YYYY-MM-DD")
    if not (1 <= n_passengers <= 2000):
        raise InvalidRequestError("n_passengers must be between 1 and 2000.")

    sim_df, day_name = _simulate_transactions(route, date_str, n_passengers)
    scored = predict_fraud_risk(sim_df)

    flagged = scored[_flagged_mask(scored)]
    predictions = [
        {
            "transaction_id": r['transaction_id'],
            "ensemble_risk_score": r['risk_score'],
            "risk_tier": r['risk_category'],
            "likely_fraud_type": r['suspected_fraud_type'],
            "is_flagged_fraud": bool(r['risk_score'] >= RECOMMENDED_THRESHOLD),
            "reason_for_flagging": r['reason_for_flagging'],
            "recommended_action": r['recommended_action'],
        }
        for _, r in scored.iterrows()
    ]

    summary = {
        "train_route": route,
        "date": date_str,
        "day_of_week": day_name,
        "total_passengers": int(n_passengers),
        "predicted_fraud_count": int(len(flagged)),
        "fraud_rate_pct": round(100 * len(flagged) / n_passengers, 2) if n_passengers else 0,
        "risk_tier_breakdown": _risk_tier_breakdown(scored),
        "fraud_type_breakdown": _fraud_type_breakdown(scored, only_flagged=True),
    }

    return jsonify({"success": True, "summary": summary, "predictions": predictions})


@app.route('/predict_transaction', methods=['POST'])
def predict_transaction():
    """
    Body (JSON): a single raw transaction, same shape as one row simulated above:
    {
        "transaction_id": "TXN123", "passenger_id": "PSG123", "date": "2026-09-14",
        "time": "18:40", "day_of_week": "Monday", "route": "Colombo Fort - Kandy",
        "travel_class": "2nd Class", "ticket_type": "Full Fare",
        "standard_fare_lkr": 420, "fare_paid_lkr": 420, "payment_method": "Cash",
        "booking_channel": "Station Counter", "seat_number": null, "ticket_scan_count": 1
    }
    For manually verifying one specific ticket (e.g. an inspector checking a walk-up case).
    """
    body = request.get_json()
    if body is None:
        raise InvalidRequestError("Request body must be JSON.")

    required = ["transaction_id", "passenger_id", "date", "time", "day_of_week", "route",
                "travel_class", "ticket_type", "standard_fare_lkr", "fare_paid_lkr",
                "payment_method", "booking_channel", "ticket_scan_count"]
    missing = [f for f in required if f not in body]
    if missing:
        raise InvalidRequestError(f"Missing required field(s): {missing}")

    txn_df = pd.DataFrame([body])
    if 'seat_number' not in txn_df.columns:
        txn_df['seat_number'] = np.nan
    scored = predict_fraud_risk(txn_df).iloc[0]

    return jsonify({
        "success": True,
        "transaction_id": scored['transaction_id'],
        "risk_score": scored['risk_score'],
        "risk_category": scored['risk_category'],
        "suspected_fraud_type": scored['suspected_fraud_type'],
        "reason_for_flagging": scored['reason_for_flagging'],
        "recommended_action": scored['recommended_action'],
        "model_breakdown": {
            "isolation_forest": scored['iso_score'],
            "one_class_svm": scored['ocsvm_score'],
            "autoencoder": scored['autoencoder_score'],
        },
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5555)