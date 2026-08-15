import { useState, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, Mail, Lock, Eye, EyeOff, Sparkles, ShieldCheck, Users, TrendingUp, Loader2, ArrowRight } from 'lucide-react';

const highlights = [
  { icon: Users, text: 'Kelola ratusan santri dalam satu sistem' },
  { icon: TrendingUp, text: "Pantau setoran & muroja'ah secara real-time" },
  { icon: ShieldCheck, text: 'Data tersimpan aman & terstruktur' },
];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Login gagal. Periksa email dan password.');
      setErrorKey((k) => k + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden grid md:grid-cols-2 animate-fade-up">
        {/* Panel kiri — branding */}
        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-10 relative overflow-hidden">
          <Sparkles size={18} className="absolute top-8 right-8 text-emerald-300 animate-sparkle" />
          <div
            className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-emerald-700/40 animate-float-slow"
            aria-hidden="true"
          />
          <div
            className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-emerald-600/30 animate-float"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="flex items-center gap-2.5 animate-fade-up">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                <BookOpen size={20} className="text-emerald-200" />
              </div>
              <div className="leading-tight">
                <p className="font-semibold text-white text-[15px]">Tahfidz</p>
                <p className="text-emerald-300 text-[15px] font-semibold -mt-0.5">Qur'an</p>
              </div>
            </div>

            <h1 className="text-2xl font-semibold mt-14 leading-snug animate-fade-up [animation-delay:100ms]">
              Kelola program tahfidz<br />dengan sistem terstruktur
            </h1>
            <p className="text-emerald-200 text-sm mt-3 leading-relaxed max-w-xs animate-fade-up [animation-delay:200ms]">
              Masuk ke panel admin untuk mengelola santri, setoran hafalan, dan muroja'ah dalam satu dashboard.
            </p>
          </div>

          <div className="relative space-y-4">
            {highlights.map((h, i) => {
              const Icon = h.icon;
              return (
                <div
                  key={h.text}
                  className="flex items-center gap-3 animate-fade-up"
                  style={{ animationDelay: `${300 + i * 100}ms` }}
                >
                  <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-emerald-200" />
                  </div>
                  <p className="text-sm text-emerald-100">{h.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel kanan — form login */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          {/* Logo mobile */}
          <div className="flex md:hidden items-center gap-2.5 mb-8 animate-fade-up">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-gray-900 text-[15px]">Tahfidz</p>
              <p className="text-emerald-600 text-[15px] font-semibold -mt-0.5">Qur'an</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 animate-fade-up [animation-delay:100ms]">Masuk ke Admin Panel</h2>
          <p className="text-sm text-gray-500 mt-1.5 animate-fade-up [animation-delay:200ms]">
            Silakan masuk menggunakan akun admin yang terdaftar.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div
                key={errorKey}
                role="alert"
                className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100 animate-shake"
              >
                {error}
              </div>
            )}

            {/* Email */}
            <div className="animate-fade-up [animation-delay:250ms]">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1.5 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition">
                <Mail size={16} className="text-gray-400 shrink-0" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tahfidzquran.sch.id"
                  className="bg-transparent outline-none text-sm flex-1 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Password */}
            <div className="animate-fade-up [animation-delay:350ms]">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">Kata Sandi</label>
                <a href="/forgot-password" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">Lupa kata sandi?</a>
              </div>
              <div className="mt-1.5 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition">
                <Lock size={16} className="text-gray-400 shrink-0" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent outline-none text-sm flex-1 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Ingat saya */}
            <label className="flex items-center gap-2 text-sm text-gray-600 select-none cursor-pointer transition-colors hover:text-gray-900 animate-fade-up [animation-delay:450ms]">
              <input
                type="checkbox"
                name="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 transition-transform"
              />
              Ingat saya di perangkat ini
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full overflow-hidden bg-emerald-700 hover:bg-emerald-800 disabled:opacity-70 text-white text-sm font-semibold rounded-xl py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-700/20 active:scale-95 animate-fade-up [animation-delay:500ms]"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="mr-2 inline animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  Masuk
                  <ArrowRight size={16} className="ml-2 inline transition-transform duration-200 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-8 animate-fade-up [animation-delay:600ms]">
            © 2024 Tahfidz Qur'an. All rights reserved. · Versi 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
