# Tahfidz App

Tahfidz App adalah aplikasi web untuk membantu pengelolaan program tahfidz Al-Qur'an di sekolah, pesantren, atau lembaga pendidikan. Aplikasi ini menyediakan pencatatan data siswa, guru, kelompok tahfidz, setoran hafalan, murajaah, serta pemantauan progress hafalan siswa.

Backend aplikasi menggunakan Laravel, sedangkan frontend menggunakan React, TypeScript, Vite, Tailwind CSS, dan TanStack Query.

## Fitur Utama

- Autentikasi API berbasis Laravel Sanctum.
- Role pengguna: Super Admin, Guru, dan Siswa.
- Manajemen tahun ajaran, guru, kelas, siswa, dan kelompok tahfidz.
- Data Al-Qur'an: juz, surah, ayat, teks Arab, dan terjemahan.
- Setoran Hafalan:
  - Pencatatan hafalan baru dan pengulangan.
  - Penilaian kelancaran, tajwid, makhraj, dan fashahah.
  - Tampilan ayat yang disetorkan.
  - Audio ayat dan tombol Play Semua.
  - Toggle tampil/sembunyi terjemahan.
- Murajaah:
  - Pencatatan pengulangan hafalan.
  - Tampilan ayat murajaah.
  - Audio ayat dan tombol Play Semua.
  - Status hafalan per ayat: belum dihafal, sedang dihafal, dan sudah hafal.
- Pengecekan Bacaan:
  - Siswa membacakan hafalan lewat mikrofon (Web Speech API, bahasa Arab).
  - Hasil dibandingkan per kata dengan teks ayat; kata salah/tidak terbaca ditandai.
  - Bersifat realtime. Opsi penyimpanan ke riwayat tersedia di Pengaturan (default nonaktif).
- Progress Hafalan:
  - Ringkasan progress siswa.
  - Progress per surah.
  - Perhitungan progress berdasarkan ayat berstatus `memorized`.

## Teknologi

### Backend

- PHP 8.3+
- Laravel 13
- Laravel Sanctum
- Eloquent ORM
- Database migration dan seeder

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- React Hook Form
- Zod
- Axios
- Lucide React

## Kebutuhan Sistem

Pastikan perangkat sudah memiliki:

- PHP 8.3 atau lebih baru
- Composer
- Node.js dan npm
- Database SQLite, MySQL, atau MariaDB
- Git

Untuk lingkungan lokal Windows, aplikasi ini dapat dijalankan menggunakan Laragon, XAMPP, atau `php artisan serve`. Untuk instalasi di VPS Linux (Ubuntu/Debian), lihat bagian **Instalasi di VPS** di bawah.

## Instalasi Lokal

### 1. Clone repository

```bash
git clone https://github.com/risk4/tahfidz.git
cd tahfidz
```

### 2. Install dependency PHP

```bash
composer install
```

### 3. Install dependency frontend

```bash
npm install
```

### 4. Salin file environment

```bash
cp .env.example .env
```

Jika menggunakan Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 5. Generate application key

```bash
php artisan key:generate
```

### 6. Konfigurasi database

Secara default `.env.example` menggunakan SQLite:

```env
DB_CONNECTION=sqlite
```

Jika ingin menggunakan SQLite, buat file database:

```bash
touch database/database.sqlite
```

Jika menggunakan Windows PowerShell:

```powershell
New-Item database/database.sqlite -ItemType File
```

Jika menggunakan MySQL atau MariaDB, ubah konfigurasi `.env` menjadi contoh berikut:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tahfidz_app
DB_USERNAME=root
DB_PASSWORD=
```

Pastikan database `tahfidz_app` sudah dibuat.

### 7. Jalankan migration dan seeder

```bash
php artisan migrate --seed
```

Seeder akan membuat data awal tahun ajaran, user, guru, kelas, siswa, kelompok tahfidz, serta data Al-Qur'an.

### 8. Build asset frontend

Untuk development:

```bash
npm run dev
```

Untuk production build:

```bash
npm run build
```

### 9. Jalankan server Laravel

```bash
php artisan serve
```

Aplikasi dapat dibuka di:

```txt
http://127.0.0.1:8000
```

Jika menggunakan Laragon/Apache/Nginx, pastikan document root mengarah ke folder:

```txt
public
```

## Instalasi di VPS

Panduan berikut menargetkan VPS Linux (Ubuntu/Debian) dengan **Nginx + PHP-FPM** dan **MySQL/MariaDB**. Langkah ini mengasumsikan Anda sudah masuk sebagai user dengan hak `sudo` dan sudah punya domain yang mengarah ke IP VPS.

### 1. Install dependency sistem

```bash
sudo apt update
sudo apt install -y nginx mysql-server software-properties-common \
    git unzip curl

