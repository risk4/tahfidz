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

Untuk lingkungan lokal Windows, aplikasi ini dapat dijalankan menggunakan Laragon, XAMPP, atau `php artisan serve`. Untuk instalasi di VPS (dengan **aaPanel + Nginx**), lihat bagian **Instalasi di VPS** di bawah.

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

## Instalasi di VPS (aaPanel + Nginx)

Panduan berikut menargetkan VPS Linux yang sudah terinstall **aaPanel** (dengan **Nginx**). aaPanel akan menangani instalasi PHP, MySQL, pembuatan situs, dan SSL. Anda hanya perlu menjalankan perintah via SSH untuk Composer, npm, dan perintah Artisan.

> Prasyarat: domain sudah diarahkan (DNS) ke IP VPS, dan Anda sudah bisa mengakses panel aaPanel serta terminal SSH.

### 1. Install software via aaPanel

Masuk ke panel aaPanel (biasanya `http://<IP_VPS>:8888`), lalu pada menu **App Store / Software Store** install:

- **Nginx** (versi terbaru / 1.2x)
- **MySQL** (5.7 atau 8.0)
- **PHP** (pilih versi **8.2 atau 8.3** — aplikasi butuh PHP 8.3+)

Setelah PHP terinstall, buka **PHP → Setting → Install extension** dari aaPanel dan pastikan ekstensi berikut aktif (ekstensi wajib ditandai):

- `fileinfo` (wajib)
- `openssl` (wajib)
- `mbstring` (wajib)
- `xml` / `dom` (wajib)
- `curl` (wajib)
- `zip` (wajib, untuk Composer/phpspreadsheet)
- `gd` (untuk upload gambar)
- `bcmath` (untuk phpspreadsheet)
- `exif` (disarankan)

Catatan: di aaPanel, perintah `php` di terminal sering mengarah ke versi PHP yang belum diaktifkan. Untuk memakai PHP versi tertentu, gunakan path lengkap, mis. `/www/server/php/83/bin/php` (sesuaikan angka versinya), atau atur sebagai alias:

```bash
php -v                        # cek apakah sudah PHP 8.3
ls /www/server/php/           # lihat versi PHP yang terinstall di aaPanel
```

### 2. Install Composer dan Node.js (via SSH)

```bash
# Composer (global)
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Node.js 20+ / 22+ (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verifikasi:

```bash
composer --version
node -v
npm -v
```

Jika `composer` tidak ditemukan karena PATH user aaPanel, gunakan `php /usr/local/bin/composer ...` atau sesuaikan.

### 3. Buat situs dan database di aaPanel

1. Buka menu **Website → Add site**.
2. Isi **Domain** dengan domain yang sudah diarahkan (mis. `tahfidz.example.com`).
3. **PHP Version**: pilih **PHP 8.3**.
4. Centang **Create Database** dan isi nama database + username + password sendiri (pastikan tipe **MySQL/utf8mb4**).
5. Selesaikan pembuatan. Catat nama database, username, dan password yang dibuat.
6. Lokasi root situs default aaPanel: `/www/wwwroot/tahfidz.example.com/`.

### 4. Deploy kode aplikasi ke root situs

Via SSH, pindah ke direktori root situs dan clone repository:

```bash
cd /www/wwwroot/tahfidz.example.com
rm -rf *
git clone https://github.com/risk4/tahfidz.git .

# Atur permission agar situs (user www) bisa membaca/menulis
sudo chown -R www:www .
sudo chmod -R 775 storage bootstrap/cache
```

Install dependency:

```bash
composer install --no-dev --optimize-autoloader
npm install
npm run build
```

### 5. Konfigurasi environment

```bash
cp .env.example .env
php artisan key:generate    # atau /www/server/php/83/bin/php artisan key:generate
```

Edit `.env`:

```bash
nano .env
```

Ubah setidaknya menjadi (sesuaikan nama DB/user/password dari langkah 3):

```env
APP_NAME="Tahfidz App"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://domain-anda.com

# Opsional: jika diisi, password ini dipakai untuk ketiga akun seeder
# SEED_USER_PASSWORD=pass123

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=NAMA_DATABASE
DB_USERNAME=USER_DATABASE
DB_PASSWORD=PASSWORD_DATABASE
```

> **Tips password seeder:** secara default, ketiga akun seeder memakai password **`password`**. Jika `SEED_USER_PASSWORD` diisi di `.env`, nilai tersebut yang dipakai menggantikan default — sebaiknya diubah setelah login pertama.

### 6. Jalankan migration dan seeder

```bash
php artisan migrate --seed --force
# atau: /www/server/php/83/bin/php artisan migrate --seed --force
```

### 7. Set permission dan symlink storage

```bash
sudo chown -R www:www storage bootstrap/cache

