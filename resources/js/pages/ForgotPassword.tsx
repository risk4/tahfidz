import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoginBrandPanel } from '@/components/auth/LoginBrandPanel';
import { LoginInput } from '@/components/auth/LoginInput';
import { authService } from '@/services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.forgotPassword(email);
      setSuccess(response.message);
    } catch (err: unknown) {
      const serverError = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errors = serverError.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : undefined;
      setError(firstError || serverError.response?.data?.message || 'Gagal mengirim tautan reset. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="font-inter relative flex min-h-screen overflow-hidden bg-[#F8FAFC]">
      {/* ===== Background decoration — abstract green, very transparent ===== */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#0D753F] opacity-[0.03] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#0D753F] opacity-[0.03] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-[#075B30] opacity-[0.04] blur-2xl"
        aria-hidden="true"
      />

      {/* ===== Container — 2 panels, full page di desktop ===== */}
      <div className="relative grid w-full min-h-[100svh] overflow-hidden bg-white animate-login-in md:h-screen md:grid-cols-[40%_60%] lg:grid-cols-[45%_55%]">
        <LoginBrandPanel />
        <div className="flex flex-col justify-center p-5 md:p-10 lg:p-14">
          <div className="mx-auto w-full max-w-[420px]">
            {/* Brand — mobile only */}
            <div className="mb-8 flex flex-col items-center md:hidden animate-fade-up">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#E8F5EE]">
                <BookOpen size={20} className="text-[#0D753F]" aria-hidden="true" />
              </div>
              <p className="mt-3 text-xl font-bold text-[#172033]">
                Tahfidz <span className="text-[#0D753F]">Qur'an</span>
              </p>
            </div>

            {/* Header */}
            <div className="animate-fade-up">
              <div className="hidden h-12 w-12 place-items-center rounded-xl bg-[#E8F5EE] md:grid">
                <BookOpen size={20} className="text-[#0D753F]" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-[28px] font-bold leading-tight text-[#172033] text-center md:text-left">
                Lupa Kata Sandi
              </h2>
              <p className="mt-2 text-sm leading-[1.6] text-[#64748B] text-center md:text-left">
                Masukkan email akun Anda. Kami akan mengirimkan tautan untuk membuat kata sandi baru.
              </p>
            </div>

            {/* Error alert */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mt-6 flex items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5 animate-shake"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#B91C1C]" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-[#B91C1C]">Gagal mengirim</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-[#B91C1C]/90">{error}</p>
                </div>
              </div>
            )}

            {/* Success alert */}
            {success && (
              <div
                role="status"
                className="mt-6 flex items-start gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3.5 animate-fade-up"
              >
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#15803D]" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-[#15803D]">Tautan terkirim</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-[#15803D]/90">{success}</p>
                </div>
              </div>
            )}

            {!success && (
              <form onSubmit={handleSubmit} noValidate>
                <div className="mt-7 animate-fade-up [animation-delay:100ms]">
                  <LoginInput
                    id="email"
                    label="Email"
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@tahfidzquran.sch.id"
                    disabled={isLoading}
                    invalid={!!error}
                  />
                </div>

                <div className="mt-[22px] animate-fade-up [animation-delay:200ms]">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group flex h-[50px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#0D753F] text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-px hover:bg-[#075B30] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                        Mengirim...
                      </>
                    ) : (
                      'Kirim Tautan Reset'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Back to login */}
            <div className="mt-5 animate-fade-up [animation-delay:300ms]">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0D753F] transition-colors duration-150 hover:text-[#075B30]"
              >
                <ArrowLeft size={15} aria-hidden="true" />
                Kembali ke halaman masuk
              </Link>
            </div>

            {/* Footer */}
            <p className="mt-10 text-center text-[11px] text-[#94A3B8] animate-fade-up [animation-delay:400ms]">
              © 2024 Tahfidz Qur'an. All rights reserved.
              <span className="mx-1.5 text-[#E2E8F0]" aria-hidden="true">•</span>
              Versi 1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
