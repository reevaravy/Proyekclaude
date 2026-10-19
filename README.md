# Catatan Pengeluaran

Aplikasi web sederhana untuk mencatat pengeluaran harian. Tugas Final Project MBCL.

## Fitur

- Catat, edit, dan hapus pengeluaran (tanggal, jumlah, kategori, catatan)
- Ringkasan hari ini, total bulan, rata-rata per hari, dan sisa budget
- Grafik pengeluaran per kategori
- Budget bulanan (total dan per kategori) dengan peringatan saat mencapai 80%
- Export CSV (siap dibuka di Excel) dan cadangan/pulihkan data (JSON)

## Cara pakai

Buka `index.html` di browser. Tidak perlu instalasi atau build.

Data tersimpan di `localStorage` browser, jadi hanya ada di perangkat dan browser yang dipakai.
Gunakan tombol **Unduh cadangan** secara berkala.

## Struktur

- `index.html` — tampilan
- `style.css` — gaya (mendukung mode gelap)
- `app.js` — logika aplikasi
