const mysql = require('mysql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

function createPool(database = process.env.DB_name) {
  return mysql.createPool({
    host: process.env.DB_host, user: process.env.DB_user, password: process.env.DB_password,
    database, connectionLimit: 6, timezone: 'Z', dateStrings: true, charset: 'utf8mb4',
    connectTimeout: 10000,
  });
}
function query(db, sql, args = []) {
  return new Promise((resolve, reject) => db.query(sql, args, (err, rows) => err ? reject(err) : resolve(rows)));
}
async function transaction(pool, work) {
  const connection = await new Promise((resolve, reject) => pool.getConnection((e, c) => e ? reject(e) : resolve(c)));
  try {
    await query(connection, 'SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await query(connection, 'START TRANSACTION');
    const result = await work(connection);
    await query(connection, 'COMMIT');
    return result;
  } catch (error) {
    await query(connection, 'ROLLBACK').catch(() => {});
    throw error;
  } finally { connection.release(); }
}
const close = pool => new Promise((resolve, reject) => pool.end(e => e ? reject(e) : resolve()));
module.exports = { createPool, query, transaction, close };
