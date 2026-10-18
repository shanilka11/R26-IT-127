import time
import unittest
from unittest.mock import Mock, patch

import requests

import new_main
from weather_service import (
    WEATHER_FIELDS,
    WeatherProviderError,
    WeatherService,
)


def weather_record(value=12):
    return {
        'temperature_2m_mean': 26.0,
        'precipitation_sum': float(value),
        'rain_sum': float(value),
        'precipitation_hours': 2.0,
        'weather_code': 61,
        'wind_speed_10m_max': 14.0,
    }


class WeatherFallbackTests(unittest.TestCase):
    def setUp(self):
        self.service = WeatherService(new_main.BASE_DIR)

    def test_forecast_provider_retries_once_after_timeout(self):
        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {
            'daily': {
                'time': ['2027-01-13'],
                **{field: [weather_record()[field]] for field in WEATHER_FIELDS},
            },
        }
        self.service.session.get = Mock(side_effect=[requests.Timeout(), response])

        with patch('weather_service.time.sleep') as sleep:
            records = self.service._forecast_range('Colombo Fort')

        self.assertIn('2027-01-13', records)
        self.assertEqual(self.service.session.get.call_count, 2)
        self.assertEqual(self.service.session.get.call_args.kwargs['timeout'], (3.05, 5))
        sleep.assert_called_once()

    def test_date_in_local_history_uses_exact_historical_observation(self):
        row = self.service.history[
            self.service.history['station'] == 'Colombo Fort'
        ].iloc[0]
        date_string = row['date'].strftime('%Y-%m-%d')

        weather = self.service.weather_for('Colombo Fort', date_string)

        self.assertEqual(weather['_weather_data_type'], 'historical')
        self.assertEqual(weather['weather_code'], row['weather_code'])
        self.assertIn('locally stored', weather['_weather_note'])

    def test_provider_503_falls_back_to_monthly_climate_for_future_date(self):
        response = requests.Response()
        response.status_code = 503
        response.url = 'https://api.open-meteo.com/v1/forecast'
        self.service.session.get = Mock(return_value=response)
        with patch('weather_service.time.sleep'):
            weather = self.service.weather_for('Colombo Fort', '2027-01-13')

        self.assertEqual(weather['_weather_data_type'], 'climate_estimate')
        self.assertEqual(weather['_weather_label'], 'Historical Climate Estimate')
        self.assertIn('temporarily unavailable', weather['_weather_note'])
        self.assertIn('not an actual forecast', weather['_weather_note'])
        self.assertTrue(all(field in weather for field in WEATHER_FIELDS))
        self.assertEqual(self.service.session.get.call_count, 2)
        self.service.weather_for('Colombo Fort', '2027-01-13')
        self.assertEqual(self.service.session.get.call_count, 2)

    def test_date_beyond_live_forecast_range_uses_climate_estimate(self):
        records = {
            '2026-10-18': weather_record(),
        }
        with patch.object(self.service, '_forecast_range', return_value=records):
            weather = self.service.weather_for('Colombo Fort', '2027-01-13')

        self.assertEqual(weather['_weather_data_type'], 'climate_estimate')
        self.assertIn('outside the available live forecast range', weather['_weather_note'])

    def test_timeout_after_bounded_retries_falls_back_to_climate(self):
        self.service.session.get = Mock(side_effect=requests.Timeout())
        with patch('weather_service.time.sleep'):
            weather = self.service.weather_for('Colombo Fort', '2027-01-13')

        self.assertEqual(weather['_weather_data_type'], 'climate_estimate')
        self.assertEqual(self.service.session.get.call_count, 2)

    def test_fresh_exact_date_cache_is_used_when_provider_is_unavailable(self):
        self.service.cache['Colombo Fort'] = {
            'created': time.monotonic() - 600,
            'records': {'2027-01-13': weather_record()},
        }
        with patch.object(
            self.service,
            '_forecast_range',
            side_effect=WeatherProviderError('simulated provider outage'),
        ):
            weather = self.service.weather_for('Colombo Fort', '2027-01-13')

        self.assertEqual(weather['_weather_data_type'], 'cached_forecast')
        self.assertEqual(weather['_weather_label'], 'Cached Weather Forecast')
        self.assertIn('10 minutes old', weather['_weather_note'])

    def test_valid_model_prediction_survives_open_meteo_503(self):
        service = new_main.history_df[
            (new_main.history_df['origin_station'] == 'Colombo Fort') &
            (new_main.history_df['destination_station'] == 'Anuradhapura') &
            (new_main.history_df['train_type'] == 'Express')
        ].iloc[0]
        body = {
            'date': '2027-01-13',
            'origin_station': service['origin_station'],
            'destination_station': service['destination_station'],
            'line_name': service['line_name'],
            'train_type': service['train_type'],
            'distance_km': int(service['distance_km']),
            'class_capacity': new_main.DEFAULT_CAPACITY[service['train_type']],
            'is_public_holiday': 0,
        }
        new_main.weather_service.cache.clear()
        new_main.weather_service.forecast_failures.clear()
        client = new_main.app.test_client()

        with patch.object(
            new_main.weather_service,
            '_forecast_range',
            side_effect=WeatherProviderError('simulated HTTP 503'),
        ):
            response = client.post('/predict_demand', json=body)

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload['success'])
        self.assertEqual(payload['weather']['weather_data_type'], 'climate_estimate')
        self.assertIn('Historical Climate Estimate', payload['weather']['weather_label'])
        self.assertFalse(payload['prediction_validation']['validated'])
        self.assertIn('unvalidated extrapolation', payload['prediction_validation']['note'])
        self.assertEqual(
            set(payload['predicted_demand_by_class']),
            set(new_main.DEMAND_CLASSES),
        )
        for class_result in payload['predicted_demand_by_class'].values():
            self.assertGreaterEqual(class_result['predicted_demand'], 0)
            self.assertLessEqual(class_result['predicted_demand'], class_result['seat_capacity'])


if __name__ == '__main__':
    unittest.main()
