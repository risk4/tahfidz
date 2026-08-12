<?php

namespace Database\Seeders;

use App\Domain\Quran\Models\QuranJuz;
use App\Domain\Quran\Models\QuranSurah;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Mengisi data referensi Al-Qur'an: 30 juz, 114 surah, dan ayah.
 *
 * CATATAN: text_arabic diisi placeholder referensi ayat (mis. "Al-Baqarah 1").
 * Teks Arab asli sengaja TIDAK disertakan sampai sumber dataset ayat disepakati
 * (lihat §18 dokumen desain) — strukturnya sudah siap untuk diisi/di-update.
 *
 * Pemetaan juz mengikuti daftar batas (awal) juz standar 30 juz.
 */
class QuranSeeder extends Seeder
{
    /**
     * [juz_number => [surah_number, ayah_number]] = titik awal tiap juz.
     */
    private const JUZ_BOUNDARIES = [
        1 => [1, 1], 2 => [2, 142], 3 => [2, 253], 4 => [3, 93], 5 => [4, 24],
        6 => [4, 148], 7 => [5, 82], 8 => [6, 111], 9 => [7, 88], 10 => [8, 75],
        11 => [9, 93], 12 => [11, 6], 13 => [12, 53], 14 => [15, 1], 15 => [17, 1],
        16 => [18, 75], 17 => [21, 1], 18 => [23, 1], 19 => [25, 21], 20 => [27, 56],
        21 => [29, 46], 22 => [33, 31], 23 => [36, 28], 24 => [39, 32], 25 => [41, 47],
        26 => [46, 1], 27 => [51, 31], 28 => [58, 1], 29 => [67, 1], 30 => [78, 1],
    ];

