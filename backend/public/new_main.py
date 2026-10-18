import os
import json
import numpy as np
import pandas as pd
import joblib
import holidays
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS

from weather_service import WEATHER_FIELDS, WeatherService, WeatherServiceError

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'outputs', 'demand_forecast_model.joblib')
ENCODERS_PATH = os.path.join(BASE_DIR, 'outputs', 'label_encoders.joblib')
MODEL_METADATA_PATH = os.path.join(BASE_DIR, 'outputs', 'demand_model_metadata.json')
HISTORY_PATH = os.path.join(BASE_DIR, 'outputs', 'sl_railway_ticketing_2020_2024.csv')

print('Loading model artifacts...')
model = joblib.load(MODEL_PATH)
encoders = joblib.load(ENCODERS_PATH)
with open(MODEL_METADATA_PATH, encoding='utf-8') as metadata_file:
    model_metadata = json.load(metadata_file)

history_df = pd.read_csv(HISTORY_PATH)
history_df['date'] = pd.to_datetime(history_df['date'])
history_df['route'] = history_df['origin_station'] + ' - ' + history_df['destination_station']
weather_service = WeatherService(BASE_DIR)
print(f'Loaded model + {len(history_df):,} historical records.')

DEMAND_CLASSES = ['1st Class', '2nd Class', '3rd Class']
WEATHER_CODE_LABELS = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle',
    53: 'Moderate drizzle', 55: 'Dense drizzle', 61: 'Slight rain',
    63: 'Moderate rain', 65: 'Heavy rain', 80: 'Slight rain showers',
    81: 'Moderate rain showers', 82: 'Violent rain showers', 95: 'Thunderstorm',
}

FEATURE_COLS = [
    'route_enc', 'train_type_enc', 'class_enc', 'line_name_enc', 'day_type_enc',
    'distance_km', 'seat_capacity', 'is_public_holiday',
    'month', 'dayofweek', 'day', 'weekofyear', 'is_weekend',
    'month_sin', 'month_cos', 'dow_sin', 'dow_cos',
    'lag_1', 'lag_7', 'roll_mean_7', 'roll_mean_30',
    'average_temperature', 'total_route_precipitation', 'total_route_rain',
    'total_route_precipitation_hours', 'average_route_wind_speed'
]

DEFAULT_CAPACITY = (
    history_df.groupby(['train_type', 'class'])['seat_capacity']
    .first()
    .unstack()
    .to_dict(orient='index')
)

class InvalidRequestError(ValueError):
    pass


class ModelPredictionError(RuntimeError):
    pass


def _validate_categorical(field_name, value, encoder):
    """LabelEncoder.transform() raises on unseen categories -- catch that early
    with a clear, API-friendly error instead of a raw stack trace."""
    if not isinstance(value, str) or not value.strip():
        raise InvalidRequestError(f"{field_name} must be a non-empty string.")
    if value not in encoder.classes_:
        if field_name == 'route':
            raise InvalidRequestError(
                f"The trained demand model does not support route '{value}'. "
                "Weather lookup may be available, but this route needs verified "
                "training data and model retraining before demand predictions are supported."
            )
        raise InvalidRequestError(
            f"Unknown {field_name} '{value}'. Known values: {list(encoder.classes_)}"
        )


def _validate_date(date_str):
    if not isinstance(date_str, str):
        raise InvalidRequestError("Date is required in YYYY-MM-DD format.")
    try:
        return pd.Timestamp(datetime.strptime(date_str, '%Y-%m-%d'))
    except ValueError:
        raise InvalidRequestError(f"Invalid date '{date_str}'. Expected format: YYYY-MM-DD")


def _service_model_key(origin_station, destination_station, line_name, train_type, distance_km):
    return (
        origin_station,
        destination_station,
        line_name,
        train_type,
        float(distance_km),
    )


