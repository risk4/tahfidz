import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { SearchableSelect } from '@/components/ui/searchable-select';
import CertificateTemplate, {
  CERTIFICATE_HEIGHT,
  CERTIFICATE_WIDTH,
} from '@/components/certificates/CertificateTemplate';
import type { CertificateTemplateData } from '@/components/certificates/CertificateTemplate';
import { certificateService, classService, settingsService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import {
  buildJuzLabel,
  buildVerifyUrl,
  downloadCertificatePdf,
  generateQrDataUrl,
  printCertificate,
} from '@/lib/certificate';
import { formatDate, toDateInputValue } from '@/utils/date';
import type { AppSettings, Certificate, CertificateStats, ClassRoom, EligibleStudent } from '@/types';

/* ================================================================
 * Helpers & building blocks
 * ================================================================ */

function nameInitials(value?: string | null): string {
  return (value ?? '?')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className ?? ''}`} />;
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${className ?? ''}`}>{children}</div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50">
        <Award className="h-7 w-7 text-emerald-500" />
      </span>
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="max-w-md text-xs text-slate-400">{description}</p>
    </div>
  );
}

function safeFileName(value: string): string {
  const cleaned = value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '_');
  return cleaned || 'sertifikat';
}

function toTemplateData(cert: Certificate, qrDataUrl: string | null): CertificateTemplateData {
  return {
    certificateNumber: cert.certificate_number,
    studentName: cert.student?.name ?? '-',
    studentCode: cert.student?.student_code ?? null,
    className: cert.student?.class_name ?? null,
    juzLabel: cert.juz_label || buildJuzLabel(Number(cert.juz_count) || 0),
    institutionName: cert.institution_name ?? null,
    institutionCity: cert.institution_city ?? null,
    issuedDateFormatted: formatDate(cert.issued_date),
    pembinaName: cert.pembina_name ?? null,
    pembinaLabel: cert.pembina_label ?? 'Pembina Tahfidz',
    pengajarName: cert.pengajar_name ?? null,
    pengajarLabel: cert.pengajar_label ?? 'Pengajar Tahfidz',
    sealUrl: cert.institution_seal_path ? `/storage/${cert.institution_seal_path}` : null,
    verifyUrl: buildVerifyUrl(cert.verification_code),
    qrDataUrl,
    logoUrl: cert.institution_logo_path ? `/storage/${cert.institution_logo_path}` : null,
  };
}

/* ================================================================
 * Pratinjau sertifikat (skala responsif)
 * ================================================================ */

