# Dashink API

Flutter oyunu **Dashink** (top yuvarlanır, oyuncu önüne mürekkep çizgisi çizer) için Node.js REST API.
Express 5 + mysql2 (promise pool) + CommonJS, MariaDB/MySQL. ORM yok, build adımı yok.
Sözleşme: `dashink/docs/API_CONTRACT.md` (snake_case alanlar, `{status, message, data}` zarfı, kökten sunulur — `/api` öneki yok).

Reklam yoktur. Tek gerçek para ürünü RevenueCat ile satılan `dashink_premium` (non-consumable); premium'u ve coin'i yalnızca sunucu verir.

## Kurulum

```bash
cp .env.example .env          # DB bilgileri, JWT_SECRET, DAILY_SEED_SECRET, RevenueCat anahtarları
npm install
npm run migrate               # migrations/*.sql → schema_migrations tablosuna işlenir
npm start                     # geliştirme: npm run dev
```

- Yerel geliştirmede veritabanı yoksa: `npm run migrate -- --create-db`
- Migration durumu: `npm run migrate:status`
- `JWT_SECRET` üretmek: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
- `DAILY_SEED_SECRET` (en az 16 karakter) aynı şekilde üretilir. Canlıya çıktıktan sonra değiştirmeyin: o günün seed'i değişir.
- Varsayılan port **4130**.

## Testler

```bash
npm test        # node:test — UTC pencereleri, günlük seed, skor doğrulama, görev ilerlemesi, katalog/sahiplik, sıralama, RevenueCat kararları
npm run check   # tüm dosyalarda node --check
```

## Yapı

```
src/
  index.js            # giriş noktası (gizli anahtar kontrolü, DB ping, listen, graceful shutdown)
  app.js              # express app: cors, json limit, güvenlik başlıkları, morgan→winston, 404, hata zarfı
  db.js               # mysql2/promise havuzu (DB_POOL_LIMIT, varsayılan 5) + withTransaction; oturum time_zone = UTC
  logger.js           # winston (console + logs/combined.log + logs/error.log)
  config/env.js       # .env okuma (yol __dirname'e göre)
  config/catalog.js   # mağaza kataloğu + premium ürünü
  config/tasks.js     # görev tanımları (metrik, hedef, ödül, ikon)
  lib/                # SAF (DB'siz, birim testli) kurallar:
    time.js           #   UTC gün/hafta başı, period_key, resets_at, son 7 gün
    daily.js          #   günlük seed HMAC, sıra ödülü
    score.js          #   skor doğrulama (422), rekor / rekor ödülü
    tasks.js          #   metrik satırı → görev durumu, bu oyunla tamamlananlar
    items.js          #   sahiplik (türetilmiş), kuşanma düzeltme, satın alma kontrolü
    leaderboard.js    #   sıralama / eşitlik kuralı, limit
    player.js         #   yeni kullanıcı varsayılanları, "Oyuncu NNNN", PlayerProgress şekli
    revenueCat.js     #   webhook kararı (grant/revoke/transfer/ignore), REST cevabından premium
    apiError.js response.js validate.js
  middleware/         # auth (Bearer JWT), errorHandler
  routes/ controllers/ services/
migrations/001_init.sql
scripts/migrate.js
test/*.test.js
```

## Uçlar

| Metot | Yol | Kimlik | Dosyalar |
|---|---|---|---|
| GET | `/health` | – | `controllers/healthController.js` |
| POST | `/auth/device` | – | `routes/authRoutes.js` → `controllers/authController.js` → `services/authService.js` |
| POST | `/auth/refresh` | – | aynı (rotasyon; eski token iptal) |
| GET | `/player/progress` | Bearer | `routes/playerRoutes.js` → `controllers/playerController.js` → `services/userService.js` |
| POST | `/player/tutorial-complete` | Bearer | → `services/playerService.js` |
| POST | `/player/name` | Bearer | → `services/playerService.js` (`{ name }` → `PlayerProgress`) |
| POST | `/games` | Bearer | `routes/gameRoutes.js` → `controllers/gameController.js` → `services/gameService.js` (`client_event_id` ile idempotent) |
| POST | `/events/share` | Bearer | `routes/eventRoutes.js` → `controllers/eventController.js` → `services/eventService.js` (idempotent) |
| GET | `/shop/catalog` | isteğe bağlı | `routes/shopRoutes.js` → `controllers/shopController.js` → `config/catalog.js` |
| POST | `/shop/buy` | Bearer | → `services/shopService.js` (satın alır ve kuşanır) |
| POST | `/shop/equip` | Bearer | → `services/shopService.js` |
| POST | `/purchases/sync` | Bearer | `routes/purchaseRoutes.js` → `controllers/purchaseController.js` → `services/purchaseService.js` + `services/revenueCatClient.js` |
| POST | `/webhooks/revenuecat` | `REVENUECAT_WEBHOOK_AUTH` | `routes/webhookRoutes.js` → `controllers/revenueCatController.js` → `services/purchaseService.js` |
| GET | `/tasks?period=daily\|weekly\|achievement` | Bearer | `routes/taskRoutes.js` → `controllers/taskController.js` → `services/taskService.js` + `services/metricsService.js` |
| POST | `/tasks/:id/claim` | Bearer | aynı |
| GET | `/leaderboard?period=daily\|weekly\|all&limit=50` | Bearer | `routes/leaderboardRoutes.js` → `controllers/leaderboardController.js` → `services/leaderboardService.js` |
| GET | `/daily` | Bearer | `routes/dailyRoutes.js` → `controllers/dailyController.js` → `services/dailyService.js` |

