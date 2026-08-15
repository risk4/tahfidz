import { ArrowRight, Loader2 } from 'lucide-react';

export function LoginButton({ isLoading }: { isLoading: boolean }) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="group flex h-[50px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#0D753F] text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-px hover:bg-[#075B30] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
    >
      {isLoading ? (
        <>
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          Memproses...
        </>
      ) : (
        <>
          Masuk
          <ArrowRight size={18} className="transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
        </>
      )}
    </button>
  );
}
