import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/api';
import { KeyRound, Lock, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';

interface FieldErrors {
  current_password?: string;
  password?: string;
  password_confirmation?: string;
}

export default function ChangePassword() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password.length < 8) {
      setFieldErrors({ password: 'Password minimal 8 karakter.' });
      return;
    }

    if (password !== confirmation) {
      setFieldErrors({ password_confirmation: 'Konfirmasi password tidak cocok.' });
      return;
    }

    setIsLoading(true);

    try {
      await authService.changePassword(currentPassword, password, confirmation);
      await refresh();
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errors = error.response?.data?.errors;

      if (errors) {
        const mapped: FieldErrors = {};
        for (const key of ['current_password', 'password', 'password_confirmation'] as const) {
          const messages = errors[key];
          if (messages && messages.length > 0) {
            mapped[key] = messages[0];
          }
        }
        setFieldErrors(mapped);
      }

      setError(error.response?.data?.message || 'Gagal mengganti password. Periksa kembali input Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center">
            <KeyRound size={20} className="text-white" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-gray-900 text-[15px]">Tahfidz</p>
            <p className="text-emerald-600 text-[15px] font-semibold -mt-0.5">Qur'an</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-10">
          <div className="mb-2 flex items-center gap-2 text-emerald-700">
            <ShieldCheck size={18} />
            <span className="text-xs font-semibold uppercase tracking-wide">Keamanan Akun</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Ganti Password</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Demi keamanan, Anda wajib mengganti password sementara sebelum melanjutkan.
            {user && (
              <>
                {' '}Akun: <span className="font-medium text-gray-700">{user.email}</span>
              </>
            )}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div role="alert" className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {/* Password saat ini */}
            <div>
              <label htmlFor="current_password" className="text-sm font-medium text-gray-700">
                Password Saat Ini
              </label>
              <div className="mt-1.5 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition">
                <Lock size={16} className="text-gray-400 shrink-0" />
                <input
                  id="current_password"
                  name="current_password"
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan password saat ini"
                  className="bg-transparent outline-none text-sm flex-1 placeholder:text-gray-400"
                />
              </div>
              {fieldErrors.current_password && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.current_password}</p>
              )}
            </div>

            {/* Password baru */}
            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password Baru
              </label>
              <div className="mt-1.5 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition">
                <Lock size={16} className="text-gray-400 shrink-0" />
                <input
                  id="password"
                  name="password"
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="bg-transparent outline-none text-sm flex-1 placeholder:text-gray-400"
                />
              </div>
              {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
            </div>

            {/* Konfirmasi */}
            <div>
              <label htmlFor="password_confirmation" className="text-sm font-medium text-gray-700">
                Konfirmasi Password Baru
              </label>
              <div className="mt-1.5 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition">
                <Lock size={16} className="text-gray-400 shrink-0" />
                <input
                  id="password_confirmation"
                  name="password_confirmation"
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="bg-transparent outline-none text-sm flex-1 placeholder:text-gray-400"
                />
              </div>
              {fieldErrors.password_confirmation && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.password_confirmation}</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              Tampilkan password
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full flex items-center justify-center gap-2 bg-[#0D753F] hover:bg-[#075B30] disabled:opacity-70 text-white text-sm font-semibold rounded-xl py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#0D753F]/20 active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  Simpan Password Baru
                  <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/login', { replace: true });
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Logout & login kembali
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
