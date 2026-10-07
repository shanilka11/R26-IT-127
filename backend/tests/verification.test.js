const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {randomUUID,createHash} = require('crypto');
const fs = require('fs');
const path = require('path');
const {createPool,query,close} = require('../verification/db');
const {createService} = require('../verification/service');
const {migrate,importTickets} = require('../verification/setup');
const pool=createPool();
const ticketIds=[], requestIds=[];
let actorId, source, service, hashes;
const model={get:async()=>({data:{success:true,routes:['Colombo Fort - Vavuniya'],risk_tier_cutoffs:{medium:.4,high:.7},model_provenance:{model_id:'test'}}}),post:async(_, body)=>({data:{success:true,summary:{train_route:body.train_route,date:body.date,total_passengers:body.n_passengers},predictions:Array.from({length:body.n_passengers},(_,i)=>({transaction_id:'SIM'+i,ensemble_risk_score:.8}))}})};
function sourceHashes(){return ['ticket_fraud_dataset_2020_2024.csv','risk_scored_transactions_2024.csv'].map(f=>createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../public/models',f))).digest('hex'))}
before(async()=>{await migrate(pool); actorId=(await query(pool,'SELECT id FROM users WHERE active=1 LIMIT 1'))[0]?.id;assert.ok(actorId,'An active demo user is required');source=JSON.parse((await query(pool,"SELECT source_data FROM tickets WHERE transaction_id='TXN100004'"))[0].source_data);service=createService(pool,model);hashes=sourceHashes()});
after(async()=>{try{if(ticketIds.length){await query(pool,'DELETE FROM ticket_verifications WHERE transaction_id IN (?)',[ticketIds]);await query(pool,'DELETE FROM tickets WHERE transaction_id IN (?)',[ticketIds])}if(requestIds.length)await query(pool,'DELETE FROM journey_predictions WHERE request_id IN (?)',[requestIds]);assert.deepEqual(sourceHashes(),hashes)}finally{await close(pool)}});
async function fixture(overrides={}){const transaction_id='TEST-'+randomUUID().toUpperCase();ticketIds.push(transaction_id);const row={...source,...overrides,transaction_id};await importTickets(pool,[[transaction_id,row.route,row.date,JSON.stringify(row),'0'.repeat(64),null,row.ticket_scan_count,row.inspection_status]]);return row}
const input=(ticket,extra={})=>({transaction_id:ticket.transaction_id,request_id:randomUUID(),actor_user_id:actorId,expected_version:0,action:'Accept',...extra});
const reject=(promise,status)=>assert.rejects(promise,e=>e.status===status);

test('lookup is exact, normalized, read-only and independent of ML',async()=>{const t=await fixture();const offline=createService(pool,{get:()=>{throw Error()},post:()=>{throw Error()}});const r=await offline.lookup(' '+t.transaction_id.toLowerCase()+' ');assert.equal(r.verification.ticket_usage,'First Use');assert.equal(r.verification.can_accept,true);assert.equal(r.assessment,null);await offline.lookup(t.transaction_id);assert.equal((await offline.history({transaction_id:t.transaction_id})).total,0);await reject(service.lookup(t.transaction_id.slice(0,-1)),404);await reject(service.lookup(' '),400)});
test('accept increments once; later read flags reuse; duplicate request survives stale version',async()=>{const t=await fixture();const body=input(t);const r=await service.decide(body);assert.equal(r.record.before_state.ticket_scan_count,1);assert.equal(r.record.after_state.ticket_scan_count,2);assert.equal(r.record.verification_status,'Verified');assert.equal((await service.decide(body)).duplicate,true);const latest=await service.lookup(t.transaction_id);assert.equal(latest.verification.fraud_status,'Flagged');assert.deepEqual(latest.verification.fraud_types,['Ticket Reuse']);assert.equal((await service.history({transaction_id:t.transaction_id})).total,1);await reject(service.decide(input(t,{expected_version:1})),409)});
test('concurrent acceptances cannot double count; concurrent retries create one event',async()=>{for(const identical of [false,true]){const t=await fixture();const a=input(t);const replies=await Promise.allSettled([service.decide(a),service.decide(identical?a:input(t))]);assert.equal(replies.filter(r=>r.status==='fulfilled').length,identical?2:1);assert.equal((await service.lookup(t.transaction_id)).state.ticket_scan_count,2);assert.equal((await service.history({transaction_id:t.transaction_id})).total,1)}});
test('reused, recorded fraud and failed concession checks block acceptance',async()=>{for(const overrides of [{ticket_scan_count:3},{is_fraud:1,fraud_type:'Suspicious Resale'},{ticket_type:'Student Concession'}]){const t=await fixture(overrides);await reject(service.decide(input(t)),409);if(overrides.ticket_type){await reject(service.decide(input(t,{eligibility:'ineligible'})),409);const accepted=await service.decide(input(t,{eligibility:'eligible'}));assert.equal(accepted.record.eligibility_result,'eligible')}}});
test('flag/reject require reasons, persist checks, do not increment and cannot clear rejection',async()=>{const t=await fixture({ticket_type:'Student Concession'});await reject(service.decide(input(t,{action:'Flag'})),400);await reject(service.decide(input(t,{action:'Flag',reason:'Other'})),400);const r=await service.decide(input(t,{action:'Reject',reason:'Abnormal Concession Usage',eligibility:'ineligible'}));assert.equal(r.record.after_state.ticket_scan_count,1);assert.equal(r.record.verification_result.fraud_status,'Flagged');await service.decide(input(t,{expected_version:1,action:'Flag',reason:'Other',remarks:'Further review'}));assert.equal((await service.lookup(t.transaction_id)).state.decision_status,'Rejected')});
test('latest-only void restores prior state, preserves audit and increments version',async()=>{const t=await fixture();const first=await service.decide(input(t));const second=await service.decide(input(t,{expected_version:1,action:'Reject',reason:'Ticket Reuse'}));await reject(service.voidDecision(first.record.verification_id,{actor_user_id:actorId,reason:'Correction'}),409);await service.voidDecision(second.record.verification_id,{actor_user_id:actorId,reason:'Incorrect rejection'});assert.equal((await service.lookup(t.transaction_id)).state.ticket_scan_count,2);await service.voidDecision(first.record.verification_id,{actor_user_id:actorId,reason:'Incorrect acceptance'});const final=await service.lookup(t.transaction_id);assert.equal(final.state.ticket_scan_count,1);assert.equal(final.state.state_version,4);assert.equal(final.state.inspection_status,'Not Inspected');assert.equal((await service.history({transaction_id:t.transaction_id})).records.filter(r=>r.voided_at).length,2);assert.equal((await service.voidDecision(first.record.verification_id,{actor_user_id:actorId,reason:'Retry'})).duplicate,true)});
test('import reruns preserve counters and decisions; invalid actors and reused request IDs fail',async()=>{const t=await fixture();const body=input(t);await service.decide(body);await importTickets(pool,[[t.transaction_id,t.route,t.date,JSON.stringify(t),'0'.repeat(64),null,1,'Not Inspected']]);assert.equal((await service.lookup(t.transaction_id)).state.ticket_scan_count,2);await reject(service.decide({...body,remarks:'Different payload'}),409);await reject(service.decide(input(t,{actor_user_id:2147483647})),403)});
test('saved historical replay matches exact route/date and lookup never reruns ML',async()=>{const t=await fixture();const body={request_id:randomUUID(),actor_user_id:actorId,mode:'historical_replay',train_route:t.route,date:t.date,n_passengers:2};requestIds.push(body.request_id);const r=await service.predict(body);assert.equal(r.journey_prediction.risk_tier,'High');assert.equal(r.journey_prediction.mean_risk_score,.8);const offline=createService(pool,{get:()=>{throw Error()},post:()=>{throw Error()}});assert.equal((await offline.lookup(t.transaction_id)).journey_prediction.prediction_id,r.journey_prediction.prediction_id);assert.equal((await offline.predict(body)).journey_prediction.prediction_id,r.journey_prediction.prediction_id);const other=await fixture({date:'1999-01-01'});assert.equal((await offline.lookup(other.transaction_id)).journey_prediction,null);await reject(service.predict({...body,request_id:randomUUID(),date:'1900-01-01'}),400);await reject(service.predict({...body,request_id:randomUUID(),mode:'future'}),400)});
test('history pagination, literal search, UTC times and service reconstruction',async()=>{const t=await fixture();const r=await service.decide(input(t));assert.match(r.record.verified_at,/Z$/);const restarted=createService(pool,model);const page=await restarted.history({transaction_id:t.transaction_id,page:1,page_size:1});assert.equal(page.records.length,1);assert.equal(page.records[0].actor_user_id,actorId);assert.equal((await restarted.history({search:'%'})).total,0);await reject(restarted.history({page_size:101}),400)});

test('malformed bodies and query values return validation errors',async()=>{
  for(const body of [null,[],undefined]){
    await reject(service.decide(body),400);
    await reject(service.predict(body),400);
    await reject(service.voidDecision('missing',body),400);
  }
  await reject(service.history({search:['bad']}),400);
  await reject(service.lookup('X'.repeat(65)),400);
});

test('HTTP endpoints preserve validation, history, and unavailable-service responses',async()=>{
  const express=require('express');
  const {createRouter}=require('../verification/router');
  const app=express();app.use(express.json());app.use(createRouter(service));
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    assert.equal((await fetch(base+'/passenger-verification/transaction')).status,400);
    assert.equal((await fetch(base+'/passenger-verification/transaction?transaction_id=UNKNOWN-TEST')).status,404);
    const t=await fixture();
    const lookup=await (await fetch(base+'/passenger-verification/transaction?transaction_id='+t.transaction_id)).json();
    assert.equal(lookup.state.state_version,0);
    assert.equal((await fetch(base+'/passenger-verification/decisions',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,400);
    assert.equal((await (await fetch(base+'/passenger-verification/history?transaction_id='+t.transaction_id)).json()).total,0);
  }finally{await new Promise(resolve=>server.close(resolve))}
  const offline=createService(pool,{get:async()=>{throw Error('offline')},post:async()=>{throw Error('offline')}});
  await reject(offline.options(),503);
});
