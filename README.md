# Swiper Store

Toko akun PUBG premium dengan katalog publik, halaman detail, dan panel admin.
Dibangun dengan Next.js App Router, PostgreSQL, dan Tailwind CSS. Seluruh antarmuka
memakai Bahasa Indonesia dan bertema hitam–emas.

## Fitur

- Admin login email + password (Argon2id, sesi HttpOnly di database).
- CRUD listing dengan kode otomatis `SWP-0001`, harga, deskripsi, status terjual,
  URL video, dan thumbnail WebP.
- Katalog publik: pencarian judul, filter tersedia/terjual, urutan terbaru/harga,
  pagination 12 kartu per halaman.
- Halaman detail dengan embed YouTube/TikTok/Google Drive yang tervalidasi dan CTA
  WhatsApp `Halo min, saya ingin membeli akun dengan Id SWP-0001`.
- Header keamanan, `robots.txt` dengan admin diblokir, health check, halaman 404/500
  berbahasa Indonesia.
- Cleanup media yatim/trash dan sesi kedaluwarsa.

## Stack

| Bagian | Teknologi |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Bahasa | TypeScript strict |
| UI | Tailwind CSS v4, font Bebas Neue + Plus Jakarta Sans |
| Database | PostgreSQL 16, Drizzle ORM, `pg` |
| Auth | Argon2id (`@node-rs/argon2`), token sesi SHA-256 |
| Media | `sharp` → WebP 1600px, ditulis ke `storage/uploads` |
| Validasi | Zod 4 |
| Test | Vitest (unit + integrasi), Playwright + axe-core (E2E) |

## Prasyarat

- Node.js 24 (lihat `.nvmrc`)
- npm 10+
- PostgreSQL 16 — `docker-compose.yml` menyediakan instance lokal di port 5433

## Setup lokal

```bash
cp .env.example .env.local
docker compose up -d postgres
npm install

# Isi ADMIN_PASSWORD_HASH. Escape setiap "$" menjadi "\$" saat menempel ke env.
npm run hash-password -- 'password-admin-lokal'

npm run db:migrate
npm run db:seed     # opsional: 25 listing contoh
npm run dev
```

Buka <http://localhost:3000> dan <http://localhost:3000/admin>.

Identitas video yang didukung: YouTube (`watch`, `youtu.be`, `shorts`, `embed`),
TikTok, dan Google Drive (`file/d`, `open?id`, `preview`, `uc?id`). URL harus HTTPS
dan memakai host resmi.

## Variabel environment

| Key | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | ya | `postgres://user:pass@host:port/db` |
| `ADMIN_EMAIL` | ya | Email login admin |
| `ADMIN_PASSWORD_HASH` | ya | Hash Argon2id, `$` di-escape sebagai `\$` |
| `WA_NUMBER` | ya | Nomor WhatsApp admin, format `628...` |
| `UPLOAD_DIR` | ya | Direktori media, mis. `./storage/uploads` |
| `SITE_URL` | ya | Origin publik, dipakai metadata dan OG image |
| `DATABASE_URL_TEST` | tidak | Hanya untuk test integrasi |
| `E2E_ADMIN_PASSWORD` | tidak | Hanya untuk test E2E lokal |

`.env.local` tidak pernah ikut ter-commit. Jangan menaruh rahasia di `deploy/`.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi (standalone) |
| `npm start` | Menjalankan build produksi |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit test |
| `npm run test:integration` | Integrasi (database `_test` terpisah) |
| `npm run test:e2e` | Playwright + axe |
| `npm run db:generate` | Generate migration Drizzle |
| `npm run db:migrate` | Jalankan migration |
| `npm run db:seed` | Seed data contoh (idempoten) |
| `npm run hash-password -- '...'` | Buat hash Argon2id |
| `npm run cleanup:media` | Dry run media yatim + trash kedaluwarsa |
| `npm run cleanup:media -- --apply` | Hapus media yatim + trash > 7 hari |
| `npm run cleanup:sessions` | Hapus sesi kedaluwarsa |
| `npm run cleanup:sessions -- --dry-run` | Pratinjau sesi kedaluwarsa |

Test integrasi menolak berjalan bila nama database tidak berakhiran `_test`. Jangan
mengarahkan `DATABASE_URL_TEST` ke database produksi.

## Struktur

```
app/
  (publik) page.tsx, akun/[code], media/[...path], robots.ts, api/health
  admin/ login, (protected)/ dashboard + listings
  error.tsx, not-found.tsx
components/  catalog, listing, admin, site header/footer
lib/         auth, db, listings, media, video, whatsapp
deploy/      nginx, systemd, backup
scripts/     migrate, seed, hash-password, cleanup
tests/       unit, integration
e2e/         Playwright + axe
```

## Operasional

```bash
curl -fsS https://domain-anda/api/health   # {"status":"ok"}
```

Jadwalkan cleanup lewat cron server (contoh):

