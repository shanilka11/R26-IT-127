import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import VerificationHistory from './VerificationHistory';
import { verificationAPI, demoActor, requestUUID, apiError, colomboTime, simulationMode } from './verificationApi';
import './PassengerVerification.css';

export default function FraudBatchCheck() {
  const initialId = useRef(new URLSearchParams(window.location.search).get('transaction_id') || '');
  const [transactionId, setTransactionId] = useState(initialId.current);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [eligibility, setEligibility] = useState('not_checked');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [saveError, setSaveError] = useState('');
  const request = useRef(0);
  const controller = useRef(null);
  const pending = useRef(false);
  const mutation = useRef(null);
  const search = useCallback(async idValue => {
    if (pending.current) return;
    const current = ++request.current;
    controller.current?.abort();
    setResult(null); setError(''); setSaved(null); setSaveError(''); setEligibility('not_checked'); setReason(''); setRemarks('');
    mutation.current = null;
    const id = idValue.trim().toUpperCase();
    if (!id) { setLoading(false); setError('Enter a Transaction ID.'); return; }
    controller.current = new AbortController(); setLoading(true);
    try {
      const { data } = await axios.get(`${verificationAPI}/passenger-verification/transaction`, {
        params: { transaction_id: id }, signal: controller.current.signal, timeout: 15000,
      });
      if (current === request.current) setResult(data);
    } catch (err) {
      if (current === request.current && !axios.isCancel(err)) setError(apiError(err,
        err.response?.status === 404 ? 'Transaction not found. Check the ID.' : 'Verification service unavailable. Please retry.'));
    } finally { if (current === request.current) setLoading(false); }
  }, []);
  useEffect(() => {
    if (initialId.current) search(initialId.current);
    return () => { request.current += 1; controller.current?.abort(); };
  }, [search]);
  const decide = async action => {
    if (pending.current || saved) return;
    setSaveError('');
    if (!demoActor()) { setSaveError('Sign in with an active demo account before saving.'); return; }
    if (action !== 'Accept' && (!reason || (reason === 'Other' && !remarks.trim()))) {
      setSaveError('Choose a reason. Other also requires remarks.'); return;
    }
    const body = { transaction_id: result.transaction.transaction_id, actor_user_id: demoActor(),
      expected_version: result.state.state_version, action,
      eligibility: result.verification.concession_required ? eligibility : 'not_required', reason: action === 'Accept' ? '' : reason, remarks: remarks.trim() };
    const key = JSON.stringify(body);
    if (mutation.current?.key !== key) mutation.current = { key, id: requestUUID() };
    pending.current = true; setSaving(true);
    try {
      const { data } = await axios.post(`${verificationAPI}/passenger-verification/decisions`, {
        ...body, request_id: mutation.current.id,
      }, { timeout: 15000 });
      setSaved(data.record);
    } catch (err) { setSaveError(apiError(err, 'Unable to confirm the saved decision. Retry the same action to safely check its result.')); }
    finally { pending.current = false; setSaving(false); }
  };
  const t = result?.transaction, v = result?.verification, assessment = result?.assessment;
  const ineligible = v?.concession_required && eligibility === 'ineligible';
  const flagged = v?.fraud_status === 'Flagged' || ineligible;
  const needsEligibility = v?.concession_required && eligibility !== 'eligible';
  const level = flagged ? 'high' : needsEligibility ? 'medium' : 'low';
  const journey = result?.journey_prediction;
  const replayUrl = t ? `/FraudDashboard?${new URLSearchParams({ tab: 'predict', mode: 'historical_replay', route: t.route, date: t.date, transaction_id: t.transaction_id })}` : '';
  return <main className="pv-page">
    <header className="pv-heading"><h1>Passenger Ticket Verification</h1><p><strong>Historical verification demo</strong> · Recorded dates are not current travel authorization.</p>
      <p className="pv-note pv-muted">Decisions use local demo user attribution, not authenticated staff identity.</p></header>
    <section className="pv-card pv-input-card">
      <form className="pv-toolbar" onSubmit={event => { event.preventDefault(); search(transactionId); }} noValidate>
        <label htmlFor="pv-ticket-id">Transaction ID<input id="pv-ticket-id" value={transactionId} onChange={event => setTransactionId(event.target.value)} disabled={saving} placeholder="e.g. TXN100004" autoComplete="off" /></label>
        <button className="pv-search" disabled={saving}>Verify Ticket</button>
      </form>
      <p className="pv-muted pv-note">Verification only reads the ticket. Accepting saves a decision and increments the scan count once.</p>
      {loading && <p role="status">Looking up transaction…</p>}{error && <p role="alert" className="pv-error">{error}</p>}
    </section>
    {t && <>
      {saved && <section className="pv-card pv-confirmation" role="status"><h2>Decision saved: {saved.verification_status}</h2>
        <p>Scan count: {saved.before_state.ticket_scan_count} → {saved.after_state.ticket_scan_count}. Verify Ticket again to retrieve the updated state.</p>
        <p>Saved at {colomboTime(saved.verified_at)} (Asia/Colombo).</p></section>}
      <div className="pv-grid" aria-busy={saving}>
        <section className="pv-card"><h2>Passenger Details</h2><dl className="pv-details">
          {Object.entries({ 'Transaction ID': t.transaction_id, 'Passenger ID': t.passenger_id, 'Passenger Name': t.passenger_name,
            'Recorded Date/Time': `${t.date} ${t.time}`, Route: t.route, 'Travel Class': t.travel_class,
            'Ticket Type': t.ticket_type, Seat: t.seat_number || 'Not Assigned', 'Fare Paid (LKR)': t.fare_paid_lkr, 'Standard Fare (LKR)': t.standard_fare_lkr,
          }).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}
        </dl></section>
        <section className={`pv-card pv-result pv-result-${level}`} aria-live="polite"><h2>{saved ? 'Verification Result · before decision' : 'Verification Result'}</h2>
          <p className={`pv-badge pv-risk-${level}`}>{flagged ? '⚠ Flagged for review' : needsEligibility ? '◇ Eligibility check required' : '✓ Clear — demo checks'}</p>
          <dl className="pv-details">
            <div><dt>Ticket Status</dt><dd>{ineligible ? 'Suspicious' : needsEligibility && !flagged ? 'Eligibility Required' : !flagged ? 'Valid — demo checks' : v.ticket_status}</dd></div>
            <div><dt>Ticket Usage</dt><dd>{v.ticket_usage}{v.ticket_scan_count > 1 && ' · Possible Ticket Reuse'}</dd></div>
            <div><dt>Scan Count</dt><dd>{v.ticket_scan_count}</dd></div><div><dt>Inspection Status</dt><dd>{v.inspection_status}</dd></div>
            <div><dt>Fraud Status</dt><dd>{flagged ? 'Flagged' : needsEligibility ? 'Pending Checks' : 'Clear'}</dd></div>
            <div><dt>Fraud Type</dt><dd>{[...new Set([...v.fraud_types, ...(ineligible ? ['Abnormal Concession Usage'] : [])])].join(', ') || 'None'}</dd></div>
          </dl>
          {t.is_fraud === 1 && <p className="pv-flagged">Imported recorded fraud: {t.fraud_type || 'Recorded Fraud'}. Acceptance is blocked.</p>}
          <div className="pv-journey"><h3>Simulation Journey Risk</h3>{journey ? <>
            <strong className={`pv-badge pv-risk-${journey.risk_tier.toLowerCase()}`}>{journey.risk_tier} · {Number(journey.mean_risk_score).toFixed(3)} / 1</strong>
            <p>{simulationMode(journey.mode)} · {journey.passenger_count} simulated passengers<br />Generated {colomboTime(journey.created_at)} (Asia/Colombo)</p>
            <p className="pv-note">Mean simulated passenger score, not a separately validated route-risk model. This badge does not determine ticket acceptance.</p>
          </> : <p>Journey Risk Unavailable</p>}
          <a href={replayUrl}>Run Historical Replay for this route/date</a></div>
        </section>
      </div>
      <section className="pv-card pv-actions"><h2>Inspector Decision</h2>
        <fieldset disabled={saving || !!saved}>
          {v.concession_required && <label>Concession eligibility<select value={eligibility} onChange={event => setEligibility(event.target.value)}><option value="not_checked">Check documents and choose</option><option value="eligible">Eligible</option><option value="ineligible">Not Eligible</option></select></label>}
          <div className="pv-grid"><label>Flag / rejection reason<select value={reason} onChange={event => setReason(event.target.value)}><option value="">Select a reason</option>{result.reasons.map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Remarks (required for Other)<textarea maxLength={2000} value={remarks} onChange={event => setRemarks(event.target.value)} /></label></div>
          <div className="pv-toolbar"><button className="pv-search" disabled={v.acceptance_blocked || needsEligibility} onClick={() => decide('Accept')}>Accept Ticket</button>
            <button className="pv-search pv-secondary" onClick={() => decide('Flag')}>Flag Ticket</button><button className="pv-search pv-danger" onClick={() => decide('Reject')}>Reject &amp; Flag</button></div>
        </fieldset>
        {saving && <p role="status">Saving decision…</p>}{saveError && <p role="alert" className="pv-error">{saveError}</p>}
      </section>
      <section className="pv-card pv-ml"><details><summary>Historical ML assessment</summary>{assessment ? <>
        <p>Saved risk: {assessment.risk_score} / 100 · {assessment.risk_category} Risk · {assessment.is_flagged_fraud ? 'Flagged for Review' : 'Not Flagged'}</p>
        <p>{assessment.suspected_fraud_type} · {assessment.reason_for_flagging}</p>
        <p className="pv-muted">Historical model assessment is separate from the inspector’s decision.</p>
      </> : <p>Not Assessed — no saved individual ML assessment. Operational inspection remains available.</p>}</details></section>
      <VerificationHistory key={t.transaction_id} transactionId={t.transaction_id} revision={saved?.verification_id || result.state.state_version} />
    </>}
  </main>;
}