`PlayerProgress` dönen uçlar: `/player/progress`, `/player/tutorial-complete`, `/player/name`, `/shop/buy`, `/shop/equip`, `/purchases/sync`.

Hata kodları (`message`): `invalid_request` 400, `unauthorized` 401, `not_found` 404,
`insufficient_coins` / `already_owned` / `item_locked` / `not_owned` / `task_not_complete` / `already_claimed` 409,
`invalid_score` 422, `server_error` 500.

## Tutarlılık kuralları

- Coin değişiklikleri transaction içinde, kullanıcı satırı `SELECT ... FOR UPDATE` ile kilitlenerek yapılır; bakiye negatife düşemez.
- Her coin değişikliği `coin_ledger`'a yazılır: `game_coins`, `record_reward`, `task_reward`, `shop_buy`, `premium_bonus`, `daily_rank`.
- `client_events (user_id, client_event_id)` UNIQUE: aynı oyun sonucu tekrar gelirse ilk cevap aynen döner (eşzamanlı tekrarlar da kilit sayesinde tek kez işlenir).
- Paylaşım: `share_events (user_id, client_event_id)` UNIQUE (`INSERT IGNORE`), tekrar → yine `{ ok: true }`.
- Görev ödülü: `task_claims (user_id, task_id, period_key)` UNIQUE; `period_key` günlükte `YYYY-MM-DD`, haftalıkta pazartesinin tarihi, başarımda `all`.
- Günlük sıra ödülü: `daily_rewards (user_id, date)` UNIQUE.
- Premium bonusu: `purchase_grants (user_id, product_id)` UNIQUE → 1000 coin bir kez.
- Tüm zamanlar UTC: havuz her bağlantıda `SET time_zone = '+00:00'` yapar; gün 00:00 UTC, hafta pazartesi 00:00 UTC.

## Kurallar ve sözleşme yorumları

Sözleşmede açık olmayan noktalarda seçilen en basit davranış:

