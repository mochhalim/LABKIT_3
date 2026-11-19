# Peminjaman Alat Bengkel TKJ (versi sederhana)

Aplikasi pencatatan peminjaman alat tanpa server dan tanpa Firebase. Gratis di GitHub Pages.

## Fitur
- **Peminjaman:** siswa mengisi nama, kelas, nama barang (bebas diketik), jumlah, tanggal kembali, dan keperluan.
- **Pengembalian:** admin memilih peminjaman lalu mencatat keadaan barang (Baik / Rusak ringan / Rusak berat / Hilang) beserta catatan.
- **Data peminjam:** daftar semua peminjaman, bisa dicari dan difilter (belum kembali, terlambat, sudah kembali).
- **Laporan bulanan (PIN admin):** pilih bulan, isi nama sekolah dan nama admin, lalu **Cetak laporan** (kertas A4 landscape lengkap dengan kolom tanda tangan).
- **Cadangan:** unduh dan pulihkan data dalam file JSON.

## Deploy ke GitHub Pages
1. Buat repository dan unggah semua file di folder ini.
2. Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.
3. Buka `https://NAMA_USER.github.io/NAMA_REPO/`.

## Catatan penting
- Data tersimpan di **browser perangkat yang dipakai**. Pakai satu komputer/tablet utama, dan unduh cadangan rutin (mis. seminggu sekali).
- PIN admin hanya pencegah salah pakai, bukan keamanan sungguhan. Simpan data seperlunya (nama, kelas).
- Jika data browser dihapus tanpa cadangan, data hilang.

## Pasang sebagai aplikasi (PWA)
- Buka alamat GitHub Pages lewat **HTTPS** di Chrome (Android). Tunggu beberapa detik, lalu ketuk tombol **Pasang aplikasi** di pojok atas, atau menu ⋮ → **Instal aplikasi**.
- iPhone/iPad: buka di Safari → Bagikan → **Tambah ke Layar Utama**.
- **Hapus dulu pintasan lama** di layar utama sebelum memasang ulang. Jika menu hanya menampilkan "Tambahkan ke layar utama", muat ulang halaman satu kali agar service worker aktif, lalu cek lagi.
- Setelah terpasang, aplikasi bisa dibuka tanpa internet (data tetap di perangkat).
- Setelah mengubah file aplikasi, naikkan nomor `CACHE` di `sw.js` (mis. `v2`) agar perangkat memuat versi baru.

## Pembaruan v2
- **Banyak barang sekaligus:** satu peminjam bisa menambah beberapa barang dalam satu form.
- **Perpanjang tenggat:** tombol **+3 hari** di tab Pengembalian (perlu PIN).
- **PIN untuk menerima pengembalian**, supaya status tidak diubah sembarang orang.
- **Unduh CSV** laporan bulanan, bisa dibuka di Excel/Google Sheets.
- **Pengingat cadangan** muncul jika cadangan terakhir lebih dari 7 hari.
- Data lama tetap terbaca (format kompatibel).

## Pembaruan v3
- **Daftar alat & stok** (tab baru, PIN): stok tersedia dihitung otomatis; peminjaman melebihi stok ditolak. Tombol "Buat daftar dari riwayat" memudahkan peralihan dari data lama.
- **Pengembalian sebagian:** isi jumlah yang dikembalikan; sisanya tetap tercatat dipinjam.
- **Hapus bisa diurungkan** (tombol Urungkan muncul 7 detik).
- **Laporan:** ada barang terbanyak dipinjam dan daftar yang belum kembali dari bulan sebelumnya.
- Alat berstatus "Hilang" otomatis mengurangi stok.
