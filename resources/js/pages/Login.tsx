import { LoginBrandPanel } from '@/components/auth/LoginBrandPanel';
import { LoginForm } from '@/components/auth/LoginForm';

export default function Login() {
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

      {/* ===== Login container — 2 panels, full page di desktop ===== */}
      <div className="relative grid w-full min-h-[100svh] overflow-hidden bg-white animate-login-in md:h-screen md:grid-cols-[40%_60%] lg:grid-cols-[45%_55%]">
        <LoginBrandPanel />
        <LoginForm />
      </div>
    </div>
  );
}