```cron
15 3 * * * cd /srv/swiperstore && npm run cleanup:media -- --apply >> /var/log/swiperstore-cleanup.log 2>&1
30 3 * * * cd /srv/swiperstore && npm run cleanup:sessions >> /var/log/swiperstore-cleanup.log 2>&1
```

Media yang dihapus dari katalog dipindah ke `storage/trash`, bukan dihapus langsung.
Script media hanya menghapus file yang tidak direferensikan database, dan defaultnya
dry run.

## Build Linux

`sharp` dan `@node-rs/argon2` memakai binary native, jadi artefak harus dibangun di
Linux dengan arsitektur yang sama seperti VPS. Docker dipakai untuk memverifikasi
build `linux/amd64` dengan Node 24:

```bash
docker build --platform linux/amd64 -t swiperstore:linux-amd64 .

# Cek binary native benar-benar termuat di dalam image.
docker run --rm --entrypoint node swiperstore:linux-amd64 -e '
  const sharp = require("sharp");
  const argon2 = require("@node-rs/argon2");
  sharp({ create: { width: 8, height: 8, channels: 3, background: "#000" } })
    .webp().toBuffer()
    .then(() => argon2.hash("cek"))
    .then(() => console.log("sharp + argon2 OK"));
'
```

Image juga bisa dipakai langsung sebagai container:

```bash
docker run -d --name swiperstore -p 127.0.0.1:3000:3000 \
  --env-file /srv/swiperstore/.env.production \
  -e HOSTNAME=0.0.0.0 \
  -e UPLOAD_DIR=/app/storage/uploads \
  -v /srv/swiperstore/shared/storage:/app/storage \
  swiperstore:linux-amd64
```

Docker `--env-file` tidak memproses escape `\$`, jadi untuk container gunakan salinan
env tanpa backslash pada `ADMIN_PASSWORD_HASH`.

## Deploy VPS

Deploy dijalankan manual. Urutannya penting: **backup dulu**, build rilis baru,
migration, baru switch symlink. Jangan pernah menimpa rilis yang sedang jalan.

### 0. Backup sebelum menyentuh server

```bash
sudo -u swiperstore /srv/swiperstore/current/deploy/backup/backup.sh
```

Simpan juga nama rilis yang sedang aktif untuk rollback:
`readlink -f /srv/swiperstore/current`.

### 1. Provisioning (Ubuntu 24.04, 2 GB RAM)

```bash
# User dan direktori
sudo adduser --system --group --home /srv/swiperstore swiperstore
sudo install -d -m 755 -o swiperstore -g swiperstore /srv/swiperstore
sudo install -d -m 755 -o swiperstore -g swiperstore /srv/swiperstore/releases
sudo install -d -m 750 -o swiperstore -g swiperstore \
  /srv/swiperstore/shared/storage/uploads /srv/swiperstore/shared/storage/trash

# Swap 2 GB: build Next butuh lebih dari 1 GB
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Node 24 (contoh NodeSource; pastikan `/usr/bin/node` ada karena systemd memanggil
path absolut):

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # v24.x
```

PostgreSQL lokal, hanya listen di localhost:

```bash
sudo apt-get install -y postgresql-16
sudo -u postgres createuser swiperstore --pwprompt
sudo -u postgres createdb swiperstore -O swiperstore
# Untuk restore drill, role butuh izin membuat database scratch:
sudo -u postgres psql -c 'ALTER ROLE swiperstore CREATEDB;'
```

Firewall dan paket pendukung:

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx age rsync
sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable
```

Environment produksi, mode `0600`, dimiliki `swiperstore`:

```bash
sudo install -m 600 -o swiperstore -g swiperstore /dev/null /srv/swiperstore/.env.production
sudo -e /srv/swiperstore/.env.production
```

```dotenv
DATABASE_URL=postgres://swiperstore:PASSWORD@127.0.0.1:5432/swiperstore
ADMIN_EMAIL=admin@domain-anda
ADMIN_PASSWORD_HASH=\$argon2id\$v=19\$...   # escape setiap "$" sebagai "\$"
WA_NUMBER=628xxxxxxxxxx
UPLOAD_DIR=/srv/swiperstore/shared/storage/uploads
SITE_URL=https://domain-anda
PORT=3000
HOSTNAME=127.0.0.1
```

`deploy/` dan `.env.production` tidak boleh berisi rahasia di repositori.

### 2. Build rilis baru

```bash
STAMP=$(date -u +%Y%m%d-%H%M%S)
RELEASE=/srv/swiperstore/releases/$STAMP
sudo -u swiperstore mkdir -p "$RELEASE"

# Kirim source tanpa artefak lokal; .env.production tidak ikut.
sudo rsync -a --delete --chown=swiperstore:swiperstore \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude storage --exclude .env.local --exclude test-results \
  ./ "$RELEASE"/

