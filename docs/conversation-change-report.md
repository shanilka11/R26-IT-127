# Project change report: fraud dashboard, prediction, and passenger verification

This report covers the setup work and implemented features discussed in this conversation. It describes the final implementation and explains earlier changes that were later extended. Database credentials are deliberately omitted.

## 1. Overall result

The project now combines a historical fraud analytics dashboard, saved fraud simulations, and a persistent passenger inspection demonstration. The inspection workflow can retrieve imported tickets, check reuse and concession eligibility, save Accept/Flag/Reject decisions, show their history, and reverse a decision through an auditable void.

The requirements developed in three stages:

1. Move the existing Fraud Batch Check simulation into Future Prediction and turn the standalone page into historical ticket lookup.
2. Redesign the Fraud Detection tab with filters, summary cards, charts, and historical evaluation metrics.
3. Extend ticket lookup into a persistent inspection workflow and connect it to saved simulations through Historical Replay.

The first two stages used read-only CSV data and did not require ticket CRUD. The third stage added database persistence because the client requested saved decisions, usage updates, history, and corrections.

## 2. Local setup and troubleshooting

| Item | Work covered / final state | Purpose |
| --- | --- | --- |
| Project directories | Clarified the repository's actual `backend/public` location and working-directory requirements. | Prevent incorrect paths such as an extra `CeylonRail` directory. |
| Python commands and environment | A project `.venv` is available; activation and Python execution are documented. The correct command is `python`, rather than `pyhton`; installation can use `python -m pip`. | Run the Python services with the required interpreter and packages. |
| Node startup | The backend runs through `npm start`; a global `nodemon` installation is not required for that command. | Provide a working startup command when `nodemon` is unavailable. |
| MariaDB connection | The local MariaDB setup was brought into use, and `backend/.env` differs from the original checkout in `DB_host`, `DB_name`, `DB_user`, and `DB_password`. The new inspection module uses that configuration. | Resolve local connection and authentication problems and point the application at the intended local database. |
| Demand model artifacts | Required `.joblib` artifacts are present under `backend/public/data` and `backend/public/outputs`; extraction locations are documented. | Resolve missing-artifact startup problems using the project's supplied models. |
| Service responsibilities | Documented the frontend, Node backend, fraud analytics, fraud simulation, and demand service ports. | Make clear which processes must run for each feature. |

Password/configuration changes apply to the database server/account they target. Changes to a local MariaDB account do not change another developer's separate database. Sharing a server/account or committing credentials would have a different effect. The persistent inspection implementation did not perform an additional password reset.

Homebrew MariaDB can supply this project's database service. XAMPP is not a mandatory application dependency. These startup explanations are support work; they do not represent a rewrite of the application's authentication or a dependency-security upgrade.

## 3. Move Fraud Batch Check into Future Prediction

| Change | Purpose |
| --- | --- |
| Extracted the existing simulation form and result modal into `FraudSimulation.js`. | Reuse the client's preferred Batch Check interaction inside the Future Prediction tab. |
| Replaced the former Future Prediction content with that component. | Adopt the existing simulation behavior as well as its appearance. |
| Retained route/date/passenger inputs, summary cards, risk and fraud breakdowns, and the scrollable transaction table. | Preserve the useful simulation outputs from the reference design. |
| Displayed simulation scores explicitly on a 0–1 scale. | Prevent confusion with the historical assessment service's 0–100 scores. |
| Added date/count validation, loading/errors, duplicate-submit protection, and accessible modal focus. | Make submissions predictable and results usable with keyboard controls. |

Initially this component called the existing model on port 3333 directly. The final version calls Node on port 4000, which invokes the same model and saves a prediction snapshot. The underlying simulation model was not retrained.

## 4. Initial historical verification and Python API fixes

| Change | Purpose |
| --- | --- |
| Added exact `GET /passenger-verification/transaction` lookup to `main.py` on port 5555. | Retrieve an existing transaction using only its ID, without requiring a full prediction payload. |
| Built normalized raw-transaction and assessment indexes and validated their relationships. | Support exact lookups and detect invalid/duplicate IDs or unmatched saved assessments. |
| Returned raw details and the saved individual assessment when available. | Keep lookup results consistent with historical dashboard assessments. |
| Returned an explicit unassessed state for known transactions without a saved score. | Avoid inventing ML results for the larger raw dataset. |
| Added shared recommendation helpers and populated the missing `recommended_action` field. | Repair the existing passenger-verification list endpoint and provide consistent suggestions. |
| Changed list searches to literal matching. | Avoid interpreting user search text as a regular expression. |
| Replaced the standalone Batch Check UI with Passenger Ticket Verification while retaining `/FraudBatchCheck`. | Introduce the client-requested verification screen without breaking the existing URL. |

