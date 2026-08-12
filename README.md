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

Untuk lingkungan lokal Windows, aplikasi ini dapat dijalankan menggunakan Laragon, XAMPP, atau `php artisan serve`.

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

## Akun Default

Setelah menjalankan seeder, tersedia akun awal berikut:

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@example.com | password |
| Guru | guru1@example.com | password |
| Siswa | siswa1@example.com | password |

Segera ubah password default jika aplikasi digunakan di lingkungan produksi.

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

Untuk deployment ke server:

1. Clone repository ke server.
2. Jalankan `composer install --no-dev --optimize-autoloader`.
3. Jalankan `npm install` dan `npm run build`.
4. Salin dan konfigurasi `.env`.
5. Jalankan `php artisan key:generate` jika belum ada `APP_KEY`.
6. Jalankan `php artisan migrate --force`.
7. Jalankan `php artisan optimize:clear`.
8. Arahkan web server ke folder `public`.

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
