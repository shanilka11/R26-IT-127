const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { query, transaction } = require('./db');
async function migrate(pool) {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/migrations/001_persistent_verification.sql'), 'utf8');
  for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await query(pool, statement);
}
function validatedRows() {
  const venv = path.join(__dirname, '../../.venv/bin/python');
  const python = process.env.PYTHON || (fs.existsSync(venv) ? venv : 'python3');
  return JSON.parse(execFileSync(python, ['-B', path.join(__dirname, '../scripts/verification-data.py')], { maxBuffer: 32 * 1024 * 1024, encoding: 'utf8' }));
}
async function importTickets(pool, rows = validatedRows()) {
  return transaction(pool, async connection => {
    const before = (await query(connection, 'SELECT COUNT(*) AS total FROM tickets'))[0].total;
    for (let i = 0; i < rows.length; i += 250) {
      await query(connection, `INSERT INTO tickets
        (transaction_id, route, recorded_date, source_data, source_hash, historical_assessment, ticket_scan_count, inspection_status)
        VALUES ? ON DUPLICATE KEY UPDATE transaction_id = VALUES(transaction_id)`, [rows.slice(i, i + 250)]);
    }
    const after = (await query(connection, 'SELECT COUNT(*) AS total FROM tickets'))[0].total;
    return { validated: rows.length, inserted: after - before, skipped: rows.length - (after - before) };
  });
}
module.exports = { migrate, importTickets, validatedRows };