# Tambahkan repositori php sury.org (Ubuntu) agar mendapat PHP 8.3+
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# Install PHP 8.3 dan ekstensi yang dibutuhkan Laravel
sudo apt install -y php8.3-fpm php8.3-cli php8.3-mbstring php8.3-xml \
    php8.3-curl php8.3-zip php8.3-mysql php8.3-gd php8.3-intl \
    php8.3-bcmath php8.3-sqlite3 php8.3-bz2
```

Catatan: jika hanya memakai SQLite, ekstensi `php8.3-mysql` bisa diganti `php8.3-sqlite3` dan abaikan langkah MySQL di bawah.

### 2. Install Composer dan Node.js

```bash
# Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Node.js 20+ (gunakan versi LTS terbaru)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verifikasi instalasi:

```bash
composer --version
node -v
npm -v
```

### 3. Siapkan database MySQL

```bash
sudo mysql
```

Di prompt MySQL, buat database dan user khusus (ganti nilai sesuai kebutuhan):

```sql
CREATE DATABASE tahfidz_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tahfidz'@'localhost' IDENTIFIED BY 'GANTI_DENGAN_PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON tahfidz_app.* TO 'tahfidz'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Clone repository dan install dependency

```bash
cd /var/www
sudo git clone https://github.com/risk4/tahfidz.git
cd tahfidz

sudo chown -R $USER:www-data .
sudo chmod -R 775 storage bootstrap/cache

composer install --no-dev --optimize-autoloader
npm install
npm run build
```

### 5. Konfigurasi environment

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env`:

```bash
nano .env
```

Ubah setidaknya menjadi:

```env
APP_NAME="Tahfidz App"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://domain-anda.com

# Opsional: tetap gunakan password seeder yang sama
# SEED_USER_PASSWORD=GANTI_PRINT_KE_KONSOLE_ATAU_KOSONGKAN

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tahfidz_app
DB_USERNAME=tahfidz
DB_PASSWORD=GANTI_DENGAN_PASSWORD_KUAT
```

> **Tips password seeder:** jika `SEED_USER_PASSWORD` dibiarkan kosong, setiap akun seeder akan diberi password acak dan dicetak ke console saat seeding. Jika diisi, password tersebut yang dipakai untuk ketiga akun seeder — sebaiknya diubah setelah login pertama.

### 6. Jalankan migration dan seeder

```bash
php artisan migrate --seed --force
```

### 7. Set permission storage dan symlink

```bash
sudo chown -R www-data:www-data storage bootstrap/cache

# Buat symlink agar file upload (mis. logo) bisa diakses publik
php artisan storage:link
```

### 8. Konfigurasi Nginx

Buat file konfigurasi site:

```bash
sudo nano /etc/nginx/sites-available/tahfidz
```

Isi dengan (ganti `domain-anda.com` dan path sesuai lokasi repo):

```nginx
server {
    listen 80;
    server_name domain-anda.com;
    root /var/www/tahfidz/public;

    index index.php index.html;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Aset statis di-cache lama; file dari symlink storage juga dilayani
    location ~* \.(css|js|jpg|jpeg|png|gif|webp|svg|ico|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    client_max_body_size 20M;
}
```

Aktifkan site dan reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/tahfidz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9. Setup queue worker (Supervisor)

Aplikasi memakai driver queue `database` (migration `jobs`). Jalankan worker agar proses async (notifikasi, dll.) berjalan. Install Supervisor:

```bash
sudo apt install -y supervisor
```

Buat file konfigurasi:

```bash
sudo nano /etc/supervisor/conf.d/tahfidz-worker.conf
```

Isi dengan (sesuaikan path):

```ini
[program:tahfidz-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/tahfidz/artisan queue:work --sleep=3 --tries=3
directory=/var/www/tahfidz
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/tahfidz/storage/logs/worker.log
stopwaitsecs=3600
```

Reload dan aktifkan:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start tahfidz-worker:*
```

Jika nanti ada penjadwalan (mis. backup otomatis), daftarkan Laravel scheduler ke cron:

```bash
sudo crontab -e
```

```cron
* * * * * cd /var/www/tahfidz && php artisan schedule:run >> /dev/null 2>&1
```

### 10. HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domain-anda.com
```

Pastikan `APP_URL` di `.env` sudah `https://`, lalu:

```bash
cd /var/www/tahfidz
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize:clear
sudo systemctl reload nginx
```

### 11. Verify

Akses `https://domain-anda.com`. Login menggunakan akun seeder (lihat bagian **Akun Seeder** di bawah). Jika `SEED_USER_PASSWORD` kosong, password acak dicetak saat seeding dan tidak ditampilkan lagi.

Panduan deployment/pemeliharaan yang lebih ringkas dapat dilihat pada bagian **Deployment Singkat** di bawah.

## Akun Seeder

