# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pemilik sekaligus admin Swiper Store. Bekerja sendiri, sering membuka dashboard dari ponsel maupun desktop untuk memantau akun mana yang masih tersedia, menandai akun terjual, dan sesekali menambah atau memperbaiki listing.

## Product Purpose

Menjual akun PUBG premium secara langsung lewat WhatsApp. Dashboard admin menjaga katalog tetap akurat: akun yang sudah terjual tidak lagi tampil sebagai stok tersedia. Sukses berarti admin bisa memperbarui status tanpa ragu dan pembeli tidak pernah menghubungi untuk akun yang sudah laku.

## Positioning

Katalog akun PUBG yang dikurasi dengan informasi harga dan status yang jujur, tanpa proses checkout berlapis: pembeli memilih akun, lalu langsung menghubungi penjual lewat WhatsApp.

## Operating Context

- Admin login lewat `/admin/login`; sesi disimpan di database dan bertahan 7 hari.
- Pekerjaan paling sering: memindai daftar akun dan menandai terjual/tersedia.
- Listing ditambah dan diedit satu per satu lewat form; belum ada aksi massal.
- Thumbnail diunggah sebagai JPG/PNG/WebP lalu dikonversi ke WebP.
- Katalog publik hanya menampilkan data dari tabel `akun`.

## Capabilities and Constraints

- PHP native tanpa Composer, Node, atau build step; CSS dan JavaScript ditulis langsung.
- PostgreSQL; kode akun berformat `SWP-0001` dan dibuat otomatis.
- Filter status: semua, tersedia, terjual. Paginasi server-side.
- Aksi per akun: edit, ubah status, hapus (dengan halaman konfirmasi).
- Form memakai CSRF token; semua output di-escape.
- Tidak ada pencarian admin dan tidak ada aksi massal saat ini.

## Brand Commitments

- Nama: Swiper Store.
- Palet gelap hitam dengan aksen emas; tipografi Bebas Neue untuk judul dan Plus Jakarta Sans untuk teks.
- Nada bahasa Indonesia yang langsung dan sopan.
- Katalog publik dan panel admin berbagi identitas visual yang sama.

## Evidence on Hand

- Data akun nyata sudah dikosongkan pada 2026-10-24; template desain memakai data contoh sintetis.
- Aset merek yang ada: favicon SVG, dua file font WOFF2, dan stylesheet di `assets/`.

## Product Principles

1. Status stok harus terbaca dalam sekali pandai, bukan setelah membaca tombol.
2. Aksi yang paling sering dipakai mendapat ruang paling besar; aksi berisiko disembunyikan tetapi tetap terjangkau.
3. Dashboard harus tetap cepat dipakai di layar ponsel tanpa scroll berlebihan.
4. Identitas hitam-emas dipertahankan; kemewahan datang dari presisi, bukan ornamen.
5. Jangan menambah fitur yang belum ada di backend hanya demi tampilan.

## Accessibility & Inclusion

- Target WCAG 2.2 AA untuk kontras teks dan fokus keyboard.
- Semua aksi harus dapat dipakai dengan keyboard dan pembaca layar; status tidak boleh dibedakan hanya lewat warna.
- Target sentuh minimal 44×44 px di layar ponsel.