def _build_model_supported_services():
    if weather_service.history.empty:
        return set()
    try:
        training_start, training_end = model_metadata['training_period'].split(' to ')
        start = _validate_date(training_start)
        end = _validate_date(training_end)
    except (KeyError, ValueError, InvalidRequestError):
        return set()

    weather_history = weather_service.history.dropna(subset=WEATHER_FIELDS)
    complete_station_dates = set(zip(
        weather_history['date'].dt.normalize(),
        weather_history['station'],
    ))
    training_records = history_df[
        history_df['date'].between(start, end, inclusive='both')
    ].copy()
    service_has_complete_weather = [
        (row.date.normalize(), row.origin_station) in complete_station_dates
        and (row.date.normalize(), row.destination_station) in complete_station_dates
        for row in training_records.itertuples()
    ]
    training_records = training_records.loc[service_has_complete_weather]
    supported = set()
    service_fields = [
        'origin_station', 'destination_station', 'line_name',
        'train_type', 'distance_km',
    ]
    for values, records in training_records.groupby(service_fields, dropna=False):
        origin, destination, line_name, train_type, distance_km = values
        if set(records['class'].dropna()) != set(DEMAND_CLASSES):
            continue
        route = f'{origin} - {destination}'
        categorical_values = (
            ('route', route, encoders['route']),
            ('train_type', train_type, encoders['train_type']),
            ('line_name', line_name, encoders['line_name']),
        )
        if any(value not in encoder.classes_ for _, value, encoder in categorical_values):
            continue
        supported.add(
            _service_model_key(origin, destination, line_name, train_type, distance_km)
        )
    return supported


MODEL_SUPPORTED_SERVICES = _build_model_supported_services()


def _public_holiday_name(date):
    # python-holidays derives Sri Lanka dates from the Holidays Acts and annual Government Gazettes.
    return holidays.country_holidays('LK', years=[date.year], language='en_US').get(date.date())


def _is_public_holiday(date, requested=0):
    if requested not in (0, 1, '0', '1', False, True):
        raise InvalidRequestError('is_public_holiday must be 0 or 1.')
    return int(requested == 1 or requested == '1' or _public_holiday_name(date) is not None)


def _model_validation_status(date):
    training_period = model_metadata.get('training_period', '')
    testing_period = model_metadata.get('testing_period', '')
    try:
        supported_from, _ = training_period.split(' to ')
        _, validated_through = testing_period.split(' to ')
        start = _validate_date(supported_from)
        end = _validate_date(validated_through)
    except (ValueError, InvalidRequestError):
        return {
            'validated': None,
            'validated_testing_period': testing_period or None,
            'note': 'The model validation period is not available in its metadata.',
        }

    validated = start <= date <= end
    return {
        'validated': validated,
        'validated_testing_period': testing_period,
        'note': (
            None if validated else
            f'This date is outside the model training and validation period ({training_period}; tested through {validated_through}). The prediction is an unvalidated extrapolation.'
        ),
    }


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
                       cls, distance_km, seat_capacity, is_public_holiday, weather_features):
    route = f"{origin_station} - {destination_station}"
    dayofweek = date.dayofweek
    day_type = 'Weekend' if dayofweek >= 5 else 'Weekday'

    _validate_categorical('train_type', train_type, encoders['train_type'])
    _validate_categorical('class', cls, encoders['class'])
    _validate_categorical('route', route, encoders['route'])
    _validate_categorical('line_name', line_name, encoders['line_name'])
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
        'month': date.month,
        'dayofweek': dayofweek,
        'day': date.day,
        'weekofyear': int(date.isocalendar().week),
        'is_weekend': int(dayofweek >= 5),
        'month_sin': np.sin(2 * np.pi * date.month / 12),
        'month_cos': np.cos(2 * np.pi * date.month / 12),
        'dow_sin': np.sin(2 * np.pi * dayofweek / 7),
        'dow_cos': np.cos(2 * np.pi * dayofweek / 7),
        'average_temperature': weather_features['average_temperature'],
        'total_route_precipitation': weather_features['total_route_precipitation'],
        'total_route_rain': weather_features['total_route_rain'],
        'total_route_precipitation_hours': weather_features['total_route_precipitation_hours'],
        'average_route_wind_speed': weather_features['average_route_wind_speed'],
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
    is_public_holiday = _is_public_holiday(date, body.get('is_public_holiday', 0))
    route = f"{origin_station} - {destination_station}"
    day_type = 'Weekend' if date.dayofweek >= 5 else 'Weekday'
    _validate_categorical('route', route, encoders['route'])
    _validate_categorical('train_type', train_type, encoders['train_type'])
    _validate_categorical('line_name', line_name, encoders['line_name'])
    _validate_categorical('day_type', day_type, encoders['day_type'])
    for cls in DEMAND_CLASSES:
        _validate_categorical('class', cls, encoders['class'])

    try:
        distance_km = float(distance_km)
    except (TypeError, ValueError) as exc:
        raise InvalidRequestError('distance_km must be a finite positive number.') from exc
    if not np.isfinite(distance_km) or distance_km <= 0:
        raise InvalidRequestError('distance_km must be a finite positive number.')
    if _service_model_key(
        origin_station, destination_station, line_name, train_type, distance_km
    ) not in MODEL_SUPPORTED_SERVICES:
        raise InvalidRequestError(
            f"The trained demand model has no complete training coverage for "
            f"'{origin_station} - {destination_station}' ({train_type}); no prediction is available."
        )
    override_capacity = body.get('class_capacity')
    if override_capacity is not None and not isinstance(override_capacity, dict):
        raise InvalidRequestError('class_capacity must be an object keyed by travel class.')
    if train_type not in DEFAULT_CAPACITY and not override_capacity:
        raise InvalidRequestError(
            f"Unknown train_type '{train_type}' and no class_capacity override provided. "
            f"Known train types: {list(DEFAULT_CAPACITY.keys())}"
        )

    capacities = {}
    for cls in DEMAND_CLASSES:
        value = (
            override_capacity[cls]
            if override_capacity and cls in override_capacity
            else DEFAULT_CAPACITY.get(train_type, {}).get(cls)
        )
        try:
            numeric_capacity = float(value)
        except (TypeError, ValueError) as exc:
            raise InvalidRequestError(f"Capacity for {cls} must be a finite positive integer.") from exc
        if (
            not np.isfinite(numeric_capacity)
            or numeric_capacity <= 0
            or not numeric_capacity.is_integer()
        ):
            raise InvalidRequestError(f"Capacity for {cls} must be a finite positive integer.")
        capacities[cls] = int(numeric_capacity)

    weather_features = weather_service.route_weather(
        origin_station, destination_station, date, live=True
    )
    rows = []
    for cls in DEMAND_CLASSES:
        rows.append(build_feature_row(
            date=date, origin_station=origin_station, destination_station=destination_station,
            line_name=line_name, train_type=train_type, cls=cls, distance_km=distance_km,
            seat_capacity=capacities[cls], is_public_holiday=is_public_holiday,
            weather_features=weather_features,
        ))

    X = pd.DataFrame(rows)[FEATURE_COLS]
    if not np.isfinite(X.to_numpy(dtype=float)).all():
        raise ModelPredictionError('Demand model inputs contain missing or non-finite values.')
    raw_preds = model.predict(X)
    if len(raw_preds) != len(DEMAND_CLASSES) or not np.isfinite(raw_preds).all():
        raise ModelPredictionError('Demand model returned missing or non-finite predictions.')

    predicted_demand = {}
    for cls, pred, cap in zip(DEMAND_CLASSES, raw_preds, capacities.values()):
        predicted_demand[cls] = int(np.clip(round(pred), 0, cap))

    return predicted_demand, capacities, weather_features


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