    /**
     * [surah_number => [latin, arabic, translation, total_ayahs]]
     */
    private const SURAHS = [
        1 => ['Al-Fatihah', 'الفاتحة', 'Pembukaan', 7],
        2 => ['Al-Baqarah', 'البقرة', 'Sapi Betina', 286],
        3 => ['Ali Imran', 'آل عمران', 'Keluarga Imran', 200],
        4 => ['An-Nisa', 'النساء', 'Wanita', 176],
        5 => ['Al-Maidah', 'المائدة', 'Hidangan', 120],
        6 => ['Al-Anam', 'الأنعام', 'Binatang Ternak', 165],
        7 => ['Al-Araf', 'الأعراف', 'Tempat Tertinggi', 206],
        8 => ['Al-Anfal', 'الأنفال', 'Harta Rampasan', 75],
        9 => ['At-Tawbah', 'التوبة', 'Pengampunan', 129],
        10 => ['Yunus', 'يونس', 'Nabi Yunus', 109],
        11 => ['Hud', 'هود', 'Nabi Hud', 123],
        12 => ['Yusuf', 'يوسف', 'Nabi Yusuf', 111],
        13 => ['Ar-Rad', 'الرعد', 'Guruh', 43],
        14 => ['Ibrahim', 'إبراهيم', 'Nabi Ibrahim', 52],
        15 => ['Al-Hijr', 'الحجر', 'Gunung Al Hijr', 99],
        16 => ['An-Nahl', 'النحل', 'Lebah', 128],
        17 => ['Al-Isra', 'الإسراء', 'Perjalanan Malam', 111],
        18 => ['Al-Kahf', 'الكهف', 'Gua', 110],
        19 => ['Maryam', 'مريم', 'Maryam', 98],
        20 => ['Ta-Ha', 'طه', 'Ta Ha', 135],
        21 => ['Al-Anbiya', 'الأنبياء', 'Para Nabi', 112],
        22 => ['Al-Hajj', 'الحج', 'Haji', 78],
        23 => ['Al-Muminun', 'المؤمنون', 'Orang-orang Beriman', 118],
        24 => ['An-Nur', 'النور', 'Cahaya', 64],
        25 => ['Al-Furqan', 'الفرقان', 'Pembeda', 77],
        26 => ['Ash-Shuara', 'الشعراء', 'Para Penyair', 227],
        27 => ['An-Naml', 'النمل', 'Semut', 93],
        28 => ['Al-Qasas', 'القصص', 'Kisah-kisah', 88],
        29 => ['Al-Ankabut', 'العنكبوت', 'Laba-laba', 69],
        30 => ['Ar-Rum', 'الروم', 'Bangsa Romawi', 60],
        31 => ['Luqman', 'لقمان', 'Luqman', 34],
        32 => ['As-Sajdah', 'السجدة', 'Sajdah', 30],
        33 => ['Al-Ahzab', 'الأحزاب', 'Golongan-golongan', 73],
        34 => ['Saba', 'سبأ', 'Kaum Saba', 54],
        35 => ['Fatir', 'فاطر', 'Pencipta', 45],
        36 => ['Ya-Sin', 'يس', 'Ya Sin', 83],
        37 => ['As-Saffat', 'الصافات', 'Barisan-barisan', 182],
        38 => ['Sad', 'ص', 'Sad', 88],
        39 => ['Az-Zumar', 'الزمر', 'Rombongan', 75],
        40 => ['Ghafir', 'غافر', 'Yang Mengampuni', 85],
        41 => ['Fussilat', 'فصلت', 'Yang Dijelaskan', 54],
        42 => ['Ash-Shura', 'الشورى', 'Musyawarah', 53],
        43 => ['Az-Zukhruf', 'الزخرف', 'Perhiasan', 89],
        44 => ['Ad-Dukhan', 'الدخان', 'Kabut', 59],
        45 => ['Al-Jathiyah', 'الجاثية', 'Yang Berlutut', 37],
        46 => ['Al-Ahqaf', 'الأحقاف', 'Bukit Pasir', 35],
        47 => ['Muhammad', 'محمد', 'Nabi Muhammad', 38],
        48 => ['Al-Fath', 'الفتح', 'Kemenangan', 29],
        49 => ['Al-Hujurat', 'الحجرات', 'Kamar-kamar', 18],
        50 => ['Qaf', 'ق', 'Qaf', 45],
        51 => ['Adh-Dhariyat', 'الذاريات', 'Angin yang Menerbangkan', 60],
        52 => ['At-Tur', 'الطور', 'Bukit', 49],
        53 => ['An-Najm', 'النجم', 'Bintang', 62],
        54 => ['Al-Qamar', 'القمر', 'Bulan', 55],
        55 => ['Ar-Rahman', 'الرحمن', 'Yang Maha Pemurah', 78],
        56 => ['Al-Waqiah', 'الواقعة', 'Hari Kiamat', 96],
        57 => ['Al-Hadid', 'الحديد', 'Besi', 29],
        58 => ['Al-Mujadilah', 'المجادلة', 'Wanita yang Menggugat', 22],
        59 => ['Al-Hashr', 'الحشر', 'Pengusiran', 24],
        60 => ['Al-Mumtahanah', 'الممتحنة', 'Wanita yang Diuji', 13],
        61 => ['As-Saff', 'الصف', 'Barisan', 14],
        62 => ['Al-Jumuah', 'الجمعة', 'Jumat', 11],
        63 => ['Al-Munafiqun', 'المنافقون', 'Orang-orang Munafik', 11],
        64 => ['At-Taghabun', 'التغابن', 'Pengungkapan Kesalahan', 18],
        65 => ['At-Talaq', 'الطلاق', 'Talak', 12],
        66 => ['At-Tahrim', 'التحريم', 'Pengharaman', 12],
        67 => ['Al-Mulk', 'الملك', 'Kerajaan', 30],
        68 => ['Al-Qalam', 'القلم', 'Pena', 52],
        69 => ['Al-Haqqah', 'الحاقة', 'Hari yang Pasti', 52],
        70 => ['Al-Maarij', 'المعارج', 'Tempat Naik', 44],
        71 => ['Nuh', 'نوح', 'Nabi Nuh', 28],
        72 => ['Al-Jinn', 'الجن', 'Jin', 28],
        73 => ['Al-Muzzammil', 'المزمل', 'Orang yang Berselimut', 20],
        74 => ['Al-Muddaththir', 'المدثر', 'Orang yang Berkemul', 56],
        75 => ['Al-Qiyamah', 'القيامة', 'Hari Kiamat', 40],
        76 => ['Al-Insan', 'الإنسان', 'Manusia', 31],
        77 => ['Al-Mursalat', 'المرسلات', 'Malaikat yang Diutus', 50],
        78 => ['An-Naba', 'النبأ', 'Berita Besar', 40],
        79 => ['An-Naziat', 'النازعات', 'Malaikat yang Mencabut', 46],
        80 => ['Abasa', 'عبس', 'Ia Bermuka Masam', 42],
        81 => ['At-Takwir', 'التكوير', 'Penggulungan', 29],
        82 => ['Al-Infitar', 'الانفطار', 'Terbelah', 19],
        83 => ['Al-Mutaffifin', 'المطففين', 'Orang-orang yang Curang', 36],
        84 => ['Al-Inshiqaq', 'الانشقاق', 'Terbelah', 25],
        85 => ['Al-Buruj', 'البروج', 'Gugusan Bintang', 22],
        86 => ['At-Tariq', 'الطارق', 'Yang Datang di Malam Hari', 17],
        87 => ['Al-Ala', 'الأعلى', 'Yang Maha Tinggi', 19],
        88 => ['Al-Ghashiyah', 'الغاشية', 'Hari Pembalasan', 26],
        89 => ['Al-Fajr', 'الفجر', 'Fajar', 30],
        90 => ['Al-Balad', 'البلد', 'Negeri', 20],
        91 => ['Ash-Shams', 'الشمس', 'Matahari', 15],
        92 => ['Al-Lail', 'الليل', 'Malam', 21],
        93 => ['Ad-Duha', 'الضحى', 'Waktu Dhuha', 11],
        94 => ['Ash-Sharh', 'الشرح', 'Kelapangan', 8],
        95 => ['At-Tin', 'التين', 'Buah Tin', 8],
        96 => ['Al-Alaq', 'العلق', 'Segumpal Darah', 19],
        97 => ['Al-Qadr', 'القدر', 'Kemuliaan', 5],
        98 => ['Al-Bayyinah', 'البينة', 'Bukti Nyata', 8],
        99 => ['Az-Zalzalah', 'الزلزلة', 'Kegoncangan', 8],
        100 => ['Al-Adiyat', 'العاديات', 'Kuda Perang', 11],
        101 => ['Al-Qariah', 'القارعة', 'Hari Kiamat', 11],
        102 => ['At-Takathur', 'التكاثر', 'Bermegah-megahan', 8],
        103 => ['Al-Asr', 'العصر', 'Masa', 3],
        104 => ['Al-Humazah', 'الهمزة', 'Pengumpat', 9],
        105 => ['Al-Fil', 'الفيل', 'Gajah', 5],
        106 => ['Quraysh', 'قريش', 'Suku Quraisy', 4],
        107 => ['Al-Maun', 'الماعون', 'Barang-barang Berguna', 7],
        108 => ['Al-Kawthar', 'الكوثر', 'Nikmat Berlimpah', 3],
        109 => ['Al-Kafirun', 'الكافرون', 'Orang-orang Kafir', 6],
        110 => ['An-Nasr', 'النصر', 'Pertolongan', 3],
        111 => ['Al-Masad', 'المسد', 'Sabut', 5],
        112 => ['Al-Ikhlas', 'الإخلاص', 'Ikhlas', 4],
        113 => ['Al-Falaq', 'الفلق', 'Waktu Subuh', 5],
        114 => ['An-Nas', 'الناس', 'Manusia', 6],
        //__CHUNK_2__
    ];

