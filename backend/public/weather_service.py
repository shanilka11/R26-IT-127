import json
import math
import os
import threading
import time
from datetime import date as date_type, datetime
from collections import Counter

import pandas as pd
import requests

WEATHER_FIELDS = [
    'temperature_2m_mean',
    'precipitation_sum',
    'rain_sum',
    'precipitation_hours',
    'weather_code',
    'wind_speed_10m_max',
]
WEATHER_CODE_LABELS = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle',
    53: 'Moderate drizzle', 55: 'Dense drizzle', 61: 'Slight rain',
    63: 'Moderate rain', 65: 'Heavy rain', 80: 'Slight rain showers',
    81: 'Moderate rain showers', 82: 'Violent rain showers', 95: 'Thunderstorm',
}
FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
HISTORICAL_URL = 'https://archive-api.open-meteo.com/v1/archive'
CACHE_TTL_SECONDS = 300
STALE_FORECAST_MAX_AGE_SECONDS = 1800
FORECAST_FAILURE_TTL_SECONDS = 30
FORECAST_RETRIES = 1
FORECAST_RETRY_BACKOFF_SECONDS = 0.25


class WeatherServiceError(ValueError):
    def __init__(self, message, error_code='WEATHER_DATA_UNAVAILABLE', status_code=422):
        super().__init__(message)
        self.error_code = error_code
        self.status_code = status_code


class WeatherProviderError(WeatherServiceError):
    def __init__(self, message):
        super().__init__(message, error_code='WEATHER_PROVIDER_UNAVAILABLE', status_code=503)


class StationMappingError(WeatherServiceError):
    def __init__(self, message):
        super().__init__(message, error_code='WEATHER_STATION_UNMAPPED', status_code=422)


