# SIBAKU Lite

Pencarian cepat kode **KBLI 2025** (Klasifikasi Baku Lapangan Usaha Indonesia, Peraturan BPS No. 7 Tahun 2025) dengan bahasa sehari-hari. Dibuat untuk latihan lomba HSN dan untuk petugas lapangan yang perlu mengode usaha dengan cepat.

## Fitur
- **Paham bahasa sehari-hari**: misalnya *bengkel motor* → 95320, *warung soto* → 56101, *tambak udang* → 03231, *laundry* → 96100.
- **Cari dengan angka**: ketik `56` atau `561` untuk melihat semua kode yang diawali angka itu.
- **Ketuk hasil untuk menyalin kode.** Keyboard: `/` untuk mencari, `↑↓` untuk memilih, `Enter` untuk menyalin, `Esc` untuk menghapus.
- Telusuri per **golongan pokok** (2 digit), dan ada daftar **usaha yang sering ditemui**.
- **Bisa offline** setelah dibuka sekali, dan bisa dipasang di HP ("Tambahkan ke layar utama").
- Ada catatan **kode KBLI 2020** untuk usaha yang kodenya berubah (misalnya bengkel motor 45405 → 95320).

## Menjalankan secara lokal
```bash
python -m http.server 5174
```

## Sumber data dan batasan
- 1.559 kode 5 digit KBLI 2025 dari API publik [tenderx.id](https://tenderx.id/kbli-2025). **Sebagian judul terpotong** dari sumbernya, jadi ada catatan tambahan untuk beberapa kode.
- Kamus sinonim dan daftar usaha populer disusun manual di [`js/kamus.js`](js/kamus.js).
- **Bukan aplikasi resmi BPS.** Selalu cocokkan hasilnya dengan SIBAKU resmi BPS.
