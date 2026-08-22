import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, BadgeCheck, CalendarDays, Hash, Layers, ShieldX } from 'lucide-react';
import { certificateService } from '@/services/api';
import { formatDate } from '@/utils/date';

/**
 * Halaman publik verifikasi keaslian sertifikat — diakses dari QR code
 * pada sertifikat tanpa perlu masuk ke aplikasi.
 */
export default function VerifyCertificate() {
  const { code = '' } = useParams<{ code: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['certificate-verify', code],
    queryFn: () => certificateService.verify(code),
    enabled: Boolean(code),
    retry: false,
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(5,150,105,0.12),transparent_35%)] bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <Award className="h-7 w-7" />
          </span>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Verifikasi Sertifikat</h1>
          <p className="mt-1 text-sm text-slate-500">Sistem Tahfidz Al-Qur&rsquo;an</p>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-3 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
            <div className="mx-auto h-8 w-40 rounded-full bg-slate-100" />
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-4 w-2/3 mx-auto rounded bg-slate-100" />
            <div className="h-4 w-1/2 mx-auto rounded bg-slate-100" />
          </div>
        ) : !data?.valid || !data.certificate ? (
          <div className="rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-rose-50">
              <ShieldX className="h-7 w-7 text-rose-500" />
            </span>
            <h2 className="text-base font-bold text-rose-700">Sertifikat Tidak Valid</h2>
            <p className="mt-1 text-sm text-slate-500">
              {data?.message ?? 'Kode verifikasi tidak dikenali atau sertifikat telah dicabut.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-[#04281A] to-[#075233] px-6 py-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-emerald-200">
                  {data.certificate.institution_name}
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/15 px-3 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-300/30">
                  <BadgeCheck className="h-3.5 w-3.5" /> Terverifikasi
                </span>
              </div>

              <div className="space-y-4 p-6">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Diberikan kepada</p>
                  <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
                    {data.certificate.student_name}
                  </p>
                  {data.certificate.class_name && <p className="text-sm text-slate-500">{data.certificate.class_name}</p>}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <Layers className="mx-auto h-4 w-4 text-emerald-600" />
                    <p className="mt-1.5 text-sm font-bold text-slate-900">{data.certificate.juz_label}</p>
                    <p className="text-[11px] text-slate-400">Capaian Hafalan</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <CalendarDays className="mx-auto h-4 w-4 text-sky-600" />
                    <p className="mt-1.5 text-sm font-bold text-slate-900">{formatDate(data.certificate.issued_date)}</p>
                    <p className="text-[11px] text-slate-400">Tanggal Terbit</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <Hash className="mx-auto h-4 w-4 text-violet-600" />
                    <p className="mt-1.5 truncate text-sm font-bold text-slate-900">{data.certificate.certificate_number}</p>
                    <p className="text-[11px] text-slate-400">Nomor</p>
                  </div>
                </div>

                <p className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-center text-xs leading-relaxed text-emerald-800">
                  Dokumen ini tercatat resmi dalam sistem dan dinyatakan{' '}
                  <b>asli &amp; berlaku</b>. Keaslian dapat dipastikan melalui halaman ini.
                </p>
              </div>
            </div>
          </>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Halaman verifikasi publik — tidak memerlukan akun.
          <br />© {new Date().getFullYear()} {data?.certificate?.institution_name ?? "Lembaga Tahfidz Al-Qur'an"}
        </p>
      </div>
    </div>
  );
}
