const express = require('express');
const { createPool } = require('./db');
const { createService } = require('./service');
function createRouter(service = createService(createPool())) {
  const router = express.Router();
  const run = work => async (req,res) => {
    try { res.json(await work(req)); }
    catch (error) {
      const conflict = error.code === 'ER_DUP_ENTRY';
      res.status(error.status || (conflict ? 409 : 503)).json({ success:false,
        error: error.status ? error.message : conflict ? 'Request ID already used. Verify the current state before retrying.' : 'Verification database unavailable. Check the service and run the verification setup commands.' });
    }
  };
  router.get('/passenger-verification/transaction', run(req => service.lookup(req.query.transaction_id)));
  router.get('/passenger-verification/history', run(req => service.history(req.query)));
  router.post('/passenger-verification/decisions', run(req => service.decide(req.body)));
  router.post('/passenger-verification/verifications/:id/void', run(req => service.voidDecision(req.params.id, req.body)));
  router.get('/journey-predictions/options', run(() => service.options()));
  router.post('/journey-predictions', run(req => service.predict(req.body)));
  return router;
}
module.exports = { createRouter };
