# How each project section works

This guide describes the current code, including the features implemented during this conversation. It distinguishes saved historical analysis, synthetic fraud simulations, demand estimates, and persistent inspector decisions.

## 1. The application's main responsibilities

The project has three operational purposes:

- **Capacity planning:** estimate passenger demand and calculate suggested seats by travel class.
- **Historical fraud analysis:** summarize saved transaction risk assessments and evaluate them against recorded dataset labels.
- **Passenger inspection demonstration:** look up a historical ticket, apply operational checks, and persist an inspector's decision.

Those purposes use different data and services. Selecting a date does not make a historical ticket a newly issued travel ticket.

| Service | Port | What it does |
| --- | ---: | --- |
| React frontend | 3000 | Shows forms, cards, charts, history, and navigation |
| Node backend | 4000 | Handles database-backed users, actual-demand records, inspections, corrections, and saved simulation orchestration |
| `main.py` | 5555 | Serves historical fraud summaries, analytics, and the older read-only lookup |
| `main_old.py` | 3333 | Generates synthetic fraud batches and scores them using the existing models |
| `new_main.py` | 4444 | Reads demand history, predicts passenger counts, and calculates class seat allocations |

The Python services load supplied model files at startup. Pressing Run normally applies those existing models; it does not train a new model.

## 2. Main application Dashboard

**Purpose:** provide an entry point into the railway modules and a small operational overview.

The train-service count comes from `GET :4444/train_services`. That endpoint builds a catalog of distinct origin/destination/train-type combinations found in the historical demand CSV. The station count is the number of distinct origins/destinations in that catalog. These are reference catalog counts, not live counts of currently moving trains.

The system-status card checks the historical fraud service's `/health` endpoint. It does not establish that every database and model service is healthy. The clock displays Asia/Colombo time. The network drawing and update notices are reference UI content, rather than GPS tracking or a live railway news feed.

Module cards navigate to demand, allocation, or fraud pages. Train Tracking and Schedule Optimization have no implemented application routes; their sidebar entries are disabled.

## 3. Demand Forecast

**Question answered:** how many passengers are expected in each travel class for the selected service and date?

You choose a service, date, and optional Public Holiday / COVID Lockdown scenario flags. The service catalog provides the route, line, train type, distance, and reference class capacities.

The frontend sends seven separate requests to `POST :4444/predict_demand`, one for the selected day and six following days. The selected day's class table and the seven-day trend are displayed together. The scenario flags selected in the form are sent for every day in that trend; the frontend does not independently consult a holiday calendar for each date.

`new_main.py` creates a feature row for each of 1st, 2nd, and 3rd Class. Features include the route/train/class, line, distance, capacity, weekday/month, weekend and scenario flags, and prior ticket-sales values/averages from the historical CSV. Only records before the requested date supply the lag features. With no matching history, those lag features default to zero.

The saved demand model estimates a count for each class. The current backend rounds it and caps it between zero and that class's seat capacity. It returns class counts, capacity, and utilization; the frontend adds totals and a trend chart.

Example: an estimate of 30 passengers for 40 first-class seats displays 75% utilization. An uncapped model output of 60 with capacity 40 is returned as 40, so the current screen cannot show that extra 20 as unrestricted demand.

Demand results are displayed for planning; the request does not sell tickets, reserve particular seats, or retrain the model.

## 4. Adaptive Seat Allocation

**Question answered:** given predicted class demand and available capacity, how should the class allocation be planned?

The selected service/date/scenario goes to `POST :4444/seat_allocation`. The backend first obtains the same demand estimates, then runs an allocation calculation.

The calculation starts with minimum/fairness floors (default 5% of total capacity per class), distributes remaining seats in proportion to additional demand, applies class maximums, and attempts to distribute leftover seats. The response reports predicted demand, allocated seats, unmet demand, and expected utilization for each class.

The UI shows a class table and bars comparing predicted demand, allocated seats, and reference train capacity. These are suggested numerical allocations, not booked seat numbers or instructions that physically reconfigure a train.

Because the current demand model output is capped by class capacity, excess-demand behavior is limited. The allocation algorithm can also assign capacity beyond current predicted demand; lower utilization then represents unused suggested seats.

## 5. Seat Allocation Dashboard

The screen title is **Actual vs Predicted Seat Allocation**.

**Question answered:** how do model estimates compare with recorded passenger counts for a particular train/date?

It loads predicted demand from `:4444/predict_demand`, then independently requests actual counts from `GET :4000/train/actual_demand`. Actual counts are matched by origin, destination, train type, and date. It shows class distributions and actual-versus-predicted comparisons when records are available.

