# M238 Performance Audit — 27 Sep 2026

## Temuan utama

1. Endpoint `data-fixed`, `daily-fixed`, dan `daily-summary-fast-fixed` memanggil endpoint lama lalu membaca ulang range Google Sheets besar untuk menambal AirPods/voucher. Ini menggandakan pekerjaan server dan jumlah pembacaan Sheet pada jalur yang paling sering dipakai.
2. Mobile Daily Sales memuat `/api/data` dan `/api/daily` secara paralel. Dengan rewrite fixed sebelumnya, keduanya sama-sama menjalankan double-processing.
3. Dashboard legacy menjalankan auto refresh tiap 60 detik pada setting `auto`, sehingga payload berat terus diminta walaupun user tidak melakukan aksi.
4. Endpoint fixed mengembalikan `cache-control: no-store`, sehingga hasil perhitungan yang mahal tidak dapat dipakai ulang oleh browser/CDN.
5. Logic AirPods dan voucher seharusnya berada di parser/agregator utama, bukan ditambal setelah response jadi.

## Rencana perbaikan

- Hilangkan double-processing pada jalur utama.
- Pertahankan filter voucher dan perhitungan AirPods di satu shared sales sanitizer.
- Jadikan endpoint fixed sebagai endpoint yang memakai cache hasil sanitasi, bukan membaca ulang Sheet untuk request identik.
- Kurangi auto-refresh legacy dari 60 detik menjadi interval yang lebih masuk akal dan hanya refresh saat tab visible.
- Pertahankan lazy loading di mobile; jangan preload data Sales/Report sebelum menu dibuka.

## Target

Mengurangi pembacaan Google Sheets berulang, mempercepat first-load dan perpindahan menu, tanpa mengubah angka penjualan yang benar.