The port-5555 lookup remains available for compatibility. The final inspection screen uses the database-backed Node lookup described below. Python's historical lookup does not reflect operational scan-count changes.

## 5. Fraud Detection dashboard redesign

Only the Fraud Detection tab inside `/FraudDashboard` was redesigned; the application header and other historical dashboard tabs retained their roles.

| Change | Purpose |
| --- | --- |
| Added `FraudDetectionOverview.js` and scoped dashboard styles. | Implement the reference dashboard arrangement using the existing application theme. |
| Added start/end dates, transaction search, Apply, Reset, and retry controls. | Allow users to inspect a selected historical population. |
| Extended `/fraud-detection/overview` with inclusive date validation and trimmed, case-insensitive literal search across transaction ID, passenger ID/name, and route. | Supply the frontend filters with predictable read-only behavior. |
| Applied filters before every summary, chart, route breakdown, and alert calculation. | Ensure all sections describe the same population. |
| Added four KPI cards: assessed transactions, flagged anomalies, distinct High-risk passengers, and detection rate. | Present the key figures prominently and define exactly what each counts. |
| Replaced horizontal transaction bars with a monthly line/area chart and added a vertical suspected-fraud chart and ticket-type donut. | Match the requested content arrangement and make distributions easier to compare. |
| Used actual ticket types instead of invented Tourist/Commuter passenger categories. | Keep the UI supported by the available data. |
| Calculated historical precision, recall, F1, and ROC-AUC from saved scores and labels. | Populate the performance card with reproducible measurements. |
| Defined detection rate as recall, thresholded scores consistently, and used continuous scores for ROC-AUC. | Avoid inconsistent metric meanings. |
| Returned `null`/displayed N/A for undefined metrics and supported empty filtered results. | Avoid misleading zeroes or calculation errors. |
| Retained route breakdown and recent High-risk alerts. | Preserve supporting information beneath the redesigned overview. |
| Added accessible chart data lists and protection against older requests replacing newer filter results. | Support keyboard/screen-reader use and prevent stale data displays. |

The unfiltered saved dataset contains 2,750 assessed transactions dated 2024-01-01 to 2024-12-31. At the configured 45/100 flagging threshold, the confirmed baseline is:

| Measure | Value |
| --- | ---: |
| Flagged anomalies | 386 |
| Distinct High-risk passengers | 136 |
| Detection rate / recall | 90.35% |
| Precision | 60.62% |
| F1 | 72.56% |
| ROC-AUC | 0.9583 |

These are retrospective measurements on the saved dataset. They are not independently validated production or held-out test results. Later operational decisions do not change these historical metrics.

## 6. Database persistence and import

| Change | Purpose |
| --- | --- |
| Added versioned migration `001_persistent_verification.sql`. | Provide repeatable creation of the three new InnoDB tables. |
| Added `tickets`. | Store imported passenger/ticket details, original source values, optional historical assessments, current inspection state, scan count, and version. |
| Added `ticket_verifications`. | Retain decisions, eligibility, reasons, remarks, actor snapshots, before/after states, request IDs, timestamps, and void details. |
| Added `journey_predictions`. | Save simulation results and derived journey-risk summaries with route/date, mode, passenger count, and model provenance. |
| Added complete CSV validation and an explicit import command. | Check the source records and assessment matches before applying the import transaction. |
| Imported 9,800 unique tickets from 2020–2024, including 2,750 matching assessments. | Provide real historical demo records without generating tickets or altering dates. |
| Made import reruns skip existing tickets. | Preserve decisions, counters, assessments, and history during repeated setup. |
| Kept original CSV fields separately from mutable operational state. | Preserve research labels and original scan/inspection values during demonstrations. |
| Added a dedicated connection pool and transactional repository/service layer. | Apply related writes together and support concurrent requests. |

The local database's existing `users` table continues to supply active demo actors. The feature did not change that table's schema or add a ticket-purchasing system.

## 7. Persistent passenger inspection workflow

