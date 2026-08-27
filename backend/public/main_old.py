import json
import random

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

MODEL_DIR = "./data/"

iso_forest_simple = joblib.load(MODEL_DIR + "isolation_forest_simple.joblib")
oc_svm_simple = joblib.load(MODEL_DIR + "one_class_svm_simple.joblib")
autoencoder_simple = joblib.load(MODEL_DIR + "autoencoder_simple.joblib")
label_encoders = joblib.load(MODEL_DIR + "label_encoders.joblib")
score_ranges = joblib.load(MODEL_DIR + "simple_score_ranges.joblib")

sim_params = joblib.load(MODEL_DIR + "simulation_params.joblib")

le_class = label_encoders["class"]
le_ticket = label_encoders["ticket_type"]
le_route = label_encoders["route"]

demand_model = joblib.load(MODEL_DIR + "demand_forecast_model.joblib")
demand_label_encoders = joblib.load(MODEL_DIR + "demand_label_encoders.joblib")
demand_feature_columns = joblib.load(MODEL_DIR + "demand_feature_columns.joblib")

DEMAND_CLASSES = ["1st Class", "2nd Class", "3rd Class"]
DEMAND_CLASS_WEIGHTS = {"1st Class": 0.05, "2nd Class": 0.30, "3rd Class": 0.65}
TRAIN_TYPE_BASE_CAPACITY = {
    "Express": 900, "Intercity": 750, "Slow/Local": 500, "Night Mail": 650,
}

FEATURE_COLS = [
    "hour", "fare_ratio", "is_weekend", "ticket_scan_count",
    "travel_class_code", "ticket_type_code", "route_code",
    "is_online_booking", "is_concession_ticket", "has_seat_number",
]

FRAUD_THRESHOLD = 0.5

app = Flask(__name__)
CORS(app)

def risk_tier(score):
    if score >= 0.7:
        return "High Risk"
    elif score >= 0.4:
        return "Medium Risk"
    return "Low Risk"


def explain_fraud_type(row):
    reasons = []

    if row["ticket_scan_count"] > 1:
        reasons.append("Ticket Reuse")

    if row["is_concession_ticket"] == 1 and row["fare_ratio"] <= 0.35:
        reasons.append("Abnormal Concession Usage")

    if row["is_online_booking"] == 1 and row["has_seat_number"] == 1 \
            and row["ticket_scan_count"] == 1:
        reasons.append("Suspicious Resale")

    if not reasons:
        return "Unclassified Anomaly"
    return " + ".join(reasons)


def simulate_day_transactions(route_name, date_str, day_of_week, n_passengers=40):
    """
    Generates a synthetic day's worth of passenger transactions for one
    train route, using the same distribution the training data was built
    from (see notebook Section 15). This stands in for a real ticketing-
    system export filtered by route + date.
    """
    classes = sim_params["classes"]
    class_weights = sim_params["class_weights"]
    ticket_types = sim_params["ticket_types"]
    ticket_type_weights = sim_params["ticket_type_weights"]
    booking_channels = sim_params["booking_channels"]
    booking_weights = sim_params["booking_weights"]
    standard_fare_by_class = sim_params["standard_fare_by_class"]

    day_rows = []
    for i in range(n_passengers):
        travel_class = random.choices(classes, weights=class_weights)[0]
        ticket_type = random.choices(ticket_types, weights=ticket_type_weights)[0]
        channel = random.choices(booking_channels, weights=booking_weights)[0]
        payment = "Online" if channel == "Online" else random.choices(
            ["Cash", "Online"], weights=[0.85, 0.15]
        )[0]
        base_fare = standard_fare_by_class[travel_class]

        if ticket_type == "Full Fare":
            fare_paid = base_fare
        elif ticket_type == "Season Ticket":
            fare_paid = round(base_fare * 0.5)
        elif ticket_type == "Student Concession":
            fare_paid = round(base_fare * 0.4)
        elif ticket_type == "Senior Citizen Concession":
            fare_paid = round(base_fare * 0.5)
        elif ticket_type == "Government Employee Concession":
            fare_paid = round(base_fare * 0.6)
        else:
            fare_paid = round(base_fare * 0.3)

        scan_count = 1
        if random.random() < 0.08:
            scan_count = random.randint(2, 4)

        hour = random.choices(
            [6, 7, 8, 9, 16, 17, 18, 19], weights=[3, 4, 3, 2, 4, 4, 3, 2]
        )[0]

        day_rows.append({
            "transaction_id": f"TXN-{date_str}-{i + 1:03d}",
            "date": date_str,
            "time": f"{hour:02d}:{random.randint(0, 59):02d}",
            "day_of_week": day_of_week,
            "route": route_name,
            "travel_class": travel_class,
            "ticket_type": ticket_type,
            "standard_fare_lkr": base_fare,
            "fare_paid_lkr": fare_paid,
            "payment_method": payment,
            "booking_channel": channel,
            "seat_number": (random.randint(1, 80) if channel == "Online" else None),
            "ticket_scan_count": scan_count,
            "inspection_status": random.choices(
                ["Inspected", "Not Inspected"], weights=[0.35, 0.65]
            )[0],
        })
    return day_rows


