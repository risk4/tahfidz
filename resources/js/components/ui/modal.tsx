import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ title, subtitle, onClose, children, maxWidth = 'max-w-2xl' }, ref) => {
    return (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div ref={ref} className={cn('max-h-[92vh] w-full overflow-hidden rounded-2xl bg-white shadow-2xl', maxWidth)}>
          <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-full p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="max-h-[78vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    );
  }
);
Modal.displayName = 'Modal';

export { Modal };