cd "$RELEASE"
sudo -u swiperstore ln -s /srv/swiperstore/.env.production .env.production
sudo -u swiperstore npm ci
sudo -u swiperstore npm run build
sudo -u swiperstore rm .env.production
```

Build memakai `.env.production` hanya untuk memenuhi validasi env; semua variabel
dibaca ulang saat runtime dan tidak ada yang di-inline ke bundle klien.

### 3. Migration sebelum switch

```bash
cd "/srv/swiperstore/releases/$STAMP"
sudo -u swiperstore bash -c '
  set -a; . /srv/swiperstore/.env.production; set +a
  npm run db:migrate
'
```

Migration bersifat maju (forward-only). Rollback aplikasi memakai rilis lama, bukan
membalik migration.

### 4. Switch symlink dan restart

```bash
sudo ln -sfn "releases/$STAMP" /srv/swiperstore/current.new
sudo mv -Tf /srv/swiperstore/current.new /srv/swiperstore/current

sudo install -m 644 deploy/systemd/swiperstore.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now swiperstore
sudo systemctl status swiperstore --no-pager
```

Rilis lama tetap ada; rollback cukup mengarahkan `current` ke rilis sebelumnya lalu
`systemctl restart swiperstore`.

### 5. Nginx dan TLS

```bash
sudo install -m 644 deploy/nginx/swiperstore.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/swiperstore.conf /etc/nginx/sites-enabled/
# Ganti swiperstore.example.com, lalu buat zona rate limit:
echo 'limit_req_zone $binary_remote_addr zone=login:10m rate=10r/m;' |
  sudo tee /etc/nginx/conf.d/swiperstore-limits.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d swiperstore.example.com
```

### 6. Smoke test

- `curl -fsS https://domain-anda/api/health` → `{"status":"ok"}`.
- Katalog memuat 12 kartu, pencarian/filter/sort/pagination bekerja.
- Detail menampilkan video dan tombol WhatsApp dengan teks
  `Halo min, saya ingin membeli akun dengan Id SWP-xxxx`.
- Login admin berhasil, upload thumbnail menjadi WebP, toggle terjual berubah.
- `sudo reboot`, lalu ulangi health check untuk memastikan service, Nginx, dan
  PostgreSQL pulih otomatis.

## Backup dan restore

`deploy/backup/backup.sh` menulis `pg_dump -Fc` + tar `uploads/` dan `trash/` ke
`/var/backups/swiperstore/<tier>/<stamp>/`, lengkap dengan checksum SHA-256.
Retensi: 14 harian, 8 mingguan, 6 bulanan (promosi otomatis; snapshot pertama pada
suatu periode menjadi wakil periode itu). Offsite opsional dan terenkripsi `age`.

```bash
sudo install -d -m 700 -o swiperstore -g swiperstore /var/backups/swiperstore
sudo install -d -m 750 -o root -g swiperstore /etc/swiperstore
sudo install -m 640 -o root -g swiperstore \
  deploy/backup/backup.env.example /etc/swiperstore/backup.env
sudo -e /etc/swiperstore/backup.env      # isi DATABASE_URL, UPLOAD_DIR, BACKUP_ROOT

sudo touch /var/log/swiperstore-backup.log
sudo chown swiperstore:swiperstore /var/log/swiperstore-backup.log
sudo crontab -u swiperstore -e
```

```cron
30 2 * * * /srv/swiperstore/current/deploy/backup/backup.sh >> /var/log/swiperstore-backup.log 2>&1
```

Uji restore setiap bulan ke database scratch (tidak menyentuh produksi):

```bash
cd /srv/swiperstore/current
sudo -u swiperstore \
  RESTORE_DATABASE_URL=postgres://swiperstore:PASSWORD@127.0.0.1:5432/swiperstore_restore_check \
  deploy/backup/verify-restore.sh
```

Script memverifikasi checksum, membuat database `*_restore_check`, me-restore dump,
mengekstrak media, lalu memastikan setiap `thumbnail_path` punya file di arsip.
Database scratch dihapus setelah selesai.

Restore darurat ke produksi (service berhenti dulu):

```bash
sudo systemctl stop swiperstore
sudo -u postgres dropdb swiperstore && sudo -u postgres createdb -O swiperstore swiperstore
pg_restore --no-owner --no-privileges -d postgres://swiperstore:PASSWORD@127.0.0.1:5432/swiperstore \
  /var/backups/swiperstore/daily/<stamp>/db.dump
sudo tar -xzf /var/backups/swiperstore/daily/<stamp>/media.tar.gz \
  -C /srv/swiperstore/shared/storage
sudo systemctl start swiperstore
```

Nginx melayani `/media/` langsung dari disk, membatasi body 10 MB, menambahkan HSTS,
dan menandai seluruh `/admin` sebagai `noindex`.

## Catatan pengembangan

- Gunakan `localhost`, bukan `127.0.0.1`, saat membuka dev server. Next 16 memblokir
  chunk dan HMR dari origin berbeda sehingga halaman tidak ter-hydrate.
- Gambar thumbnail disajikan sebagai file WebP yang sudah dioptimalkan; komponen
  memang memakai `<img>` dan bukan `next/image`, sehingga optimizer Next dilewati.
- Halaman admin memakai Server Actions yang selalu memanggil `requireAdmin()`.