def build_features(records):
    """
    records: list of dicts, each with the raw ticket fields:
        date, time, day_of_week, route, travel_class, ticket_type,
        standard_fare_lkr, fare_paid_lkr, payment_method, booking_channel,
        seat_number, ticket_scan_count, inspection_status
    Returns a DataFrame with the engineered feature columns + the original fields.
    """
    data = pd.DataFrame(records)

    required = ["date", "time", "day_of_week", "route", "travel_class",
                "ticket_type", "standard_fare_lkr", "fare_paid_lkr",
                "booking_channel", "seat_number", "ticket_scan_count"]
    missing = [c for c in required if c not in data.columns]
    if missing:
        raise ValueError(f"Missing required field(s): {missing}")

    data["date"] = pd.to_datetime(data["date"])
    data["hour"] = pd.to_datetime(data["time"], format="%H:%M").dt.hour
    data["is_weekend"] = data["day_of_week"].isin(["Saturday", "Sunday"]).astype(int)

    data["fare_ratio"] = data["fare_paid_lkr"] / data["standard_fare_lkr"]
    data["is_multi_scanned"] = (data["ticket_scan_count"] > 1).astype(int)
    data["has_seat_number"] = data["seat_number"].notna().astype(int)
    data["is_online_booking"] = (data["booking_channel"] == "Online").astype(int)
    data["is_concession_ticket"] = (data["ticket_type"] != "Full Fare").astype(int)

    def safe_transform(encoder, series, field_name):
        unknown = set(series.unique()) - set(encoder.classes_)
        if unknown:
            raise ValueError(
                f"Unknown value(s) in '{field_name}': {unknown}. "
                f"Known values: {list(encoder.classes_)}"
            )
        return encoder.transform(series)

    data["travel_class_code"] = safe_transform(le_class, data["travel_class"], "travel_class")
    data["ticket_type_code"] = safe_transform(le_ticket, data["ticket_type"], "ticket_type")
    data["route_code"] = safe_transform(le_route, data["route"], "route")

    return data


def score_batch(data):
    """Takes the engineered feature DataFrame, returns risk scores per row."""
    X = data[FEATURE_COLS].values

    iso_raw = iso_forest_simple.decision_function(X)
    iso_score = np.clip(
        (score_ranges["iso_forest_max"] - iso_raw) /
        (score_ranges["iso_forest_max"] - score_ranges["iso_forest_min"]), 0, 1
    )

    svm_raw = oc_svm_simple.decision_function(X)
    svm_score = np.clip(
        (score_ranges["oc_svm_max"] - svm_raw) /
        (score_ranges["oc_svm_max"] - score_ranges["oc_svm_min"]), 0, 1
    )

    recon = autoencoder_simple.predict(X)
    recon_err = np.mean((X - recon) ** 2, axis=1)
    ae_score = np.clip(
        (recon_err - score_ranges["recon_error_min"]) /
        (score_ranges["recon_error_max"] - score_ranges["recon_error_min"]), 0, 1
    )

    ensemble = np.mean([iso_score, svm_score, ae_score], axis=0)

    data = data.copy()
    data["iso_forest_score"] = iso_score
    data["oc_svm_score"] = svm_score
    data["autoencoder_score"] = ae_score
    data["ensemble_risk_score"] = ensemble
    data["risk_tier"] = data["ensemble_risk_score"].apply(risk_tier)
    data["is_flagged_fraud"] = (data["ensemble_risk_score"] >= FRAUD_THRESHOLD)
    data["likely_fraud_type"] = data.apply(
        lambda r: explain_fraud_type(r) if r["is_flagged_fraud"] else "None", axis=1
    )
    return data