| Change | Purpose |
| --- | --- |
| Switched the inspection page to Node's database-backed lookup on port 4000. | Read current persisted state without requiring an ML service. |
| Rebuilt the page with a full-width ID form, Passenger Details and Verification Result cards, eligibility/action controls, and history. | Follow the client's final inspection design. |
| Expanded passenger fields to include ID, class, seat, original date/time, route, ticket type, and fares. | Present the details an inspector needs for checks. |
| Added green/amber/red results with text and icons. | Distinguish clear, pending-check, and flagged states without relying on color alone. |
| Made Verify read-only. | Prevent repeated searches from changing usage or creating decisions. |
| Added Accept Ticket. | Save a Verified decision, mark inspection complete, and increment scan count exactly once. |
| Added Flag Ticket and Reject & Flag with required reasons and Other remarks. | Save an explainable inspector decision without incrementing usage. |
| Added automatic reuse warnings when the current scan count exceeds one. | Implement the client's chosen historical demo usage rule. |
| Blocked acceptance for imported fraud, reuse, active Flag/Reject decisions, and failed concession checks. | Enforce operational checks on the server. |
| Added explicit Eligible / Not Eligible concession selection and persisted it with the decision. | Record the inspector's document-check outcome. |
| Preserved Not Assigned for missing seats without treating that alone as fraud. | Avoid unsupported fraud conclusions. |
| Kept individual historical ML assessment expandable and separate from operational acceptance. | Allow model context without confusing it with the inspector's decision. |
| Added before/after count confirmation and explicit re-verification after saving. | Show the state change clearly and retrieve the subsequent reuse warning. |
| Added paginated saved history with decision details, actors, eligibility, reasons, and scan changes. | Keep evidence available across refreshes and server restarts. |
| Added ticket-row locking, expected versions, request UUIDs, and payload hashes. | Prevent stale writes and double application from concurrent acceptance or network retries. |
| Resolved supplied demo actor IDs against active users and stored name/ID snapshots. | Attribute decisions while preserving the selected local-demo identity policy. |
| Stored event timestamps in UTC and displayed Asia/Colombo time. | Keep timestamps consistent and readable locally. |

The page is labeled Historical verification demo. “Valid” represents the demo checks; the original historical date is not current travel authorization. Journey risk and saved ML scores alone do not automatically reject tickets.

## 8. Administration and corrections

| Change | Purpose |
| --- | --- |
| Added `/Admin/Verifications` and an Administration link. | Give correction/history functions a dedicated administration view. |
| Added cross-ticket history search, pagination, and expandable records. | Review saved inspection decisions. |
| Added latest-active-decision voiding with a required correction reason. | Reverse a mistake without deleting its audit record. |
| Restored the preceding operational state and incremented the ticket version when voiding. | Keep rollback and concurrency consistent. |
| Recorded correction actor/time/reason and retained the original record. | Preserve the audit trail. |
| Required later active decisions to be voided before earlier ones. | Prevent inconsistent rollback of dependent changes. |
| Displayed the local demo identity limitation. | Avoid claiming authenticated or server-enforced administrator access. |

No Void/Delete control is shown on the passenger inspection screen. Permanent audit deletion was not implemented.

## 9. Saved simulations and Historical Replay

| Change | Purpose |
| --- | --- |
| Added `/meta/fraud-simulation` to `main_old.py`. | Expose all 14 supported routes, tier cutoffs, and model artifact provenance. |
| Added Node simulation options and save endpoints. | Validate requests, invoke the existing model, and persist successful results. |
| Replaced the six hardcoded route choices with service-provided routes. | Make every supported model route available. |
| Added Future Simulation and Historical Replay modes. | Support both upcoming dates and imported historical route/date pairs. |
| Retained the 1–2,000 passenger limit and result modal. | Keep the established simulation interaction bounded and familiar. |
| Derived Simulation Journey Risk from the mean returned passenger score. | Provide a concrete saved journey summary: Low <0.4, Medium 0.4–<0.7, High >=0.7. |
| Saved mode, generation time, count, result payload, and model hash/provenance. | Make the simulation snapshot explainable and reproducible in context. |
| Matched the latest saved prediction to a ticket's exact route/date. | Connect inspection to relevant saved journey context. |
| Added a ticket shortcut that preselects Historical Replay and a return-to-verification link. | Demonstrate the complete prediction-to-inspection flow. |
| Kept simulation IDs separate from imported tickets. | Avoid making synthetic passengers appear to be real historical tickets. |
| Allowed ticket lookup to read saved badges while the simulation service is offline. | Keep inspection independent of live inference availability. |

Historical Replay still creates a synthetic simulation; it does not reconstruct the actual passengers on that date. The journey summary is not a separately validated route-risk model.

## 10. Navigation, appearance, and feedback

The sidebar label is now Passenger Ticket Verification while the existing `/FraudBatchCheck` URL is retained. Mobile navigation collapses into an accessible menu; longer labels wrap. Dashboard and verification layouts support light/dark themes, stack at narrow widths, and provide keyboard focus indicators. Loading, unavailable-service, unknown-ID, validation, and empty states explain the next action. Request cancellation/response checks prevent older lookups from replacing newer results.

## 11. Final service and endpoint mapping

| Service | Port | Responsibility |
| --- | ---: | --- |
| React frontend | 3000 | Dashboard, prediction, verification, and administration UI |
| Node backend | 4000 | Database inspection workflow, corrections, history, and saved prediction orchestration |
| `main.py` | 5555 | Historical fraud dashboard and compatibility lookup |
| `main_old.py` | 3333 | Existing fraud simulation and metadata |
| `new_main.py` | 4444 | Existing demand features |

