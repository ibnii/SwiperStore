#!/usr/bin/env bash
# Backup harian Swiper Store: dump PostgreSQL + arsip gambar upload.
# Jalankan manual: deploy/backup/backup.sh
# Atau via cron:   0 2 * * * /var/www/swiperstore/deploy/backup/backup.sh >> /var/log/swiperstore-backup.log 2>&1

set -euo pipefail

SKRIP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${BACKUP_ENV:-${SKRIP_DIR}/backup.env}"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "File konfigurasi tidak ditemukan: $ENV_FILE" >&2
    echo "Salin backup.env.example menjadi backup.env lalu isi nilainya." >&2
    exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

: "${DB_HOST:?DB_HOST wajib diisi}"
: "${DB_PORT:?DB_PORT wajib diisi}"
: "${DB_NAME:?DB_NAME wajib diisi}"
: "${DB_USER:?DB_USER wajib diisi}"
: "${DB_PASS:?DB_PASS wajib diisi}"
: "${APP_DIR:?APP_DIR wajib diisi}"
: "${BACKUP_DIR:?BACKUP_DIR wajib diisi}"
RETENSI_HARI="${RETENSI_HARI:-14}"

UMUR="${TZ:-Asia/Jakarta}"
STAMP="$(TZ="$UMUR" date +%Y%m%d-%H%M%S)"
DUMP="${BACKUP_DIR}/db-${STAMP}.dump"
ARSIP="${BACKUP_DIR}/uploads-${STAMP}.tar.gz"

umask 077
mkdir -p "$BACKUP_DIR"

if [[ ! -d "${APP_DIR}/storage/uploads" ]]; then
    echo "Folder upload tidak ditemukan: ${APP_DIR}/storage/uploads" >&2
    exit 1
fi

echo "[$(TZ="$UMUR" date '+%Y-%m-%d %H:%M:%S')] Mulai backup ${DB_NAME}"

# Tulis ke .part dulu supaya file setengah jadi tidak dianggap backup valid.
PGPASSWORD="$DB_PASS" pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --format=custom \
    --no-owner \
    --no-privileges \
    --file="${DUMP}.part"

mv "${DUMP}.part" "$DUMP"

tar -czf "${ARSIP}.part" -C "$APP_DIR/storage" uploads
mv "${ARSIP}.part" "$ARSIP"

( cd "$BACKUP_DIR" && sha256sum "$(basename "$DUMP")" "$(basename "$ARSIP")" > "checksum-${STAMP}.sha256" )

echo "[$(TZ="$UMUR" date '+%Y-%m-%d %H:%M:%S')] Backup selesai: ${DUMP} dan ${ARSIP}"

find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' -o -name 'checksum-*.sha256' \) \
    -mtime "+${RETENSI_HARI}" -print -delete

echo "[$(TZ="$UMUR" date '+%Y-%m-%d %H:%M:%S')] Backup lebih lama dari ${RETENSI_HARI} hari dibersihkan."
