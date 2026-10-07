const { createPool, close } = require('../verification/db');
const { migrate, importTickets } = require('../verification/setup');
(async () => {
  const pool = createPool();
  try {
    if (process.argv[2] === 'migrate') { await migrate(pool); console.log('Verification migration 001 applied.'); }
    else if (process.argv[2] === 'import') console.log(await importTickets(pool));
    else throw new Error('Use migrate or import');
  } finally { await close(pool); }
})().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
