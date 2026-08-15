import type { InputHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

interface LoginInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon: LucideIcon;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}

export function LoginInput({ id, label, icon: Icon, invalid, describedBy, className, ...props }: LoginInputProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-[#172033]">
        {label}
      </label>
      <div className="relative">
        <Icon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
        <input
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="h-[50px] w-full rounded-[10px] border border-[#E2E8F0] bg-white pl-11 pr-4 text-sm text-[#172033] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#94A3B8] focus:border-[#0D753F] focus:ring-[3px] focus:ring-[#0D753F]/10 disabled:cursor-not-allowed disabled:opacity-60"
          {...props}
        />
      </div>
    </div>
  );
}
