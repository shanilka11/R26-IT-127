const { randomUUID, createHash } = require('crypto');
const axios = require('axios');
const { query, transaction } = require('./db');

class RequestError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new RequestError(status, message); };
const parse = value => typeof value === 'string' ? JSON.parse(value) : value;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id = value => typeof value === 'string' && value.trim() && value.trim().length <= 64 && /^[\x20-\x7E]+$/.test(value.trim()) ? value.trim().toUpperCase() : fail(400, 'Transaction ID is required.');
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : fail(400, 'A valid request ID is required.');
const integer = (value, name, min = 0) => Number.isSafeInteger(value) && value >= min ? value : fail(400, `${name} must be a whole number of at least ${min}.`);
const note = (value, name, required = false) => {
  if (value != null && typeof value !== 'string') fail(400, `${name} must be text.`);
  const result = (value || '').trim();
  if ((required && !result) || result.length > 2000) fail(400, `${name} is required and must be at most 2,000 characters.`);
  return result;
};
const iso = value => value ? value.replace(' ', 'T') + 'Z' : null;
const state = row => ({ ticket_scan_count: row.ticket_scan_count, inspection_status: row.inspection_status,
  decision_status: row.decision_status, operational_fraud_type: row.operational_fraud_type, state_version: row.state_version });