class WeatherService:
    def __init__(self, base_dir=None, session=None):
        self.base_dir = base_dir or os.path.dirname(os.path.abspath(__file__))
        mapping_path = os.path.join(self.base_dir, 'weather_station_mapping.json')
        history_path = os.path.join(
            self.base_dir, '..', '..', 'ml', 'demand', 'weather',
            'open_meteo_historical_station_weather_2020_2024.csv',
        )
        with open(mapping_path, encoding='utf-8') as mapping_file:
            self.mapping = json.load(mapping_file)
        self.history = pd.read_csv(history_path, parse_dates=['date']) if os.path.exists(history_path) else pd.DataFrame()
        self.session = session or requests.Session()
        self.cache = {}
        self.cache_lock = threading.Lock()
        self.station_fetch_locks = {}
        self.climate_cache = {}
        self.historical_cache = {}
        self.forecast_failures = {}

    def resolve_station(self, station):
        details = self.mapping.get('stations', {}).get(station)
        if not details or details.get('latitude') is None or details.get('longitude') is None:
            raise StationMappingError(
                f"No verified weather coordinate is configured for {station}."
            )
        return details

    @staticmethod
    def _date_string(value):
        if isinstance(value, pd.Timestamp):
            return value.strftime('%Y-%m-%d')
        try:
            return datetime.strptime(str(value), '%Y-%m-%d').strftime('%Y-%m-%d')
        except ValueError as exc:
            raise WeatherServiceError(
                f"Invalid weather date '{value}'. Expected format: YYYY-MM-DD",
                error_code='INVALID_WEATHER_DATE',
                status_code=400,
            ) from exc

    def _validated_record(self, record, station, date_string):
        missing = [
            field for field in WEATHER_FIELDS
            if field not in record or record[field] is None or pd.isna(record[field])
        ]
        invalid = []
        for field in WEATHER_FIELDS:
            if field in missing:
                continue
            try:
                value = float(record[field])
            except (TypeError, ValueError):
                invalid.append(field)
                continue
            if not math.isfinite(value):
                invalid.append(field)
        if missing or invalid:
            problem_fields = sorted(set(missing + invalid))
            raise WeatherServiceError(
                f"Weather data is incomplete for {station} on {date_string}; "
                f"unavailable or invalid fields: {', '.join(problem_fields)}.",
                error_code='WEATHER_DATA_INCOMPLETE',
                status_code=422,
            )
        return record

    def _get_provider_json(self, url, params, timeout, error_message):
        payload = None
        for attempt in range(FORECAST_RETRIES + 1):
            try:
                response = self.session.get(url, params=params, timeout=timeout)
                response.raise_for_status()
                payload = response.json()
                break
            except (requests.RequestException, ValueError) as exc:
                if attempt >= FORECAST_RETRIES:
                    raise WeatherProviderError(error_message) from exc
                time.sleep(FORECAST_RETRY_BACKOFF_SECONDS * (attempt + 1))
        return payload

    def historical_for(self, station, date):
        date_string = self._date_string(date)
        self.resolve_station(station)
        if self.history.empty:
            raise WeatherServiceError('Local historical weather dataset is unavailable.')
        matches = self.history[
            (self.history['station'] == station) &
            (self.history['date'].dt.strftime('%Y-%m-%d') == date_string)
        ]
        if matches.empty:
            raise WeatherServiceError(
                f"Historical weather is unavailable for {station} on {date_string}."
            )
        return self._validated_record(
            matches.iloc[0][WEATHER_FIELDS].to_dict(), station, date_string
        )

    def _historical_api_for(self, station, date_string):
        cache_key = (station, date_string)
        with self.cache_lock:
            station_lock = self.station_fetch_locks.setdefault(
                f'historical:{station}:{date_string}', threading.Lock()
            )
        with station_lock:
            with self.cache_lock:
                cached = self.historical_cache.get(cache_key)
                if cached and time.monotonic() - cached['created'] < 86400:
                    return dict(cached['record'])

            location = self.resolve_station(station)
            params = {
                'latitude': location['latitude'],
                'longitude': location['longitude'],
                'start_date': date_string,
                'end_date': date_string,
                'daily': ','.join(WEATHER_FIELDS),
                'timezone': 'Asia/Colombo',
                'models': 'era5',
            }
            payload = self._get_provider_json(
                HISTORICAL_URL,
                params,
                timeout=(3.05, 8),
                error_message='Open-Meteo historical weather service is unavailable after a bounded retry.',
            )
            daily = payload.get('daily')
            if not daily or not daily.get('time'):
                raise WeatherServiceError(
                    f'Historical weather is unavailable for {station} on {date_string}.'
                )
            record = {
                field: daily[field][0] if daily.get(field) else None
                for field in WEATHER_FIELDS
            }
            self._validated_record(record, station, date_string)
            with self.cache_lock:
                self.historical_cache[cache_key] = {
                    'created': time.monotonic(),
                    'record': dict(record),
                }
            return record

    def climate_estimate_for(self, station, date):
        date_string = self._date_string(date)
        self.resolve_station(station)
        target = datetime.strptime(date_string, '%Y-%m-%d')
        comparable = pd.DataFrame()
        if not self.history.empty:
            station_history = self.history[self.history['station'] == station]
            comparable = station_history[station_history['date'].dt.month == target.month]
        if comparable.empty:
            record = self._climate_archive_records(station).get(target.month)
            if record is None:
                raise WeatherServiceError(f'Historical climate data is unavailable for {station}.')
            record = dict(record)
            baseline_note = (
                'Monthly means from Open-Meteo ERA5 archive (2020-2024); '
                'this is a climate estimate, not an observation or exact forecast.'
            )
        else:
            numeric_fields = [field for field in WEATHER_FIELDS if field != 'weather_code']
            record = comparable[numeric_fields].mean().to_dict()
            weather_codes = comparable['weather_code'].dropna().astype(int)
            if weather_codes.empty:
                raise WeatherServiceError(f'Historical climate data is incomplete for {station}.')
            record['weather_code'] = int(Counter(weather_codes).most_common(1)[0][0])
            baseline_note = (
                f'Monthly climate average for {station} based on local Open-Meteo ERA5 history; '
                f'not an actual forecast for {date_string}.'
            )
        self._validated_record(record, station, date_string)
        record['_weather_data_type'] = 'climate_estimate'
        record['_weather_label'] = 'Historical Climate Estimate'
        record['_weather_note'] = baseline_note
        return record

    def _climate_archive_records(self, station):
        with self.cache_lock:
            station_lock = self.station_fetch_locks.setdefault(
                f'climate:{station}', threading.Lock()
            )
        with station_lock:
            with self.cache_lock:
                cached = self.climate_cache.get(station)
                if cached and time.monotonic() - cached['created'] < 86400:
                    return cached['records']

            location = self.resolve_station(station)
            params = {
                'latitude': location['latitude'],
                'longitude': location['longitude'],
                'start_date': '2020-01-01',
                'end_date': '2024-12-31',
                'daily': ','.join(WEATHER_FIELDS),
                'timezone': 'Asia/Colombo',
                'models': 'era5',
            }
            payload = self._get_provider_json(
                HISTORICAL_URL,
                params,
                timeout=(3.05, 15),
                error_message='Open-Meteo historical archive is unavailable for the climate estimate after a bounded retry.',
            )
            daily = payload.get('daily')
            if not daily or not daily.get('time'):
                raise WeatherServiceError(
                    f'Open-Meteo returned no climate baseline for {station}.',
                    error_code='WEATHER_CLIMATE_UNAVAILABLE',
                    status_code=422,
                )

            frame = pd.DataFrame(daily)
            frame['date'] = pd.to_datetime(frame['time'], errors='coerce')
            frame = frame.dropna(subset=['date'])
            records = {}
            for month, monthly in frame.groupby(frame['date'].dt.month):
                record = {}
                for field in WEATHER_FIELDS:
                    values = pd.to_numeric(monthly.get(field), errors='coerce').dropna()
                    if values.empty:
                        continue
                    record[field] = (
                        int(Counter(values.astype(int)).most_common(1)[0][0])
                        if field == 'weather_code'
                        else float(values.mean())
                    )
                if all(field in record for field in WEATHER_FIELDS):
                    records[int(month)] = record
            if not records:
                raise WeatherServiceError(
                    f'Open-Meteo returned no usable climate baseline for {station}.',
                    error_code='WEATHER_CLIMATE_UNAVAILABLE',
                    status_code=422,
                )
            with self.cache_lock:
                self.climate_cache[station] = {
                    'created': time.monotonic(),
                    'records': records,
                }
            return records

    def _forecast_range(self, station):
        location = self.resolve_station(station)
        params = {
            'latitude': location['latitude'],
            'longitude': location['longitude'],
            'daily': ','.join(WEATHER_FIELDS),
            'timezone': 'Asia/Colombo',
            'forecast_days': 16,
        }
        payload = self._get_provider_json(
            FORECAST_URL,
            params,
            timeout=(3.05, 5),
            error_message='Open-Meteo forecast service is unavailable after a bounded retry.',
        )
        if payload.get('error') or 'daily' not in payload:
            raise WeatherServiceError('Open-Meteo returned no usable forecast weather.')
        daily = payload['daily']
        records = {}
        for index, day in enumerate(daily.get('time', [])):
            record = {field: daily[field][index] for field in WEATHER_FIELDS}
            records[day] = record
        return records

    def forecast_for(self, station, date):
        date_string = self._date_string(date)
        cache_key = station
        with self.cache_lock:
            station_lock = self.station_fetch_locks.setdefault(cache_key, threading.Lock())

        with station_lock:
            now = time.monotonic()
            with self.cache_lock:
                cached = self.cache.get(cache_key)
                cached_age = now - cached['created'] if cached else None
                if cached and cached_age < CACHE_TTL_SECONDS:
                    record = cached['records'].get(date_string)
                    if record is None:
                        raise WeatherServiceError(
                            'Weather forecast is unavailable for the requested date in the cached provider range.',
                            error_code='WEATHER_DATE_UNAVAILABLE',
                            status_code=422,
                        )
                    return self._cached_forecast_record(
                        record, cached_age, station, date_string
                    )

                failure = self.forecast_failures.get(cache_key)
                if failure and now < failure['retry_after']:
                    provider_error = True
                else:
                    provider_error = False

            if provider_error:
                records = None
                fetch_error = WeatherProviderError(
                    'Open-Meteo forecast service is temporarily unavailable; using a weather fallback.'
                )
            else:
                try:
                    records = self._forecast_range(station)
                    fetch_error = None
                except WeatherProviderError as exc:
                    records = None
                    fetch_error = exc

            if fetch_error is not None:
                if (
                    cached
                    and cached_age <= STALE_FORECAST_MAX_AGE_SECONDS
                    and date_string in cached['records']
                ):
                    return self._cached_forecast_record(
                        cached['records'][date_string],
                        cached_age,
                        station,
                        date_string,
                        stale=True,
                    )
                with self.cache_lock:
                    self.forecast_failures[cache_key] = {
                        'retry_after': time.monotonic() + FORECAST_FAILURE_TTL_SECONDS,
                    }
                raise fetch_error

            if date_string not in records:
                raise WeatherServiceError(
                    f"Forecast weather is unavailable for {station} on {date_string}.",
                    error_code='WEATHER_DATE_UNAVAILABLE',
                    status_code=422,
                )
            with self.cache_lock:
                self.cache[cache_key] = {'created': time.monotonic(), 'records': records}
                self.forecast_failures.pop(cache_key, None)
            return self._validated_record(records[date_string], station, date_string)

    def _cached_forecast_record(self, record, age_seconds, station, date_string, stale=False):
        cached_record = dict(self._validated_record(record, station, date_string))
        age_minutes = max(0, int(age_seconds // 60))
        cache_status = 'stale but within the allowed freshness window' if stale else 'fresh'
        refresh_note = '; no provider refresh was available' if stale else ''
        cached_record['_weather_data_type'] = 'cached_forecast'
        cached_record['_weather_label'] = 'Cached Weather Forecast'
        cached_record['_weather_note'] = (
            f'Exact-date Open-Meteo forecast from the {cache_status} local cache '
            f'({age_minutes} minutes old){refresh_note}.'
        )
        return cached_record

    def _climate_fallback(self, station, date_string, reason):
        record = self.climate_estimate_for(station, date_string)
        record['_weather_note'] = (
            f'{reason} Using the clearly labelled monthly climate estimate instead. '
            f'{record["_weather_note"]}'
        )
        return record

    def weather_for(self, station, date):
        date_string = self._date_string(date)
        target = datetime.strptime(date_string, '%Y-%m-%d').date()
        today = datetime.now().date()
        if not self.history.empty:
            history_min = self.history['date'].min().date()
            history_max = self.history['date'].max().date()
            if history_min <= target <= history_max:
                try:
                    record = self.historical_for(station, date_string)
                except WeatherServiceError as local_error:
                    if local_error.error_code not in (
                        'WEATHER_DATA_UNAVAILABLE',
                        'WEATHER_DATA_INCOMPLETE',
                    ):
                        raise
                    try:
                        record = self._historical_api_for(station, date_string)
                    except WeatherServiceError as provider_error:
                        if provider_error.error_code not in (
                            'WEATHER_DATA_INCOMPLETE',
                            'WEATHER_PROVIDER_UNAVAILABLE',
                        ):
                            raise
                        return self._climate_fallback(
                            station,
                            date_string,
                            f'Exact historical weather is unavailable for {station} on {date_string}.',
                        )
                    record['_weather_data_type'] = 'historical'
                    record['_weather_label'] = 'Historical Reanalysis'
                    record['_weather_note'] = 'Exact date from Open-Meteo ERA5 historical weather.'
                    return record
                record['_weather_data_type'] = 'historical'
                record['_weather_label'] = 'Historical Reanalysis'
                record['_weather_note'] = 'Exact date from locally stored Open-Meteo ERA5 history.'
                return record
        if target == today:
            try:
                record = self.forecast_for(station, date_string)
            except WeatherServiceError as exc:
                if exc.error_code not in ('WEATHER_PROVIDER_UNAVAILABLE', 'WEATHER_DATE_UNAVAILABLE'):
                    raise
                return self._climate_fallback(
                    station,
                    date_string,
                    f'Current-day Open-Meteo weather is unavailable for {station} on {date_string}.',
                )
            if record.get('_weather_data_type') == 'cached_forecast':
                return record
            record['_weather_data_type'] = 'current'
            record['_weather_label'] = 'Live Current-Day Forecast'
            record['_weather_note'] = 'Current-day Open-Meteo forecast/current available weather for the exact selected date.'
            return record
        if target < today:
            try:
                record = self._historical_api_for(station, date_string)
            except WeatherServiceError as exc:
                if exc.error_code not in (
                    'WEATHER_DATA_INCOMPLETE',
                    'WEATHER_PROVIDER_UNAVAILABLE',
                ):
                    raise
                return self._climate_fallback(
                    station,
                    date_string,
                    f'Exact historical weather is unavailable for {station} on {date_string}.',
                )
            record['_weather_data_type'] = 'historical'
            record['_weather_label'] = 'Historical Reanalysis'
            record['_weather_note'] = 'Exact date from Open-Meteo ERA5 historical weather.'
            return record
        try:
            record = self.forecast_for(station, date_string)
            if record.get('_weather_data_type') == 'cached_forecast':
                return record
            record['_weather_data_type'] = 'forecast'
            record['_weather_label'] = 'Live Forecast'
            record['_weather_note'] = 'Live Open-Meteo forecast for the exact selected date.'
            return record
        except WeatherServiceError as exc:
            if exc.error_code not in ('WEATHER_DATE_UNAVAILABLE', 'WEATHER_PROVIDER_UNAVAILABLE'):
                raise
            reason = (
                f'Open-Meteo is temporarily unavailable for {station} on {date_string}.'
                if exc.error_code == 'WEATHER_PROVIDER_UNAVAILABLE'
                else f'{date_string} is outside the available live forecast range for {station}.'
            )
            return self._climate_fallback(station, date_string, reason)

    def route_weather(self, origin_station, destination_station, date, live=True):
        getter = self.weather_for if live else self.historical_for
        origin = getter(origin_station, date)
        destination = getter(destination_station, date)
        origin = {**origin, 'weather_description': WEATHER_CODE_LABELS.get(int(origin['weather_code']), 'Other')}
        destination = {**destination, 'weather_description': WEATHER_CODE_LABELS.get(int(destination['weather_code']), 'Other')}
        data_types = {
            origin.get('_weather_data_type'),
            destination.get('_weather_data_type'),
        }
        if len(data_types) > 1:
            weather_data_type = 'mixed'
            weather_label = 'Mixed Weather Sources'
        elif 'climate_estimate' in data_types:
            weather_data_type = 'climate_estimate'
            weather_label = 'Historical Climate Estimate'
        elif 'cached_forecast' in data_types:
            weather_data_type = 'cached_forecast'
            weather_label = 'Cached Weather Forecast'
        elif 'forecast' in data_types:
            weather_data_type = 'forecast'
            weather_label = 'Live Forecast'
        elif 'current' in data_types:
            weather_data_type = 'current'
            weather_label = 'Live Current-Day Forecast'
        else:
            weather_data_type = 'historical'
            weather_label = 'Historical Reanalysis'
        source_notes = [
            f'{station}: {record["_weather_note"]}'
            for station, record in (
                (origin_station, origin),
                (destination_station, destination),
            )
            if record.get('_weather_note')
        ]
        weather_note = ' '.join(source_notes) or None
        return {
            'date': self._date_string(date),
            'origin_station': origin_station,
            'destination_station': destination_station,
            'average_temperature': (origin['temperature_2m_mean'] + destination['temperature_2m_mean']) / 2,
            'total_route_precipitation': origin['precipitation_sum'] + destination['precipitation_sum'],
            'total_route_rain': origin['rain_sum'] + destination['rain_sum'],
            'total_route_precipitation_hours': origin['precipitation_hours'] + destination['precipitation_hours'],
            'average_route_wind_speed': (origin['wind_speed_10m_max'] + destination['wind_speed_10m_max']) / 2,
            'origin_weather_code': origin['weather_code'],
            'destination_weather_code': destination['weather_code'],
            'origin_weather': origin,
            'destination_weather': destination,
            'weather_data_type': weather_data_type,
            'weather_label': weather_label,
            'weather_note': weather_note,
            'weather_sources': {
                'origin': origin.get('_weather_label', 'Weather'),
                'destination': destination.get('_weather_label', 'Weather'),
            },
            'origin_location_note': self.resolve_station(origin_station).get('note'),
            'destination_location_note': self.resolve_station(destination_station).get('note'),
        }
