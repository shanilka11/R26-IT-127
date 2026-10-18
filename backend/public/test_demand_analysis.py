import unittest
from unittest.mock import patch

import pandas as pd

import new_main


class DemandAnalysisApiTests(unittest.TestCase):
    def setUp(self):
        self.client = new_main.app.test_client()

    def get_analysis(self, origin, destination, train_type='Express'):
        return self.client.get('/demand_analysis', query_string={
            'origin_station': origin,
            'destination_station': destination,
            'train_type': train_type,
            'date': '2026-10-20',
            'is_public_holiday': '0',
        })

    def test_supported_routes_return_complete_categories_and_distinct_service_samples(self):
        route_results = []
        for destination, train_type in [('Kandy', 'Night Mail'), ('Anuradhapura', 'Express')]:
            response = self.get_analysis('Colombo Fort', destination, train_type)
            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertTrue(payload['availability']['historical_demand'])
            self.assertEqual(
                [record['category'] for record in payload['weekday_weekend']],
                ['Weekday', 'Weekend'],
            )
            self.assertEqual(
                [record['category'] for record in payload['day_of_week']],
                ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            )
            self.assertEqual(
                [record['category'] for record in payload['weather_demand']],
                ['No rain', 'Light rain', 'Moderate rain', 'Heavy rain'],
            )
            self.assertTrue(all(isinstance(record['sample_count'], int) for record in payload['day_of_week']))
            self.assertTrue(all(
                record['average_demand'] is None or isinstance(record['average_demand'], float)
                for record in payload['day_of_week']
            ))
            route_results.append(payload)

        self.assertNotEqual(
            route_results[0]['day_of_week'],
            route_results[1]['day_of_week'],
        )
        self.assertGreater(route_results[0]['total_capacity'], 0)
        self.assertGreater(route_results[1]['total_capacity'], 0)
        self.assertNotEqual(route_results[0]['total_capacity'], route_results[1]['total_capacity'])

    def test_daily_averages_and_sample_counts_match_raw_route_records(self):
        response = self.get_analysis('Colombo Fort', 'Kandy', 'Night Mail')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        selected_holiday = payload['context']['is_public_holiday']
        records = new_main.history_df[
            (new_main.history_df['origin_station'] == 'Colombo Fort') &
            (new_main.history_df['destination_station'] == 'Kandy') &
            (new_main.history_df['train_type'] == 'Night Mail') &
            (new_main.history_df['is_public_holiday'] == selected_holiday)
        ].copy()
        records['date'] = pd.to_datetime(records['date'])
        records['day_type'] = records['date'].dt.dayofweek.map(
            lambda weekday: 'Weekend' if weekday >= 5 else 'Weekday'
        )
        daily = records.groupby(['date', 'day_type'])['tickets_sold'].sum().reset_index()
        expected = daily.groupby('day_type')['tickets_sold'].agg(['mean', 'count'])
        actual = {record['category']: record for record in payload['weekday_weekend']}

        for day_type, expected_values in expected.iterrows():
            self.assertAlmostEqual(actual[day_type]['average_demand'], expected_values['mean'])
            self.assertEqual(actual[day_type]['sample_count'], int(expected_values['count']))

    def test_route_without_historical_weather_keeps_demand_and_marks_weather_unavailable(self):
        response = self.get_analysis('Colombo Fort', 'Ratnapura', 'Night Mail')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload['availability']['historical_demand'])
        self.assertFalse(payload['availability']['historical_weather'])
        self.assertTrue(payload['availability']['historical_weather_reason'])
        self.assertEqual(payload['weather_conditions'], [])
        self.assertTrue(all(
            record['average_demand'] is None and record['sample_count'] == 0
            for record in payload['weather_demand']
        ))

    def test_route_with_no_demand_history_returns_explicit_unavailable_values(self):
        response = self.get_analysis('No Such Station', 'No Such Destination')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertFalse(payload['availability']['historical_demand'])
        self.assertTrue(all(
            record['average_demand'] is None and record['sample_count'] == 0
            for record in payload['weekday_weekend'] + payload['day_of_week'] + payload['weather_demand']
        ))

    def test_unsupported_prediction_remains_rejected_without_weather_dependency(self):
        service = new_main.history_df[
            (new_main.history_df['origin_station'] == 'Colombo Fort') &
            (new_main.history_df['destination_station'] == 'Ratnapura') &
            (new_main.history_df['train_type'] == 'Night Mail')
        ].iloc[0]
        body = {
            'date': '2026-10-20',
            'origin_station': service['origin_station'],
            'destination_station': service['destination_station'],
            'line_name': service['line_name'],
            'train_type': service['train_type'],
            'distance_km': int(service['distance_km']),
            'class_capacity': new_main.DEFAULT_CAPACITY[service['train_type']],
            'is_public_holiday': 0,
        }
        with patch.object(
            new_main.weather_service,
            'route_weather',
            return_value={
                'average_temperature': 25,
                'total_route_precipitation': 0,
                'total_route_rain': 0,
                'total_route_precipitation_hours': 0,
                'average_route_wind_speed': 0,
            },
        ) as route_weather:
            response = self.client.post('/predict_demand', json=body)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()['error_code'], 'INVALID_REQUEST')
        self.assertIn('does not support route', response.get_json()['error'])
        route_weather.assert_not_called()

    def test_train_services_report_encoder_support_without_hiding_services(self):
        response = self.client.get('/train_services')
        self.assertEqual(response.status_code, 200)
        services = response.get_json()['train_services']
        self.assertGreater(len(services), 0)
        supported = next(
            item for item in services
            if item['origin_station'] == 'Colombo Fort'
            and item['destination_station'] == 'Anuradhapura'
        )
        unsupported = next(
            item for item in services
            if item['origin_station'] == 'Colombo Fort'
            and item['destination_station'] == 'Ratnapura'
        )
        self.assertTrue(supported['demand_model_supported'])
        self.assertFalse(unsupported['demand_model_supported'])
        self.assertTrue(all(
            isinstance(capacity, int) and capacity > 0
            for capacity in supported['default_capacity'].values()
        ))


if __name__ == '__main__':
    unittest.main()