This page also calculates a suggested allocation in the browser. That calculation is separate from the fairness-floor algorithm used by the Adaptive Seat Allocation page. Normally it allocates the lesser of each class's demand and capacity; it has a proportional branch for demand above total capacity. Its displayed allocation utilization is allocated seats divided by predicted passengers, whereas the backend allocation's utilization is expected occupied seats divided by allocated seats. Those percentages should not be assumed interchangeable.

The current local database has `users` and the three inspection/prediction tables, but no `train` table. Actual-demand reads/writes require that existing project table to be provisioned. The inspection migration does not create it.

## 6. Train Data

The screen is **Insert Actual Demand**.

You choose a train/date, enter observed passenger counts for 1st, 2nd, and 3rd Class, and submit. The frontend validates required/nonnegative values and sends `POST :4000/train/train_data`. The backend stores the counts in the existing `train` table under columns `1c`, `2c`, and `3c`. A duplicate origin/destination/type/date record is rejected.

These stored counts supply the Seat Allocation Dashboard's actual-versus-predicted comparison. They are not individual passenger tickets and do not enter the `tickets` inspection table.

Adding actual demand here does not automatically append to the demand model's CSV, refresh its lag history, or retrain the model. As noted above, the required `train` table is absent from the inspected local database.

## 7. Fraud Detection module: the five tabs

The sidebar's Fraud Detection link opens `/FraudDashboard`, with the redesigned **Main Dashboard** selected by default. Its first four tabs use the saved assessment CSV containing 2,750 transactions from 2024. They aggregate saved results; opening them does not rerun inference for each ticket. Future Prediction runs a separate simulation.

Main Dashboard's date/search filters apply to its sections. They do not filter Anomaly Detection, Risk Analysis, or Inspection Workload. Tab selections update the URL and support refresh and Back/Forward; legacy `tab=fraud` links open Main Dashboard. Historical Replay parameters survive tab switches.

### 7.1 Main Dashboard tab

This calls `GET :5555/fraud-detection/overview` and shows the redesigned historical overview described below. The previous six-card screen has been removed; `/dashboard/summary` remains available to other screens.

**Suspicious** means a saved score meets the configured review threshold, currently 45/100. A fraud label is a recorded dataset value; a threshold flag is a model-based suspicion. They are separate measurements.

High risk is a saved category: Low below 40, Medium 40 to below 66, High 66 and above. A score of 50 is therefore Medium risk and still exceeds the review threshold.

The overview endpoint accepts inclusive dates and a literal, case-insensitive search across transaction ID, passenger ID/name, and route. Every section is calculated after applying those filters. The source/date-range text, matching-count line, and assessed-transaction KPI are omitted from the page. Typing alone changes the draft: select **Apply filters** or press Enter to submit, or **Reset** to restore the full range. A pending-filter notice distinguishes edits from the displayed results.

It shows:

- Flagged anomaly count, distinct High-risk passenger count, and fraud detection rate.
- Monthly assessed transaction totals.
- Suspected fraud types among flagged records.
- Actual ticket-type distribution across all matching assessments.
- Historical model performance, route breakdown, and recent High-risk alerts.

Detection rate is **recall**: the proportion of recorded fraud cases caught by thresholding the scores. It differs from flagged share, which is flagged transactions divided by all assessed transactions.

Precision asks how many flagged cases have recorded fraud labels; recall asks how many recorded fraud cases were flagged; F1 combines those measurements. ROC-AUC evaluates ranking using continuous saved scores. Undefined measurements display N/A. These are retrospective measurements on the CSV, not a separate held-out evaluation.

At the original unfiltered baseline: 2,750 assessed transactions; 386 flagged (about 14.04%); 136 distinct High-risk passengers; recall 90.35%; precision 60.62%; F1 72.56%; ROC-AUC 0.9583. High-risk passengers and High-risk transactions are different counts: there are 151 High-risk transactions in the saved data.

### 7.2 Anomaly Detection tab

This groups saved ensemble risk scores into ranges such as 0–10, 10–20, and so on. It helps show whether most transactions have low anomaly scores or whether many occupy higher ranges.

The project has Isolation Forest, One-Class SVM, and Autoencoder artifacts. Their scoring routines are combined into an ensemble. The current historical CSV lacks individual per-model score columns, so this tab displays the ensemble distribution rather than separate model comparisons.

An anomaly is unusual behavior according to the model; it is not by itself a confirmed inspector finding. The displayed histogram reads saved scores instead of running those models again.

### 7.3 Risk Analysis tab

