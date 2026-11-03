import dotenv from 'dotenv';
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const APP_URL = process.env.APP_URL;

async function manageWebhook() {
  if (!BOT_TOKEN) {
    console.error('❌ Error: TELEGRAM_BOT_TOKEN is not set in environment or .env');
    process.exit(1);
  }

  const baseUrl = `https://api.telegram.org/bot${BOT_TOKEN}`;

  console.log('🤖 Telegram Webhook Management Script');
  console.log('====================================');

  // 1. Get Current Webhook Info
  console.log('\n🔍 Memeriksa status webhook saat ini...');
  const infoRes = await fetch(`${baseUrl}/getWebhookInfo`);
  const infoData = await infoRes.json();
  console.log('Status saat ini:', JSON.stringify(infoData.result, null, 2));

  // 2. Set or Update Webhook if APP_URL is provided
  if (!APP_URL) {
    console.log('\nℹ️ APP_URL belum diatur. Untuk mengatur webhook, tentukan APP_URL di .env');
    console.log('Contoh: APP_URL=https://my-finance-bot.vercel.app');
    return;
  }

  const webhookUrl = `${APP_URL.replace(/\/$/, '')}/api/webhook`;
  console.log(`\n🚀 Mengatur webhook ke: ${webhookUrl}`);

  const setRes = await fetch(`${baseUrl}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: WEBHOOK_SECRET,
      drop_pending_updates: false,
      allowed_updates: ['message', 'callback_query'],
    }),
  });

  const setData = await setRes.json();
  if (setData.ok) {
    console.log('✅ Webhook berhasil diatur!');
    console.log('Keterangan:', setData.description);
  } else {
    console.error('❌ Gagal mengatur webhook:', setData);
  }

  // 3. Re-verify
  console.log('\n🔍 Verifikasi akhir webhook info...');
  const verifyRes = await fetch(`${baseUrl}/getWebhookInfo`);
  const verifyData = await verifyRes.json();
  console.log('Status Terakhir:', JSON.stringify(verifyData.result, null, 2));
}

manageWebhook().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
