-- Dashink başlangıç şeması. MariaDB 10.6+ ve MySQL 8+ uyumlu.
-- JSON veriler LONGTEXT olarak tutulur (MariaDB'de JSON zaten LONGTEXT takma adıdır).
-- Tüm DATETIME değerleri UTC'dir (bağlantı time_zone = '+00:00').

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  platform VARCHAR(16) NULL,
  app_version VARCHAR(32) NULL,
  name VARCHAR(32) NOT NULL,
  coins INT UNSIGNED NOT NULL DEFAULT 0,
  best_score INT UNSIGNED NOT NULL DEFAULT 0,
  best_score_at DATETIME(3) NULL,               -- best_score'a ilk ulaşma anı (tüm zamanlar sıralamasında eşitlik)
  games_played INT UNSIGNED NOT NULL DEFAULT 0,
  tutorial_seen TINYINT(1) NOT NULL DEFAULT 0,
  premium TINYINT(1) NOT NULL DEFAULT 0,
  equipped_ball VARCHAR(32) NOT NULL DEFAULT 'ball_klasik',
  equipped_ink VARCHAR(32) NOT NULL DEFAULT 'ink_lacivert',
  equipped_theme VARCHAR(32) NOT NULL DEFAULT 'theme_kagit',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_device_id (device_id),
  KEY idx_users_best (best_score, best_score_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  replaced_by_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_hash (token_hash),
  KEY idx_refresh_tokens_user (user_id),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Coin ile alınan veya görevle açılan öğeler. Varsayılan ve premium öğeler burada TUTULMAZ (türetilir).
CREATE TABLE IF NOT EXISTS user_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  item_id VARCHAR(32) NOT NULL,
  source ENUM('coins','task') NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_items_user_item (user_id, item_id),
  CONSTRAINT fk_user_items_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Oyun sonuçları. Sıralama pencereleri (gün/hafta) created_at'e, günlük parkur sıralaması daily_date'e göre.
CREATE TABLE IF NOT EXISTS games (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  client_event_id VARCHAR(64) NOT NULL,
  mode ENUM('normal','daily') NOT NULL,
  seed BIGINT UNSIGNED NOT NULL,
  daily_date DATE NULL,
  score INT UNSIGNED NOT NULL,
  coins_collected INT UNSIGNED NOT NULL,
  duration_ms INT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_games_user_event (user_id, client_event_id),
  KEY idx_games_window (created_at, user_id, score),
  KEY idx_games_user_time (user_id, created_at),
  KEY idx_games_daily (mode, daily_date, user_id, score),
  CONSTRAINT fk_games_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Klip/skor paylaşımları (görevler için). (user_id, client_event_id) UNIQUE → idempotent.
CREATE TABLE IF NOT EXISTS share_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  client_event_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_share_events_user_event (user_id, client_event_id),
  KEY idx_share_events_user_time (user_id, created_at),
  CONSTRAINT fk_share_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- İstemci olayları için idempotentlik: aynı (user_id, client_event_id) ikinci kez gelirse saklanan cevap döner.
CREATE TABLE IF NOT EXISTS client_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  client_event_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  response LONGTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_client_events_user_event (user_id, client_event_id),
  CONSTRAINT fk_client_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Her coin değişikliği (delta negatif olabilir).
CREATE TABLE IF NOT EXISTS coin_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  delta INT NOT NULL,
  balance_after INT UNSIGNED NOT NULL,
  reason VARCHAR(32) NOT NULL,
  ref VARCHAR(191) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_coin_ledger_user (user_id, created_at),
  CONSTRAINT fk_coin_ledger_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Görev ödülü alımları. period_key: günlükte YYYY-MM-DD, haftalıkta pazartesinin YYYY-MM-DD'si, başarımda 'all'.
CREATE TABLE IF NOT EXISTS task_claims (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  task_id VARCHAR(32) NOT NULL,
  period_key VARCHAR(10) NOT NULL,
  reward INT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_task_claims_user_task_period (user_id, task_id, period_key),
  CONSTRAINT fk_task_claims_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Günlük meydan okuma sıra ödülü. Geçmiş her gün kullanıcı başına BİR KEZ değerlendirilir:
-- ilk reward_top içindeyse coins > 0 (yüklenir), değilse coins = 0 (yalnızca "bakıldı" işareti).
CREATE TABLE IF NOT EXISTS daily_rewards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  date DATE NOT NULL,
  `rank` INT UNSIGNED NOT NULL,
  coins INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_daily_rewards_user_date (user_id, date),
  CONSTRAINT fk_daily_rewards_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Premium (RevenueCat non-consumable) verilişleri. (user_id, product_id) UNIQUE → bonus coin bir kez.
-- İadede status = 'revoked' olur (bonus geri alınmaz); tekrar satın alınırsa 'granted'a döner, bonus tekrar verilmez.
CREATE TABLE IF NOT EXISTS purchase_grants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  product_id VARCHAR(191) NOT NULL,
  transaction_id VARCHAR(191) NULL,
  bonus_coins INT UNSIGNED NOT NULL DEFAULT 0,
  source ENUM('webhook','sync') NOT NULL,
  status ENUM('granted','revoked') NOT NULL DEFAULT 'granted',
  environment VARCHAR(16) NULL,
  raw LONGTEXT NULL,
  revoked_at DATETIME(3) NULL,
  revoke_raw LONGTEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchase_grants_user_product (user_id, product_id),
  CONSTRAINT fk_purchase_grants_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