# Buat symlink agar file upload (mis. logo) bisa diakses publik
php artisan storage:link
```

### 8. Set document root ke folder `public`

Aplikasi Laravel mengharuskan document root mengarah ke folder `public`, bukan root situs. Di aaPanel:

1. Buka **Website → (pilih situs) → Setting / 网站目录 (Directory)**.
2. Ubah **Document Root (运行目录)** menjadi:
   ```txt
   /www/wwwroot/tahfidz.example.com/public
   ```
3. Pastikan pengaturan **Anti-leech / 防跨站** (anti-cross-site) diarahkan juga ke direktori `public` agar folder lain di luar `public` tidak bisa diakses langsung.
4. Simpan dan reload situs.

### 9. Aktifkan HTTPS (SSL)

1. Di aaPanel, buka **Website → SSL** untuk situs tersebut.
2. Pilih **Let's Encrypt** → generate sertifikat untuk domain.
3. Aktifkan **Force HTTPS** (强制 HTTPS) agar semua request dialihkan ke `https://`.

Pastikan `APP_URL` di `.env` sudah menggunakan `https://`, lalu:

```bash
cd /www/wwwroot/tahfidz.example.com
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize:clear
```

### 10. Setup queue worker (Supervisor/Cron di aaPanel)

Aplikasi memakai driver queue `database` (migration `jobs`). Jalankan worker agar proses async (notifikasi, dll.) berjalan. aaPanel menyediakan menu **Process Daemon (守护进程 / Supervisor)**:

1. Buka **Terminal/SSH** lalu pastikan Supervisor terinstall:
   ```bash
   which supervisorctl || (sudo apt update && sudo apt install -y supervisor)
   ```
2. Buat file konfigurasi worker:
   ```bash
   sudo nano /etc/supervisor/conf.d/tahfidz-worker.conf
   ```
   Isi dengan (sesuaikan path dan path php):
   ```ini
   [program:tahfidz-worker]
   process_name=%(program_name)s_%(process_num)02d
   command=/www/server/php/83/bin/php /www/wwwroot/tahfidz.example.com/artisan queue:work --sleep=3 --tries=3
   directory=/www/wwwroot/tahfidz.example.com
   autostart=true
   autorestart=true
   stopasgroup=true
   killasgroup=true
   user=www
   numprocs=1
   redirect_stderr=true
   stdout_logfile=/www/wwwroot/tahfidz.example.com/storage/logs/worker.log
   stopwaitsecs=3600
   ```
3. Reload dan aktifkan:
   ```bash
   sudo supervisorctl reread
   sudo supervisorctl update
   sudo supervisorctl start tahfidz-worker:*
   ```

> Atau, jika lebih sederhana, buat **Cron** di aaPanel (menu **Cron**) yang menjalankan worker dalam interval pendek. Catatan: untuk queue worker sebaiknya menggunakan daemon (Supervisor/Process Daemon) agar berjalan terus-menerus.

Jika nanti ada penjadwalan (mis. backup otomatis), daftarkan Laravel scheduler ke cron. Di aaPanel bisa lewat menu **Cron → Add Cron Task (Shell Script)** atau langsung lewat SSH:

```bash
sudo crontab -e
```

```cron
* * * * * cd /www/wwwroot/tahfidz.example.com && /www/server/php/83/bin/php artisan schedule:run >> /dev/null 2>&1
```

### 11. Verify

Akses `https://domain-anda.com`. Login menggunakan akun seeder (lihat bagian **Akun Seeder** di bawah). Password default untuk semua akun seeder adalah **`password`** (bisa dioverride via `SEED_USER_PASSWORD` di `.env`).

Gunakan menu **Website → Monitoring / Error log** di aaPanel jika terjadi kendala, atau cek log aplikasi di `storage/logs/laravel.log`.

Panduan deployment/pemeliharaan yang lebih ringkas dapat dilihat pada bagian **Deployment Singkat** di bawah.

## Akun Seeder

Setelah menjalankan seeder, tersedia akun awal berikut:

| Role | Email |
|---|---|
| Super Admin | admin@example.com |
| Guru | guru1@example.com |
| Siswa | siswa1@example.com |

Password default setiap akun adalah **`password`** (untuk development/production yang ingin password berbeda, set variabel env `SEED_USER_PASSWORD`, mis. `SEED_USER_PASSWORD=pass123`).

Semua akun seeder ditandai `must_change_password` — pada login pertama, aplikasi akan mewajibkan pengguna mengganti password sebelum bisa mengakses fitur lain.

Untuk development lokal yang ingin password seeder ditentukan sendiri, set variabel env `SEED_USER_PASSWORD` (mis. `SEED_USER_PASSWORD=pass123`) lalu jalankan `php artisan migrate:fresh --seed`.

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

> Untuk panduan lengkap instalasi di VPS berbasis **aaPanel + Nginx** (install software, buat situs/database, document root, SSL, queue worker), lihat bagian **Instalasi di VPS** di atas.

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
