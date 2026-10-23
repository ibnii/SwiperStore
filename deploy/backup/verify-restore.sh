#!/usr/bin/env bash
# Uji hasil backup tanpa menyentuh database produksi.
# Skrip membuat database sementara, memulihkan dump ke sana, menghitung baris,
# lalu menghapus database sementara tersebut.
#
# Pemakaian:
#   deploy/backup/verify-restore.sh /var/backups/swiperstore/db-20261024-020000.dump
#   deploy/backup/verify-restore.sh db.dump uploads.tar.gz

set -euo pipefail

SKRIP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${BACKUP_ENV:-${SKRIP_DIR}/backup.env}"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "File konfigurasi tidak ditemukan: $ENV_FILE" >&2
    exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

DUMP="${1:-}"
ARSIP="${2:-}"

if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
    echo "Pemakaian: $0 <file.dump> [uploads.tar.gz]" >&2
    exit 1
fi

if [[ -n "$ARSIP" && ! -f "$ARSIP" ]]; then
    echo "Arsip upload tidak ditemukan: $ARSIP" >&2
    exit 1
fi

UMUR="${TZ:-Asia/Jakarta}"
DB_UJI="swiperstore_uji_$$"

bersihkan() {
    PGPASSWORD="$DB_PASS" dropdb \
        --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
        --if-exists "$DB_UJI" >/dev/null 2>&1 || true
}
trap bersihkan EXIT

echo "Membuat database uji sementara: ${DB_UJI}"
PGPASSWORD="$DB_PASS" createdb \
    --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
    --template=template0 "$DB_UJI"

echo "Memulihkan dump ke database uji..."
PGPASSWORD="$DB_PASS" pg_restore \
    --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
    --dbname="$DB_UJI" --no-owner --no-privileges --exit-on-error "$DUMP"

JUMLAH_AKUN="$(PGPASSWORD="$DB_PASS" psql --host="$DB_HOST" --port="$DB_PORT" \
    --username="$DB_USER" --dbname="$DB_UJI" -tA -c 'SELECT count(*) FROM akun')"
JUMLAH_ADMIN="$(PGPASSWORD="$DB_PASS" psql --host="$DB_HOST" --port="$DB_PORT" \
    --username="$DB_USER" --dbname="$DB_UJI" -tA -c 'SELECT count(*) FROM admin')"

echo "OK database: akun=${JUMLAH_AKUN} admin=${JUMLAH_ADMIN}"

if [[ -n "$ARSIP" ]]; then
    FOLDER_UJI="$(mktemp -d)"
    trap 'rm -rf "$FOLDER_UJI"; bersihkan' EXIT
    tar -xzf "$ARSIP" -C "$FOLDER_UJI"
    JUMLAH_GAMBAR="$(find "$FOLDER_UJI/uploads" -type f -name '*.webp' | wc -l | tr -d ' ')"
    echo "OK upload: gambar_webp=${JUMLAH_GAMBAR}"
fi

echo "[$(TZ="$UMUR" date '+%Y-%m-%d %H:%M:%S')] Verifikasi backup selesai; database uji dihapus."
