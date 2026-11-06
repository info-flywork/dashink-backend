/**
 * PM2 süreç tanımı. Sunucuda (uygulama klasöründe):
 *   pm2 startOrReload ecosystem.config.js --update-env && pm2 save
 *
 * Ortam değişkenlerini uygulama kendisi `.env`'den okur (src/config/env.js, yol __dirname'e göre).
 * `migrate` burada YOK: sürekli süreç değil, deploy adımıdır.
 */
module.exports = {
  apps: [
    {
      name: 'dashink-api',
      script: 'src/index.js',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '300M',
      kill_timeout: 12_000,
      merge_logs: true,
      time: true,
      env: { NODE_ENV: 'production' },
    },
  ],
};