- **Sahiplik türetilir**: `owned_items` = varsayılanlar + `user_items` (coin / görev) + (premium ise premium öğeler). Premium geri alınınca premium öğeler kendiliğinden düşer; kuşanılı olan varsayılana döner (DB'de de düzeltilir, okumada ayrıca `resolveEquipped` uygulanır).
- **`/shop/buy` hata sırası**: önce `item_locked` (default/task/premium öğe coin ile alınamaz — varsayılan öğe zaten sahip olunsa da `item_locked`), sonra `already_owned`, sonra `insufficient_coins`. Bilinmeyen `item_id` → 404 `not_found` (buy ve equip).
- **`/games` doğrulama**: alan tipi/eksik alan → 400; `duration_ms` 1..3 600 000 dışı, skor/süre ve altın/skor sınırı aşımı → 422 `invalid_score`. `mode=normal` iken gelen `daily_date` yok sayılır (NULL saklanır). `seed` 0..2^32-1 tamsayı.
- **Rekor**: `best_score`'u ilk kez yükselten oyun (önceki 0) rekor sayılmaz ama `best_score` güncellenir. Altın ve rekor ödülü defterde ayrı satırlar (`game_coins`, `record_reward`).
- **`completed_tasks`**: bu oyundan önce hedefin altında, sonra hedefte olan ve geçerli pencerede claim edilmemiş görevler (gün/hafta/başarım hepsi).
- **Görev pencereleri**: tüm metrikler `games.created_at` / `share_events.created_at` ile hesaplanır (`daily_days` için farklı `daily_date` sayılır). `?period` verilmezse `daily`; geçersiz → 400. Bilinmeyen görev id'si → 404.
- **Sıralama**: pencere içindeki her kullanıcının en iyi skoru (tüm modlar); `daily`/`weekly` `games.created_at` UTC penceresi, `all` = `users.best_score` (+ `best_score_at`). Eşitlikte o skora önce ulaşan üstte, o da eşitse `user_id`; sıralar benzersiz (paylaşılan sıra yok). `?period` verilmezse `daily`; `limit` 1..100 dışı → 400.
- **Günlük meydan okuma sırası** (`/daily`, `/games` cevabındaki `daily`, ödül): yalnızca `mode=daily` ve `daily_date = gün` oyunları, aynı eşitlik kuralı.
- **Günlük seed**: `HMAC-SHA256(DAILY_SEED_SECRET, "YYYY-MM-DD")` özetinin ilk 4 baytı big-endian okunup 1 bit sağa kaydırılır (ilk 31 bit, 0..2^31-1).
- **Lazy günlük ödül**: PlayerProgress dönen her çağrıda, kullanıcı kilitliyken son 7 günün (bugün hariç) günlük parkurunda oynadığı ve `daily_rewards`'ta kaydı olmayan her gün için sırası hesaplanır. İlk 100 içindeyse 100 altın yüklenir ve `rewards`'a eklenir; değilse `coins = 0` kayıt bırakılır (o gün bir daha hesaplanmaz). 7 günden eski günler hiç ödüllendirilmez.
- **`/purchases/sync`**: REST cevabında `entitlements.premium` aktifse (`expires_date` boş veya gelecekte) ya da `non_subscriptions.dashink_premium` doluysa premium verilir. Aktif değilse **geri alınmaz** (geri alma yalnızca iade webhook'u ile). Cevap sözleşmedeki gibi `PlayerProgress`.
- **Webhook**: `INITIAL_PURCHASE` / `NON_RENEWING_PURCHASE` (ürün `dashink_premium` veya entitlement `premium`) → ver; `CANCELLATION` / `REFUND` → geri al (bonus geri alınmaz, `purchase_grants.status = revoked`). Yeniden satın almada premium tekrar verilir, bonus verilmez.
  `TRANSFER` olayında ürün bilgisi olmadığı için hedef kullanıcının (`transferred_to`) entitlement'ı REST ile doğrulanıp verilir (doğrulanmadan premium verilmez). Bilinmeyen kullanıcı → 200.
- **Ad**: yeni kullanıcıya `Oyuncu 1000..9999`; ad benzersiz değildir. `/player/name` ile 2..32 karakter (unicode harf/rakam, boşluk, `_ - . '`); trim + iç boşluklar tek boşluğa iner.

## RevenueCat

- Panel → Integrations → Webhooks: URL `https://<alan>/webhooks/revenuecat`, Authorization değeri = `REVENUECAT_WEBHOOK_AUTH` (`Bearer <değer>` de kabul edilir).
- `/purchases/sync`: `GET {REVENUECAT_API_BASE}/subscribers/{user.id}` (`REVENUECAT_SECRET_KEY`, sk_...).
- Uygulama `Purchases.logIn(user.id)` yapmalı; webhook'ta kullanıcı `app_user_id`, `original_app_user_id`, `aliases`, `transferred_to` içinden bulunur.

## Deploy (PM2 + nginx)

```bash
npm ci --omit=dev
cp .env.example .env && nano .env          # PORT için önce: sudo ss -tlnp
npm run migrate
pm2 startOrReload ecosystem.config.js --update-env && pm2 save
curl https://<alan>/health
```

nginx: `proxy_pass http://127.0.0.1:4130;` + `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` başlıkları;
`sudo nginx -t && sudo systemctl reload nginx`; SSL için `certbot --nginx`.
Havuz limiti küçük (5): aynı MySQL'i kullanan diğer API'lerin bağlantı bütçesini etkilemez.

Geri alma: `pm2 stop dashink-api` (diğer süreçlere dokunmaz). Şema tamamen yeni tablolardan oluşur (ayrı `dashink` veritabanı).

## Loglar

- Konsol (renkli), `logs/combined.log`, `logs/error.log` (winston, boyut sınırlı dönüşüm)
- HTTP satırları morgan ile combined log'a (`lang=` Accept-Language dahil)
