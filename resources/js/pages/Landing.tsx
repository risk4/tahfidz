import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { brandingService, getBrandingCache, applyFavicon } from "@/services/api";
import {
  Moon,
  Users,
  BookOpen,
  Star,
  Book,
  UploadCloud,
  RefreshCw,
  BarChart3,
  Heart,
  Bell,
  Play,
  ArrowRight,
  ArrowUp,
  Check,
  Quote,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  AtSign,
  Globe,
  Send,
  Settings,
  Home,
  ClipboardList,
  Repeat,
  Sparkles,
  LineChart,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Data                                                                       */
/* -------------------------------------------------------------------------- */

const navLinks = [
  { label: "Beranda", href: "#beranda", active: true },
  { label: "Fitur", href: "#fitur" },
  { label: "Manfaat", href: "#manfaat" },
  { label: "Testimoni", href: "#testimoni" },
  { label: "Kontak", href: "#kontak" },
];

const sidebarMenu = [
  { label: "Beranda", icon: Home, active: true },
  { label: "Hafalan Saya", icon: BookOpen },
  { label: "Setoran", icon: ClipboardList },
  { label: "Muroja'ah", icon: Repeat },
  { label: "Doa Harian", icon: Moon },
  { label: "Progress", icon: LineChart },
  { label: "Pengaturan", icon: Settings },
];

const features = [
  {
    icon: Book,
    color: "bg-emerald-100 text-emerald-600",
    title: "Hafalan Terstruktur",
    desc: "Pencatatan hafalan per surah dan ayat dengan sistem terstruktur.",
  },
  {
    icon: UploadCloud,
    color: "bg-sky-100 text-sky-600",
    title: "Setoran Online",
    desc: "Setorkan hafalan kepada ustadz secara online dengan mudah.",
  },
  {
    icon: RefreshCw,
    color: "bg-violet-100 text-violet-600",
    title: "Muroja'ah Terjadwal",
    desc: "Jadwal muroja'ah otomatis agar hafalan terjaga dengan baik.",
  },
  {
    icon: BarChart3,
    color: "bg-amber-100 text-amber-600",
    title: "Tracking Progress",
    desc: "Pantau perkembangan hafalan dengan grafik yang interaktif.",
  },
  {
    icon: Heart,
    color: "bg-rose-100 text-rose-600",
    title: "Doa & Motivasi",
    desc: "Kumpulan doa harian dan motivasi untuk menguatkan semangat.",
  },
  {
    icon: Bell,
    color: "bg-teal-100 text-teal-600",
    title: "Pengingat Pintar",
    desc: "Notifikasi setoran dan muroja'ah agar tidak terlewat.",
  },
];

const benefits = [
  "Memudahkan santri dalam mengelola hafalan",
  "Memudahkan ustadz dalam memantau setoran santri",
  "Meningkatkan kedisiplinan muroja'ah",
  "Data aman dan dapat diakses kapan saja",
  "Mendekatkan diri kepada Al-Qur'an setiap hari",
];

const testimonials = [
  {
    quote:
      "Aplikasi ini sangat membantu saya dalam mengatur hafalan dan muroja'ah. Interface-nya juga mudah digunakan.",
    name: "Fathurrahman",
    role: "Santri",
    initials: "F",
    color: "bg-rose-200 text-rose-700",
  },
  {
    quote:
      "Sebagai ustadz, saya bisa memantau setoran santri dengan lebih rapi dan efisien. Sangat rekomended!",
    name: "Ust. Ahmad Zuhdi",
    role: "Pembina Tahfidz",
    initials: "AZ",
    color: "bg-emerald-200 text-emerald-700",
  },
  {
    quote:
      "Fitur pengingatnya sangat membantu saya tetap konsisten muroja'ah setiap hari.",
    name: "Aisyah Zahra",
    role: "Santri",
    initials: "AZ",
    color: "bg-amber-200 text-amber-700",
  },
];

const footerMenu = ["Beranda", "Fitur", "Manfaat", "Harga", "Kontak"];
const footerHelp = [
  "FAQ",
  "Panduan Penggunaan",
  "Kebijakan Privasi",
  "Syarat & Ketentuan",
];

/* -------------------------------------------------------------------------- */
/*  Small building blocks                                                     */
/* -------------------------------------------------------------------------- */

function Logo({ dark = false }) {
  const { data: branding } = useQuery({
    queryKey: ["branding"],
    queryFn: () => brandingService.get(),
    initialData: getBrandingCache() ?? undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
  const logoUrl = branding?.logo_path ? `/storage/${branding.logo_path}` : null;
  const appName = branding?.app_name ?? null;

  return (
    <div className="flex items-center gap-2.5">
      {logoUrl ? (
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-emerald-600 ring-1 ring-emerald-700/20">
          <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
        </div>
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
          <Moon className="h-5 w-5 text-white" strokeWidth={2.5} fill="white" />
        </div>
      )}
      <div className="leading-tight">
        {appName ? (
          <p className={`max-w-[160px] truncate text-[15px] font-bold ${dark ? "text-white" : "text-slate-900"}`}>
            {appName}
          </p>
        ) : (
          <>
            <p className={`text-[15px] font-bold ${dark ? "text-white" : "text-slate-900"}`}>
              Tahfidz
            </p>
            <p className={`-mt-0.5 text-[15px] font-bold ${dark ? "text-white" : "text-slate-900"}`}>
              Qur'an
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function StarRow() {
  return (
    <div className="flex gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-4 w-4" fill="currentColor" strokeWidth={0} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scroll-reveal wrapper                                                      */
/* -------------------------------------------------------------------------- */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`will-change-transform transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page sections                                                             */
/* -------------------------------------------------------------------------- */

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`relative text-sm font-medium transition-colors ${
                link.active
                  ? "text-emerald-600"
                  : "text-slate-600 hover:text-emerald-600"
              }`}
            >
              {link.label}
              {link.active && (
                <span className="absolute -bottom-[17px] left-0 h-0.5 w-full rounded-full bg-emerald-600" />
              )}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 active:scale-95"
          >
            Masuk
          </Link>
          <Link
            to="/login"
            className="rounded-full bg-[#0D753F] px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-[#0D753F]/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#075B30] active:scale-95"
          >
            Daftar Gratis
          </Link>
        </div>
      </div>
    </header>
  );
}

function DashboardPreview() {
  return (
    <div className="flex overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-emerald-900/10 animate-float">
      {/* Sidebar */}
      <aside className="hidden w-44 shrink-0 border-r border-slate-100 bg-white p-4 sm:block">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <Moon className="h-4 w-4 text-white" fill="white" strokeWidth={0} />
          </div>
          <div className="text-[11px] font-bold leading-tight text-slate-900">
            Tahfidz
            <br />
            Qur'an
          </div>
        </div>
        <nav className="space-y-1">
          {sidebarMenu.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium ${
                item.active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-500"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" strokeWidth={2} />
              {item.label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 p-5">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500">Assalamu'alaikum,</p>
            <p className="text-lg font-bold text-slate-900">Ahmad Fauzi</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Semangat menjaga kalam Allah hari ini! 🌿
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-slate-400" />
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-200 text-[10px] font-bold text-emerald-800">
                AF
              </div>
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-[11px] font-semibold text-slate-800">
                  Ahmad Fauzi
                </p>
                <p className="text-[10px] text-slate-400">Santri</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-[11px] text-slate-500">Hafalan Tersimpan</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="text-xl font-bold text-emerald-700">12</p>
              <BookOpen className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-[10px] text-slate-400">Juz</p>
          </div>
          <div className="rounded-xl bg-sky-50 p-3">
            <p className="text-[11px] text-slate-500">Setoran Hari Ini</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="text-xl font-bold text-sky-700">2</p>
              <ClipboardList className="h-4 w-4 text-sky-400" />
            </div>
            <p className="text-[10px] text-slate-400">Halaman</p>
          </div>
          <div className="rounded-xl bg-violet-50 p-3">
            <p className="text-[11px] text-slate-500">Muroja'ah Hari Ini</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="text-xl font-bold text-violet-700">5</p>
              <Repeat className="h-4 w-4 text-violet-400" />
            </div>
            <p className="text-[10px] text-slate-400">Halaman</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-slate-100 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-700">
              Progress Hafalan
            </p>
            <p className="text-xs text-slate-400">12 / 30 Juz</p>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="flex h-full w-[40%] items-center justify-end rounded-full bg-emerald-500 pr-1">
              <span className="text-[8px] font-bold text-white">40%</span>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-slate-400">
            <span>Target: 30 Juz</span>
            <span>Sisa: 18 Juz</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
              <Book className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">
                Terakhir Setoran
              </p>
              <p className="text-[10px] text-slate-400">
                Surah Ar-Rahman: 33 – 45
              </p>
              <p className="text-[10px] text-slate-400">Oleh: Ust. Ahmad</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400">Hari ini, 08:30</p>
            <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Disetujui
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section id="beranda" className="relative overflow-hidden bg-gradient-to-br from-[#075B30] to-[#0D753F]">
      {/* ===== Decorative elements — sama persis dengan LoginBrandPanel ===== */}
      {/* Islamic geometric pattern */}
      <svg className="absolute inset-0 h-full w-full text-white opacity-[0.04]" aria-hidden="true">
        <defs>
          <pattern id="hero-islamic-pattern" width="72" height="72" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M36 4 L68 36 L36 68 L4 36 Z" />
              <path d="M36 14 L58 36 L36 58 L14 36 Z" />
              <circle cx="36" cy="36" r="2.5" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-islamic-pattern)" />
      </svg>

      {/* Large transparent circle — top right */}
      <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-white/[0.05] blur-2xl" aria-hidden="true" />
      {/* Small circle — bottom left */}
      <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-white/[0.06]" aria-hidden="true" />
      {/* Subtle green glow — center */}
      <div className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-[#7EE2B8]/[0.08] blur-3xl" aria-hidden="true" />
      {/* Extra glow — right side untuk area DashboardPreview */}
      <div className="absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-[#7EE2B8]/[0.06] blur-3xl" aria-hidden="true" />

      {/* Abstract curved shape — bottom right */}
      <svg
        className="absolute -bottom-10 -right-10 h-64 w-64 text-white opacity-[0.06]"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <path d="M150 20 C60 50 50 140 160 165" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M185 45 C95 80 90 160 185 185" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      </svg>

      {/* ===== Content ===== */}
      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:px-10 lg:py-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-[#7EE2B8] ring-1 ring-white/10 animate-fade-up">
            <Moon className="h-3.5 w-3.5" /> APLIKASI TAHFIDZ QUR'AN
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.15] text-white sm:text-5xl animate-fade-up [animation-delay:100ms]">
            Teman Terbaik Dalam Perjalanan
            <br className="hidden sm:block" /> Hafalan{" "}
            <span className="text-[#7EE2B8]">Al-Qur'an</span>
          </h1>

          <p className="mt-5 max-w-lg text-white/75 animate-fade-up [animation-delay:200ms]">
            Kelola hafalan, setoran, dan muroja'ah dengan mudah. Pantau
            perkembangan hafalan Anda kapan saja dan di mana saja.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3 animate-fade-up [animation-delay:300ms]">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#075B30] shadow-lg shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#7EE2B8] active:scale-95 animate-pulse-ring"
            >
              Mulai Sekarang <ArrowRight className="h-4 w-4" />
            </Link>
            <button className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 active:scale-95">
              <Play className="h-3.5 w-3.5" fill="currentColor" /> Lihat Demo
            </button>
          </div>

          <div className="mt-10 flex flex-wrap gap-8 animate-fade-up [animation-delay:400ms]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <Users className="h-4.5 w-4.5 text-[#7EE2B8]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">1000+</p>
                <p className="text-xs text-white/60">Pengguna Aktif</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <BookOpen className="h-4.5 w-4.5 text-[#7EE2B8]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">50.000+</p>
                <p className="text-xs text-white/60">Setoran Hafalan</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <Star className="h-4.5 w-4.5 text-[#7EE2B8]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">99%</p>
                <p className="text-xs text-white/60">Kepuasan Pengguna</p>
              </div>
            </div>
          </div>
        </div>

        <DashboardPreview />
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="fitur" className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
      <Reveal>
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Fitur Unggulan
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
            Lengkap untuk mendukung perjalanan tahfidz Anda
          </h2>
        </div>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={i * 100}>
            <div className="group h-full rounded-2xl border border-slate-100 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-100">
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${f.color} transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110`}
              >
                <f.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="font-bold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                {f.desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function BenefitsIllustration() {
  return (
    <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900">
      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]" />
      <div className="relative flex h-28 w-40 -rotate-3 flex-col items-center justify-center rounded-lg bg-emerald-50 shadow-2xl animate-float-slow">
        <Book className="h-10 w-10 text-emerald-700" strokeWidth={1.5} />
        <div className="mt-1.5 h-1 w-16 rounded-full bg-amber-400" />
      </div>
      <Sparkles className="absolute right-10 top-10 h-6 w-6 text-amber-300/70 animate-sparkle" />
      <Sparkles className="absolute bottom-14 left-12 h-4 w-4 text-emerald-300/60 animate-sparkle [animation-delay:1.2s]" />

      <div className="absolute bottom-4 left-4 right-4 flex items-start gap-3 rounded-xl bg-white p-4 shadow-xl">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
          <Moon className="h-4 w-4 text-emerald-600" fill="currentColor" strokeWidth={0} />
        </div>
        <div>
          <p className="text-xs font-semibold leading-snug text-slate-800">
            Menjaga hafalan hari ini adalah investasi akhirat esok hari.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">~ Ustadz Adi Hidayat</p>
        </div>
      </div>
    </div>
  );
}

function Benefits() {
  return (
    <section id="manfaat" className="bg-slate-50/70 py-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center lg:px-10">
        <Reveal>
          <BenefitsIllustration />
        </Reveal>

        <Reveal delay={150}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Manfaat
            </p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight text-slate-900">
              Mengapa menggunakan
              <br />
              <span className="text-emerald-600">Tahfidz Qur'an?</span>
            </h2>

            <Reveal delay={250}>
              <ul className="mt-7 space-y-4">
                {benefits.map((b) => (
                  <li key={b} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                    <span className="text-slate-600">{b}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Testimonials() {
  const [index, setIndex] = useState(0);
  const total = testimonials.length;

  const prev = () => setIndex((i) => (i - 1 + total) % total);
  const next = () => setIndex((i) => (i + 1) % total);

  return (
    <section id="testimoni" className="relative mx-auto max-w-7xl px-6 py-20 lg:px-10">
      <Reveal>
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Testimoni
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
            Apa kata mereka?
          </h2>
        </div>
      </Reveal>

      <Reveal delay={150}>
        <div className="relative mt-12">
        <button
          onClick={prev}
          aria-label="Sebelumnya"
          className="absolute -left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:text-emerald-600 sm:-left-4"
        >
          <ChevronLeft className="h-4 w-4 text-slate-500" />
        </button>
        <button
          onClick={next}
          aria-label="Berikutnya"
          className="absolute -right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:text-emerald-600 sm:-right-4"
        >
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>

        <div className="mx-auto max-w-2xl overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {testimonials.map((item, i) => (
              <div key={item.name} className="w-full shrink-0 px-1">
                <div
                  className={`rounded-2xl border p-8 text-center shadow-sm shadow-slate-100 transition-opacity duration-500 ${
                    i === index ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <Quote className="mx-auto h-7 w-7 text-emerald-500" fill="currentColor" strokeWidth={0} />
                  <p className="mt-5 text-base italic leading-relaxed text-slate-600">
                    {item.quote}
                  </p>
                  <div className="mt-4 flex justify-center">
                    <StarRow />
                  </div>
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${item.color}`}
                    >
                      {item.initials}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {testimonials.map((item, i) => (
            <button
              key={item.name}
              onClick={() => setIndex(i)}
              aria-label={`Tampilkan testimoni ${i + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                i === index ? "w-7 bg-emerald-600" : "w-2.5 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      </div>
      </Reveal>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
      <Reveal>
        <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-600 px-8 py-9 sm:flex-row">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 sm:flex">
              <Moon className="h-6 w-6 text-white" fill="white" strokeWidth={0} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white sm:text-xl">
                Siap memulai perjalanan tahfidz Anda?
              </h3>
              <p className="mt-1 text-sm text-emerald-100">
                Bergabung sekarang dan rasakan kemudahan menghafal Al-Qur'an
                dengan teknologi.
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-white px-6 py-3 text-sm font-semibold text-emerald-700 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-emerald-50 active:scale-95"
          >
            Daftar Gratis Sekarang <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#062e21] pt-16 text-emerald-100/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
        <Reveal>
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-emerald-100/60">
              Aplikasi web untuk membantu santri dalam menghafal dan menjaga
              hafalan Al-Qur'an dengan lebih mudah dan terstruktur.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div>
            <p className="mb-4 text-sm font-bold text-white">Menu</p>
            <ul className="space-y-2.5 text-sm">
              {footerMenu.map((m) => (
                <li key={m}>
                  <a href="#" className="transition hover:text-white">
                    {m}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div>
            <p className="mb-4 text-sm font-bold text-white">Bantuan</p>
            <ul className="space-y-2.5 text-sm">
              {footerHelp.map((m) => (
                <li key={m}>
                  <a href="#" className="transition hover:text-white">
                    {m}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={300}>
          <div>
            <p className="mb-4 text-sm font-bold text-white">Ikuti Kami</p>
            <div className="flex gap-3">
              {[MessageCircle, AtSign, Globe, Send].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-all duration-200 hover:scale-110 hover:bg-white/30 active:scale-95"
                >
                  <Icon className="h-4 w-4 text-white" />
                </a>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={200}>
        <div className="border-t border-white/10 py-5 text-center text-xs text-emerald-100/50">
          © 2024 Tahfidz Qur'an. All rights reserved.
        </div>
      </Reveal>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

function GoToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Kembali ke atas"
      title="Kembali ke atas"
      className={`fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition-all duration-300 hover:-translate-y-1 hover:bg-emerald-700 active:scale-95 ${
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-4 scale-75 opacity-0"
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

export default function Landing() {
  // Ambil data branding agar favicon terpasang otomatis dari cache maupun server
  const { data: branding } = useQuery({
    queryKey: ["branding"],
    queryFn: () => brandingService.get(),
    initialData: getBrandingCache() ?? undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (branding?.favicon_path) {
      applyFavicon(branding.favicon_path);
    }
    if (branding?.app_name) {
      document.title = branding.app_name;
    }
  }, [branding]);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      <Navbar />
      <Hero />
      <Features />
      <Benefits />
      <Testimonials />
      <CTA />
      <Footer />
      <GoToTop />
    </div>
  );
}