const requireBody = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'A JSON object is required.');
};
const reasons = ['Ticket Reuse', 'Abnormal Concession Usage', 'Recorded Fraud', 'Suspicious Resale', 'Other'];
function evaluate(row, eligibility = 'not_checked') {
  const source = parse(row.source_data);
  const concession = /concession/i.test(source.ticket_type);
  const fraudTypes = [];
  if (row.ticket_scan_count > 1) fraudTypes.push('Ticket Reuse');
  if (source.is_fraud) fraudTypes.push(source.fraud_type || 'Recorded Fraud');
  if (row.decision_status !== 'Clear') fraudTypes.push(row.operational_fraud_type || 'Inspector Flag');
  if (concession && eligibility === 'ineligible') fraudTypes.push('Abnormal Concession Usage');
  const flagged = fraudTypes.length > 0;
  const pending = concession && eligibility === 'not_checked';
  return {
    ticket_status: row.decision_status === 'Rejected' ? 'Rejected' : flagged ? 'Suspicious' : pending ? 'Eligibility Required' : 'Valid — demo checks',
    ticket_usage: row.ticket_scan_count > 1 ? 'Already Used' : 'First Use',
    ticket_scan_count: row.ticket_scan_count, inspection_status: row.inspection_status,
    fraud_status: flagged ? 'Flagged' : pending ? 'Pending Checks' : 'Clear',
    fraud_types: [...new Set(fraudTypes)], concession_required: concession,
    eligibility_result: concession ? eligibility : 'not_required',
    can_accept: !flagged && (!concession || eligibility === 'eligible'),
    acceptance_blocked: flagged,
  };
}
function event(row) {
  return { ...row, before_state: parse(row.before_state), after_state: parse(row.after_state),
    verification_result: parse(row.verification_result), verified_at: iso(row.verified_at), voided_at: iso(row.voided_at) };
}
function prediction(row) {
  if (!row) return null;
  return { prediction_id: row.prediction_id, route: row.route, date: row.recorded_date, mode: row.mode,
    passenger_count: row.passenger_count, mean_risk_score: row.mean_risk_score, risk_tier: row.risk_tier,
    model_provenance: parse(row.model_provenance), created_at: iso(row.created_at) };
}
function createService(pool, model = axios.create({ baseURL: process.env.FRAUD_SIMULATION_URL || 'http://127.0.0.1:3333', timeout: 60000 })) {
  async function actor(db, actorId) {
    integer(actorId, 'Demo user ID', 1);
    const rows = await query(db, 'SELECT id, fname, lname FROM users WHERE id = ? AND active = 1', [actorId]);
    if (!rows.length) fail(403, 'Sign in with an active demo account before saving a decision.');
    return { id: rows[0].id, name: `${rows[0].fname} ${rows[0].lname}`.trim() };
  }
  async function getTicket(db, transactionId, lock = false) {
    const rows = await query(db, `SELECT * FROM tickets WHERE transaction_id = ?${lock ? ' FOR UPDATE' : ''}`, [transactionId]);
    if (!rows.length) fail(404, 'Transaction not found.');
    return rows[0];
  }
  async function lookup(transactionId) {
    const ticket = await getTicket(pool, id(transactionId));
    const forecasts = await query(pool, 'SELECT * FROM journey_predictions WHERE route = ? AND recorded_date = ? ORDER BY sequence_id DESC LIMIT 1', [ticket.route, ticket.recorded_date]);
    const assessment = parse(ticket.historical_assessment);
    const verification = evaluate(ticket);
    return { success: true, mode: 'historical_demo', transaction: parse(ticket.source_data), state: state(ticket),
      verification, assessment, assessment_status: assessment ? 'assessed' : 'not_assessed',
      journey_prediction: prediction(forecasts[0]), reasons,
      permitted_actions: verification.acceptance_blocked ? ['Flag', 'Reject'] : ['Accept', 'Flag', 'Reject'] };
  }
  async function history(params = {}) {
    if (params.search != null && typeof params.search !== 'string') fail(400, 'Search must be text.');
    const page = integer(Number(params.page || 1), 'Page', 1);
    const size = integer(Number(params.page_size || 20), 'Page size', 1);
    if (size > 100) fail(400, 'Page size cannot exceed 100.');
    const clauses = [], values = [];
    if (params.transaction_id) { clauses.push('v.transaction_id = ?'); values.push(id(params.transaction_id)); }
    if (params.search && params.search.trim()) {
      clauses.push('LOCATE(?, v.transaction_id) > 0'); values.push(params.search.trim().toUpperCase());
    }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    const [{ total }] = await query(pool, `SELECT COUNT(*) total FROM ticket_verifications v ${where}`, values);
    const rows = await query(pool, `SELECT v.*, NOT EXISTS(SELECT 1 FROM ticket_verifications later WHERE later.transaction_id = v.transaction_id AND later.voided_at IS NULL AND later.sequence_id > v.sequence_id) AND v.voided_at IS NULL AS can_void FROM ticket_verifications v ${where} ORDER BY v.sequence_id DESC LIMIT ? OFFSET ?`, [...values, size, (page - 1) * size]);
    return { success: true, records: rows.map(event), total, page, page_size: size };
  }
  async function decide(body) {
    requireBody(body);
    const input = { transaction_id: id(body.transaction_id), request_id: uuid(body.request_id),
      actor_user_id: integer(body.actor_user_id, 'Demo user ID', 1), expected_version: integer(body.expected_version, 'Ticket version'),
      action: body.action, eligibility: body.eligibility || 'not_checked', reason: note(body.reason, 'Reason'), remarks: note(body.remarks, 'Remarks') };
    if (!['Accept', 'Flag', 'Reject'].includes(input.action)) fail(400, 'Choose Accept, Flag, or Reject.');
    if (!['not_checked', 'not_required', 'eligible', 'ineligible'].includes(input.eligibility)) fail(400, 'Invalid eligibility result.');
    if (input.action !== 'Accept' && !reasons.includes(input.reason)) fail(400, 'Choose a reason for flagging or rejecting.');
    if (input.action !== 'Accept' && input.reason === 'Other' && !input.remarks) fail(400, 'Remarks are required for Other.');
    const requestHash = hash(input);
    return transaction(pool, async db => {
      const who = await actor(db, input.actor_user_id);
      const ticket = await getTicket(db, input.transaction_id, true);
      // Check retries after locking, before version validation: a committed retry has an older version.
      const existing = await query(db, 'SELECT * FROM ticket_verifications WHERE request_id = ?', [input.request_id]);
      if (existing.length) {
        if (existing[0].request_hash !== requestHash) fail(409, 'This request ID was already used for another decision.');
        return { success: true, duplicate: true, record: event(existing[0]) };
      }
      if (ticket.state_version !== input.expected_version) fail(409, 'Ticket changed. Verify it again before deciding.');
      const result = evaluate(ticket, input.eligibility);
      if (result.concession_required && input.eligibility === 'not_required') fail(400, 'Concession eligibility must be checked.');
      if (input.action === 'Accept' && !result.can_accept) fail(409, 'This ticket cannot be accepted. Review its fraud and concession checks.');
      const before = state(ticket);
      const after = { ...before, inspection_status: 'Inspected', state_version: before.state_version + 1 };
      if (input.action === 'Accept') after.ticket_scan_count += 1;
      else {
        after.decision_status = input.action === 'Reject' ? 'Rejected' : (before.decision_status === 'Rejected' ? 'Rejected' : 'Flagged');
        after.operational_fraud_type = result.fraud_types[0] || input.reason;
        result.fraud_status = 'Flagged';
        result.ticket_status = after.decision_status === 'Rejected' ? 'Rejected' : 'Suspicious';
        result.fraud_types = [...new Set([...result.fraud_types, input.reason])];
      }
      const verificationId = randomUUID();
      await query(db, `INSERT INTO ticket_verifications
        (verification_id,transaction_id,request_id,request_hash,actor_user_id,actor_name,inspector_action,verification_status,eligibility_result,reason,remarks,verification_result,before_state,after_state,verified_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(3))`,
      [verificationId,input.transaction_id,input.request_id,requestHash,who.id,who.name,input.action,
        input.action === 'Accept' ? 'Verified' : input.action === 'Flag' ? 'Flagged' : 'Rejected',result.eligibility_result,
        input.reason || null,input.remarks,JSON.stringify(result),JSON.stringify(before),JSON.stringify(after)]);
      await updateState(db, input.transaction_id, after);
      return { success: true, record: event((await query(db, 'SELECT * FROM ticket_verifications WHERE verification_id = ?', [verificationId]))[0]) };
    });
  }
  async function updateState(db, transactionId, next) {
    await query(db, 'UPDATE tickets SET ticket_scan_count=?,inspection_status=?,decision_status=?,operational_fraud_type=?,state_version=? WHERE transaction_id=?',
      [next.ticket_scan_count,next.inspection_status,next.decision_status,next.operational_fraud_type,next.state_version,transactionId]);
  }
  async function voidDecision(verificationId, body) {
    requireBody(body);
    const reason = note(body.reason, 'Void reason', true);
    const actorId = integer(body.actor_user_id, 'Demo user ID', 1);
    const rows = await query(pool, 'SELECT transaction_id FROM ticket_verifications WHERE verification_id = ?', [verificationId]);
    if (!rows.length) fail(404, 'Verification record not found.');
    return transaction(pool, async db => {
      const who = await actor(db, actorId);
      const ticket = await getTicket(db, rows[0].transaction_id, true);
      const row = (await query(db, 'SELECT * FROM ticket_verifications WHERE verification_id = ?', [verificationId]))[0];
      if (row.voided_at) return { success: true, duplicate: true, record: event(row) };
      const latest = await query(db, 'SELECT verification_id FROM ticket_verifications WHERE transaction_id = ? AND voided_at IS NULL ORDER BY sequence_id DESC LIMIT 1', [ticket.transaction_id]);
      if (latest[0].verification_id !== verificationId) fail(409, 'Void later decisions for this ticket first.');
      const restored = { ...parse(row.before_state), state_version: ticket.state_version + 1 };
      await updateState(db, ticket.transaction_id, restored);
      await query(db, 'UPDATE ticket_verifications SET voided_at=UTC_TIMESTAMP(3),voided_by=?,voided_by_name=?,void_reason=? WHERE verification_id=?', [who.id,who.name,reason,verificationId]);
      return { success: true, record: event((await query(db, 'SELECT * FROM ticket_verifications WHERE verification_id=?', [verificationId]))[0]) };
    });
  }
  async function metadata() {
    try {
      const { data } = await model.get('/meta/fraud-simulation');
      if (!data.success || !Array.isArray(data.routes) || data.risk_tier_cutoffs?.medium !== .4 || data.risk_tier_cutoffs?.high !== .7) throw new Error();
      return data;
    } catch (_) { fail(503, 'Simulation service unavailable. Start the fraud simulation service and retry.'); }
  }
  async function options() {
    const meta = await metadata();
    const dates = await query(pool, 'SELECT DISTINCT route, recorded_date FROM tickets ORDER BY route, recorded_date');
    const historical_dates = {};
    for (const row of dates) {
      if (meta.routes.includes(row.route)) (historical_dates[row.route] ||= []).push(row.recorded_date);
    }
    return { success: true, routes: meta.routes, historical_dates, risk_tier_cutoffs: meta.risk_tier_cutoffs,
      today: new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()) };
  }
  async function predict(body) {
    requireBody(body);
    const input = { request_id: uuid(body.request_id), actor_user_id: integer(body.actor_user_id, 'Demo user ID', 1),
      train_route: note(body.train_route, 'Route', true), date: body.date, mode: body.mode,
      n_passengers: integer(body.n_passengers, 'Passenger count', 1) };
    if (input.n_passengers > 2000) fail(400, 'Passenger count cannot exceed 2,000.');
    if (!['future', 'historical_replay'].includes(input.mode)) fail(400, 'Choose Future Simulation or Historical Replay.');
    if (typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0,10) !== input.date) fail(400, 'Choose a valid date.');
    const requestHash = hash(input);
    const who = await actor(pool, input.actor_user_id);
    const replay = async () => {
      const existing = await query(pool, 'SELECT * FROM journey_predictions WHERE request_id=?', [input.request_id]);
      if (!existing.length) return null;
      if (existing[0].request_hash !== requestHash) fail(409, 'This request ID was already used for another simulation.');
      return { ...parse(existing[0].result_data), journey_prediction: prediction(existing[0]) };
    };
    const cached = await replay();
    if (cached) return cached;
    if (input.mode === 'historical_replay') {
      const matches = await query(pool, 'SELECT 1 FROM tickets WHERE route=? AND recorded_date=? LIMIT 1', [input.train_route,input.date]);
      if (!matches.length) fail(400, 'Historical Replay requires an imported route/date pair.');
    } else {
      const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      if (input.date < today) fail(400, 'Choose today or a future date.');
    }
    const meta = await metadata();
    if (!meta.routes.includes(input.train_route)) fail(400, 'Unsupported route.');
    let data;
    try { ({ data } = await model.post('/predict_batch', { train_route: input.train_route, date: input.date, n_passengers: input.n_passengers })); }
    catch (_) { fail(503, 'Simulation service unavailable. Retry this request.'); }
    if (!data?.success || !Array.isArray(data.predictions) || data.predictions.length !== input.n_passengers || data.summary?.train_route !== input.train_route || data.summary?.date !== input.date || data.summary?.total_passengers !== input.n_passengers || data.predictions.some(p => !Number.isFinite(p.ensemble_risk_score) || p.ensemble_risk_score < 0 || p.ensemble_risk_score > 1)) fail(502, 'Simulation service returned an invalid result.');
    const mean = data.predictions.reduce((sum, p) => sum + p.ensemble_risk_score, 0) / data.predictions.length;
    const tier = mean >= .7 ? 'High' : mean >= .4 ? 'Medium' : 'Low';
    try {
      await query(pool, `INSERT INTO journey_predictions
        (prediction_id,request_id,request_hash,route,recorded_date,mode,passenger_count,mean_risk_score,risk_tier,model_provenance,result_data,actor_user_id,actor_name,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(3))`,
      [randomUUID(),input.request_id,requestHash,input.train_route,input.date,input.mode,input.n_passengers,mean,tier,
        JSON.stringify({ ...meta.model_provenance, risk_tier_cutoffs: meta.risk_tier_cutoffs, aggregation: 'mean_returned_passenger_score' }),JSON.stringify(data),who.id,who.name]);
    } catch (error) { if (error.code !== 'ER_DUP_ENTRY') throw error; }
    return replay();
  }
  return { lookup, history, decide, voidDecision, options, predict };
}
module.exports = { createService, evaluate, RequestError, reasons };