def build_demand_feature_row(input_dict, travel_class, seat_capacity):
    """
    Builds one model-ready row (matching demand_feature_columns order) for a
    single (route, date, train_type, class) combination.
    """
    d = pd.to_datetime(input_dict["date"])

    row = {
        "year": d.year,
        "month": d.month,
        "day_of_month": d.day,
        "week_of_year": int(d.isocalendar().week),
        "is_weekend": int(d.dayofweek >= 5),
        "is_public_holiday": int(input_dict.get("is_public_holiday", 0)),
        "is_covid_lockdown_period": int(input_dict.get("is_covid_lockdown_period", 0)),
        "distance_km": input_dict["distance_km"],
        "seat_capacity": seat_capacity,
    }

    def enc(field_name, value):
        encoder = demand_label_encoders[field_name]
        if value not in encoder.classes_:
            raise ValueError(
                f"Unknown value '{value}' for '{field_name}'. "
                f"Known values: {list(encoder.classes_)}"
            )
        return int(encoder.transform([value])[0])

    row["day_of_week_enc"] = enc("day_of_week", d.day_name())
    row["origin_station_enc"] = enc("origin_station", input_dict["origin_station"])
    row["destination_station_enc"] = enc("destination_station", input_dict["destination_station"])
    row["line_name_enc"] = enc("line_name", input_dict["line_name"])
    row["train_type_enc"] = enc("train_type", input_dict["train_type"])
    row["class_enc"] = enc("class", travel_class)

    return pd.DataFrame([row])[demand_feature_columns]


def predict_demand_for_route(input_dict):
    """
    Predicts tickets_sold (demand) for each travel class on the given route/date/
    train_type. If per-class seat capacities aren't supplied, falls back to the
    default class split used at training time (TRAIN_TYPE_BASE_CAPACITY x
    DEMAND_CLASS_WEIGHTS), keyed off train_type.
    """
    train_type = input_dict["train_type"]
    base_capacity = TRAIN_TYPE_BASE_CAPACITY.get(train_type)
    if base_capacity is None:
        raise ValueError(
            f"Unknown 'train_type': {train_type}. "
            f"Known values: {list(TRAIN_TYPE_BASE_CAPACITY.keys())}"
        )

    class_capacity_input = input_dict.get("class_capacity", {})

    predictions = {}
    capacities = {}
    for cls in DEMAND_CLASSES:
        cap = class_capacity_input.get(cls, int(base_capacity * DEMAND_CLASS_WEIGHTS[cls]))
        capacities[cls] = cap
        feature_row = build_demand_feature_row(input_dict, cls, cap)
        predicted = float(demand_model.predict(feature_row)[0])
        predicted = max(0, min(predicted, cap))  # cannot exceed physical seats offered
        predictions[cls] = int(round(predicted))

    return predictions, capacities


def adaptive_seat_allocation(predicted_demand, total_capacity, min_class_capacity=None,
                              max_class_capacity=None, fairness_floor_pct=0.05):
    """
    Fairness-aware heuristic allocator (per TAF Section 9, sub-objective 4):
      1. Every class is guaranteed a minimum floor of seats (fairness), so no
         class is starved even if its predicted demand is low.
      2. Remaining capacity is distributed proportionally to each class's
         *unmet* predicted demand above its floor.
      3. Any capacity left over (rounding / class capacity caps) is handed to
         the class(es) with the largest remaining unmet demand.
    """
    classes = list(predicted_demand.keys())
    min_class_capacity = min_class_capacity or {}
    max_class_capacity = max_class_capacity or {}

    fairness_floor = {
        c: max(min_class_capacity.get(c, 0), int(total_capacity * fairness_floor_pct))
        for c in classes
    }
    floor_sum = sum(fairness_floor.values())
    if floor_sum > total_capacity and floor_sum > 0:
        scale = total_capacity / floor_sum
        fairness_floor = {c: int(v * scale) for c, v in fairness_floor.items()}
        floor_sum = sum(fairness_floor.values())

    allocation = dict(fairness_floor)
    remaining = total_capacity - floor_sum

    extra_needed = {c: max(0, predicted_demand[c] - fairness_floor[c]) for c in classes}
    total_extra_needed = sum(extra_needed.values())

    if total_extra_needed > 0 and remaining > 0:
        for c in classes:
            share = extra_needed[c] / total_extra_needed
            add = int(remaining * share)
            max_cap = max_class_capacity.get(c, total_capacity)
            allocation[c] = min(allocation[c] + add, max_cap)

    leftover = total_capacity - sum(allocation.values())
    if leftover > 0:
        for c in sorted(classes, key=lambda c: predicted_demand[c] - allocation[c], reverse=True):
            if leftover <= 0:
                break
            max_cap = max_class_capacity.get(c, total_capacity)
            can_add = max(0, min(leftover, max_cap - allocation[c]))
            allocation[c] += can_add
            leftover -= can_add

    result = {}
    for c in classes:
        seats = allocation[c]
        demand = predicted_demand[c]
        result[c] = {
            "allocated_seats": seats,
            "predicted_demand": demand,
            "expected_utilization_pct": round(100 * min(demand, seats) / seats, 2) if seats > 0 else 0,
            "unmet_demand": max(0, demand - seats),
        }
    return result


