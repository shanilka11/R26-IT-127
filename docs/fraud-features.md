# Fraud features: local services, dashboard, and verification

Keep the React frontend (`frontend`: `npm start`) and Node backend (`backend`: `npm start`) running. In each Python terminal, start from the repository root, activate `.venv`, then change to `backend/public`:

```sh
source .venv/bin/activate
cd backend/public
```

| Command (separate terminals) | Port | Feature |
| --- | --- | --- |
| `npm start` in `backend` | 4000 | Database-backed inspection, history, corrections, saved predictions |
| `python main.py` | 5555 | Historical Fraud Dashboard analytics and compatibility lookup |
| `python main_old.py` | 3333 | Simulation model and route metadata, called by Node |
| `python new_main.py` | 4444 | Demand features |

If model files are missing, extract `data/demand_forecast_model.zip` into `data/` for `main_old.py`, and `outputs/demand_forecast_model.zip` into `outputs/` for `new_main.py`. These archives contain different models.

## Fraud Detection dashboard

Open `/FraudDashboard`: **Main Dashboard** is the default and contains the former Fraud Detection overview. The old six-card Main Dashboard has been removed. There are five tabs: Main Dashboard, Anomaly Detection, Risk Analysis, Inspection Workload, and Future Prediction. The application header and sidebar are unchanged.

Main Dashboard has a date/search toolbar, three summary cards (Flagged Anomalies, High Risk Passenger Alerts, and Fraud Detection Rate), monthly transaction totals, suspected fraud types, ticket category distribution, and historical model performance. The source/date-range text, matching-count line, and Assessed Ticket Transactions card have been removed from below the filters. The route breakdown and latest 15 High-risk alerts remain below the overview. Filters apply only to Main Dashboard; the other historical tabs retain their existing behavior. Operational inspection decisions do not change these historical statistics.

Tab clicks update the `tab` URL parameter and support refresh and browser Back/Forward. `/FraudDashboard`, `?tab=main`, and legacy `?tab=fraud` links open Main Dashboard; legacy links are replaced with `tab=main`. Valid tab keys are `main`, `anomaly`, `risk`, `workload`, and `predict`; unknown keys open Main Dashboard. Historical Replay's `mode`, `route`, `date`, and `transaction_id` parameters are preserved when switching tabs. The existing `/dashboard/summary` API remains available to other screens.

The read-only API on port **5555** is:

```text
GET http://localhost:5555/fraud-detection/overview
GET http://localhost:5555/fraud-detection/overview?start_date=2024-01-01&end_date=2024-12-31&search=TXN107055
```

All API filters are optional; the dashboard form requires both date boundaries. Dates use `YYYY-MM-DD`, include both boundary days, and return HTTP 400 if invalid or reversed. Search is trimmed, case-insensitive, and matches a literal substring in transaction ID, passenger ID, passenger name, or route. Combined filters apply to every summary, chart, route, and alert. **Apply filters** or Enter submits the inputs; typing alone does not fetch new results. A **Filters changed — select Apply filters** notice distinguishes draft edits from the displayed results. **Reset** restores the full available historical range and clears search. Previous results are hidden while loading, and a newer request supersedes an older pending response.

The response preserves `normal_vs_suspicious`, `fraud_type_distribution`, `fraud_detection_trend`, `recent_fraud_alerts`, and `fraud_by_route`, and adds:

| Field | Meaning |
| --- | --- |
| `summary` | `total_ticket_transactions`, `flagged_anomalies`, `high_risk_passengers`, `fraud_detection_rate_pct` |
| `ticket_category_distribution` | Counts by actual ticket type across all matching assessments |
| `model_performance` | `precision_pct`, `recall_pct`, `f1_pct`, `roc_auc`, `sample_count`, `risk_threshold`, `evaluation: "historical"` |
| `available_date_range` | Complete assessment dataset's `start_date` and `end_date`, unaffected by filtering |
| `applied_filters` | Effective date boundaries and trimmed search |

The current dataset contains **2,750 scored transactions**, dated **2024-01-01 through 2024-12-31**. Unscored raw transactions do not contribute to this dashboard. Ticket categories are the actual fare/concession types; Tourist/Commuter classifications are not available. Fraud types are suspected patterns among flagged transactions, including Unclassified.

Values are calculated from `backend/public/models/risk_scored_transactions_2024.csv`, loaded by `main.py` at startup, rather than hardcoded display numbers or live inspection events. The repository does not establish that each source record represents a verified real-world passenger. No simulated Future Prediction result is added to these counts. Dates outside the assessment range produce empty results rather than invented current-year records.

Verified filter examples (at the configured threshold):

