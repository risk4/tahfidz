import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  hideForgotLink?: boolean;
}

export function PasswordInput({ id, label, invalid, describedBy, className, hideForgotLink, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-[#172033]">
          {label}
        </label>
        {!hideForgotLink && (
        <a
          href="/forgot-password"
          className="text-xs font-medium text-[#0D753F] transition-colors duration-150 hover:text-[#075B30]"
        >
          Lupa kata sandi?
        </a>
        )}
      </div>
      <div className="relative">
        <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="h-[50px] w-full rounded-[10px] border border-[#E2E8F0] bg-white pl-11 pr-11 text-sm text-[#172033] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#94A3B8] focus:border-[#0D753F] focus:ring-[3px] focus:ring-[#0D753F]/10 disabled:cursor-not-allowed disabled:opacity-60"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] transition-colors duration-150 hover:text-[#64748B]"
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
