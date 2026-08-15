import { LoginBrandPanel } from '@/components/auth/LoginBrandPanel';
import { LoginForm } from '@/components/auth/LoginForm';

export default function Login() {
  return (
    <div className="font-inter relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8FAFC] md:p-6">
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

      {/* ===== Login container — 2 panels ===== */}
      <div className="relative grid w-full max-w-[1200px] min-h-[100svh] overflow-hidden rounded-none border-0 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] animate-login-in md:min-h-[620px] md:rounded-3xl md:border md:border-[#E2E8F0] md:grid-cols-[40%_60%] lg:h-[680px] lg:max-h-[94vh] lg:grid-cols-[45%_55%]">
        <LoginBrandPanel />
        <LoginForm />
      </div>
    </div>
  );
}