@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response


@app.route('/predict_single', methods=['POST'])
def predict_single():
    """
    Body (JSON): a single transaction object, e.g.
    {
        "transaction_id": "TXN2026001",
        "date": "2026-08-14",
        "time": "08:15",
        "day_of_week": "Friday",
        "route": "Colombo Fort - Kandy",
        "travel_class": "2nd Class",
        "ticket_type": "Student Concession",
        "standard_fare_lkr": 420,
        "fare_paid_lkr": 130,
        "payment_method": "Online",
        "booking_channel": "Online",
        "seat_number": 15,
        "ticket_scan_count": 2,
        "inspection_status": "Not Inspected"
    }
    """
    try:
        record = request.get_json()
        data = build_features([record])
        scored = score_batch(data)
        row = scored.iloc[0]

        result = {
            "transaction_id": record.get("transaction_id", "N/A"),
            "iso_forest_score": round(float(row["iso_forest_score"]), 3),
            "oc_svm_score": round(float(row["oc_svm_score"]), 3),
            "autoencoder_score": round(float(row["autoencoder_score"]), 3),
            "ensemble_risk_score": round(float(row["ensemble_risk_score"]), 3),
            "risk_tier": row["risk_tier"],
            "is_flagged_fraud": bool(row["is_flagged_fraud"]),
            "likely_fraud_type": row["likely_fraud_type"],
        }
        return jsonify({"success": True, "result": result})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route('/predict_batch', methods=['POST'])
