import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { RefreshCcw } from 'lucide-react';

/**
 * Kode verifikasi sederhana (captcha) untuk konfirmasi aksi penting seperti hapus data.
 * Kode 4 karakter acak (tanpa karakter ambigu 0/O/1/I/L) yang harus diketik ulang
 * oleh pengguna sebelum aksi diizinkan.
 */
const CAPTCHA_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
  }
  return code;
}

export function Captcha({ onValidChange, label = 'Verifikasi Keamanan' }: { onValidChange: (valid: boolean) => void; label?: string }) {
  const [code, setCode] = useState(randomCode);
  const [value, setValue] = useState('');

  const normalized = value.trim().toUpperCase();
  const correct = normalized === code && normalized.length > 0;

  useEffect(() => {
    onValidChange(correct);
  }, [correct, onValidChange]);

  const refresh = () => {
    setCode(randomCode());
    setValue('');
    onValidChange(false);
  };

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-700">{label}</p>
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex select-none items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-slate-100/70 px-4 py-2.5"
        >
          {code.split('').map((c, i) => (
            <span
              key={i}
              className="inline-block text-xl font-black tracking-wider text-[#0D753F]"
              style={{
                fontFamily: "'Courier New', monospace",
                transform: `rotate(${(i % 2 === 0 ? 1 : -1) * (6 + i * 5)}deg) translateY(${(i % 2 === 0 ? -1 : 1) * 1}px)`,
              }}
            >
              {c}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={refresh}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#E2E8F0] text-[#64748B] transition-colors hover:border-[#0D753F] hover:text-[#0D753F]"
          aria-label="Muat ulang kode verifikasi"
          title="Muat ulang kode"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        placeholder="Ketik kode di atas"
        aria-label="Ketik kode verifikasi"
        autoComplete="off"
        className="mt-2.5 h-10 rounded-xl uppercase tracking-widest"
      />
      {value && !correct && <p className="mt-1.5 text-xs text-rose-600">Kode tidak cocok. Periksa kembali.</p>}
      {correct && <p className="mt-1.5 text-xs text-emerald-600">Kode benar ✓</p>}
    </div>
  );
}
