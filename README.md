# Digimap PIM 2 Sales Dashboard

Dashboard responsif yang menampilkan performa harian Digimap Pondok Indah Mall 2 dari Google Sheets.

## Fitur

- Data live dari Google Sheets dan refresh otomatis setiap 5 menit.
- Ringkasan target, actual, achievement, gap, Accessories, VAS, dan UPT.
- Ranking serta tabel performa staff.
- Pencarian staff, light/dark mode, dan tampilan mobile.
- Cache data terakhir apabila koneksi sementara gagal.
- Deployment otomatis melalui GitHub Pages.

## Sumber data

- Spreadsheet ID: `160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0`
- Sheet GID: `1585177730`

Google Sheet harus dapat dilihat oleh siapa saja yang memiliki link. Jangan menaruh data customer, NIK pribadi, nomor telepon, atau informasi rahasia di sheet publik.

## Menjalankan lokal

Karena project ini tidak memerlukan proses build, jalankan server statis dari folder project:

```bash
python3 -m http.server 8080
```

Kemudian buka `http://localhost:8080`.

## Mengaktifkan GitHub Pages

1. Buka repository di GitHub.
2. Masuk ke **Settings → Pages**.
3. Pada **Build and deployment**, pilih **Source: GitHub Actions**.
4. Buka tab **Actions** dan tunggu workflow `Deploy dashboard to GitHub Pages` selesai.
5. Website akan tersedia di `https://USERNAME.github.io/digimap-sales-dashboard/`.

## Mengganti sumber Google Sheets

Edit konstanta `CONFIG` pada bagian atas `app.js`, lalu ubah `spreadsheetId` dan `gid`.