    public function run(): void
    {
        $this->command?->info('Seeding Quran reference data...');

        // 1. Juz
        foreach (range(1, 30) as $n) {
            QuranJuz::firstOrCreate(['juz_number' => $n]);
        }
        $juzIds = QuranJuz::pluck('id', 'juz_number');
        $surahIds = [];

        // 2. Surah
        foreach (self::SURAHS as $number => [$latin, $arabic, $translation, $totalAyahs]) {
            $surah = QuranSurah::firstOrCreate(
                ['surah_number' => $number], [
                    'name_arabic' => $arabic,
                    'name_latin' => $latin,
                    'translation' => $translation,
                    'total_ayahs' => $totalAyahs,
                ]
            );
            $surahIds[$number] = $surah->id;
        }

        // 3. Ayah (bulk insert dengan pemetaan juz)
        $this->insertAyahs($juzIds, $surahIds);

        $this->command?->info('Quran seeding selesai.');
    }

    private function insertAyahs($juzIds, $surahIds): void
    {
        DB::table('quran_ayahs')->truncate();

        $rows = [];
        $currentJuz = 1;

        foreach (self::SURAHS as $surahNumber => [$latin, $arabic, $translation, $totalAyahs]) {
            for ($ayahNumber = 1; $ayahNumber <= $totalAyahs; $ayahNumber++) {
                // Pindah juz bila ayat ini adalah titik awal juz berikutnya.
                if (isset(self::JUZ_BOUNDARIES[$currentJuz + 1])
                    && self::JUZ_BOUNDARIES[$currentJuz + 1] === [$surahNumber, $ayahNumber]) {
                    $currentJuz++;
                }

                $rows[] = [
                    'juz_id' => $juzIds[$currentJuz],
                    'surah_id' => $surahIds[$surahNumber],
                    'ayah_number' => $ayahNumber,
                    'text_arabic' => "{{$latin} {$ayahNumber}}", // placeholder — lihat docblock
                    'text_translation' => null,
                ];

                if (count($rows) >= 500) {
                    DB::table('quran_ayahs')->insert($rows);
                    $rows = [];
                }
            }
        }

        if ($rows) {
            DB::table('quran_ayahs')->insert($rows);
        }
    }
}
