import os
import numpy as np
import pandas as pd
import joblib
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

MODEL_PATH = os.path.join('outputs', 'demand_forecast_model.joblib')
ENCODERS_PATH = os.path.join('outputs', 'label_encoders.joblib')
HISTORY_PATH = 'outputs/sl_railway_ticketing_2020_2024.csv'

print('Loading model artifacts...')
model = joblib.load(MODEL_PATH)
encoders = joblib.load(ENCODERS_PATH)

history_df = pd.read_csv(HISTORY_PATH)
history_df['date'] = pd.to_datetime(history_df['date'])
history_df['route'] = history_df['origin_station'] + ' - ' + history_df['destination_station']
print(f'Loaded model + {len(history_df):,} historical records.')

DEMAND_CLASSES = ['1st Class', '2nd Class', '3rd Class']

FEATURE_COLS = [
    'route_enc', 'train_type_enc', 'class_enc', 'line_name_enc', 'day_type_enc',
    'distance_km', 'seat_capacity', 'is_public_holiday', 'is_covid_lockdown_period',
    'month', 'dayofweek', 'day', 'weekofyear', 'is_weekend',
    'month_sin', 'month_cos', 'dow_sin', 'dow_cos',
    'lag_1', 'lag_7', 'roll_mean_7', 'roll_mean_30'
]

DEFAULT_CAPACITY = (
    history_df.groupby(['train_type', 'class'])['seat_capacity']
    .first()
    .unstack()
    .to_dict(orient='index')
)

class InvalidRequestError(ValueError):
    pass


def _validate_categorical(field_name, value, encoder):
    """LabelEncoder.transform() raises on unseen categories -- catch that early
    with a clear, API-friendly error instead of a raw stack trace."""
    if value not in encoder.classes_:
        raise InvalidRequestError(
            f"Unknown {field_name} '{value}'. Known values: {list(encoder.classes_)}"
        )


def _validate_date(date_str):
    try:
        return pd.Timestamp(datetime.strptime(date_str, '%Y-%m-%d'))
    except ValueError:
        raise InvalidRequestError(f"Invalid date '{date_str}'. Expected format: YYYY-MM-DD")

def _lag_features_for(route, train_type, cls, before_date):
    series = history_df[
        (history_df['route'] == route) &
        (history_df['train_type'] == train_type) &
        (history_df['class'] == cls) &
        (history_df['date'] < before_date)
    ].sort_values('date')

    if len(series) == 0:
        return {'lag_1': 0, 'lag_7': 0, 'roll_mean_7': 0, 'roll_mean_30': 0}

    return {
        'lag_1': series['tickets_sold'].iloc[-1],
        'lag_7': series['tickets_sold'].iloc[-7] if len(series) >= 7 else series['tickets_sold'].mean(),
        'roll_mean_7': series['tickets_sold'].tail(7).mean(),
        'roll_mean_30': series['tickets_sold'].tail(30).mean(),
    }


def build_feature_row(date, origin_station, destination_station, line_name, train_type,
                       cls, distance_km, seat_capacity, is_public_holiday, is_covid_lockdown_period):
    route = f"{origin_station} - {destination_station}"
    dayofweek = date.dayofweek
    day_type = 'Weekend' if dayofweek >= 5 else 'Weekday'

    _validate_categorical('train_type', train_type, encoders['train_type'])
    _validate_categorical('class', cls, encoders['class'])
    _validate_categorical('line_name', line_name, encoders['line_name'])
    _validate_categorical('route', route, encoders['route'])
    _validate_categorical('day_type', day_type, encoders['day_type'])

    lag_feats = _lag_features_for(route, train_type, cls, date)

    row = {
        'route_enc': encoders['route'].transform([route])[0],
        'train_type_enc': encoders['train_type'].transform([train_type])[0],
        'class_enc': encoders['class'].transform([cls])[0],
        'line_name_enc': encoders['line_name'].transform([line_name])[0],
        'day_type_enc': encoders['day_type'].transform([day_type])[0],
        'distance_km': distance_km,
        'seat_capacity': seat_capacity,
        'is_public_holiday': is_public_holiday,
        'is_covid_lockdown_period': is_covid_lockdown_period,
        'month': date.month,
        'dayofweek': dayofweek,
        'day': date.day,
        'weekofyear': int(date.isocalendar().week),
        'is_weekend': int(dayofweek >= 5),
        'month_sin': np.sin(2 * np.pi * date.month / 12),
        'month_cos': np.cos(2 * np.pi * date.month / 12),
        'dow_sin': np.sin(2 * np.pi * dayofweek / 7),
        'dow_cos': np.cos(2 * np.pi * dayofweek / 7),
        **lag_feats,
    }
    return row

def predict_demand_for_route(body: dict):
    """
    Takes the parsed request body, returns:
        predicted_demand: {'1st Class': int, '2nd Class': int, '3rd Class': int}
        capacities:       {'1st Class': int, '2nd Class': int, '3rd Class': int}
    """
    date = _validate_date(body['date'])
    origin_station = body['origin_station']
    destination_station = body['destination_station']
    line_name = body['line_name']
    train_type = body['train_type']
    distance_km = body['distance_km']
    is_public_holiday = int(body.get('is_public_holiday', 0))
    is_covid_lockdown_period = int(body.get('is_covid_lockdown_period', 0))

    override_capacity = body.get('class_capacity')
    if train_type not in DEFAULT_CAPACITY and not override_capacity:
        raise InvalidRequestError(
            f"Unknown train_type '{train_type}' and no class_capacity override provided. "
            f"Known train types: {list(DEFAULT_CAPACITY.keys())}"
        )

    rows = []
    capacities = {}
    for cls in DEMAND_CLASSES:
        if override_capacity and cls in override_capacity:
            seat_capacity = int(override_capacity[cls])
        else:
            seat_capacity = int(DEFAULT_CAPACITY[train_type][cls])
        capacities[cls] = seat_capacity

        rows.append(build_feature_row(
            date=date, origin_station=origin_station, destination_station=destination_station,
            line_name=line_name, train_type=train_type, cls=cls, distance_km=distance_km,
            seat_capacity=seat_capacity, is_public_holiday=is_public_holiday,
            is_covid_lockdown_period=is_covid_lockdown_period,
        ))

    X = pd.DataFrame(rows)[FEATURE_COLS]
    raw_preds = model.predict(X)

    predicted_demand = {}
    for cls, pred, cap in zip(DEMAND_CLASSES, raw_preds, capacities.values()):
        predicted_demand[cls] = int(np.clip(round(pred), 0, cap))

    return predicted_demand, capacities


