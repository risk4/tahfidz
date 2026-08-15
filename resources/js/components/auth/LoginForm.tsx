import { useState, type FormEvent } from 'react';
import { AlertCircle, BookOpen, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LoginInput } from '@/components/auth/LoginInput';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { LoginButton } from '@/components/auth/LoginButton';
import { SecurityNotice } from '@/components/auth/SecurityNotice';

const ERROR_MESSAGE = 'Email atau kata sandi yang Anda masukkan tidak benar.';

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const serverError = err as { response?: { data?: { message?: string } } };
      setError(serverError.response?.data?.message || ERROR_MESSAGE);
      setErrorKey((k) => k + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
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

        {/* Login header */}
        <div className="animate-fade-up">
          <div className="hidden h-12 w-12 place-items-center rounded-xl bg-[#E8F5EE] md:grid">
            <BookOpen size={20} className="text-[#0D753F]" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-[28px] font-bold leading-tight text-[#172033] text-center md:text-left">
            Masuk ke Admin Panel
          </h2>
          <p className="mt-2 text-sm leading-[1.6] text-[#64748B] text-center md:text-left">
            Silakan masuk menggunakan akun admin yang terdaftar.
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <div
            key={errorKey}
            id="login-error"
            role="alert"
            aria-live="assertive"
            className="mt-6 flex items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5 animate-shake"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#B91C1C]" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-[#B91C1C]">Login gagal</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[#B91C1C]/90">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
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
              describedBy={error ? 'login-error' : undefined}
            />
          </div>

          {/* Password */}
          <div className="mt-[18px] animate-fade-up [animation-delay:200ms]">
            <PasswordInput
              id="password"
              label="Kata Sandi"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi"
              disabled={isLoading}
              invalid={!!error}
              describedBy={error ? 'login-error' : undefined}
            />
          </div>

          {/* Remember me */}
          <div className="mt-[14px] animate-fade-up [animation-delay:300ms]">
            <label className="flex cursor-pointer select-none items-center gap-2.5 text-[13px] text-[#64748B] transition-colors duration-150 hover:text-[#172033]">
              <input
                type="checkbox"
                name="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-[#E2E8F0] accent-[#0D753F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D753F]"
              />
              Ingat saya di perangkat ini
            </label>
          </div>

          {/* Submit */}
          <div className="mt-[22px] animate-fade-up [animation-delay:400ms]">
            <LoginButton isLoading={isLoading} />
          </div>
        </form>

        {/* Security notice */}
        <div className="mt-5 animate-fade-up [animation-delay:500ms]">
          <SecurityNotice />
        </div>

        {/* Footer */}
        <p className="mt-10 text-center text-[11px] text-[#94A3B8] animate-fade-up [animation-delay:600ms]">
          © 2024 Tahfidz Qur'an. All rights reserved.
          <span className="mx-1.5 text-[#E2E8F0]" aria-hidden="true">•</span>
          Versi 1.0.0
        </p>
      </div>
    </div>
  );
}
