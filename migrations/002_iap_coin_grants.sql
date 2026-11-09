-- Consumable coin paketleri (RevenueCat). transaction_id ile idempotent; aynı paket tekrar alınabilir.
CREATE TABLE IF NOT EXISTS iap_coin_grants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  product_id VARCHAR(191) NOT NULL,
  transaction_id VARCHAR(191) NOT NULL,
  coins INT UNSIGNED NOT NULL,
  source ENUM('webhook','sync') NOT NULL,
  status ENUM('granted','revoked') NOT NULL DEFAULT 'granted',
  environment VARCHAR(16) NULL,
  raw LONGTEXT NULL,
  revoked_at DATETIME(3) NULL,
  revoke_raw LONGTEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_iap_coin_grants_tx (transaction_id),
  KEY idx_iap_coin_grants_user (user_id, created_at),
  CONSTRAINT fk_iap_coin_grants_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