def predict_batch():
    """
    Body (JSON):
    {
        "train_route": "Colombo Fort - Kandy",   # required
        "date": "2026-08-14",                    # required, format YYYY-MM-DD
        "n_passengers": 40                       # optional, default 40
    }
    """
    try:
        body = request.get_json()

        train_route = body.get("train_route")
        date_str = body.get("date")
        if not train_route:
            raise ValueError("'train_route' is required")
        if not date_str:
            raise ValueError("'date' is required")

        if train_route not in le_route.classes_:
            raise ValueError(
                f"Unknown 'train_route': {train_route}. "
                f"Known routes: {list(le_route.classes_)}"
            )

        try:
            date_obj = pd.to_datetime(date_str)
        except Exception:
            raise ValueError(f"'date' must be a valid date, got: {date_str}")
        day_of_week = date_obj.day_name()

        n_passengers = int(body.get("n_passengers", 40))
        if n_passengers <= 0:
            raise ValueError("'n_passengers' must be a positive integer")

        records = simulate_day_transactions(
            route_name=train_route,
            date_str=date_str,
            day_of_week=day_of_week,
            n_passengers=n_passengers,
        )

        data = build_features(records)
        scored = score_batch(data)

        total = len(scored)
        flagged_count = int(scored["is_flagged_fraud"].sum())

        per_transaction = []
        for i, row in scored.iterrows():
            per_transaction.append({
                "transaction_id": records[i].get("transaction_id", f"row_{i}"),
                "ensemble_risk_score": round(float(row["ensemble_risk_score"]), 3),
                "risk_tier": row["risk_tier"],
                "is_flagged_fraud": bool(row["is_flagged_fraud"]),
                "likely_fraud_type": row["likely_fraud_type"],
            })

        fraud_type_breakdown = (
            scored.loc[scored["is_flagged_fraud"], "likely_fraud_type"]
            .value_counts()
            .to_dict()
        )

        summary = {
            "train_route": train_route,
            "date": date_str,
            "day_of_week": day_of_week,
            "total_passengers": total,
            "predicted_fraud_count": flagged_count,
            "fraud_rate_pct": round(flagged_count / total * 100, 2) if total else 0,
            "risk_tier_breakdown": scored["risk_tier"].value_counts().to_dict(),
            "fraud_type_breakdown": fraud_type_breakdown,
        }

        return jsonify({
            "success": True,
            "summary": summary,
            "predictions": per_transaction,
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route('/predict_demand', methods=['POST'])
def predict_demand():
    """
    Body (JSON):
    {
        "date": "2026-04-13",
        "origin_station": "Colombo Fort",
        "destination_station": "Kandy",
        "line_name": "Main Line",
        "train_type": "Intercity",
        "distance_km": 121,
        "is_public_holiday": 1,                 # optional, default 0
        "is_covid_lockdown_period": 0,           # optional, default 0
        "class_capacity": {                      # optional, overrides default split
            "1st Class": 40, "2nd Class": 225, "3rd Class": 485
        }
    }
    """
    try:
        body = request.get_json()

        required = ["date", "origin_station", "destination_station",
                    "line_name", "train_type", "distance_km"]
        missing = [f for f in required if f not in body]
        if missing:
            raise ValueError(f"Missing required field(s): {missing}")

        predicted_demand, capacities = predict_demand_for_route(body)

        result = {
            cls: {
                "predicted_demand": predicted_demand[cls],
                "seat_capacity": capacities[cls],
                "expected_utilization_pct": round(
                    100 * predicted_demand[cls] / capacities[cls], 2
                ) if capacities[cls] > 0 else 0,
            }
            for cls in DEMAND_CLASSES
        }

        return jsonify({
            "success": True,
            "route": f"{body['origin_station']} - {body['destination_station']}",
            "date": body["date"],
            "train_type": body["train_type"],
            "predicted_demand_by_class": result,
            "total_predicted_demand": sum(predicted_demand.values()),
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route('/seat_allocation', methods=['POST'])
def seat_allocation():
    """
    Body (JSON):
    {
        "date": "2026-04-13",
        "origin_station": "Colombo Fort",
        "destination_station": "Kandy",
        "line_name": "Main Line",
        "train_type": "Intercity",
        "distance_km": 121,
        "is_public_holiday": 1,                 # optional, default 0
        "is_covid_lockdown_period": 0,           # optional, default 0
        "total_capacity": 750,                   # optional, defaults to train_type base capacity
        "class_capacity": {...},                 # optional, per-class physical max seats
        "min_class_capacity": {...},             # optional, per-class minimum floor (fairness)
        "fairness_floor_pct": 0.05               # optional, default 5% of total_capacity per class
    }
    """
    try:
        body = request.get_json()

        required = ["date", "origin_station", "destination_station",
                    "line_name", "train_type", "distance_km"]
        missing = [f for f in required if f not in body]
        if missing:
            raise ValueError(f"Missing required field(s): {missing}")

        predicted_demand, default_capacities = predict_demand_for_route(body)

        train_type = body["train_type"]
        total_capacity = int(body.get("total_capacity", TRAIN_TYPE_BASE_CAPACITY[train_type]))
        max_class_capacity = body.get("class_capacity", default_capacities)
        min_class_capacity = body.get("min_class_capacity", {})
        fairness_floor_pct = float(body.get("fairness_floor_pct", 0.05))

        allocation_result = adaptive_seat_allocation(
            predicted_demand=predicted_demand,
            total_capacity=total_capacity,
            min_class_capacity=min_class_capacity,
            max_class_capacity=max_class_capacity,
            fairness_floor_pct=fairness_floor_pct,
        )

        total_allocated = sum(v["allocated_seats"] for v in allocation_result.values())
        total_unmet = sum(v["unmet_demand"] for v in allocation_result.values())

        return jsonify({
            "success": True,
            "route": f"{body['origin_station']} - {body['destination_station']}",
            "date": body["date"],
            "train_type": train_type,
            "total_capacity": total_capacity,
            "allocation_by_class": allocation_result,
            "total_allocated_seats": total_allocated,
            "total_unmet_demand": total_unmet,
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "fraud_models_loaded": True,
        "demand_model_loaded": True,
    })


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=3333, debug=True)