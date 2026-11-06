/**
 * Numaralı SQL migration'larını (migrations/NNN_ad.sql) sırayla uygular.
 * Uygulananlar `schema_migrations` tablosunda tutulur.
 *
 *   npm run migrate              bekleyenleri uygular
 *   npm run migrate -- --status  uygulanmış/bekleyen listesi (değişiklik yapmaz)
 *   npm run migrate -- --create-db  DB_NAME yoksa oluşturur (yerel geliştirme)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'migrations');
const args = new Set(process.argv.slice(2));
const statusOnly = args.has('--status') || args.has('--dry-run');
const createDb = args.has('--create-db');

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{3,}_[\w-]+\.sql$/.test(f))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b));
}

async function main() {
  const base = { host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password, charset: 'utf8mb4' };

  if (createDb) {
    if (!/^[A-Za-z0-9_]+$/.test(env.db.database)) throw new Error(`Geçersiz DB_NAME: ${env.db.database}`);
    const admin = await mysql.createConnection(base);
    await admin.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await admin.end();
    console.log(`✔ veritabanı hazır: ${env.db.database}`);
  }

  const conn = await mysql.createConnection({ ...base, database: env.db.database, multipleStatements: true });
  try {
    await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(191) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    const [rows] = await conn.query('SELECT filename, checksum FROM schema_migrations');
    const applied = new Map(rows.map((r) => [r.filename, r.checksum]));
    const files = listMigrationFiles();
    const pending = [];

    for (const file of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      if (applied.has(file)) {
        if (applied.get(file) !== checksum) {
          console.warn(`⚠ ${file} uygulandıktan sonra değiştirilmiş (checksum farklı). Yeni bir migration ekleyin.`);
        }
        continue;
      }
      pending.push({ file, sql, checksum });
    }

    console.log(`Uygulanmış: ${applied.size} · Bekleyen: ${pending.length}`);
    if (statusOnly) {
      for (const m of pending) console.log(`  • ${m.file} (uygulanmadı)`);
      return;
    }

    // Not: MySQL/MariaDB'de DDL örtük commit yapar; dosya yarıda kalırsa düzeltip tekrar çalıştırın
    // (migration'lar IF NOT EXISTS ile yazılmalı).
    for (const m of pending) {
      await conn.query(m.sql);
      await conn.query('INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)', [m.file, m.checksum]);
      console.log(`  ✔ ${m.file}`);
    }
    console.log(`Bu çalıştırmada uygulanan: ${pending.length}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(`✖ migrate başarısız: ${err.message}`);
  process.exit(1);
});