function ScaledCertificate({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / CERTIFICATE_WIDTH));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner">
      <div style={{ height: scale > 0 ? CERTIFICATE_HEIGHT * scale : 360 }}>
        <div style={{ transform: `scale(${scale > 0 ? scale : 0.3})`, transformOrigin: 'top left', width: CERTIFICATE_WIDTH }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
 * Modal pratinjau + unduh PDF + cetak
 * ================================================================ */

function CertificatePreviewModal({ cert, onClose }: { cert: Certificate; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Detail lengkap (data institusi & label juz) — fallback ke objek baris tabel.
  const { data: fetched } = useQuery({
    queryKey: ['certificate', cert.id],
    queryFn: () => certificateService.get(cert.id),
    staleTime: 60_000,
  });
  const payload: Certificate = fetched?.certificate ?? cert;

  useEffect(() => {
    let active = true;
    setQrDataUrl(null);
    generateQrDataUrl(buildVerifyUrl(payload.verification_code))
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [payload.verification_code]);

  const data = useMemo(() => toTemplateData(payload, qrDataUrl), [payload, qrDataUrl]);

  // Host di luar #app untuk node ekspor ukuran asli (cetak & PDF).
  const [exportHost] = useState<HTMLElement | null>(() => {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById('certificate-print-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'certificate-print-root';
      document.body.appendChild(el);
    }
    return el as HTMLElement;
  });

  const handleDownload = async () => {
    if (!exportRef.current || downloading) return;
    setDownloading(true);
    try {
      const base = safeFileName(
        `${payload.student?.name ?? 'santri'}_${payload.juz_label ?? `juz_${payload.juz_count}`}`,
      );
      await downloadCertificatePdf(exportRef.current, `Sertifikat_${base}.pdf`);
    } catch {
      alert('Gagal membuat berkas PDF. Silakan coba lagi.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Modal
        title="Pratinjau Sertifikat"
        subtitle={`${payload.certificate_number} · ${payload.juz_label ?? buildJuzLabel(Number(payload.juz_count) || 0)}`}
        onClose={onClose}
        maxWidth="max-w-[1100px]"
      >
        <div className="space-y-4 p-5">
          <ScaledCertificate>
            <CertificateTemplate data={data} />
          </ScaledCertificate>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <a
              href={`/sertifikat/verifikasi/${payload.verification_code}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700 hover:underline"
            >
              Lihat halaman verifikasi publik →
            </a>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => printCertificate()}>
                <Printer className="h-4 w-4" /> Cetak
              </Button>
              <Button onClick={handleDownload} disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Unduh PDF
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Node ukuran asli di luar #app — dipakai untuk cetak & ekspor PDF */}
      {exportHost &&
        createPortal(
          <div ref={exportRef} aria-hidden="true">
            <CertificateTemplate data={data} />
          </div>,
          exportHost,
        )}
    </>
  );
}

/* ================================================================
 * Modal penerbitan sertifikat
 * ================================================================ */

function IssueCertificateModal({
  onClose,
  onIssued,
}: {
  onClose: () => void;
  onIssued: (cert: Certificate) => void;
}) {
  const queryClient = useQueryClient();

  const [studentId, setStudentId] = useState<number | null>(null);
  const [juzCount, setJuzCount] = useState<number | ''>('');
  const [issuedDate, setIssuedDate] = useState(toDateInputValue(new Date()));
  const [pembinaName, setPembinaName] = useState('');
  const [pembinaLabel, setPembinaLabel] = useState('Pembina Tahfidz');
  const [pengajarName, setPengajarName] = useState('');
  const [pengajarLabel, setPengajarLabel] = useState('Pengajar Tahfidz');
  const [notes, setNotes] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const sealFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.all(),
    staleTime: 5 * 60 * 1000,
  });
  const currentSeal = (settings as AppSettings | undefined)?.certificate?.seal_path ?? null;

  const sealUpload = useMutation({
    mutationFn: (file: File) => settingsService.uploadLogo('certificate.seal_path', file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setToastMsg('Segel berhasil diperbarui.');
    },
  });

  const sealDelete = useMutation({
    mutationFn: () => settingsService.deleteLogo('certificate.seal_path'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setToastMsg('Segel dihapus — menggunakan segel bawaan.');
    },
  });

  const { data: eligibleData, isLoading } = useQuery({
    queryKey: ['certificate-eligible'],
    queryFn: () => certificateService.eligible(),
  });

  const eligible: EligibleStudent[] = eligibleData?.data ?? [];

  const options = useMemo(
    () =>
      eligible.map((s) => ({
        value: s.student_id,
        label: s.name,
        secondary: `${s.class_name ?? '-'} · Tuntas ${s.total_juz_completed} juz`,
        disabled: s.already_certified,
        avatarText: nameInitials(s.name),
      })),
    [eligible],
  );

  const selected = eligible.find((s) => s.student_id === studentId) ?? null;

  // Tingkat yang belum bersertifikat: certified_max+1 .. total juz tuntas.
  const levels = useMemo(() => {
    if (!selected) return [] as number[];
    const arr: number[] = [];
    for (let n = selected.certified_max_juz + 1; n <= selected.total_juz_completed; n++) arr.push(n);
    return arr;
  }, [selected]);

  useEffect(() => {
    setJuzCount(levels.length ? levels[levels.length - 1] : '');
  }, [levels]);

  const mutation = useMutation({
    mutationFn: () =>
      certificateService.create({
        student_id: Number(studentId),
        juz_count: Number(juzCount),
        issued_date: issuedDate,
        pembina_name: pembinaName.trim() || null,
        pembina_label: pembinaLabel.trim() || null,
        pengajar_name: pengajarName.trim() || null,
        pengajar_label: pengajarLabel.trim() || null,
        notes: notes.trim() || null,
      }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ['certificates'] });
      await queryClient.invalidateQueries({ queryKey: ['certificate-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['certificate-eligible'] });
      onIssued(res.certificate);
    },
  });

  const errMsg: string | null =
    (mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? null;

  const canSubmit =
    Boolean(studentId) && juzCount !== '' && Boolean(issuedDate) && !mutation.isPending;

  return (
    <Modal title="Terbitkan Sertifikat" subtitle="Penghargaan capaian hafalan juz santri" onClose={onClose}>
      <div className="space-y-4 p-6">
        {toastMsg && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
            ✓ {toastMsg}
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Santri</label>
          {isLoading ? (
            <Skeleton className="h-11 w-full" />
          ) : (
            <SearchableSelect
              options={options}
              value={studentId}
              onChange={(v) => setStudentId(v === null ? null : Number(v))}
              placeholder="Pilih santri yang memenuhi syarat..."
              searchPlaceholder="Cari nama / kode santri..."
              emptyText="Belum ada santri dengan minimal satu juz tuntas."
            />
          )}
          {selected && selected.already_certified && (
            <p className="mt-1.5 text-xs text-amber-600">
              Santri ini sudah memiliki sertifikat pada seluruh tingkat hafalannya saat ini.
            </p>
          )}
        </div>

        {selected && levels.length > 0 && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tingkat Capaian</label>
              <select
                value={juzCount}
                onChange={(e) => setJuzCount(Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                {[...levels].reverse().map((n) => (
                  <option key={n} value={n}>
                    {buildJuzLabel(n, selected.starting_juz)} ({n} juz)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tanggal Penerbitan</label>
              <Input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Peran Tanda Tangan Kiri</label>
                <Input
                  list="role-label-presets"
                  placeholder="Mis. Kepala Madrasah"
                  value={pembinaLabel}
                  onChange={(e) => setPembinaLabel(e.target.value)}
                  maxLength={60}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Peran Tanda Tangan Kanan</label>
                <Input
                  list="role-label-presets"
                  placeholder="Mis. Pengajar Tahfidz"
                  value={pengajarLabel}
                  onChange={(e) => setPengajarLabel(e.target.value)}
                  maxLength={60}
                />
              </div>
              <datalist id="role-label-presets">
                <option value="Pembina Tahfidz" />
                <option value="Kepala Madrasah" />
                <option value="Kepala Sekolah" />
                <option value="Ketua Yayasan" />
                <option value="Pengajar Tahfidz" />
              </datalist>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nama {pembinaLabel || 'Pembina'}</label>
                <Input
                  placeholder="Mis. Ust. Ahmad, Lc."
                  value={pembinaName}
                  onChange={(e) => setPembinaName(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nama {pengajarLabel || 'Pengajar'}</label>
                <Input
                  placeholder="Mis. Ust. Muhammad, M.Pd."
                  value={pengajarName}
                  onChange={(e) => setPengajarName(e.target.value)}
                  maxLength={120}
                />
              </div>
            </div>

            {/* Segel lembaga */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700">Segel / Stempel Lembaga</p>
                  <p className="text-xs text-slate-400">
                    Tampil di tengah bawah sertifikat. Kosongkan untuk memakai segel bawaan.
                  </p>
                </div>
                <div
                  className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-amber-400/80 bg-white"
                  title={currentSeal ? 'Segel kustom' : 'Segel bawaan'}
                >
                  {currentSeal ? (
                    <img src={`/storage/${currentSeal}`} alt="" className="h-full w-full object-contain p-1" />
                  ) : (
                    <Award className="h-6 w-6 text-emerald-600" />
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  ref={sealFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) sealUpload.mutate(file);
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={sealUpload.isPending || sealDelete.isPending}
                  onClick={() => sealFileRef.current?.click()}
                >
                  {sealUpload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Unggah Segel
                </Button>
                {currentSeal && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    disabled={sealDelete.isPending}
                    onClick={() => sealDelete.mutate()}
                  >
                    {sealDelete.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Hapus
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Catatan (opsional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
                placeholder="Catatan tambahan yang tampil pada arsip sertifikat..."
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </>
        )}

        {errMsg && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errMsg}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Terbitkan
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================
 * Halaman utama
 * ================================================================ */

export default function Certificates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = user?.role === 'super_admin' || user?.role === 'teacher';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Certificate | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, classFilter]);

  const listQuery = useQuery({
    queryKey: ['certificates', debouncedSearch, classFilter, page, perPage],
    queryFn: () =>
      certificateService.list({
        page,
        per_page: perPage,
        search: debouncedSearch || undefined,
        class_id: classFilter ? Number(classFilter) : undefined,
      }),
  });

  const statsQuery = useQuery({
    queryKey: ['certificate-stats'],
    queryFn: certificateService.stats,
    enabled: canManage,
  });

  const classesQuery = useQuery({
    queryKey: ['classes-options'],
    queryFn: () => classService.list({ per_page: 100 }),
    enabled: canManage,
  });

  const rows: Certificate[] = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const lastPage = listQuery.data?.last_page ?? 1;
  const stats: CertificateStats | undefined = statsQuery.data;
  const classes: ClassRoom[] = Array.isArray(classesQuery.data)
    ? classesQuery.data
    : classesQuery.data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => certificateService.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['certificates'] });
      await queryClient.invalidateQueries({ queryKey: ['certificate-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['certificate-eligible'] });
      setDeleteTarget(null);
    },
  });

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Penghargaan</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Sertifikat Hafalan</h1>
          <p className="mt-1 text-slate-500">
            Bentuk apresiasi atas capaian hafalan juz santri — dapat diunduh sebagai PDF atau dicetak langsung.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setIssueOpen(true)}>
            <Plus className="h-4 w-4" /> Terbitkan Sertifikat
          </Button>
        )}
      </div>

      {/* KPI */}
      {canManage && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            {statsQuery.isLoading ? (
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Sertifikat</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{stats?.total_certificates ?? 0}</p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50">
                  <Award className="h-5 w-5 text-emerald-600" strokeWidth={2} />
                </span>
              </div>
            )}
          </Card>
          <Card>
            {statsQuery.isLoading ? (
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Penerima Santri</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{stats?.total_recipients ?? 0}</p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50">
                  <Users className="h-5 w-5 text-sky-600" strokeWidth={2} />
                </span>
              </div>
            )}
          </Card>
          <Card>
            {statsQuery.isLoading ? (
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Memenuhi Syarat</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{stats?.eligible_students ?? 0}</p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50">
                  <BadgeCheck className="h-5 w-5 text-amber-600" strokeWidth={2} />
                </span>
              </div>
            )}
          </Card>
          <Card>
            {statsQuery.isLoading ? (
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Kamil 30 Juz</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{stats?.kamil_count ?? 0}</p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50">
                  <ShieldCheck className="h-5 w-5 text-violet-600" strokeWidth={2} />
                </span>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Filter */}
      {canManage && (
        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="relative md:col-span-7">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Cari nama santri atau nomor sertifikat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Cari sertifikat"
              />
            </div>
            <div className="md:col-span-3">
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                aria-label="Filter kelas"
              >
                <option value="">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end md:col-span-2">
              <span className="text-xs text-slate-400">{total} sertifikat</span>
            </div>
          </div>
        </Card>
      )}

      {/* Error */}
      {listQuery.isError && (
        <Card className="border-rose-100 bg-rose-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-rose-500" />
              <div>
                <p className="text-sm font-bold text-rose-700">Data sertifikat gagal dimuat.</p>
                <p className="text-xs text-rose-500">Terjadi masalah saat mengambil data.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => listQuery.refetch()}>
              <RotateCcw className="h-4 w-4" /> Coba Lagi
            </Button>
          </div>
        </Card>
      )}

      {/* Daftar */}
      <Card className="overflow-hidden p-0">
        {listQuery.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Belum ada sertifikat"
            description={
              canManage
                ? 'Terbitkan sertifikat pertama untuk santri yang telah menuntaskan minimal satu juz hafalan.'
                : 'Sertifikat akan muncul di sini setelah diterbitkan oleh pembina/pengajar Anda.'
            }
          />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">No</th>
                    <th className="px-3 py-3">Santri</th>
                    <th className="px-3 py-3">Nomor Sertifikat</th>
                    <th className="px-3 py-3">Capaian</th>
                    <th className="px-3 py-3">Tanggal</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, i) => (
                    <tr key={row.id} className="transition-colors hover:bg-emerald-50/40">
                      <td className="px-4 py-3 text-slate-400">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
                            {nameInitials(row.student?.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">{row.student?.name ?? '-'}</p>
                            <p className="text-xs text-slate-400">
                              {row.student?.student_code ?? ''}
                              {row.student?.class_room?.name ? ` · ${row.student.class_room.name}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600">{row.certificate_number}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <Award className="h-3 w-3" /> {row.juz_label ?? buildJuzLabel(Number(row.juz_count) || 0)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{formatDate(row.issued_date)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            size="icon"
                            variant="outline"
                            title="Pratinjau / unduh / cetak"
                            aria-label={`Lihat sertifikat ${row.student?.name ?? ''}`}
                            onClick={() => setPreviewCert(row)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canManage && (
                            <Button
                              size="icon"
                              variant="outline"
                              title="Hapus sertifikat"
                              aria-label={`Hapus sertifikat ${row.student?.name ?? ''}`}
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => setDeleteTarget(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden">
              {rows.map((row) => (
                <div key={row.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
                        {nameInitials(row.student?.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{row.student?.name ?? '-'}</p>
                        <p className="truncate font-mono text-xs text-slate-400">{row.certificate_number}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button size="icon" variant="outline" title="Pratinjau" onClick={() => setPreviewCert(row)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canManage && (
                        <Button
                          size="icon"
                          variant="outline"
                          title="Hapus"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <Award className="h-3 w-3" /> {row.juz_label ?? buildJuzLabel(Number(row.juz_count) || 0)}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(row.issued_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!listQuery.isLoading && total > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Menampilkan <b>{from}</b>-<b>{to}</b> dari <b>{total}</b> data
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  {[15, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} / halaman
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Halaman sebelumnya">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-sm font-semibold text-slate-700">
                  {page} / {lastPage}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  disabled={page >= lastPage}
                  onClick={() => setPage(page + 1)}
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modal pratinjau */}
      {previewCert && <CertificatePreviewModal cert={previewCert} onClose={() => setPreviewCert(null)} />}

      {/* Modal terbitkan */}
      {issueOpen && (
        <IssueCertificateModal
          onClose={() => setIssueOpen(false)}
          onIssued={(created) => {
            setIssueOpen(false);
            setPreviewCert(created);
          }}
        />
      )}

      {/* Konfirmasi hapus */}
      {deleteTarget && (
        <Modal title="Hapus Sertifikat" subtitle={`${deleteTarget.certificate_number}`} onClose={() => setDeleteTarget(null)} maxWidth="max-w-md">
          <div className="space-y-4 p-6">
            <p className="text-sm text-slate-600">
              Yakin ingin menghapus sertifikat <b>{deleteTarget.juz_label ?? `tingkat ${deleteTarget.juz_count}`}</b> atas nama{' '}
              <b>{deleteTarget.student?.name ?? '-'}</b>? Sertifikat yang dihapus tidak lagi valid saat diverifikasi.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Hapus
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