Setelah menjalankan seeder, tersedia akun awal berikut:

| Role | Email |
|---|---|
| Super Admin | admin@example.com |
| Guru | guru1@example.com |
| Siswa | siswa1@example.com |

Password setiap akun **dibuat acak saat seeding** dan dicetak ke console (baris diawali `Akun seeder dibuat dengan password acak...`). Simpan catatan password tersebut karena tidak akan ditampilkan lagi.

Semua akun seeder ditandai `must_change_password` — pada login pertama, aplikasi akan mewajibkan pengguna mengganti password sebelum bisa mengakses fitur lain.

Untuk development lokal yang ingin password tetap, set variabel env `SEED_USER_PASSWORD` (mis. `SEED_USER_PASSWORD=password`) lalu jalankan `php artisan migrate:fresh --seed`.

## Struktur Menu

### Dashboard

Menampilkan ringkasan data dan akses cepat sesuai role pengguna.

### Tahun Ajaran

Mengelola tahun ajaran dan menentukan tahun ajaran aktif.

### Guru

Mengelola data guru pembimbing tahfidz.

### Kelas

Mengelola kelas siswa.

### Siswa

Mengelola data siswa dan relasinya dengan kelas serta tahun ajaran.

### Kelompok Tahfidz

Mengelola kelompok tahfidz, guru pembimbing, dan anggota kelompok.

### Setoran Hafalan

Digunakan untuk mencatat hafalan baru atau pengulangan yang disetorkan siswa kepada guru. Menu ini juga dapat menampilkan ayat Al-Qur'an sesuai rentang setoran agar guru dapat mengecek bacaan siswa.

### Murajaah

Digunakan untuk mencatat pengulangan hafalan lama. Pada menu ini guru dapat memberi status hafalan per ayat, seperti belum dihafal, sedang dihafal, atau sudah hafal.

### Progress

Menampilkan perkembangan hafalan siswa. Progress dihitung berdasarkan cakupan ayat yang sudah berstatus hafal.

## Perbedaan Setoran Hafalan dan Murajaah

Setoran Hafalan digunakan ketika siswa menyetorkan hafalan baru atau pengulangan resmi kepada guru. Fokusnya adalah pencatatan capaian setoran dan nilai kualitas bacaan.

Murajaah digunakan untuk mengulang dan menjaga hafalan yang sudah pernah dipelajari. Fokusnya adalah pemeliharaan hafalan dan evaluasi status hafalan per ayat.

Singkatnya:

```txt
Setoran Hafalan = pencatatan setoran/capaian hafalan
Murajaah = pengulangan dan penguatan hafalan
```

## Perintah yang Sering Digunakan

Menjalankan migration:

```bash
php artisan migrate
```

Menjalankan migration dengan seeder:

```bash
php artisan migrate --seed
```

Reset database dan seed ulang:

```bash
php artisan migrate:fresh --seed
```

Membersihkan cache Laravel:

```bash
php artisan optimize:clear
```

Menjalankan frontend development server:

```bash
npm run dev
```

Build frontend untuk production:

```bash
npm run build
```

Menjalankan test Laravel:

```bash
php artisan test
```

## Catatan Data Al-Qur'an dan Audio

- Data ayat disediakan melalui seeder `QuranSeeder`.
- Jika teks ayat lokal masih berupa placeholder, frontend dapat mencoba mengambil data ayat dari API eksternal Al-Qur'an.
- Audio ayat menggunakan sumber publik EveryAyah.
- Pastikan koneksi internet tersedia jika fitur fallback ayat eksternal atau audio digunakan.

## Deployment Singkat

> Untuk panduan lengkap instalasi di VPS (dependency, database MySQL, Nginx, queue worker, HTTPS), lihat bagian **Instalasi di VPS** di atas.

Ringkasan langkah deployment ke server:

1. Clone repository ke server.
2. Jalankan `composer install --no-dev --optimize-autoloader`.
3. Jalankan `npm install` dan `npm run build`.
4. Salin dan konfigurasi `.env`.
5. Jalankan `php artisan key:generate` jika belum ada `APP_KEY`.
6. Jalankan `php artisan migrate --force`.
7. Jalankan `php artisan storage:link` (jika belum) agar file upload bisa diakses.
8. Jalankan `php artisan optimize:clear`.
9. Arahkan web server ke folder `public`.

Contoh optimasi cache untuk production:

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Keamanan

- Jangan commit file `.env`.
- Jangan gunakan password default di production.
- Pastikan `APP_DEBUG=false` di production.
- Gunakan HTTPS untuk deployment publik.
- Batasi akses database hanya dari server aplikasi.

## Lisensi

Project ini dibuat untuk kebutuhan pengelolaan tahfidz. Silakan sesuaikan lisensi penggunaan sesuai kebutuhan pemilik repository.