def adaptive_seat_allocation(predicted_demand, total_capacity, min_class_capacity=None,
                             max_class_capacity=None, fairness_floor_pct=0.05):
    classes = list(predicted_demand.keys())
    min_class_capacity = min_class_capacity or {}
    max_class_capacity = max_class_capacity or {}
    fairness_floor = {
        cls: max(min_class_capacity.get(cls, 0), int(total_capacity * fairness_floor_pct))
        for cls in classes
    }
    floor_sum = sum(fairness_floor.values())
    if floor_sum > total_capacity and floor_sum > 0:
        scale = total_capacity / floor_sum
        fairness_floor = {cls: int(value * scale) for cls, value in fairness_floor.items()}
        floor_sum = sum(fairness_floor.values())

    allocation = dict(fairness_floor)
    remaining = total_capacity - floor_sum
    extra_needed = {
        cls: max(0, predicted_demand[cls] - fairness_floor[cls]) for cls in classes
    }
    total_extra_needed = sum(extra_needed.values())
    if total_extra_needed > 0 and remaining > 0:
        for cls in classes:
            share = extra_needed[cls] / total_extra_needed
            maximum = max_class_capacity.get(cls, total_capacity)
            allocation[cls] = min(allocation[cls] + int(remaining * share), maximum)

    leftover = total_capacity - sum(allocation.values())
    for cls in sorted(classes, key=lambda item: predicted_demand[item] - allocation[item], reverse=True):
        if leftover <= 0:
            break
        maximum = max_class_capacity.get(cls, total_capacity)
        can_add = max(0, min(leftover, maximum - allocation[cls]))
        allocation[cls] += can_add
        leftover -= can_add

    return {
        cls: {
            "allocated_seats": allocation[cls],
            "predicted_demand": predicted_demand[cls],
            "expected_utilization_pct": round(
                100 * min(predicted_demand[cls], allocation[cls]) / allocation[cls], 2
            ) if allocation[cls] > 0 else 0,
            "unmet_demand": max(0, predicted_demand[cls] - allocation[cls]),
        }
        for cls in classes
    }


@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

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
        if body is None:
            raise InvalidRequestError("Request body must be JSON.")

        required = ["date", "origin_station", "destination_station",
                    "line_name", "train_type", "distance_km"]
        missing = [f for f in required if f not in body]
        if missing:
            raise InvalidRequestError(f"Missing required field(s): {missing}")

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

    except InvalidRequestError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None,
                     "historical_records": len(history_df)})


@app.route('/seat_allocation', methods=['POST'])
def seat_allocation():
    try:
        body = request.get_json()
        if body is None:
            raise InvalidRequestError("Request body must be JSON.")
        required = ["date", "origin_station", "destination_station", "line_name", "train_type", "distance_km"]
        missing = [field for field in required if field not in body]
        if missing:
            raise InvalidRequestError(f"Missing required field(s): {missing}")

        predicted_demand, capacities = predict_demand_for_route(body)
        total_capacity = int(body.get("total_capacity", sum(capacities.values())))
        allocation = adaptive_seat_allocation(
            predicted_demand,
            total_capacity,
            body.get("min_class_capacity"),
            body.get("class_capacity", capacities),
            float(body.get("fairness_floor_pct", 0.05)),
        )
        return jsonify({
            "success": True,
            "route": f"{body['origin_station']} - {body['destination_station']}",
            "date": body["date"],
            "train_type": body["train_type"],
            "total_capacity": total_capacity,
            "allocation_by_class": allocation,
            "total_allocated_seats": sum(item["allocated_seats"] for item in allocation.values()),
            "total_unmet_demand": sum(item["unmet_demand"] for item in allocation.values()),
        })
    except InvalidRequestError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route('/train_services', methods=['GET'])
def train_services():

    combos = (
        history_df[['origin_station', 'destination_station', 'line_name', 'distance_km', 'train_type']]
        .drop_duplicates()
        .sort_values(['origin_station', 'destination_station', 'train_type'])
    )

    services = []
    for _, row in combos.iterrows():
        cap = DEFAULT_CAPACITY.get(row['train_type'], {})
        services.append({
            "id": f"{row['origin_station']}|{row['destination_station']}|{row['train_type']}",
            "origin_station": row['origin_station'],
            "destination_station": row['destination_station'],
            "line_name": row['line_name'],
            "distance_km": int(row['distance_km']),
            "train_type": row['train_type'],
            "label": f"{row['origin_station']} \u2192 {row['destination_station']} ({row['train_type']})",
            "default_capacity": {cls: int(cap.get(cls, 0)) for cls in DEMAND_CLASSES},
        })

    print(services)

    return jsonify({"success": True, "count": len(services), "train_services": services})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=4444, use_reloader=False)