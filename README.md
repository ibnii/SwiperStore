# Swiper Store

Katalog akun premium dengan PHP Native, PostgreSQL, CSS Native, dan JavaScript Native. Tidak ada Composer, Node, atau framework frontend.

Struktur folder mengikuti project PBL: setiap fitur punya halaman PHP sendiri, logika bersama ada di `includes/`, dan koneksi database ada di `config/`.

## Struktur

```text
SwiperStore/
├── index.php              katalog publik
├── akun/detail.php        detail akun + video + tombol WhatsApp
├── auth/                  login.php, logout.php
├── admin/                 index.php, tambah.php, edit.php, hapus.php, status.php, _form.php
├── config/                koneksi.php, aplikasi.php
├── includes/              bootstrap, helper, sesi, auth, media, video, WhatsApp, query akun
├── database/              01_schema.sql, 02_migrasi_next.sql, 03_buat_admin.php
├── cron/                  bersihkan.php
├── deploy/                nginx/, php-fpm/, backup/
├── assets/                css/, js/, fonts/, img/
├── storage/               uploads/ (gambar), trash/, sessions/
├── router.php             router server pengembangan
├── health.php              /api/health
└── 404.php
```

## Kebutuhan server

- PHP 8.3+ dengan ekstensi `pdo_pgsql`, `gd` (dukungan WebP), `exif`, `fileinfo`, `mbstring`.
- PostgreSQL 14+.
- Nginx + PHP-FPM untuk produksi (konfigurasi contoh tersedia di `deploy/`).

## Menjalankan lokal (urut)

1. Buat database PostgreSQL, misalnya `swiperstore`.
2. Jalankan skema:

   ```bash
   psql -U swiperstore -d swiperstore -f database/01_schema.sql
   ```

   Kalau ingin memindahkan data dari versi Next.js lama, jalankan juga:

   ```bash
   psql -U swiperstore -d swiperstore -f database/02_migrasi_next.sql
   ```

3. Sesuaikan kredensial di `config/koneksi.php` dan URL/WhatsApp di `config/aplikasi.php`.
4. Buat admin:

   ```bash
   php database/03_buat_admin.php admin@swiperstore.id
   ```

   Skrip meminta kata sandi (minimal 12 karakter). Jalankan ulang perintah yang sama untuk mengganti kata sandi.
5. Pastikan folder runtime dapat ditulis:

   ```bash
   mkdir -p storage/uploads/listings storage/trash storage/sessions
   chmod -R 775 storage
   ```

6. Jalankan server pengembangan:

   ```bash
   php -d upload_max_filesize=10M -d post_max_size=12M -d memory_limit=512M \
     -S 127.0.0.1:8000 router.php
   ```

   Flag `-d` diperlukan karena `php -S` tidak membaca `.user.ini`.

7. Buka `http://127.0.0.1:8000` untuk katalog dan `http://127.0.0.1:8000/admin` untuk panel admin.

Catatan: `php -S` hanya untuk pengembangan. URL bersih (tanpa `.php`) berjalan lewat `router.php`; di produksi aturannya ada di `deploy/nginx/swiperstore.conf`.

## Deploy VPS (urut)

0. Sebelum mengubah data produksi, buat backup:

   ```bash
   cp deploy/backup/backup.env.example deploy/backup/backup.env
   # isi kredensial database di backup.env
   deploy/backup/backup.sh
   ```

1. Pasang paket:

   ```bash
   sudo apt install nginx php8.3-fpm php8.3-pgsql php8.3-gd php8.3-mbstring postgresql-client
   ```

2. Salin project ke `/var/www/swiperstore`, lalu buat database dan jalankan `database/01_schema.sql`.
3. Isi `config/koneksi.php` dengan kredensial database di server.
4. Buat admin dengan `php database/03_buat_admin.php email@domain.com`.
5. Pasang konfigurasi:

   ```bash
   sudo cp deploy/nginx/swiperstore.conf /etc/nginx/sites-available/swiperstore
   sudo ln -s /etc/nginx/sites-available/swiperstore /etc/nginx/sites-enabled/
   sudo cp deploy/php-fpm/swiperstore.conf /etc/php/8.3/fpm/pool.d/
   ```

   Sesuaikan `server_name`, `root`, dan versi PHP/socket di kedua file, lalu:

   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   sudo systemctl restart php8.3-fpm
   ```

6. Atur izin tulis:

   ```bash
   sudo chown -R www-data:www-data storage
   sudo find storage -type d -exec chmod 775 {} \;
   ```

7. Pasang cron harian:

   ```text
   0 1 * * * php /var/www/swiperstore/cron/bersihkan.php >> /var/www/swiperstore/storage/bersihkan.log 2>&1
   0 2 * * * /var/www/swiperstore/deploy/backup/backup.sh >> /var/log/swiperstore-backup.log 2>&1
   ```

8. Aktifkan HTTPS dengan Certbot, lalu buka baris HSTS di blok Nginx.

## Pembersihan otomatis

`cron/bersihkan.php` menghapus:

- gambar di `storage/trash` yang lebih tua dari 7 hari,
- file sesi PHP yang lebih tua dari 7 hari,
- catatan `percobaan_login` yang lebih tua dari 1 hari,
- sesi admin yang sudah kedaluwarsa.

## Backup dan uji restore

- `deploy/backup/backup.sh` membuat dump PostgreSQL dan arsip `storage/uploads`, lengkap dengan checksum, lalu menghapus backup lebih tua dari `RETENSI_HARI`.
- `deploy/backup/verify-restore.sh <dump> [uploads.tar.gz]` memulihkan ke database sementara (bukan database produksi), menghitung data, lalu menghapus database sementara itu.

Contoh:

```bash
deploy/backup/verify-restore.sh /var/backups/swiperstore/db-20261024-020000.dump \
  /var/backups/swiperstore/uploads-20261024-020000.tar.gz
```

## Aturan keamanan yang sudah berjalan

- Kata sandi admin di-hash dengan Argon2id.
- Sesi admin disimpan di database (token di-hash) dan kedaluwarsa 7 hari.
- Setiap form memakai CSRF token.
- Login dibatasi 5 percobaan per IP dan 10 per email dalam 15 menit.
- Unggahan hanya JPG/PNG/WebP, maksimal 8 MB dan 40 MP; gambar diperkecil ke sisi maksimal 1600 px lalu dikonversi ke WebP.
- Header keamanan dan CSP dipasang di PHP dan Nginx.
- Folder `config/`, `includes/`, `database/`, `cron/`, `deploy/`, dan `storage/` tidak boleh diakses langsung dari web.
