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
log "1/5 · Menarik kode terbaru dari GitHub..."
git pull origin main || fail "git pull gagal"

# --------------------------------------------------------------------------
# 2. Install / update PHP dependencies
# --------------------------------------------------------------------------
log "2/5 · Menginstall PHP dependencies..."
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev \
  || fail "composer install gagal"

# --------------------------------------------------------------------------
# 3. Build frontend assets
# --------------------------------------------------------------------------
log "3/5 · Membangun frontend assets (npm run build)..."
npm ci --prefer-offline 2>/dev/null || npm install
npm run build || fail "npm run build gagal"

# --------------------------------------------------------------------------
# 4. Laravel housekeeping
# --------------------------------------------------------------------------
log "4/5 · Menjalankan perintah Laravel..."

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
# 5. Set permission direktori storage & cache
# --------------------------------------------------------------------------
log "5/5 · Mengatur permission storage & bootstrap/cache..."
chmod -R 775 storage bootstrap/cache
# Sesuaikan owner jika perlu (uncomment baris di bawah dan ganti www-data
# dengan user web server di VPS Anda, misalnya: www-data, nginx, nobody)
# chown -R www-data:www-data storage bootstrap/cache

log "========================================"
log " Deploy selesai! ✓"
log "========================================"
