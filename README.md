# M238 Digimap Pondok Indah Mall 2 Dashboard

Dashboard mempunyai tiga halaman: **Daily Sales**, **Daily Summary**, dan **Staff Performance**. Master data adalah Google Sheet `Master Dashboard SPW Dwimas` dengan ID `160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0`.

## Sumber data

- `RAW SalesPerson!AB:AR`: Daily Sales terbaru.
- `Data Copas!A:S`: transaksi bulanan, Daily Summary, dan Staff Performance.
- `Config!H:L`: nama, posisi, dan persentase target staff.
- `Config!Q:U`: target bulanan amount, device, accessories, dan VAS.
- Upload SPW mengganti isi `RAW SalesPerson!R2:T70000`.
- Invoice exchange ditambahkan ke `RAW SalesPerson!Y:Y`.

## 1. Siapkan Google Cloud

1. Buka https://console.cloud.google.com/ dan buat project baru.
2. Buka **APIs & Services → Library → Google Sheets API → Enable**.
3. Buka **IAM & Admin → Service Accounts → Create Service Account**.
4. Buka service account tersebut lalu pilih **Keys → Add key → Create new key → JSON**.
5. Simpan nilai `client_email` dan `private_key` dari file JSON.

## 2. Beri akses master Sheet

Bagikan Google Sheet master kepada alamat `client_email` sebagai **Editor**. Akses Editor diperlukan karena dashboard dapat mengunggah SPW dan menyimpan nomor invoice exchange.

## 3. Upload ke GitHub

1. Buat repository baru, misalnya `m238-digimap-pim2-dashboard`.
2. Upload seluruh isi project ini ke repository tersebut.
3. Jangan upload file JSON service account atau `.env`.

## 4. Deploy ke Vercel

1. Masuk ke https://vercel.com/ dan pilih **Add New → Project**.
2. Hubungkan GitHub dan pilih repository dashboard.
3. Tambahkan Environment Variables:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: isi `client_email`.
   - `GOOGLE_PRIVATE_KEY`: isi lengkap `private_key`, termasuk BEGIN/END PRIVATE KEY.
4. Klik **Deploy**.

## Perhitungan

- Target staff = target store × `%T` dari Config.
- Achievement = actual ÷ target.
- Variance = actual − target.
- UPT = total qty ÷ invoice unik.
- ATV = total amount ÷ invoice unik.
- Point = minimum achievement Device × 60 + Accessories × 30 + VAS × 10; maksimal 100 point.
- Incentive device: MacBook Rp30.000, iPhone Rp15.000, iPad Rp10.000, Apple Watch Rp10.000 per unit.
- Incentive accessories mengikuti tier harga pada dashboard.

Dashboard memperbarui data otomatis setiap dua jam dan juga dapat diperbarui manual.