New Node endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /passenger-verification/transaction` | Exact current ticket lookup |
| `GET /passenger-verification/history` | Paginated ticket/all-ticket history |
| `POST /passenger-verification/decisions` | Accept, Flag, or Reject |
| `POST /passenger-verification/verifications/:id/void` | Retained-record correction |
| `GET /journey-predictions/options` | Supported routes and imported historical dates |
| `POST /journey-predictions` | Run and save a simulation |

## 12. Files and their purposes

| Files | Purpose |
| --- | --- |
| `backend/.env` | Local database connection configuration; credentials omitted from this report |
| `backend/index.js` | Mount the new Node feature routes |
| `backend/package.json` | Add migration, import, and backend test commands |
| `backend/sql/migrations/001_persistent_verification.sql` | Create the three persistence tables and constraints/indexes |
| `backend/verification/db.js` | Dedicated pool, query wrapper, transaction handling |
| `backend/verification/service.js` | Lookup, checks, decisions, concurrency, voids, saved simulations |
| `backend/verification/router.js` | HTTP endpoints and feature error responses |
| `backend/verification/setup.js` | Migration execution and transactional idempotent import |
| `backend/scripts/verification-data.py` | Validate raw tickets and saved assessments for import |
| `backend/scripts/verification-setup.js` | Setup command entry point |
| `backend/public/main.py` | Historical exact lookup, recommendations/list repair, filtered dashboard metrics |
| `backend/public/main_old.py` | Route/cutoff/model provenance metadata endpoint |
| `frontend/src/components/Screens/FraudDashboard.js` | Compose redesigned tab and simulation; support replay tab preselection |
| `frontend/src/components/Screens/FraudDetectionOverview.js` | Filtered historical KPI/chart/performance layout |
| `frontend/src/components/Screens/FraudDashboard.css` | Scoped dashboard layout, theme, and responsive styles |
| `frontend/src/components/Screens/FraudSimulation.js` | Future/Replay form, saved simulation calls and result modal |
| `frontend/src/components/Screens/FraudBatchCheck.js` | Persistent passenger verification UI |
| `frontend/src/components/Screens/FraudBatchCheck.css` | Simulation/modal styles |
| `frontend/src/components/Screens/PassengerVerification.css` | Verification, history, correction, and responsive styles |
| `frontend/src/components/Screens/VerificationHistory.js` | Shared history display and administration void form |
| `frontend/src/components/Screens/VerificationAdmin.js` | Administration history page |
| `frontend/src/components/Screens/verificationApi.js` | API address, request UUIDs, demo user ID, timestamp/mode formatting |
| `frontend/src/App.js` | New administration route |
| `frontend/src/components/UserManagement/Admin.js` | Link to verification history and demo identity notice |
| `frontend/src/components/Sidebar.js` and `Sidebar.css` | Updated verification label and mobile navigation |
| Backend/Python/frontend test files | Automated checks for new behavior and existing historical behavior |
| `docs/fraud-features.md` | Setup, service mapping, rules, API contracts, test commands and demo instructions |
| `docs/conversation-change-report.md` | This consolidated change-and-purpose report |

The virtual environment, extracted model files, Python cache files, and frontend build outputs are local/generated artifacts, rather than new business features. `new_main.py`'s demand logic was not modified by this work.

## 13. Verification completed

Recorded implementation checks passed:

| Check | Result / purpose |
| --- | --- |
| Node/MariaDB tests | 11 passed: decisions, concurrency, retries, concession checks, voids, import preservation, saved predictions, and HTTP validation |
| Frontend tests | 26 passed across 3 suites: filters, inspection actions, history/corrections, replay, and route integration |
| Python historical tests | 17 passed: filtered metrics, historical lookup, recommendations, and compatibility |
| Production frontend build | Succeeded with existing dependency/source-map/lint warnings |
| Browser flow | Accepted a test ticket once, retrieved reuse, voided the decision, ran the actual model's Historical Replay, and displayed its saved badge |
| Appearance/regression smoke checks | Light/dark themes, mobile layout, and every Fraud Dashboard tab checked; no browser page errors in the recorded flow |
| Import rerun | 9,800 validated, zero inserted, 9,800 skipped |
| Final data checks | 9,800 tickets, 2,750 assessments, original TXN100004 state retained, historical baseline intact, no test-ticket fixtures left |

Test cases used their own temporary fixture tickets and cleaned them up. The demonstration ticket TXN100004 was left ready for the user: scan count 1, Not Inspected, version 0. The old starter “learn react” test was replaced with relevant route integration checks.

## 14. Current boundaries

The delivered system provides persistent Create, Read, and Update operations plus auditable voiding. It remains a local historical demonstration. Authenticated staff roles, QR scanning, live ticket issuance, permanent audit deletion, model retraining, invented passenger categories, and independently validated production model-performance claims were not added. The historical CSVs, original model artifacts, and demand feature logic retain their existing roles.
