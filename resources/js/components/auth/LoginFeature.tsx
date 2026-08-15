import type { LucideIcon } from 'lucide-react';

interface LoginFeatureProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export function LoginFeature({ icon: Icon, title, description, delay = 0 }: LoginFeatureProps) {
  return (
    <div className="flex items-start gap-4 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/10">
        <Icon size={18} className="text-[#B8F3D8]" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-white/95">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/60">{description}</p>
      </div>
    </div>
  );
}