def _analysis_data():
    if weather_service.history.empty:
        raise WeatherServiceError('Local historical weather dataset is unavailable.')
    origin_weather = weather_service.history.rename(
        columns={column: f'origin_{column}' for column in weather_service.history.columns
                 if column not in ['date', 'station']}
    ).rename(columns={'station': 'origin_station'})
    destination_weather = weather_service.history.rename(
        columns={column: f'destination_{column}' for column in weather_service.history.columns
                 if column not in ['date', 'station']}
    ).rename(columns={'station': 'destination_station'})
    data = history_df.merge(origin_weather, on=['date', 'origin_station'], how='inner')
    data = data.merge(destination_weather, on=['date', 'destination_station'], how='inner')
    data['route_precipitation'] = data['origin_precipitation_sum'] + data['destination_precipitation_sum']
    data['route_rain'] = data['origin_rain_sum'] + data['destination_rain_sum']
    data['route_weather_code'] = data[['origin_weather_code', 'destination_weather_code']].max(axis=1)
    data['weather_condition'] = data['route_weather_code'].map(WEATHER_CODE_LABELS).fillna('Other')
    return data


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
        "class_capacity": {                      # optional, overrides default split
            "1st Class": 40, "2nd Class": 225, "3rd Class": 485
        }
    }
    """
    try:
        body = request.get_json(silent=True)
        if body is None:
            raise InvalidRequestError("Request body must be JSON.")

        required = ["date", "origin_station", "destination_station",
                    "line_name", "train_type", "distance_km"]
        missing = [f for f in required if f not in body]
        if missing:
            raise InvalidRequestError(f"Missing required field(s): {missing}")

        predicted_demand, capacities, weather_context = predict_demand_for_route(body)

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
            "is_public_holiday": _is_public_holiday(
                _validate_date(body['date']), body.get('is_public_holiday', 0)
            ),
            "weather": weather_context,
            "prediction_validation": _model_validation_status(_validate_date(body['date'])),
            "predicted_demand_by_class": result,
            "total_predicted_demand": sum(predicted_demand.values()),
        })

    except InvalidRequestError as e:
        return jsonify({"success": False, "error_code": "INVALID_REQUEST", "error": str(e)}), 400
    except WeatherServiceError as e:
        app.logger.warning("Weather failure in /predict_demand: %s", e)
        return jsonify({"success": False, "error_code": e.error_code, "error": str(e)}), e.status_code
    except ModelPredictionError as e:
        app.logger.error("Invalid prediction in /predict_demand: %s", e)
        return jsonify({
            "success": False,
            "error_code": "MODEL_OUTPUT_INVALID",
            "error": "The demand model could not produce a valid prediction from the available inputs.",
        }), 500
    except Exception:
        app.logger.exception("Unexpected error in /predict_demand")
        return jsonify({"success": False, "error_code": "INTERNAL_SERVER_ERROR", "error": "Demand prediction failed unexpectedly."}), 500


@app.route('/public_holidays', methods=['GET'])
def public_holidays():
    try:
        start_date = _validate_date(request.args.get('start_date'))
        try:
            days = int(request.args.get('days', '7'))
        except ValueError as exc:
            raise InvalidRequestError('days must be an integer from 1 to 16.') from exc
        if not 1 <= days <= 16:
            raise InvalidRequestError('days must be an integer from 1 to 16.')
        result = []
        for offset in range(days):
            forecast_date = (start_date + pd.Timedelta(days=offset)).to_pydatetime()
            name = _public_holiday_name(forecast_date)
            result.append({
                'date': forecast_date.strftime('%Y-%m-%d'),
                'is_public_holiday': name is not None,
                'name': str(name) if name is not None else None,
            })
        return jsonify({
            'success': True,
            'source': 'Sri Lanka Holidays Act and annual Government Gazette calendar (python-holidays)',
            'dates': result,
        })
    except InvalidRequestError as exc:
        return jsonify({'success': False, 'error_code': 'INVALID_REQUEST', 'error': str(exc)}), 400
    except Exception:
        app.logger.exception("Unexpected error in /public_holidays")
        return jsonify({'success': False, 'error_code': 'INTERNAL_SERVER_ERROR', 'error': 'Public holiday lookup failed.'}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None,
                     "historical_records": len(history_df)})


@app.route('/route_weather', methods=['GET'])
def route_weather_endpoint():
    required = ('origin_station', 'destination_station', 'date')
    missing = [field for field in required if not request.args.get(field)]
    if missing:
        return jsonify({
            'success': False,
            'error_code': 'INVALID_REQUEST',
            'error': f'Missing required weather parameter(s): {missing}',
        }), 400
    try:
        weather_date = _validate_date(request.args['date'])
        weather = weather_service.route_weather(
            request.args['origin_station'],
            request.args['destination_station'],
            weather_date,
            live=True,
        )
        return jsonify({'success': True, 'weather': weather})
    except InvalidRequestError as exc:
        return jsonify({
            'success': False,
            'error_code': 'INVALID_REQUEST',
            'error': str(exc),
        }), 400
    except WeatherServiceError as exc:
        app.logger.warning("Weather failure in /route_weather: %s", exc)
        return jsonify({
            'success': False,
            'error_code': exc.error_code,
            'error': str(exc),
        }), exc.status_code
    except Exception:
        app.logger.exception("Unexpected error in /route_weather")
        return jsonify({
            'success': False,
            'error_code': 'INTERNAL_SERVER_ERROR',
            'error': 'Route weather is unavailable.',
        }), 500


@app.route('/demand_analysis', methods=['GET'])
def demand_analysis():
    try:
        required_context = ['origin_station', 'destination_station', 'train_type', 'date']
        missing_context = [field for field in required_context if not request.args.get(field)]
        if missing_context:
            raise InvalidRequestError(f"Missing analysis context field(s): {missing_context}")
        origin_station = request.args['origin_station']
        destination_station = request.args['destination_station']
        train_type = request.args['train_type']
        selected_date = request.args['date']
        try:
            datetime.strptime(selected_date, '%Y-%m-%d')
        except ValueError as exc:
            raise InvalidRequestError(f"Invalid analysis date '{selected_date}'. Expected format: YYYY-MM-DD") from exc
        holiday = _is_public_holiday(
            pd.Timestamp(datetime.strptime(selected_date, '%Y-%m-%d')),
            request.args.get('is_public_holiday', '0'),
        )

        route_data = history_df[
            (history_df['origin_station'] == origin_station) &
            (history_df['destination_station'] == destination_station) &
            (history_df['train_type'] == train_type) &
            (history_df['is_public_holiday'] == holiday)
        ].copy()
        route_data['date'] = pd.to_datetime(route_data['date'])
        route_data['day_of_week'] = route_data['date'].dt.day_name()
        route_data['day_type'] = np.where(route_data['date'].dt.dayofweek >= 5, 'Weekend', 'Weekday')
        daily_data = (
            route_data.groupby(['date', 'day_type', 'day_of_week'], as_index=False, dropna=False)
            .agg(daily_demand=('tickets_sold', lambda values: values.sum(min_count=1)))
        )

        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        rainfall_labels = ['No rain', 'Light rain', 'Moderate rain', 'Heavy rain']

        weather_by_date = pd.DataFrame({
            'date': pd.Series(dtype='datetime64[ns]'),
            'route_rain': pd.Series(dtype='float64'),
            'weather_condition': pd.Series(dtype='object'),
            'rainfall_category': pd.Series(dtype='object'),
        })
        weather_history = weather_service.history
        if not weather_history.empty:
            origin_weather = weather_history.loc[
                weather_history['station'] == origin_station, ['date', 'rain_sum', 'weather_code']
            ].rename(columns={'rain_sum': 'origin_rain', 'weather_code': 'origin_weather_code'})
            destination_weather = weather_history.loc[
                weather_history['station'] == destination_station, ['date', 'rain_sum', 'weather_code']
            ].rename(columns={'rain_sum': 'destination_rain', 'weather_code': 'destination_weather_code'})
            if origin_weather['date'].duplicated().any() or destination_weather['date'].duplicated().any():
                raise ValueError('Historical weather contains duplicate station/date observations.')
            weather_by_date = origin_weather.merge(
                destination_weather, on='date', how='inner', validate='one_to_one'
            )
            weather_by_date = weather_by_date[
                weather_by_date[['origin_rain', 'destination_rain',
                                 'origin_weather_code', 'destination_weather_code']].notna().all(axis=1)
            ].copy()
            weather_by_date['route_rain'] = (
                weather_by_date['origin_rain'] + weather_by_date['destination_rain']
            )
            weather_by_date['route_weather_code'] = weather_by_date[
                ['origin_weather_code', 'destination_weather_code']
            ].max(axis=1)
            weather_by_date['weather_condition'] = (
                weather_by_date['route_weather_code'].map(WEATHER_CODE_LABELS).fillna('Other')
            )
            weather_by_date['rainfall_category'] = pd.cut(
                weather_by_date['route_rain'],
                bins=[-np.inf, 0, 5, 20, np.inf],
                labels=rainfall_labels,
                include_lowest=True,
            ).astype(object)
            weather_by_date = weather_by_date[
                ['date', 'route_rain', 'weather_condition', 'rainfall_category']
            ]

        daily_data = daily_data.merge(
            weather_by_date, on='date', how='left', validate='one_to_one'
        )
        weather_daily = daily_data.dropna(
            subset=['route_rain', 'rainfall_category', 'weather_condition', 'daily_demand']
        )

        def average_records(frame, category_field, categories):
            if frame.empty:
                aggregates = {}
            else:
                grouped = (
                    frame.dropna(subset=[category_field, 'daily_demand'])
                    .groupby(category_field)['daily_demand']
                    .agg(['mean', 'count'])
                )
                aggregates = grouped.to_dict(orient='index')
            return [
                {
                    'category': category,
                    'average_demand': (
                        float(aggregates[category]['mean'])
                        if category in aggregates and pd.notna(aggregates[category]['mean'])
                        else None
                    ),
                    'sample_count': (
                        int(aggregates[category]['count'])
                        if category in aggregates
                        else 0
                    ),
                }
                for category in categories
            ]

        weather_categories = sorted(weather_daily['weather_condition'].unique().tolist())
        weekday_weekend = average_records(daily_data, 'day_type', ['Weekday', 'Weekend'])
        day_of_week = average_records(daily_data, 'day_of_week', day_order)
        weather_demand = average_records(weather_daily, 'rainfall_category', rainfall_labels)
        weather_conditions = average_records(weather_daily, 'weather_condition', weather_categories)

        capacities = DEFAULT_CAPACITY.get(train_type, {})
        capacity_by_class = {
            cls: int(capacities[cls])
            for cls in DEMAND_CLASSES
            if cls in capacities and pd.notna(capacities[cls])
        }
        demand_available = bool(daily_data['daily_demand'].notna().any())
        weather_available = not weather_daily.empty
        return jsonify({
            'success': True,
            'context': {
                'origin_station': origin_station,
                'destination_station': destination_station,
                'train_type': train_type,
                'date': selected_date,
                'is_public_holiday': holiday,
            },
            'availability': {
                'historical_demand': demand_available,
                'historical_weather': weather_available,
                'historical_weather_reason': (
                    None if weather_available
                    else 'No complete historical weather observations are available for both route endpoints in this selected service and holiday context.'
                ),
            },
            'aggregation': {
                'level': 'Exact origin, destination, train type, and selected public-holiday status',
                'demand': 'Sum tickets_sold across travel classes for each service date, then average those daily totals.',
                'sample_count': 'Number of distinct service dates contributing to the category average.',
                'weather': 'Route rainfall is the sum of origin and destination rain_sum in mm; route condition is the maximum WMO code across both endpoints.',
            },
            'capacity_by_class': capacity_by_class,
            'total_capacity': sum(capacity_by_class.values()) if capacity_by_class else None,
            'weekday_weekend': weekday_weekend,
            'day_of_week': day_of_week,
            'weather_demand': weather_demand,
            'weather_conditions': weather_conditions,
            'weather_condition_note': 'Historical weather conditions use complete observations from both route endpoints; rainfall categories use summed route rain in mm.',
        })
    except WeatherServiceError as exc:
        app.logger.warning("Weather failure in /demand_analysis: %s", exc)
        return jsonify({
            'success': False,
            'error_code': exc.error_code,
            'error': str(exc),
        }), exc.status_code
    except InvalidRequestError as exc:
        return jsonify({
            'success': False,
            'error_code': 'INVALID_REQUEST',
            'error': str(exc),
        }), 400
    except Exception:
        app.logger.exception("Unexpected error in /demand_analysis")
        return jsonify({
            'success': False,
            'error_code': 'INTERNAL_SERVER_ERROR',
            'error': 'Demand analysis is unavailable.',
        }), 500


@app.route('/seat_allocation', methods=['POST'])
def seat_allocation():
    try:
        body = request.get_json(silent=True)
        if body is None:
            raise InvalidRequestError("Request body must be JSON.")
        required = ["date", "origin_station", "destination_station", "line_name", "train_type", "distance_km"]
        missing = [field for field in required if field not in body]
        if missing:
            raise InvalidRequestError(f"Missing required field(s): {missing}")

        predicted_demand, capacities, _weather_context = predict_demand_for_route(body)
        is_public_holiday = _is_public_holiday(
            _validate_date(body['date']), body.get('is_public_holiday', 0)
        )
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
            "is_public_holiday": is_public_holiday,
            "total_capacity": total_capacity,
            "allocation_by_class": allocation,
            "total_allocated_seats": sum(item["allocated_seats"] for item in allocation.values()),
            "total_unmet_demand": sum(item["unmet_demand"] for item in allocation.values()),
        })
    except InvalidRequestError as e:
        return jsonify({"success": False, "error_code": "INVALID_REQUEST", "error": str(e)}), 400
    except WeatherServiceError as e:
        app.logger.warning("Weather failure in /seat_allocation: %s", e)
        return jsonify({"success": False, "error_code": e.error_code, "error": str(e)}), e.status_code
    except Exception:
        app.logger.exception("Unexpected error in /seat_allocation")
        return jsonify({"success": False, "error_code": "INTERNAL_SERVER_ERROR", "error": "Seat allocation failed unexpectedly."}), 500


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
            "demand_model_supported": _service_model_key(
                row['origin_station'],
                row['destination_station'],
                row['line_name'],
                row['train_type'],
                row['distance_km'],
            ) in MODEL_SUPPORTED_SERVICES,
        })

    app.logger.debug("Generated %d train service records.", len(services))

    return jsonify({"success": True, "count": len(services), "train_services": services})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=4444, use_reloader=False)