# Jakarta 1 Sales Dashboard

Dashboard area Jakarta 1 untuk memantau pencapaian store, daily summary, performa staff, promo, estimasi incentive, product focus, NPS/CX, dan reason daily.

> Branch deployment: `jakarta-1-area-dashboard`

## Pemisahan data

Project ini berdiri sendiri dan tidak membaca atau menulis ke master dashboard M238. Kode store `M238` tetap tampil karena merupakan salah satu store di Area Jakarta 1, tetapi datanya dibaca dari Data Compile area bersama store lainnya.

Sumber yang digunakan:

- Data Compile 2025: `1NnRW70VyrtV8c89_M08gTnOGbtzeldSy8gL-gm4GjJ0`
- Data Compile 2026: `151Qfrz3RZnDMgZjKOPt5s_aS-zscSiOTCWodbUDWM1k`
- SPW & SOH Jakarta 1: `1BjLDXdi_5BgZCUUJAKba-xYRFf0RDmRTT0FW1be03WE`
- Feedback Jakarta 1: tab `Jakarta 1 Feedback` di SPW & SOH Jakarta 1

Target store belum diaktifkan sampai data target tersedia di master data SPW & SOH Jakarta 1.

## Menjalankan lokal

1. Salin `.env.example` menjadi `.env.local`.
2. Isi kredensial service account Google.
3. Bagikan ketiga Google Sheet kepada service account. Akses Editor diperlukan untuk menyimpan feedback.
4. Jalankan `npm install` lalu `npm run dev`.

## Environment Vercel

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

Build command Vercel: `npm run build:vercel`.
