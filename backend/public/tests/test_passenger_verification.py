import hashlib
import unittest
from unittest.mock import patch

import pandas as pd
import main


class PassengerVerificationTests(unittest.TestCase):
    def setUp(self):
        self.client = main.app.test_client()

    def lookup(self, transaction_id):
        return self.client.get('/passenger-verification/transaction',
                               query_string={'transaction_id': transaction_id})

    def test_saved_assessment_matches_source_without_predicting(self):
        saved = main.history_df.iloc[0]
        raw = main.transaction_index.loc[saved.transaction_id]
        with patch.object(main, 'predict_fraud_risk', side_effect=AssertionError('Must not rescore')):
            response = self.lookup(saved.transaction_id)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['assessment_status'], 'assessed')
        self.assertEqual(data['assessment']['risk_score'], saved.risk_score)
        self.assertEqual(data['assessment']['risk_category'], saved.risk_category)
        self.assertEqual(data['transaction']['time'], raw.time)
        self.assertEqual(data['transaction']['date'], raw.date.strftime('%Y-%m-%d'))
        self.assertEqual(data['transaction']['ticket_type'], raw.ticket_type)
        self.assertEqual(data['transaction']['route'], raw.route)

    def test_normalization_and_exact_matching(self):
        transaction_id = main.history_df.iloc[0].transaction_id
        self.assertEqual(self.lookup('  ' + transaction_id.lower() + ' ').status_code, 200)
        self.assertEqual(self.lookup(transaction_id[:-1]).status_code, 404)
        self.assertEqual(self.lookup('.*').status_code, 404)
        self.assertEqual(self.lookup('SIM202610040001').status_code, 404)

    def test_missing_and_unknown_ids(self):
        self.assertEqual(self.client.get('/passenger-verification/transaction').status_code, 400)
        self.assertEqual(self.lookup('   ').status_code, 400)
        response = self.lookup('NONEXISTENT')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json()['error'], 'Transaction not found')

    def test_unscored_transaction_has_no_invented_assessment(self):
        transaction_id = next(i for i in main.transaction_index.index if i not in main.assessment_index.index)
        response = self.lookup(transaction_id)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['assessment_status'], 'not_assessed')
        self.assertIsNone(data['assessment'])
        self.assertEqual(data['transaction']['transaction_id'], transaction_id)

    def test_flagging_includes_threshold_and_is_separate_from_category(self):
        saved = main.history_df[main.history_df.risk_category == 'Medium'].iloc[0]
        for threshold, expected in [(float(saved.risk_score), True), (float(saved.risk_score) + .1, False)]:
            with self.subTest(threshold=threshold), patch.object(main, 'RECOMMENDED_THRESHOLD', threshold):
                assessment = self.lookup(saved.transaction_id).get_json()['assessment']
                self.assertEqual(assessment['risk_category'], 'Medium')
                self.assertEqual(assessment['is_flagged_fraud'], expected)

    def test_recommendations_follow_category_flag_and_ticket_type(self):
        for category, action in [('High', 'Priority inspection'), ('Medium', 'Random spot-check'), ('Low', 'No action needed')]:
            saved = main.history_df[main.history_df.risk_category == category].iloc[0]
            data = self.lookup(saved.transaction_id).get_json()
            assessment = data['assessment']
            self.assertEqual(assessment['recommended_action'], action)
            self.assertIn('Inspect ticket validity and dates', assessment['recommended_checks'])
            self.assertEqual('Verify passenger identity with ID' in assessment['recommended_checks'], assessment['is_flagged_fraud'])
        for concession in [True, False]:
            rows = main.history_df[main.history_df.ticket_type.str.contains('Concession') == concession]
            assessment = self.lookup(rows.iloc[0].transaction_id).get_json()['assessment']
            self.assertEqual('Check concession eligibility details' in assessment['recommended_checks'], concession)

    def test_list_works_and_literal_search_does_not_raise(self):
        response = self.client.get('/passenger-verification/list')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('total', data)
        self.assertIn('recommended_action', data['passengers'][0])
        self.assertEqual(data['passengers'][0]['verification_status'], 'Pending Review')
        response = self.client.get('/passenger-verification/list', query_string={'search': '['})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['total'], 0)

    def test_indexes_reject_blank_or_duplicate_normalized_ids(self):
        for ids in [['TXN1', ' txn1 '], [''], [None]]:
            with self.subTest(ids=ids), self.assertRaises(ValueError):
                main._transaction_index(pd.DataFrame({'transaction_id': ids}))

    def test_lookup_is_read_only(self):
        def hashes():
            results = []
            for filename in [main.HISTORY_CSV, main.TRANSACTIONS_CSV]:
                with open(filename, 'rb') as source:
                    results.append(hashlib.sha256(source.read()).hexdigest())
            return results
        before = hashes()
        snapshot = main.history_df.copy(deep=True)
        self.lookup(main.history_df.iloc[0].transaction_id)
        self.client.get('/passenger-verification/list')
        self.assertEqual(before, hashes())
        pd.testing.assert_frame_equal(snapshot, main.history_df)

    def test_existing_dashboard_endpoints_still_work(self):
        for path in ['/health', '/dashboard/summary', '/fraud-detection/overview',
                     '/anomaly-detection/overview', '/risk-analysis/overview', '/inspection-workload/overview']:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)


if __name__ == '__main__':
    unittest.main()
