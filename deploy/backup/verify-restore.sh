#!/usr/bin/env bash
# Swiper Store — restore drill.
#
# Restores a backup snapshot into a scratch database, extracts its media
# tarball, and verifies that every listings.thumbnail_path resolves to a file
# from the same snapshot. The scratch database is dropped afterwards unless
# KEEP_RESTORE=1.
#
# Usage:
#   ./verify-restore.sh [snapshot-dir]
#   ./verify-restore.sh /var/backups/swiperstore/daily/20261024-020000
#
# Requires psql and pg_restore. RESTORE_DATABASE_URL must name a database that
# ends in _restore_check and lives on a PostgreSQL where the same credentials
# may create/drop databases.

set -euo pipefail
umask 077

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

die() {
  log "ERROR: $*" >&2
  exit 1
}

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

for candidate in "${BACKUP_ENV:-}" /etc/swiperstore/backup.env "$SCRIPT_DIR/backup.env"; do
  if [ -n "$candidate" ] && [ -f "$candidate" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$candidate"
    set +a
    break
  fi
done

: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL wajib diisi}"
: "${BACKUP_ROOT:?BACKUP_ROOT wajib diisi}"

PSQL="${PSQL:-psql}"
PG_RESTORE="${PG_RESTORE:-pg_restore}"
command -v "$PSQL" >/dev/null 2>&1 || die "$PSQL tidak ditemukan"
command -v "$PG_RESTORE" >/dev/null 2>&1 || die "$PG_RESTORE tidak ditemukan"

DB_NAME="${RESTORE_DATABASE_URL##*/}"
DB_NAME="${DB_NAME%%\?*}"
case "$RESTORE_DATABASE_URL" in
  *\?*) die "RESTORE_DATABASE_URL tidak boleh memakai query string" ;;
esac
case "$DB_NAME" in
  *_restore_check) ;;
  *) die "RESTORE_DATABASE_URL harus berakhir dengan _restore_check (nama: $DB_NAME)" ;;
esac
case "$DB_NAME" in
  *[!A-Za-z0-9_]*) die "Nama database restore mengandung karakter tidak aman: $DB_NAME" ;;
esac

if [ -n "${DATABASE_URL:-}" ]; then
  PROD_DB="${DATABASE_URL##*/}"
  PROD_DB="${PROD_DB%%\?*}"
  [ "$DB_NAME" = "$PROD_DB" ] && die "Database restore sama dengan database produksi"
fi

MAINT_URL="${RESTORE_MAINTENANCE_URL:-${RESTORE_DATABASE_URL%/*}/postgres}"
[ "$MAINT_URL" = "$RESTORE_DATABASE_URL" ] && die "Tidak bisa menurunkan URL maintenance; set RESTORE_MAINTENANCE_URL"

SNAP="${1:-}"
if [ -z "$SNAP" ]; then
  SNAP=$(find "$BACKUP_ROOT/daily" -mindepth 1 -maxdepth 1 -type d -print | sort | tail -n 1)
fi
[ -n "$SNAP" ] && [ -d "$SNAP" ] || die "Snapshot tidak ditemukan: ${SNAP:-<kosong>}"

log "Snapshot: $SNAP"
log "Memeriksa checksum"
(
  cd "$SNAP"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c manifest.sha256
  else
    shasum -a 256 -c manifest.sha256
  fi
)

MEDIA_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/swiperstore-restore.XXXXXX")

cleanup() {
  rm -rf "$MEDIA_ROOT"
  if [ "${KEEP_RESTORE:-0}" != "1" ]; then
    "$PSQL" "$MAINT_URL" -v ON_ERROR_STOP=1 -q \
      -c "DROP DATABASE IF EXISTS \"$DB_NAME\" WITH (FORCE)" >/dev/null 2>&1 || true
  else
    log "KEEP_RESTORE=1: database $DB_NAME dibiarkan"
  fi
}
trap cleanup EXIT INT TERM

log "Membuat database scratch: $DB_NAME"
"$PSQL" "$MAINT_URL" -v ON_ERROR_STOP=1 -q \
  -c "DROP DATABASE IF EXISTS \"$DB_NAME\" WITH (FORCE)" \
  -c "CREATE DATABASE \"$DB_NAME\""

log "Restore dump"
"$PG_RESTORE" --no-owner --no-privileges --exit-on-error \
  --dbname "$RESTORE_DATABASE_URL" "$SNAP/db.dump"

log "Mengekstrak media"
tar -xzf "$SNAP/media.tar.gz" -C "$MEDIA_ROOT"

TOTAL=$("$PSQL" "$RESTORE_DATABASE_URL" -At -q -c "select count(*) from listings")
SOLD=$("$PSQL" "$RESTORE_DATABASE_URL" -At -q -c "select count(*) from listings where is_sold")
log "Listing: $TOTAL total, $SOLD terjual"

CHECKED=0
MISSING=0
while IFS= read -r thumb; do
  [ -n "$thumb" ] || continue
  CHECKED=$((CHECKED + 1))
  REL="${thumb#/media/}"
  if [ ! -f "$MEDIA_ROOT/uploads/$REL" ]; then
    MISSING=$((MISSING + 1))
    if [ "$MISSING" -le 10 ]; then
      log "Thumbnail hilang: $thumb"
    fi
  fi
done < <("$PSQL" "$RESTORE_DATABASE_URL" -At -q -c "select thumbnail_path from listings order by code")

log "Thumbnail diperiksa: $CHECKED, hilang: $MISSING"

if [ "$MISSING" -gt 0 ]; then
  die "Restore tidak lengkap: $MISSING thumbnail tidak ada di arsip media"
fi

log "Restore drill OK"
