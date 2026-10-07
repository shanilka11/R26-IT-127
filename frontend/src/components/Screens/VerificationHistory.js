import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { verificationAPI, demoActor, colomboTime, apiError } from './verificationApi';

export default function VerificationHistory({ transactionId, revision = 0, administration = false }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const pending = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setData(null); setError('');
    axios.get(`${verificationAPI}/passenger-verification/history`, { params: {
      transaction_id: transactionId, search: filter, page, page_size: 10,
    }, signal: controller.signal, timeout: 15000 }).then(({ data: response }) => {
      if (!controller.signal.aborted) setData(response);
    }).catch(err => { if (!controller.signal.aborted) setError(apiError(err, 'Verification history unavailable.')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [transactionId, revision, page, filter, reload]);
  const voidRecord = async event => {
    event.preventDefault();
    if (pending.current) return;
    if (!reason.trim()) { setSaveError('Enter a correction reason.'); return; }
    if (!demoActor()) { setSaveError('Sign in with an active demo account.'); return; }
    pending.current = true; setSaving(true); setSaveError('');
    try {
      await axios.post(`${verificationAPI}/passenger-verification/verifications/${selected.verification_id}/void`, {
        actor_user_id: demoActor(), reason: reason.trim(),
      }, { timeout: 15000 });
      setSelected(null); setReason(''); setReload(value => value + 1);
    } catch (err) { setSaveError(apiError(err, 'Unable to confirm the correction. Retry with the same reason.')); }
    finally { pending.current = false; setSaving(false); }
  };
  return <section className="pv-card pv-history" aria-busy={loading}>
    <h2>Verification History</h2>
    <p className="pv-muted">Saved decisions · Times in Asia/Colombo · Voided records remain in the audit history.</p>
    {administration && <form className="pv-toolbar" onSubmit={event => { event.preventDefault(); setFilter(search.trim()); setPage(1); setReload(value => value + 1); }}>
      <label>Search transaction ID<input value={search} onChange={event => setSearch(event.target.value)} disabled={saving} /></label>
      <button className="pv-search" disabled={saving}>Search History</button>
    </form>}
    {loading && <p role="status">Loading history…</p>}
    {error && <p role="alert">{error} <button className="pv-search" onClick={() => setReload(value => value + 1)}>Retry History</button></p>}
    {data && !data.records.length && <p>No verification decisions saved.</p>}
    {data?.records.length > 0 && <>
      <div className="pv-table-scroll" tabIndex={0} role="region" aria-label="Saved verification decisions">
        <table><thead><tr><th>Transaction / time</th><th>Decision</th><th>Inspector attribution</th><th>Details</th></tr></thead>
          <tbody>{data.records.map(record => <tr key={record.verification_id}>
            <td>{record.transaction_id}<br /><small>{colomboTime(record.verified_at)}</small></td>
            <td>{record.verification_status}{record.voided_at && <strong className="pv-flagged"> · Voided</strong>}</td>
            <td>{record.actor_name}<br /><small>Demo user #{record.actor_user_id}</small></td>
            <td><details><summary>View decision</summary>
              <p>Action: {record.inspector_action}<br />Eligibility: {record.eligibility_result}<br />Scan count: {record.before_state.ticket_scan_count} → {record.after_state.ticket_scan_count}</p>
              <p>Fraud status: {record.verification_result.fraud_status}<br />Types: {record.verification_result.fraud_types.join(', ') || 'None'}</p>
              <p>Reason: {record.reason || '—'}<br />Remarks: {record.remarks || '—'}</p>
              <small>Record: {record.verification_id}</small>
              {record.voided_at && <p>Voided by {record.voided_by_name} at {colomboTime(record.voided_at)}<br />Correction: {record.void_reason}</p>}
            </details>
            {administration && !record.voided_at && <button className="pv-search pv-secondary" disabled={!record.can_void || saving} onClick={() => { setSelected(record); setReason(''); setSaveError(''); }}>Void Decision</button>}
            {administration && !record.voided_at && !record.can_void && <small>Void later decisions first.</small>}
            </td>
          </tr>)}</tbody></table>
      </div>
      <div className="pv-toolbar pv-pagination"><button className="pv-search pv-secondary" disabled={page <= 1 || saving} onClick={() => setPage(value => value - 1)}>Previous</button>
        <span>Page {page} · {data.total} records</span><button className="pv-search pv-secondary" disabled={page * data.page_size >= data.total || saving} onClick={() => setPage(value => value + 1)}>Next</button></div>
    </>}
    {selected && <form className="pv-void-form" onSubmit={voidRecord}>
      <h3>Void {selected.inspector_action} decision for {selected.transaction_id}</h3>
      <p>This reverses the latest decision’s state effect and retains its audit record.</p>
      <label>Correction reason<textarea required maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} disabled={saving} /></label>
      {saveError && <p role="alert" className="pv-error">{saveError}</p>}
      <div className="pv-toolbar"><button className="pv-search" disabled={saving}>{saving ? 'Saving…' : 'Confirm Void'}</button><button className="pv-search pv-secondary" type="button" disabled={saving} onClick={() => setSelected(null)}>Cancel</button></div>
    </form>}
  </section>;
}
