import { BookOpen, ChartNoAxesCombined, ShieldCheck, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { LoginFeature } from '@/components/auth/LoginFeature';
import { brandingService, getBrandingCache } from '@/services/api';

const features = [
  { icon: Users, title: 'Kelola santri dengan mudah', description: 'Data santri, kelas, dan pembimbing terorganisir.' },
  { icon: BookOpen, title: "Pantau setoran & muraja'ah", description: "Catat hafalan dan muraja'ah secara terstruktur." },
  { icon: ChartNoAxesCombined, title: 'Laporan perkembangan', description: 'Pantau progress hafalan setiap santri.' },
  { icon: ShieldCheck, title: 'Data aman & terstruktur', description: 'Data tersimpan dengan aman.' },
];

export function LoginBrandPanel() {
  // Gunakan endpoint publik /api/branding — tidak memerlukan token.
  // initialData dari localStorage → logo langsung tampil saat hard refresh
  // tanpa menunggu fetch selesai. Setiap fetch berhasil, localStorage
  // diperbarui oleh brandingService.get() sehingga nilai selalu fresh.
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: () => brandingService.get(),
    initialData: getBrandingCache() ?? undefined,
    staleTime: 5 * 60 * 1000, // 5 menit — jarang berubah
    gcTime: 30 * 60 * 1000,   // simpan cache React Query 30 menit di memori
    retry: 1,
  });
  const logoUrl = branding?.logo_path ? `/storage/${branding.logo_path}` : null;
  const appName = branding?.app_name ?? null;

  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#075B30] to-[#0D753F] text-white md:flex">
      {/* ===== Decorative elements (subtle, 3%–10% opacity) ===== */}
      {/* Islamic geometric pattern */}
      <svg className="absolute inset-0 h-full w-full text-white opacity-[0.04]" aria-hidden="true">
        <defs>
          <pattern id="islamic-pattern" width="72" height="72" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M36 4 L68 36 L36 68 L4 36 Z" />
              <path d="M36 14 L58 36 L36 58 L14 36 Z" />
              <circle cx="36" cy="36" r="2.5" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#islamic-pattern)" />
      </svg>

      {/* Large transparent circle */}
      <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-white/[0.05] blur-2xl" aria-hidden="true" />
      {/* Small circle */}
      <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-white/[0.06]" aria-hidden="true" />
      {/* Subtle green glow */}
      <div className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-[#7EE2B8]/[0.08] blur-3xl" aria-hidden="true" />

      {/* Abstract curved shape (bottom right) */}
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
      <div className="relative z-10 flex h-full w-full flex-col justify-between p-8 lg:p-12">
        {/* Branding */}
        <div className="flex items-center gap-3 animate-fade-up">
          {logoUrl ? (
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/95 ring-1 ring-white/20">
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10">
              <BookOpen size={20} className="text-[#B8F3D8]" aria-hidden="true" />
            </div>
          )}
          <div className="leading-tight">
            {appName ? (
              <p className="max-w-[220px] truncate text-lg font-bold text-white">{appName}</p>
            ) : (
              <>
                <p className="text-lg font-bold text-white">Tahfidz</p>
                <p className="-mt-0.5 text-lg font-bold text-[#7EE2B8]">Qur'an</p>
              </>
            )}
          </div>
        </div>

        {/* Headline + description */}
        <div>
          <h1 className="max-w-[400px] text-[26px] font-bold leading-[1.15] text-white animate-fade-up [animation-delay:100ms] lg:text-[34px]">
            Kelola program tahfidz dengan sistem <span className="text-[#7EE2B8]">terstruktur</span>
          </h1>
          <p className="mt-4 max-w-[420px] text-sm leading-[1.7] text-white/75 animate-fade-up [animation-delay:200ms] lg:text-[15px]">
            Pantau hafalan, setoran, muraja'ah, dan perkembangan santri dalam satu platform yang mudah digunakan.
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-4 lg:space-y-5">
          {features.map((f, i) => (
            <LoginFeature key={f.title} icon={f.icon} title={f.title} description={f.description} delay={300 + i * 120} />
          ))}
        </div>
      </div>
    </aside>
  );
}
