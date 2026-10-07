import hashlib
import unittest
from unittest.mock import patch

import pandas as pd
import main


class FraudOverviewTests(unittest.TestCase):
    def setUp(self):
        self.client = main.app.test_client()

    def overview(self, **filters):
        response = self.client.get('/fraud-detection/overview', query_string=filters)
        self.assertEqual(response.status_code, 200, response.get_json())
        return response.get_json()

    def assert_population(self, result, expected):
        self.assertEqual(result['summary']['total_ticket_transactions'], len(expected))
        self.assertEqual(result['summary']['flagged_anomalies'], int(main._flagged_mask(expected).sum()))
        self.assertEqual(result['summary']['high_risk_passengers'], expected.loc[expected.risk_category == 'High', 'passenger_id'].nunique())
        self.assertEqual(sum(result['ticket_category_distribution'].values()), len(expected))
        self.assertEqual(sum(row['total_transactions'] for row in result['fraud_detection_trend']), len(expected))
        self.assertEqual(sum(row['total'] for row in result['fraud_by_route']), len(expected))
        self.assertEqual(sum(result['fraud_type_distribution'].values()), result['summary']['flagged_anomalies'])
        self.assertEqual(result['model_performance']['sample_count'], len(expected))
        self.assertEqual(result['summary']['fraud_detection_rate_pct'], result['model_performance']['recall_pct'])
        expected_alerts = expected[expected.risk_category == 'High'].sort_values('date', ascending=False).head(15)
        self.assertEqual([row['transaction_id'] for row in result['recent_fraud_alerts']], list(expected_alerts.transaction_id))

    def test_unfiltered_baseline_and_existing_response_fields(self):
        data = self.overview()
        self.assert_population(data, main.history_df)
        self.assertEqual(data['summary'], {'total_ticket_transactions': 2750, 'flagged_anomalies': 386, 'high_risk_passengers': 136, 'fraud_detection_rate_pct': 90.35})
        for key, value in [('precision_pct', 60.62), ('recall_pct', 90.35), ('f1_pct', 72.56), ('roc_auc', .9583)]:
            self.assertEqual(data['model_performance'][key], value)
        self.assertEqual(data['model_performance']['risk_threshold'], 45)
        self.assertEqual(data['available_date_range'], {'start_date': '2024-01-01', 'end_date': '2024-12-31'})
        self.assertEqual(data['normal_vs_suspicious'], {'normal': 2364, 'suspicious': 386})

    def test_dates_are_inclusive_and_allow_individual_boundaries(self):
        for filters in [dict(start_date='2024-01-01', end_date='2024-01-01'), dict(start_date='2024-12-31'), dict(end_date='2024-01-01')]:
            expected = main.history_df
            if 'start_date' in filters:
                expected = expected[expected.date.dt.normalize() >= pd.Timestamp(filters['start_date'])]
            if 'end_date' in filters:
                expected = expected[expected.date.dt.normalize() <= pd.Timestamp(filters['end_date'])]
            with self.subTest(filters=filters):
                data = self.overview(**filters)
                self.assert_population(data, expected)
                self.assertEqual(data['available_date_range']['end_date'], '2024-12-31')

    def test_search_is_literal_case_insensitive_and_combines_with_dates(self):
        row = main.history_df.iloc[0]
        for query in [row.transaction_id, row.passenger_id, row.passenger_name, row.route]:
            expected_mask = pd.Series(False, index=main.history_df.index)
            for col in ['transaction_id', 'passenger_id', 'passenger_name', 'route']:
                expected_mask |= main.history_df[col].str.contains(query, case=False, regex=False, na=False)
            data = self.overview(search='  ' + query.lower() + '  ')
            self.assert_population(data, main.history_df[expected_mask])
            self.assertEqual(data['applied_filters']['search'], query.lower())
        expected = main.history_df[(main.history_df.date.dt.month == 1) & (main.history_df.route == row.route)]
        self.assert_population(self.overview(start_date='2024-01-01', end_date='2024-01-31', search=row.route), expected)
        for query in ['[', '.*', 'NONEXISTENT']:
            self.assertEqual(self.overview(search=query)['summary']['total_ticket_transactions'], 0)
        self.assert_population(self.overview(search='   '), main.history_df)

    def test_bad_dates_and_reversed_ranges(self):
        for filters in [dict(start_date='2024-1-01'), dict(end_date='2024-02-30'), dict(start_date=''), dict(start_date='yesterday'), dict(start_date='2024-02-01', end_date='2024-01-01')]:
            with self.subTest(filters=filters):
                response = self.client.get('/fraud-detection/overview', query_string=filters)
                self.assertEqual(response.status_code, 400)
                self.assertFalse(response.get_json()['success'])
                self.assertIn('date', response.get_json()['error'])

    def test_empty_population_has_no_invented_metrics(self):
        data = self.overview(start_date='2026-01-01', end_date='2026-12-31')
        self.assert_population(data, main.history_df.iloc[:0])
        for key in ['precision_pct', 'recall_pct', 'f1_pct', 'roc_auc']:
            self.assertIsNone(data['model_performance'][key])
        self.assertEqual(data['fraud_detection_trend'], [])
        self.assertEqual(data['available_date_range']['start_date'], '2024-01-01')

    def test_metrics_use_continuous_scores_and_defined_denominators(self):
        df = pd.DataFrame({'is_fraud': [0, 1, 0, 1], 'risk_score': [10., 30., 50., 80.]})
        with patch.object(main, 'RECOMMENDED_THRESHOLD', 50):
            metrics = main._historical_performance(df)
            self.assertEqual([metrics[k] for k in ['precision_pct', 'recall_pct', 'f1_pct', 'roc_auc']], [50., 50., 50., .75])
        for labels, scores, expected in [
            ([0], [10], [None, None, None, None]),
            ([0], [90], [0., None, 0., None]),
            ([1], [10], [None, 0., 0., None]),
            ([1], [90], [100., 100., 100., None]),
        ]:
            with self.subTest(labels=labels, scores=scores):
                metrics = main._historical_performance(pd.DataFrame({'is_fraud': labels, 'risk_score': scores}))
                self.assertEqual([metrics[k] for k in ['precision_pct', 'recall_pct', 'f1_pct', 'roc_auc']], expected)

    def test_endpoint_is_read_only_and_never_runs_inference(self):
        def hashes():
            values = []
            for filename in [main.HISTORY_CSV, main.TRANSACTIONS_CSV]:
                with open(filename, 'rb') as source:
                    values.append(hashlib.sha256(source.read()).hexdigest())
            return values
        before = hashes()
        snapshot = main.history_df.copy(deep=True)
        with patch.object(main, 'predict_fraud_risk', side_effect=AssertionError('Must not rescore')):
            self.overview()
            self.overview(search='kandy', start_date='2024-01-01', end_date='2024-06-30')
        self.assertEqual(before, hashes())
        pd.testing.assert_frame_equal(snapshot, main.history_df)


if __name__ == '__main__':
    unittest.main()