| Filters | Assessed | Flagged | Distinct High-risk passengers | Recall |
| --- | ---: | ---: | ---: | ---: |
| Full 2024 range | 2,750 | 386 | 136 | 90.35% |
| January 2024 | 259 | 34 | 13 | 84.00% |
| Search `Kandy`, full range | 455 | 66 | 31 | 93.33% |
| January 2024 and `Kandy` | 38 | 9 | 3 | 83.33% |

At the configured **45/100** threshold, the unfiltered baseline is **386 flagged transactions**, **136 distinct High-risk passengers**, **90.35% recall/detection rate**, **60.62% precision**, **72.56% F1**, and **0.9583 ROC-AUC**. High-risk categories and threshold flags are separate: a Medium-risk transaction can be flagged.

Historical metrics compare saved scores with `is_fraud` labels; no inference or model retraining runs for this endpoint. Precision is TP/(TP+FP), recall is TP/(TP+FN), and F1 is 2TP/(2TP+FP+FN), expressed as percentages. ROC-AUC uses continuous saved risk scores. These are retrospective dataset measurements, not held-out or production performance. They recompute for the filtered population. Undefined metrics return `null` and display **N/A**: precision without predicted positives, recall without actual positives, F1 with a zero denominator, and ROC-AUC without both classes. Empty results return HTTP 200, zero counts, empty chart data, and unavailable metrics.

Chart cards offer expandable data lists for keyboard and screen-reader access. On wide screens the model-performance card spans the space beneath the transaction and fraud-type charts, alongside the taller ticket-category card. Card edges align, performance metrics use four columns, and the layout stacks progressively on smaller screens. The overview supports both themes. The API only reads CSV assessments; it does not change MariaDB, database passwords, SQL schemas, or ticket/inspection CRUD.

## Persistent inspection setup

From the repository root, with MariaDB running and the existing `backend/.env` database credentials configured:

```sh
npm run verification:migrate --prefix backend
npm run verification:import --prefix backend
```

Migration `backend/sql/migrations/001_persistent_verification.sql` adds three InnoDB tables: `tickets`, `ticket_verifications`, and `journey_predictions`. It is versioned and safe to rerun. It does not modify `users` or change passwords. The importer uses Python's standard library (the project virtual environment when available, otherwise `python3`; override with `PYTHON`). It validates the entire raw and scored CSV input before opening the import transaction. All inserts commit together. Existing transaction IDs are skipped: **rerunning the importer never resets scan counts, source snapshots, assessments, decisions, or history**.

The initial import contains **9,800** unique historical tickets from **2020–2024**, including **2,750** saved individual assessments. Original fraud labels, scan counts, inspection status, dates, fares, and passenger fields are preserved in immutable source JSON separately from mutable operational fields. CSV files and model artifacts are never rewritten.

## Passenger Ticket Verification

Open `/FraudBatchCheck`. This is a **Historical verification demo**; “Valid” means passing the demo checks, not authorization to travel today. Sign in with an active database user to attribute decisions. The client supplies the local user ID and the server resolves an active user and records their name/ID snapshot. This is **local demo attribution**, not authenticated staff identity or server-enforced administrator permissions.

Try **TXN100004**: initially Not Inspected, one scan, no recorded fraud, full fare. **TXN100005** already has Inspected in the CSV; that original value is retained. **TXN100002** demonstrates a concession check. **TXN100043** has an existing reuse warning. **TXN107055** demonstrates a saved individual ML assessment. Records without an ML assessment remain inspectable.

1. **Verify Ticket** reads current state, source passenger details, latest matching saved simulation, and paginated history. It never increments scans or creates a decision. IDs are trimmed, uppercased, and matched exactly.
2. Concession tickets require an explicit Eligible / Not Eligible choice after checking documents. The choice stays a draft until an action saves it.
3. **Accept Ticket** creates a Verified decision, sets inspection status to Inspected, and increments scan count once. A confirmation shows before/after counts. The displayed pre-decision result is explicitly labeled; Verify again fetches the updated state.
4. **Flag Ticket** or **Reject & Flag** saves the reason, remarks, and eligibility without incrementing scans. Both require a reason; Other requires remarks.
5. A later lookup after acceptance shows Already Used / Possible Ticket Reuse because the demo applies `scan_count > 1` to each imported transaction ID. Repeated lookups are read-only.

Imported fraud labels, scan counts above one, active Flag/Reject decisions, and failed concession checks block acceptance. Missing seats display Not Assigned and do not establish fraud. The expandable Historical ML assessment remains on its original **0–100** scale; neither that assessment nor a High journey-risk badge automatically rejects a ticket.

Each decision uses a dedicated pooled connection and a database transaction: lock the ticket, check its state version, insert the audit event, update state, commit. Request UUIDs and payload hashes make retries idempotent; duplicate acceptance or simultaneous inspectors cannot double-increment a ticket. Stale state returns 409 and requires a fresh Verify. A network-error retry of the same form/action retains its request ID.

## Corrections and history

