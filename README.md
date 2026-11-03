# 🤖 AI Personal Finance Telegram Bot — Vercel Serverless Edition

Aplikasi bot asisten keuangan pribadi cerdas berbasis Telegram Bot API, Artificial Intelligence (Google Gemini / Groq), Cloud PostgreSQL (Neon / Supabase), dan Prisma ORM, yang dibangun dan dioptimalkan secara native untuk **arsitektur Vercel Serverless Functions**.

Aplikasi ini berjalan **24/7 di cloud tanpa memerlukan laptop/server fisik menyala**, tidak menggunakan server polling konvensional, hemat biaya (mendukung free-tier cloud), dan dilengkapi sistem keamanan ketat (Telegram ID Whitelist & Webhook Secret Token).

---

## 📑 Daftar Isi

- [Arsitektur Sistem](#-arsitektur-sistem)
- [Fitur Utama](#-fitur-utama)
- [Struktur Proyek](#-struktur-proyek)
- [Analisis & Perbandingan Cloud Service](#-analisis--perbandingan-cloud-service)
- [Panduan Persiapan Layanan](#-panduan-persiapan-layanan)
  - [1. Membuat Bot di BotFather Telegram](#1-membuat-bot-di-botfather-telegram)
  - [2. Mendapatkan ID Telegram Pribadi](#2-mendapatkan-id-telegram-pribadi)
  - [3. Mendapatkan API Key AI (Gemini / Groq)](#3-mendapatkan-api-key-ai-gemini--groq)
  - [4. Membuat Database PostgreSQL di Neon / Supabase](#4-membuat-database-postgresql-di-neon--supabase)
- [Panduan Migrasi Database](#-panduan-migrasi-database)
- [Panduan Deployment ke Vercel](#-panduan-deployment-ke-vercel)
- [Panduan Pengaturan Webhook Telegram](#-panduan-pengaturan-webhook-telegram)
- [Pengujian & Verifikasi (Testing)](#-pengujian--verifikasi-testing)
- [Panduan Backup & Restore Database](#-panduan-backup--restore-database)
- [Daftar Perintah & Contoh Interaksi](#-daftar-perintah--contoh-interaksi)

---

## 🏛 Arsitektur Sistem

Bot ini **100% stateless dan serverless**, mematuhi siklus hidup Vercel Functions:

```
Telegram User
    │
    ▼
Telegram Bot API Server
    │  (HTTPS POST Webhook dengan Header X-Telegram-Bot-Api-Secret-Token)
    ▼
Vercel Edge Gateway
    │
    ▼
api/webhook.js (Vercel Serverless Function)
    ├── 1. Webhook Secret Token Verification
    ├── 2. ProcessedTelegramUpdate (Deduplication Check)
    ├── 3. Telegram ID Whitelist Access Control
    │
    ├── 4. Multimodal / NLP Processing:
    │      ├── AI Vision (Gemini) -> OCR Struk Pembayaran
    │      └── AI Language (Gemini/Groq) -> Intent & Amount Parser
    │          └── (Deterministic Regex Fallback jika API AI down)
    │
    ├── 5. Business Logic & Validation (Zod & Decimal Precision)
    │
    ├── 6. Prisma ORM (Singleton with PgBouncer Connection Pool)
    │
    ▼
Cloud PostgreSQL (Neon / Supabase)
    │
    ▼
Telegram Response (Inline Keyboard / Formatted Text / PDF / Excel Buffer)
```

---

## ✨ Fitur Utama

1. **Registrasi & Keamanan Whitelist:**
   - Hanya ID Telegram yang terdaftar di `TELEGRAM_ALLOWED_USER_IDS` yang dapat mengakses bot.
   - Pengecekan saldo awal saat pertama kali mengirimkan `/start`.
2. **Pencatatan Transaksi Natural (NLP):**
   - Mendeteksi pemasukan dan pengeluaran secara fleksibel:
     - *"Beli nasi padang 20rb"* -> Pengeluaran (MAKANAN) Rp20.000.
     - *"Beli bensin pertalite 35 ribu"* -> Pengeluaran (TRANSPORTASI) Rp35.000.
     - *"Gaji freelance 1,5 juta"* -> Pemasukan (LAIN_LAIN) Rp1.500.000.
   - Fallback otomatis ke rule-based parser jika kuota AI habis atau jaringan bermasalah.
3. **Scan Struk Pembayaran (AI OCR):**
   - Cukup kirimkan foto struk kasir/belanjaan.
   - Gemini Vision mengekstrak nama merchant/toko, tanggal, total nominal, dan rincian item.
   - Pengguna memverifikasi hasil pembacaan sebelum disimpan dengan tombol konfirmasi interaktif.
4. **Cek Saldo Real-time (`/saldo`):**
   - Menghitung saldo secara matematis dan persisten: `Saldo Awal + Total Pemasukan - Total Pengeluaran`.
   - Menggunakan tipe data `Decimal(15, 2)` untuk menghindari floating point issue.
5. **Laporan Keuangan Interaktif:**
   - `/hariini`, `/mingguini`, `/bulanini`, `/laporan`.
   - Persentase pengeluaran per kategori (Makanan, Transportasi, Pendidikan, Hiburan, Tagihan, Kesehatan, Belanja, Lain-lain).
   - Perbandingan periode sebelumnya (misal: pengeluaran hari ini vs kemarin, bulan ini vs bulan lalu).
   - Seluruh waktu disesuaikan dengan zona waktu `Asia/Makassar` (WITA, UTC+8).
6. **Riwayat & Pembatalan Transaksi (`/riwayat`):**
   - Riwayat transaksi dilengkapi paginasi inline button.
   - Tombol pembatalan/penghapusan transaksi per ID transaksi dengan konfirmasi.
7. **Target Tabungan (`/tabungan`):**
   - Buat target tabungan: *"Buat target tabungan Laptop 8 juta"*.
   - Setor tabungan: *"Nabung 100rb buat laptop"*.
   - Progres visual bar (`[🟩🟩🟩🟩⬜⬜⬜⬜⬜⬜] 40%`).
8. **Pengingat Keuangan Berbasis Serverless Cron (`/pengingat`):**
   - Pengingat harian (misal catat pengeluaran jam 20:00 WITA).
   - Pengingat bulanan (misal bayar wifi setiap tanggal 15).
   - Diproses melalui endpoint `/api/cron/reminders` yang dilindungi `CRON_SECRET`.
   - Mencegah pengiriman ganda dengan pengecekan `lastSentAt`.
9. **Ekspor Laporan PDF & Excel (`/export`):**
   - **PDF**: Laporan ringkas dan rapi siap cetak dibuat secara on-the-fly di memori (`pdfkit`).
   - **Excel (XLSX)**: Spreadsheet lengkap berisi seluruh riwayat dengan formula, header warna, dan kolom auto-fit (`exceljs`).
   - Tidak membebani storage serverless karena dikirim langsung dalam bentuk buffer Telegram.
10. **Ringkasan & Konsultasi AI:**
    - AI menganalisis data keuangan agregat yang diberikan backend (AI tidak diberi akses langsung ke DB mentah).

---

## 📂 Struktur Proyek

```
bot_telegram_finance/
├── api/
│   ├── webhook.js               # Entry point Telegram Webhook (Vercel Serverless Function)
│   ├── health.js                # Health check & database latency endpoint
│   └── cron/
│       └── reminders.js         # Endpoint cron pengingat dilindungi CRON_SECRET
│
├── prisma/
│   ├── schema.prisma            # Skema lengkap PostgreSQL & Prisma
│   └── migrations/
│       └── 20261103000000_init/ # File migrasi SQL inisial
│           └── migration.sql
│
├── src/
│   ├── config/
│   │   ├── env.js               # Validasi Environment Variables dengan Zod
│   │   └── database.js          # PrismaClient Singleton untuk Serverless
│   │
│   ├── bot/
│   │   ├── bot.js               # Inisialisasi Telegraf & pendaftaran route
│   │   ├── middleware/
│   │   │   ├── auth.js          # Whitelist Telegram ID & registrasi otomatis
│   │   │   └── dedup.js         # Pencegahan duplikasi webhook (deduplication)
│   │   ├── keyboards/
│   │   │   └── menuKeyboards.js # Inline keyboards interaktif (menu, riwayat, konfirmasi)
│   │   ├── commands/            # Handlers perintah bot (/start, /saldo, /laporan, dll)
│   │   └── handlers/
│   │       ├── textHandler.js   # Pemroses pesan teks & integrasi AI
│   │       ├── callbackHandler.js # Pemroses tombol inline
│   │       └── photoHandler.js  # Pemroses struk OCR
│   │
│   ├── services/
│   │   ├── ai/                  # Abstraksi AI, Gemini & Groq provider, fallback parser
│   │   ├── transaction/         # Logika transaksi & saldo
│   │   ├── report/              # Logika agregasi laporan & perbandingan
│   │   ├── savings/             # Logika target tabungan & kontribusi
│   │   ├── reminder/            # Logika pengingat & eksekusi cron
│   │   ├── export/              # Generator buffer PDF & Excel
│   │   └── ocr/                 # AI Vision OCR parser
│   │
│   └── utils/
│       ├── currency.js          # Format Rupiah & NLP number parser
│       ├── date.js              # Zona waktu Asia/Makassar (dayjs)
│       └── logger.js            # Logger aman (masking token rahasia)
│
├── tests/                       # 19 Unit & Integration Tests (Vitest)
├── scripts/
│   └── setWebhook.js            # Script utilitas setup webhook Telegram
│
├── vercel.json                  # Konfigurasi Vercel deployment & cron
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## ☁️ Analisis & Perbandingan Cloud Service

| Layanan | Provider | Paket | Kelebihan | Batasan Free Tier | Solusi di Proyek Ini |
|---|---|---|---|---|---|
| **Hosting** | Vercel | Hobby (Free) | - Serverless global edge<br>- HTTPS otomatis<br>- Native Vercel Functions<br>- Zero cold server maintenance | - Max runtime 15s (Node.js)<br>- 1 cron job aktif harian | Menggunakan webhook responsif, in-memory stream export, dan proteksi cron secret. |
| **Database** | Neon Tech | Free Tier | - Native PostgreSQL serverless<br>- Connection pooling bawaan (PgBouncer)<br>- 0.5 GB storage | - Auto-suspend compute setelah 5 menit idle | Menggunakan connection pool string (`?pgbouncer=true`) dan Prisma singleton. |
| **Database Alternatif** | Supabase | Free Tier | - PostgreSQL 15/16<br>- 500 MB storage<br>- Web interface lengkap | - Pause jika tidak aktif 7 hari berturut-turut | Menggunakan prisma migration deploy dan DIRECT_URL yang kompatibel. |
| **AI Provider** | Google Gemini API | Free Tier (AI Studio) | - Mendukung Vision OCR untuk struk<br>- JSON structured output<br>- Paham bahasa Indonesia sangat baik | - 15 RPM / 1 juta TPM | Menggunakan abstraction layer & parser fallback deterministik jika kuota limit. |
| **AI Alternatif** | Groq Cloud | Free Tier | - Inferensi LLaMA 3 super cepat | - Text-only (belum ada vision untuk struk) | Abstraction layer memungkinkan beralih instan melalui `AI_PROVIDER=groq`. |

---

## 🛠 Panduan Persiapan Layanan

### 1. Membuat Bot di BotFather Telegram

1. Buka aplikasi Telegram dan cari **[@BotFather](https://t.me/BotFather)**.
2. Ketik `/newbot`.
3. Masukkan nama bot Anda (misal: `My Finance Assistant`).
4. Masukkan username bot (harus berakhiran `bot`, misal: `my_personal_finance_bot`).
5. Simpan **HTTP API Token** yang diberikan (format: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).
6. Atur daftar perintah bot di BotFather dengan mengirim `/setcommands`, pilih bot Anda, lalu paste teks berikut:
   ```text
   start - Mulai bot dan cek status registrasi
   menu - Tampilkan menu interaktif utama
   saldo - Cek ringkasan saldo keuangan
   hariini - Laporan keuangan hari ini
   mingguini - Laporan keuangan minggu ini
   bulanini - Laporan keuangan bulan ini
   laporan - Laporan lengkap dan rincian kategori
   riwayat - Riwayat transaksi dengan paginasi
   tabungan - Kelola target tabungan
   pengingat - Kelola pengingat harian dan tagihan
   export - Unduh laporan dalam format PDF atau Excel
   bantuan - Panduan penggunaan dan contoh perintah
   ```

### 2. Mendapatkan ID Telegram Pribadi

Bot ini hanya dapat diakses oleh ID Anda. Untuk mengetahui ID Anda:
1. Buka bot **[@userinfobot](https://t.me/userinfobot)** di Telegram.
2. Tekan `/start`.
3. Catat angka **Id** Anda (contoh: `123456789`). Masukkan ke `TELEGRAM_ALLOWED_USER_IDS`.

### 3. Mendapatkan API Key AI (Gemini / Groq)

#### Opsi Rekomendasi: Google Gemini API
1. Kunjungi **[Google AI Studio](https://aistudio.google.com/)**.
2. Login dengan akun Google Anda.
3. Klik **"Get API key"** -> **"Create API key"**.
4. Salin kunci API yang diawali dengan `AIzaSy...`.

#### Opsi Alternatif: Groq Cloud
1. Kunjungi **[Groq Console](https://console.groq.com/)**.
2. Buat akun gratis dan buka menu **API Keys**.
3. Buat API Key baru (diawali `gsk_...`).

### 4. Membuat Database PostgreSQL di Neon / Supabase

#### Opsi 1: Neon Tech (Sangat Direkomendasikan untuk Vercel)
1. Buka **[Neon Console](https://neon.tech/)** dan daftar gratis.
2. Buat project baru (misal: `finance-bot-db`), pilih region terdekat (misal: `Singapore / ap-southeast-1`).
3. Pada Dashboard Neon, Anda akan melihat **Connection Details**:
   - Pilih mode **Pooled connection**. Salin URL ke `DATABASE_URL` (format: `postgresql://user:pass@ep-cool-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true`).
   - Pilih mode **Direct connection**. Salin URL ke `DIRECT_URL` (format: `postgresql://user:pass@ep-cool.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`).

#### Opsi 2: Supabase
1. Buka **[Supabase Console](https://supabase.com/)** dan buat project baru.
2. Buka **Project Settings** -> **Database**.
3. Salin **Connection String**:
   - Mode Transaction (Port 6543) untuk `DATABASE_URL`.
   - Mode Session / Direct (Port 5432) untuk `DIRECT_URL`.

---

## 🗄 Panduan Migrasi Database

Sebelum bot dijalankan, tabel database harus dibuat di PostgreSQL.

### Menggunakan Prisma CLI:
Isi file `.env` di komputer Anda sementara waktu:
```bash
npx prisma migrate deploy
```
atau
```bash
npx prisma db push
```

### Atau Menjalankan SQL Manual di SQL Editor:
Jika Anda tidak ingin menjalankan CLI, buka menu **SQL Editor** pada dashboard Neon atau Supabase Anda, lalu salin dan jalankan seluruh isi file:
📁 `prisma/migrations/20261103000000_init/migration.sql`

Semua tabel (`User`, `Transaction`, `SavingsGoal`, `SavingsContribution`, `Reminder`, `ProcessedTelegramUpdate`, `UserSettings`), relasi, foreign keys, dan index performa akan dibuat secara otomatis.

---

## 🚀 Panduan Deployment ke Vercel

### Metode 1: Menggunakan GitHub Repository (Rekomendasi)

1. Upload seluruh folder proyek ini ke repositori private GitHub Anda:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: AI Personal Finance Telegram Bot"
   git branch -M main
   git remote add origin https://github.com/USERNAME/bot_telegram_finance.git
   git push -u origin main
   ```
2. Buka **[Vercel Dashboard](https://vercel.com/)** -> **Add New** -> **Project**.
3. Hubungkan repositori GitHub Anda.
4. Pada bagian **Environment Variables**, tambahkan seluruh variabel:

| Key | Deskripsi | Contoh Nilai |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Token Bot dari BotFather | `7123456789:ABCd...` |
| `TELEGRAM_WEBHOOK_SECRET` | Token acak minimal 8 karakter | `rahasia_webhook_super_aman_2026` |
| `TELEGRAM_ALLOWED_USER_IDS` | ID Telegram Anda (koma jika banyak) | `123456789` |
| `DATABASE_URL` | Pooled connection string database | `postgresql://...@...neon.tech/neondb?sslmode=require&pgbouncer=true` |
| `DIRECT_URL` | Direct connection string database | `postgresql://...@...neon.tech/neondb?sslmode=require` |
| `AI_PROVIDER` | Provider AI ('gemini' atau 'groq') | `gemini` |
| `AI_API_KEY` | API Key dari Google AI Studio | `AIzaSy...` |
| `AI_MODEL` | Model AI yang digunakan | `gemini-1.5-flash` |
| `CRON_SECRET` | Secret token acak untuk cron Vercel | `rahasia_cron_super_aman_998877` |
| `APP_URL` | URL Vercel setelah terdeploy | `https://your-bot-name.vercel.app` |
| `TIMEZONE` | Zona waktu bot | `Asia/Makassar` |

5. Klik tombol **Deploy**. Vercel akan otomatis meng-compile dan mengaktifkan Serverless Functions.
6. Salin domain deployment Anda (misal: `https://my-finance-bot.vercel.app`). Perbarui variabel `APP_URL` di Vercel jika belum diisi.

---

## 🔗 Panduan Pengaturan Webhook Telegram

Setelah aplikasi terdeploy di Vercel, Telegram Bot API harus diarahkan ke URL endpoint Vercel Anda.

### Cara Cepat (Menggunakan Script Otomatis):
Atur variabel di `.env` lokal Anda:
```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
APP_URL=https://my-finance-bot.vercel.app
```
Jalankan script:
```bash
npm run set-webhook
```

### Cara Manual via Browser / Curl:
Ganti variabel berikut dan jalankan di terminal atau browser:
```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<YOUR-VERCEL-DOMAIN>.vercel.app/api/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "drop_pending_updates": false,
    "allowed_updates": ["message", "callback_query"]
  }'
```

### Verifikasi Webhook:
Buka di browser:
```
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```
Pastikan `url` sudah sesuai, `has_custom_certificate` bernilai false, dan `pending_update_count` bernilai 0 atau normal.

---

## 🧪 Pengujian & Verifikasi (Testing)

Proyek ini dilengkapi **19 unit dan integration tests** yang menguji kalkulasi keuangan, keamanan otorisasi webhook, pemrosesan zona waktu, fallback AI, serta ekspor file.

Jalankan pengujian dengan perintah:
```bash
npm test
```

Hasil test:
```text
 ✓ tests/currency.test.js (3 tests)
 ✓ tests/date.test.js (3 tests)
 ✓ tests/aiParser.test.js (6 tests)
 ✓ tests/savingsService.test.js (2 tests)
 ✓ tests/reportService.test.js (1 test)
 ✓ tests/webhookSecurity.test.js (2 tests)
 ✓ tests/export.test.js (2 tests)

 Test Files  7 passed (7)
      Tests  19 passed (19)
```

Untuk memverifikasi kesehatan server dan database langsung di Vercel:
Buka di browser:
```
https://<YOUR-VERCEL-DOMAIN>.vercel.app/api/health
```
Response yang diharapkan:
```json
{
  "status": "ok",
  "service": "ai-personal-finance-telegram-bot",
  "version": "1.0.0",
  "timezone": "Asia/Makassar",
  "database": {
    "status": "connected"
  }
}
```

---

## 💾 Panduan Backup & Restore Database

### Melakukan Backup (Dump) Data:
Jalankan di terminal lokal Anda menggunakan `pg_dump`:
```bash
pg_dump "postgresql://user:pass@ep-cool.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" \
  -F c -b -v -f "backup_keuangan_$(date +%Y%m%d).dump"
```

### Melakukan Restore Data:
Jika Anda ingin memulihkan data ke instance database baru:
```bash
pg_restore -d "postgresql://user:pass@new-instance.neon.tech/neondb?sslmode=require" \
  -v "backup_keuangan_20261103.dump"
```

---

## 💬 Daftar Perintah & Contoh Interaksi

### 1. Memulai Bot
Kirim `/start` ke bot Anda di Telegram. Bot akan memverifikasi ID Anda dan meminta saldo awal jika belum diatur.

### 2. Mencatat Transaksi dengan Bahasa Alami
Ketik langsung seperti berbicara dengan asisten:
- *"Beli nasi goreng telur 18 ribu"*
- *"Beli bensin 30rb"*
- *"Bayar tagihan listrik 250.000"*
- *"Gaji bulan ini 6.000.000"*
- *"Dapat uang freelance 800rb"*

### 3. Pindai Struk Kasir (OCR)
Kirim foto struk belanjaan (misal struk minimarket atau restoran). Bot akan mendeteksi toko, total belanja, dan menampilkan tombol **"Ya, Simpan Transaksi"** atau **"Batalkan"**.

### 4. Target Tabungan
- *"Buat target tabungan HP Baru 5 juta"*
- *"Nabung 250rb buat HP Baru"*
- Ketik `/tabungan` untuk melihat visual progress bar.

### 5. Pengingat Otomatis
- *"Ingatkan catat pengeluaran jam 20:00"*
- *"Ingatkan bayar wifi tanggal 10 jam 08:30"*
- Ketik `/pengingat` untuk mengelola pengingat aktif Anda.

### 6. Ekspor Data
Ketik `/export` lalu pilih:
- **PDF**: Mengunduh berkas `.pdf` rapi berisi ringkasan dan tabel transaksi.
- **Excel**: Mengunduh berkas `.xlsx` dengan format formula keuangan lengkap.

---

## 🔒 Kebijakan Keamanan & Privasi

1. **Token Masking:** Logger internal otomatis menyensor `BOT_TOKEN`, `DATABASE_URL`, dan `API_KEY` agar tidak pernah terekspos pada log Vercel.
2. **Access Control:** Permintaan dari Telegram ID yang tidak ada pada daftar `TELEGRAM_ALLOWED_USER_IDS` langsung ditolak dan tidak membebani database.
3. **Webhook Verification:** Header `X-Telegram-Bot-Api-Secret-Token` divalidasi pada setiap request webhook untuk mencegah spoofing request HTTP palsu dari pihak ketiga.
4. **Idempotency & Anti-duplikasi:** Tabel `ProcessedTelegramUpdate` mencegah Telegram melakukan eksekusi ganda jika terjadi retry network.
5. **Data Protection:** Bot tidak pernah meminta atau menyimpan kredensial bank atau nomor kartu kredit pengguna. Seluruh angka keuangan disimpan dengan enkripsi transit HTTPS dan koneksi SSL/TLS ke database PostgreSQL.