This calls `GET :5555/risk-analysis/overview` and displays saved High/Medium/Low counts, risk-score buckets, commonly recorded explanation factors, and average risk by suspected fraud type.

The factors are counted from saved semicolon-separated explanation text on flagged records. They are explanatory indicators such as multiple scans or fare inconsistency, not a newly calculated causal explanation or live document check.

Use this tab to understand where saved risk is concentrated and which recorded patterns appear most often.

### 7.4 Inspection Workload tab

This calls `GET :5555/inspection-workload/overview` and compares thresholds from 0 to 100 in increments of five.

For each threshold, it calculates the share of historical transactions requiring review and the share of recorded fraud cases detected. Lower thresholds usually increase review workload; higher thresholds reduce review workload but can miss more labeled cases.

The page highlights the configured threshold of 45 and reports distinct flagged passengers. It is a historical planning tool. It does not assign inspectors or display the number of new Accepted/Rejected decisions saved in MariaDB.

### 7.5 Future Prediction tab

The current function is a **fraud simulation** for a route/date and a chosen batch size. It supports Future Simulation and Historical Replay.

The flow is:

1. Load supported model routes and imported historical dates through Node.
2. Choose one of 14 routes, the mode/date, and 1–2,000 passengers.
3. Submit to `POST :4000/journey-predictions`.
4. Node validates the request and asks `main_old.py` at `:3333/predict_batch` to simulate and score a batch.
5. The model service generates synthetic ticket records using saved class, fare, booking, and usage distributions.
6. It builds features such as hour, fare ratio, weekend, scan count, route/class/type codes, and booking/seat indicators.
7. Isolation Forest, One-Class SVM, and Autoencoder scores are normalized and averaged into a 0–1 ensemble score.
8. Node saves the result and its model provenance; the UI opens the result modal.

The modal reports synthetic passenger counts, flagged counts, flagged percentage, tier/fraud breakdowns, and individual simulated scores. The old simulation's flagged threshold is 0.5; its Low/Medium/High cutoffs are 0.4 and 0.7. A simulated Medium-risk passenger can therefore be flagged.

**Future Simulation** permits today or later. **Historical Replay** permits an imported route/date pair. Replay still generates synthetic passengers; it does not retrieve the actual passenger list from that date.

Fresh simulations may differ because record generation is random. Retrying the same saved request ID retrieves its saved snapshot rather than creating another stored result. The feature does not forecast verified real ticket fraud counts on a live railway service.

## 8. What happened to Fraud Batch Check?

Originally `/FraudBatchCheck` simulated a batch and displayed risk results. That functionality moved into the Future Prediction tab.

The old URL and component filename remain for compatibility, but the page now displays **Passenger Ticket Verification**. It checks one imported transaction at a time. It is no longer the batch simulation screen.

A batch means many synthetic ticket transactions scored together. A verification means one existing imported ticket retrieved and checked operationally.

## 9. Passenger Ticket Verification

The page answers: **what is the current state of this ticket, what checks are needed, and what decision did the inspector make?**

The Node API reads the MariaDB `tickets` table, seeded with 9,800 historical transactions from 2020–2024. Only 2,750 have individual saved ML assessments, but all imported tickets support operational checks.

### Verify Ticket

The ID is trimmed/uppercased and matched exactly. Lookup returns passenger details, original date/time and fares, current scan/inspection state, operational fraud checks, the optional saved assessment, and latest matching saved journey context. History is loaded alongside the result. The read does not increment usage or create a decision.

### Checks and result card

The demo considers current scan count >1 possible Ticket Reuse. Recorded source fraud and active Flag/Reject decisions block acceptance. Concession tickets require an inspector to check documents and choose Eligible or Not Eligible. That choice remains a draft until a decision is saved. Not Eligible adds an Abnormal Concession Usage result and blocks acceptance. A missing seat is displayed as Not Assigned and does not alone establish fraud.

Green means the demo checks are clear; amber means checks remain; red means flagged or rejected. Original historical dates are shown as recorded dates. Passing the checks does not grant travel authorization for today's date.

### Accept, Flag, and Reject

| Action | Persisted effect |
| --- | --- |
| Accept | Create a Verified event, set Inspected, increment scan count once |
| Flag | Create a Flagged event with reason/eligibility; leave scan count unchanged |
| Reject & Flag | Create a Rejected event with reason/eligibility; leave scan count unchanged |

Flag/Reject require a reason; Other requires remarks. An Accept is blocked by reuse, recorded fraud, active Flag/Reject, or unchecked/failed concession eligibility. Saved ML risk and journey risk alone do not block acceptance.

