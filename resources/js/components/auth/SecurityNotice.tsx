import { ShieldCheck } from 'lucide-react';

export function SecurityNotice() {
  return (
    <div className="flex items-center justify-center gap-2 text-center">
      <ShieldCheck size={15} className="shrink-0 text-[#0D753F]" aria-hidden="true" />
      <p className="text-xs leading-relaxed text-[#64748B]">Akses hanya untuk administrator yang berwenang.</p>
    </div>
  );
}
