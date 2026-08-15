import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';

export interface SearchableOption<T = unknown> {
  value: string | number;
  label: string;
  data?: T;
  secondary?: string;
  avatar?: string | null;
  avatarText?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string | number | null | undefined;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  autoFocus?: boolean;
  /** Render extra content below the label (e.g. class info). */
  renderOption?: (opt: SearchableOption) => React.ReactNode;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih...',
  disabled,
  searchPlaceholder = 'Cari...',
  emptyText = 'Tidak ada data yang cocok.',
  autoFocus,
  renderOption,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.secondary ?? '').toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (open && autoFocus) {
      // focus input pada render berikutnya
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, autoFocus]);

  // Reset highlight ketika daftar berubah
  useEffect(() => setHighlight(0), [query, open]);

  const scrollTo = (index: number) => {
    listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' });
  };

  const select = (opt: SearchableOption) => {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => {
        const n = Math.min(h + 1, filtered.length - 1);
        scrollTo(n);
        return n;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => {
        const n = Math.max(h - 1, 0);
        scrollTo(n);
        return n;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt && !opt.disabled) select(opt);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      {/* Tombol pemicu */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-white px-3 text-left text-sm shadow-sm transition-colors hover:border-[#0D753F]/40 focus:outline-none focus:ring-2 focus:ring-[#0D753F]/15 disabled:cursor-not-allowed disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <>
            {selected.avatar !== undefined && (
              selected.avatar ? (
                <img src={selected.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                  {selected.avatarText ?? selected.label.slice(0, 2).toUpperCase()}
                </span>
              )
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-[#172033]">{selected.label}</span>
              {selected.secondary && (
                <span className="block truncate text-xs text-[#64748B]">{selected.secondary}</span>
              )}
            </span>
          </>
        ) : (
          <span className="text-[#94A3B8]">{placeholder}</span>
        )}
        <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-[#94A3B8]" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
          <div className="relative border-b border-[#E2E8F0]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-t-xl pl-9 pr-8 text-sm focus:outline-none"
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#94A3B8] hover:bg-slate-100"
                aria-label="Bersihkan pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <ul ref={listRef} role="listbox" className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-[#94A3B8]">{emptyText}</li>
            ) : (
              filtered.map((opt, i) => (
                <li key={`${opt.value}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={String(opt.value) === String(value)}
                    disabled={opt.disabled}
                    onClick={() => select(opt)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      i === highlight ? 'bg-emerald-50' : ''
                    } ${String(opt.value) === String(value) ? 'bg-emerald-50/60' : ''}`}
                  >
                    {opt.avatar !== undefined &&
                      (opt.avatar ? (
                        <img src={opt.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                          {opt.avatarText ?? opt.label.slice(0, 2).toUpperCase()}
                        </span>
                      ))}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-[#172033]">{opt.label}</span>
                      {opt.secondary && (
                        <span className="block truncate text-xs text-[#64748B]">{opt.secondary}</span>
                      )}
                      {renderOption?.(opt)}
                    </span>
                    {String(opt.value) === String(value) && <Check className="h-4 w-4 shrink-0 text-[#0D753F]" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