Each save locks the ticket, checks the expected version, inserts the event, updates state, and commits as one transaction. Request UUIDs/payload hashes prevent duplicate retry writes. A second inspector using an old version must Verify again.

### Example

Initially `TXN100004` has scan count 1 and Not Inspected. Verify does not change it. Accept saves one record and changes count 1 → 2, with Inspected status. The UI confirms the change. A later explicit Verify shows Already Used / Possible Ticket Reuse; accepting it again is blocked.

This is the selected historical demo rule. Searching itself is not a scan, and the demo is not a complete policy for repeat inspections or multiple-leg real travel.

### Saved assessment and journey badge

The expandable Historical ML assessment is the ticket's own saved 0–100 score. Unassessed tickets show Not Assessed. The Simulation Journey Risk badge is a saved synthetic journey-wide summary on a 0–1 scale. Neither is the inspector's operational decision.

A High journey can contain a ticket that passes the operational checks. It can justify closer review without automatically declaring that ticket fraudulent.

## 10. Simulation Journey Risk and the Replay connection

Node calculates the mean of the returned synthetic passenger risk scores. Below 0.4 is Low, 0.4 to below 0.7 is Medium, and 0.7 or higher is High.

For scores 0.2, 0.5, and 0.8, the mean is 0.5: Medium journey risk. One simulated passenger being High does not make the mean High. A mean score of 0.5 is not a calibrated 50% chance that the real journey has fraud.

Verification selects the latest successful saved prediction with the exact route and recorded date of the imported ticket. It shows mode, score/tier, generation time, and passenger count. With no matching snapshot it shows Journey Risk Unavailable.

The ticket's Historical Replay shortcut preselects that route/date in Future Prediction. After saving a replay, returning to verification reads the badge without running the model again. Future dates will generally not match the historical tickets; Replay exists to demonstrate this connection while preserving original dates.

Lookup/history and saved badges continue to work when the simulation service is offline. A new simulation requires that service.

## 11. Verification History and Administration

Passenger history displays saved decisions, actor attribution, eligibility, reasons, remarks, scan changes, and Colombo timestamps. Decisions survive refreshes and server restarts because they are stored in MariaDB.

Administration → Verification History opens `/Admin/Verifications`, which can search across tickets and void the latest active decision. Voiding records the reason, actor, and time; restores the preceding operational state; increments the version; and keeps the original audit entry. Later active decisions must be voided before earlier ones.

Voiding an acceptance of TXN100004 restores the earlier count 1 and inspection status; its accepted record remains marked Voided. There is no permanent audit-delete control.

The server resolves a supplied ID to an active database user and snapshots their name/ID. This is local demo attribution. The existing login does not provide enforced staff/admin authentication for these operations, and the administration page makes that limitation explicit.

## 12. Account Settings, login, and other administration

Registration/login use the Node users endpoints and MariaDB `users`. Login checks an existing account's password and active state. Inactive accounts produce the `user_active` error encountered earlier. The frontend stores identity and a `loginAccess` flag locally to show application routes.

Account Settings is intended to display/edit profile data and change the application-account password. That password is separate from the MariaDB connection password in `.env`. In the current code, profile/password submit URLs are malformed and the legacy update routes rely on identity guards that are not wired into the visible Node setup. Those legacy update actions should not be described as completed working authentication features.

The new persistent inspection workflow uses the active user record for demonstration attribution; it did not repair or redesign the legacy account system. The existing Administration page links to account settings and the new verification-history screen.

## 13. Train Tracking and Schedule Optimization

These are placeholders. Their sidebar items are disabled, and no matching routed screens/services implement them. The reference network map is not train tracking. Real GPS/delay feeds and scheduling logic would be further work.

## 14. Understanding what gets saved

| Operation | Storage effect |
| --- | --- |
| Open historical fraud charts | Read saved CSV assessments |
| Run demand forecast / backend allocation | Apply loaded model/calculation; display result; no forecast persistence added |
| Enter Train Data | Write observed class counts to existing `train` table when provisioned |
| Run Future Simulation / Historical Replay | Save successful snapshot in `journey_predictions`; generated IDs are not imported tickets |
| Verify Ticket | Read ticket state and saved context |
| Accept / Flag / Reject | Create `ticket_verifications` event and update `tickets` operational state |
| Admin Void | Retain/annotate the event and restore preceding ticket state |

Inspector decisions do not rewrite the original CSV fraud labels, historical chart counts, model artifacts, or demand model. The ticket database and historical analytics intentionally represent different purposes.
