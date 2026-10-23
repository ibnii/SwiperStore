#!/usr/bin/env bash
# Swiper Store — nightly backup.
#
# Writes a PostgreSQL custom-format dump plus a tarball of uploads/ and trash/
# into $BACKUP_ROOT/<tier>/<stamp>/, with SHA-256 checksums, retention
# promotion (daily -> weekly -> monthly), and optional encrypted offsite copy.
#
# Configuration comes from the environment or an env file:
#   /etc/swiperstore/backup.env  (production)
#   deploy/backup/backup.env     (local override)
# See deploy/backup/backup.env.example for every variable.

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
    log "Memuat konfigurasi: $candidate"
    set -a
    # shellcheck disable=SC1090
    . "$candidate"
    set +a
    break
  fi
done

: "${DATABASE_URL:?DATABASE_URL wajib diisi}"
: "${UPLOAD_DIR:?UPLOAD_DIR wajib diisi}"
: "${BACKUP_ROOT:?BACKUP_ROOT wajib diisi}"

PG_DUMP="${PG_DUMP:-pg_dump}"
command -v "$PG_DUMP" >/dev/null 2>&1 || die "$PG_DUMP tidak ditemukan"

[ -d "$UPLOAD_DIR" ] || die "UPLOAD_DIR tidak ada: $UPLOAD_DIR"

BACKUP_ROOT="${BACKUP_ROOT%/}"
mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"

LOCK_DIR="$BACKUP_ROOT/.lock"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  LOCK_PID=$(cat "$LOCK_DIR/pid" 2>/dev/null || true)
  if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
    die "backup lain masih berjalan (pid $LOCK_PID)"
  fi
  log "Menghapus lock basi"
  rm -rf "$LOCK_DIR"
  mkdir "$LOCK_DIR"
fi
printf '%s\n' "$$" > "$LOCK_DIR/pid"
trap 'rm -rf "$LOCK_DIR"' EXIT INT TERM

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1"
  else
    shasum -a 256 "$1"
  fi
}

UPLOAD_ABS=$(cd "$UPLOAD_DIR" && pwd)
TRASH_DIR="${TRASH_DIR:-$(dirname "$UPLOAD_ABS")/trash}"
TRASH_ABS=""
if [ -d "$TRASH_DIR" ]; then
  TRASH_ABS=$(cd "$TRASH_DIR" && pwd)
fi

STAMP=$(date -u +%Y%m%d-%H%M%S)
SNAP="$BACKUP_ROOT/daily/$STAMP"
mkdir -p "$SNAP"
chmod 700 "$BACKUP_ROOT/daily" "$SNAP"

log "Membuat dump database"
"$PG_DUMP" \
  --format=custom \
  --compress=6 \
  --no-owner \
  --no-privileges \
  --file "$SNAP/db.dump" \
  "$DATABASE_URL"

log "Membuat arsip media"
TAR_ARGS=(
  -czf "$SNAP/media.tar.gz"
  -C "$(dirname "$UPLOAD_ABS")" "$(basename "$UPLOAD_ABS")"
)
if [ -n "$TRASH_ABS" ]; then
  TAR_ARGS+=(-C "$(dirname "$TRASH_ABS")" "$(basename "$TRASH_ABS")")
fi
tar "${TAR_ARGS[@]}"

(
  cd "$SNAP"
  sha256_file db.dump > manifest.sha256
  sha256_file media.tar.gz >> manifest.sha256
)

DB_BYTES=$(wc -c < "$SNAP/db.dump" | tr -d ' ')
MEDIA_BYTES=$(wc -c < "$SNAP/media.tar.gz" | tr -d ' ')
log "Snapshot selesai: $SNAP (db ${DB_BYTES}B, media ${MEDIA_BYTES}B)"

link_snapshot() {
  target="$1"
  if [ -d "$target" ] && [ -n "$(ls -A "$target" 2>/dev/null)" ]; then
    log "Snapshot periode sudah ada: $target"
    return 0
  fi
  mkdir -p "$target"
  if ! cp -al "$SNAP/." "$target/" 2>/dev/null; then
    cp -a "$SNAP/." "$target/"
  fi
  log "Snapshot periode dibuat: $target"
}

# The first successful run of a period becomes that period's snapshot, so a
# missed night never leaves a week or month without a retained copy.
WEEK_TAG=$(date -u +%G-W%V)
MONTH_TAG=$(date -u +%Y-%m)
link_snapshot "$BACKUP_ROOT/weekly/$WEEK_TAG"
link_snapshot "$BACKUP_ROOT/monthly/$MONTH_TAG"

prune() {
  tier="$1"
  keep="$2"
  root="$BACKUP_ROOT/$tier"
  [ -d "$root" ] || return 0
  count=0
  find "$root" -mindepth 1 -maxdepth 1 -type d -print | sort -r | while IFS= read -r dir; do
    count=$((count + 1))
    if [ "$count" -gt "$keep" ]; then
      rm -rf "$dir"
      log "Hapus \($tier\): $dir"
    fi
  done
}

prune daily "${RETENTION_DAILY:-14}"
prune weekly "${RETENTION_WEEKLY:-8}"
prune monthly "${RETENTION_MONTHLY:-6}"

if [ -n "${OFFSITE_DIR:-}" ]; then
  [ -n "${AGE_RECIPIENT:-}" ] || die "OFFSITE_DIR diset tetapi AGE_RECIPIENT kosong"
  command -v age >/dev/null 2>&1 || die "OFFSITE_DIR diset tetapi age tidak terpasang"

  OFFSITE_DIR="${OFFSITE_DIR%/}"
  mkdir -p "$OFFSITE_DIR"
  ENCRYPTED="$OFFSITE_DIR/swiperstore-$STAMP.tar.age"

  log "Membuat salinan offsite terenkripsi: $ENCRYPTED"
  tar -C "$BACKUP_ROOT/daily" -cf - "$STAMP" |
    age -r "$AGE_RECIPIENT" -o "$ENCRYPTED"

  count=0
  find "$OFFSITE_DIR" -mindepth 1 -maxdepth 1 -name 'swiperstore-*.tar.age' -type f -print |
    sort -r |
    while IFS= read -r file; do
      count=$((count + 1))
      if [ "$count" -gt "${RETENTION_DAILY:-14}" ]; then
        rm -f "$file"
        log "Hapus offsite: $file"
      fi
    done
fi

log "Backup selesai"
