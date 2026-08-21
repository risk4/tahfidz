#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Script deploy otomatis untuk aplikasi Tahfidz di VPS
# Cara pakai: ./deploy.sh
# =============================================================================

set -e  # Berhenti jika ada command yang gagal

# Warna output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

log "========================================"
log " Tahfidz App — Deploy Script"
log "========================================"

# --------------------------------------------------------------------------
# 1. Pull kode terbaru dari GitHub
# --------------------------------------------------------------------------
log "1/6 · Menarik kode terbaru dari GitHub..."
git pull origin main || fail "git pull gagal"

# --------------------------------------------------------------------------
# 2. Validasi konfigurasi produksi (.env)
# --------------------------------------------------------------------------
# Kegagalan konfigurasi berbahaya (debug aktif / APP_KEY kosong) harus
# menghentikan deploy sebelum aplikasi melayani trafik.
log "2/6 · Memeriksa konfigurasi produksi..."

if [ ! -f .env ]; then
  fail "File .env tidak ditemukan. Salin .env.example dan sesuaikan dulu."
fi

APP_ENV_VAL=$(sed -n 's/^APP_ENV=//p' .env | tail -n 1 | tr -d '"' | tr -d ' ')
APP_DEBUG_VAL=$(sed -n 's/^APP_DEBUG=//p' .env | tail -n 1 | tr -d '"' | tr -d ' ')

if [ "$APP_ENV_VAL" = "production" ]; then
  if [ "$APP_DEBUG_VAL" != "false" ]; then
    fail "APP_DEBUG harus 'false' saat APP_ENV=production (kebocoran informasi sensitif)."
  fi

  if ! grep -qE '^APP_KEY=base64:.+' .env; then
    fail "APP_KEY belum di-generate. Jalankan: php artisan key:generate"
  fi
fi

# --------------------------------------------------------------------------
# 3. Install / update PHP dependencies
# --------------------------------------------------------------------------
log "3/6 · Menginstall PHP dependencies..."
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev \
  || fail "composer install gagal"

# --------------------------------------------------------------------------
# 4. Build frontend assets
# --------------------------------------------------------------------------
log "4/6 · Membangun frontend assets (npm run build)..."
npm ci --prefer-offline 2>/dev/null || npm install
npm run build || fail "npm run build gagal"

# --------------------------------------------------------------------------
# 5. Laravel housekeeping
# --------------------------------------------------------------------------
log "5/6 · Menjalankan perintah Laravel..."

php artisan migrate --force        || fail "migrate gagal"
php artisan storage:link 2>/dev/null || warn "storage:link sudah ada, dilewati"
php artisan config:clear
php artisan cache:clear
php artisan view:clear
php artisan route:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# --------------------------------------------------------------------------
# 6. Set permission direktori storage & cache
# --------------------------------------------------------------------------
log "6/6 · Mengatur permission storage & bootstrap/cache..."
chmod -R 775 storage bootstrap/cache
# Sesuaikan owner jika perlu (uncomment baris di bawah dan ganti www-data
# dengan user web server di VPS Anda, misalnya: www-data, nginx, nobody)
# chown -R www-data:www-data storage bootstrap/cache

log "========================================"
log " Deploy selesai! ✓"
log "========================================"