Open **Administration → Verification History**, at `/Admin/Verifications`. Search by transaction ID, expand record details, and paginate history. Only the latest non-voided decision for a ticket can be voided. A correction requires a reason, records actor/time, restores the decision's preceding operational state, and increments the version. To correct an earlier record, void subsequent active records first. Retrying a completed void does not reverse state twice.

Voided records remain visible with their original details and correction audit. There is no permanent delete and no correction button on the passenger screen. Event timestamps are stored as UTC and displayed in **Asia/Colombo**. The administration screen states the local demo identity limitation; it is not a security boundary.

## Future Prediction and Historical Replay

The Future Prediction tab uses all **14 supported routes** from `GET :3333/meta/fraud-simulation`, retaining the old model and its **0–1** score scale. The frontend submits through Node, which validates the request, runs the model, and saves the returned simulation with model artifact hash/provenance and creation time.

- **Future Simulation:** today or a future date (Asia/Colombo).
- **Historical Replay:** an imported route/date pair. This generates synthetic passengers; it does not reconstruct actual historical passengers.
- Both modes accept **1–2,000** passengers and retain the result modal and transaction breakdown.

The **Simulation Journey Risk** is the mean returned passenger score: Low below 0.4, Medium from 0.4 to below 0.7, High at or above 0.7. It is a derived simulation summary, **not a separately validated route-risk model**. Simulation IDs are stored only inside prediction results; they do not become searchable imported tickets.

Ticket verification retrieves the latest successful snapshot with the exact ticket route and recorded date. It shows the mode, passenger count, generation time, score, and tier. No match shows Journey Risk Unavailable. **Run Historical Replay for this route/date** preselects the ticket's journey. Return to verification to read the saved snapshot without rerunning inference.

Verification and saved history/badges remain available when port 3333 is offline. Running simulations and loading supported route metadata require that service. Python 5555 still powers the original historical dashboard; Python 4444 still powers demand features. Neither dataset nor model algorithms change.

## API contracts

All new endpoints are on **port 4000**:

| Method and path | Purpose |
| --- | --- |
| `GET /passenger-verification/transaction?transaction_id=TXN100004` | Source details, current state/version, saved assessment, journey snapshot, check results and action choices |
| `GET /passenger-verification/history?transaction_id=TXN100004&page=1&page_size=10` | Paginated decision history; omit ID to inspect all tickets; optional literal `search` |
| `POST /passenger-verification/decisions` | Accept, Flag, Reject |
| `POST /passenger-verification/verifications/:id/void` | Retained-record correction |
| `GET /journey-predictions/options` | Supported routes, imported dates per route, cutoffs and today |
| `POST /journey-predictions` | Run and save a simulation |

Decision body:

```json
{
  "transaction_id": "TXN100004",
  "actor_user_id": 1,
  "expected_version": 0,
  "request_id": "<new UUID; retain for retries>",
  "action": "Accept",
  "eligibility": "not_required",
  "reason": "",
  "remarks": ""
}
```

Use the signed-in active demo user's actual ID and the version returned by lookup. Action values are `Accept`, `Flag`, `Reject`. Eligibility values are `not_checked`, `eligible`, `ineligible`, `not_required`. Lookup supplies allowed reason choices. Void bodies contain `actor_user_id` and required `reason`.

Prediction bodies contain `request_id`, `actor_user_id`, `mode` (`future` / `historical_replay`), `train_route`, `date` (`YYYY-MM-DD`), and integer `n_passengers`. Successful responses preserve the model's `summary` and `predictions`, adding `journey_prediction`. Failed inference is not saved.

Validation returns 400, inactive/unknown demo actors 403, unknown tickets 404, stale/conflicting changes 409, invalid model output 502, and unavailable database/model services 503. The port-5555 read-only historical lookup remains available for compatibility; it intentionally does not reflect operational inspection changes.

## Checks

From the repository root after migration/import:

```sh
npm run test:verification --prefix backend
cd backend/public
../../.venv/bin/python -B -m unittest discover -s tests -v
```

Node integration tests use the configured MariaDB database, require an active user and imported TXN100004, create uniquely prefixed test tickets, and remove only their own fixture rows afterward. They cover concurrent and duplicate decisions, eligibility, retained voids, import reruns, persisted state, saved predictions, and unchanged CSV hashes. Model calls in those tests are stubbed; the browser smoke flow also runs the actual simulation service.

From `frontend`:

```sh
CI=true npm test -- --watchAll=false --runInBand
npm run build
```

Manual demonstration: verify TXN100004, accept, verify again to see reuse, then correct the latest decision through administration. Run Historical Replay via the ticket shortcut and return to see its saved badge. Test eligible/ineligible concession decisions and required reasons. Check both themes and narrow screens. Historical dashboard metrics remain at their previous baseline, unaffected by inspection or correction events.
