const mysql = require('mysql2/promise');
const env = require('./config/env');

// Havuz tek yerde bir kez oluşturulur. Aynı VPS'te çok sayıda API olduğu için limit küçük (DB_POOL_LIMIT, varsayılan 5).
const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
  timezone: 'Z',
  charset: 'utf8mb4',
  // DATE sütunları (daily_date, date) 'YYYY-MM-DD' metni olarak gelir; DATETIME'lar Date (UTC).
  dateStrings: ['DATE'],
});

// Oturum saat dilimi UTC: NOW(3) / CURRENT_TIMESTAMP(3) varsayılanları, JS'ten gelen UTC pencere
// sınırlarıyla (gün/hafta) aynı eksende olsun. Sunucunun sistem saat dilimine bağlı kalmaz.
pool.pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

async function ping() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}

/**
 * fn(conn) bir transaction içinde çalışır; hata olursa rollback.
 */
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {
      // yut
    }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, ping, withTransaction };
