const { pool } = require('../db');

/** Paylaşım olayı. (user_id, client_event_id) UNIQUE → tekrar gelirse yok sayılır, yine { ok: true }. */
async function recordShare(userId, clientEventId) {
  await pool.query('INSERT IGNORE INTO share_events (user_id, client_event_id) VALUES (?, ?)', [userId, clientEventId]);
  return { ok: true };
}

module.exports = { recordShare };
