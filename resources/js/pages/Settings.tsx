import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Database,
  Download,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  History,
  Image as ImageIcon,
  KeyRound,
  Link as LinkIcon,
  ListChecks,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Mic,
  Palette,
  Pencil,
  Plug,
  Plus,
  RefreshCw,
  Save,
  School,
  Send,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Smartphone,
  Target,
  Trash2,
  Upload,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Modal } from '@/components/ui/modal';
import ManageMembersModal from '@/components/tahfidz/ManageMembersModal';
import {
  academicYearService,
  classService,
  quranService,
  settingsService,
  tahfidzGroupService,
  teacherService,
  type SettingsGroup,
} from '@/services/api';
import type {
  AcademicYear,
  ActivityLog,
  AppSettings,
  ClassRoom,
  MurajaahMethod,
  QuranSurah,
  SessionInfo,
  SettingsUser,
  TahfidzGroup,
  Teacher,
} from '@/types';
import { formatDate, toDateInputValue } from '@/utils/date';

/* ============================================================
 * Shared helpers
 * ============================================================ */

const selectCls =
  'h-9 w-full rounded-lg border border-input bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50';

const textareaCls =
  'w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40';

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function roleLabel(role: string): string {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'teacher') return 'Guru/Pembimbing';
  if (role === 'student') return 'Siswa';
  return role;
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    login: 'Masuk aplikasi',
    logout: 'Keluar aplikasi',
    change_password: 'Mengubah password',
    update_settings: 'Mengubah pengaturan',
    upload_logo: 'Mengunggah logo',
    delete_logo: 'Menghapus logo',
    toggle_user_active: 'Mengubah status pengguna',
    revoke_session: 'Mencabut sesi',
    logout_all_devices: 'Keluar dari semua perangkat',
    backup_now: 'Melakukan backup',
    download_backup: 'Mengunduh backup',
    restore_backup: 'Memulihkan backup',
    clear_activity_logs: 'Menghapus log aktivitas',
    create: 'Menambahkan data',
    update: 'Memperbarui data',
    delete: 'Menghapus data',
  };
  return map[action] ?? action.replace(/_/g, ' ');
}

const modelLabel = (model: string): string => {
  if (model === 'settings') return 'Pengaturan';
  if (model === 'App\\Domain\\People\\Models\\User' || model === 'User') return 'Pengguna';
  if (model === 'App\\Domain\\Tahfidz\\Models\\Submission' || model === 'Submission') return 'Setoran Hafalan';
  if (model === 'App\\Domain\\Tahfidz\\Models\\Murajaah' || model === 'Murajaah') return 'Murajaah';
  if (model === 'App\\Domain\\People\\Models\\Student' || model === 'Student') return 'Santri';
  if (model === 'App\\Domain\\People\\Models\\Teacher' || model === 'Teacher') return 'Guru';
  if (model === 'sanctum_token') return 'Sesi';
  return model.split('\\').pop() ?? model;
};

function Toast({ msg, tone = 'success', onClose }: { msg: string; tone?: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed right-5 top-20 z-[60] rounded-2xl border px-5 py-3 text-sm font-semibold shadow-xl ${
        tone === 'error' ? 'border-rose-100 bg-white text-rose-700' : 'border-emerald-100 bg-white text-emerald-700'
      }`}
    >
      {msg}
    </div>
  );
}

function SectionHeader({ title, subtitle, right }: { title: string; subtitle: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

function SaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
        <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan...
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
        Gagal menyimpan
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Tersimpan
      </span>
    );
  }
  return null;
}

function Pagination({
  page,
  lastPage,
  onChange,
  total,
}: {
  page: number;
  lastPage: number;
  onChange: (p: number) => void;
  total?: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
      <p className="text-xs text-slate-500">
        {total !== undefined ? `${total.toLocaleString('id-ID')} data` : `Halaman ${page} dari ${lastPage}`}
      </p>
      <div className="flex flex-wrap items-center justify-end gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Sebelumnya
        </Button>
        <span className="px-2 text-xs font-semibold text-slate-600">
          {page} / {Math.max(lastPage, 1)}
        </span>
        <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => onChange(page + 1)}>
          Berikutnya <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function useSettings() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.all(),
  });
  return { settings: query.data, isLoading: query.isLoading, queryClient };
}

/** Form section with debounced auto-save (draft overlay di atas data server). */
function useAutoSaveSection(group: SettingsGroup) {
  const { settings, queryClient } = useSettings();
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef<Record<string, unknown> | null>(null);

  const base = (settings?.[group] ?? {}) as Record<string, unknown>;
  const values = { ...base, ...(draft ?? {}) };

  const flush = useCallback(async () => {
    const payload = draftRef.current;
    if (!payload) {
      setStatus((s) => (s === 'idle' ? 'saved' : s));
      return;
    }
    setStatus('saving');
    try {
      const res = await settingsService.updateGroup(group, payload);
      setDraft((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        Object.keys(payload).forEach((k) => delete next[k]);
        draftRef.current = Object.keys(next).length ? next : null;
        return Object.keys(next).length ? next : null;
      });
      queryClient.setQueryData(['settings'], (old: AppSettings | undefined) => {
        if (!old) return old;
        const current = { ...(old[group] as Record<string, unknown>) };
        Object.keys(payload).forEach((k) => {
          current[k] = (res.values as Record<string, unknown>)[k];
        });
        return { ...old, [group]: current } as AppSettings;
      });
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [group, queryClient]);

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const setValue = useCallback((key: string, value: unknown) => {
    setDraft((prev) => {
      const next = { ...(prev ?? {}), [key]: value };
      draftRef.current = next;
      return next;
    });
    setStatus('idle');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), 900);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return { values, setValue, status, flush };
}

/* ============================================================
 * Profil Madrasah
 * ============================================================ */

function ProfileSection() {
  const { settings, queryClient } = useSettings();
  const { values, setValue, status } = useAutoSaveSection('profile');
  const profile = values as AppSettings['profile'];
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => settingsService.uploadLogo('profile.logo_path', file),
    onSuccess: (res) => {
      queryClient.setQueryData(['settings'], (old: AppSettings | undefined) =>
        old ? { ...old, profile: { ...old.profile, logo_path: res.path } } : old
      );
      setToast({ msg: 'Logo madrasah berhasil diubah.', tone: 'success' });
    },
    onError: () => setToast({ msg: 'Gagal mengunggah logo. Ukuran maksimal 2 MB.', tone: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => settingsService.deleteLogo('profile.logo_path'),
    onSuccess: () => {
      queryClient.setQueryData(['settings'], (old: AppSettings | undefined) =>
        old ? { ...old, profile: { ...old.profile, logo_path: null } } : old
      );
      setToast({ msg: 'Logo madrasah dihapus.', tone: 'success' });
    },
    onError: () => setToast({ msg: 'Gagal menghapus logo.', tone: 'error' }),
  });

  const logoUrl = profile.logo_path ? `/storage/${profile.logo_path}` : null;

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
      <SectionHeader title="Profil Madrasah" subtitle="Kelola informasi dasar madrasah" right={<SaveIndicator status={status} />} />

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Logo Madrasah</CardTitle>
          <CardDescription>JPG, JPEG, PNG, atau WebP — maksimal 2 MB.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo madrasah" className="h-full w-full object-contain" />
            ) : (
              <ImageIcon className="h-8 w-8 text-slate-300" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
                e.target.value = '';
              }}
            />
            <Button
              variant="outline"
              disabled={uploadMutation.isPending}
              onClick={() => fileRef.current?.click()}
            >
              {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Ubah Logo
            </Button>
            {logoUrl && (
              <Button variant="ghost" className="text-rose-600" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                <Trash2 className="h-4 w-4" /> Hapus Logo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Identitas */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="profile-name">Nama Madrasah</Label>
              <Input id="profile-name" value={profile.name ?? ''} onChange={(e) => setValue('name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-npsn">NPSN</Label>
              <Input id="profile-npsn" value={profile.npsn ?? ''} onChange={(e) => setValue('npsn', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-nsm">NSM</Label>
              <Input id="profile-nsm" value={profile.nsm ?? ''} onChange={(e) => setValue('nsm', e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="profile-type">Jenis Madrasah</Label>
              <select
                id="profile-type"
                className={selectCls}
                value={profile.madrasah_type ?? ''}
                onChange={(e) => setValue('madrasah_type', e.target.value)}
              >
                <option value="MI">Madrasah Ibtidaiyah (MI)</option>
                <option value="MTs">Madrasah Tsanawiyah (MTs)</option>
                <option value="MA">Madrasah Aliyah (MA)</option>
                <option value="Pesantren">Pondok Pesantren</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="profile-address">Alamat</Label>
              <textarea
                id="profile-address"
                className={textareaCls}
                rows={3}
                value={profile.address ?? ''}
                onChange={(e) => setValue('address', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email Madrasah</Label>
              <Input
                id="profile-email"
                type="email"
                value={profile.email ?? ''}
                onChange={(e) => setValue('email', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-phone">Telepon / WhatsApp</Label>
              <Input id="profile-phone" value={profile.phone ?? ''} onChange={(e) => setValue('phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-website">Website</Label>
              <Input id="profile-website" value={profile.website ?? ''} onChange={(e) => setValue('website', e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
              <Label htmlFor="profile-city">Kabupaten/Kota</Label>
              <Input id="profile-city" value={profile.city ?? ''} onChange={(e) => setValue('city', e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
              <Label htmlFor="profile-province">Provinsi</Label>
              <Input id="profile-province" value={profile.province ?? ''} onChange={(e) => setValue('province', e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            {settings ? 'Data tersimpan dari database.' : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
 * Identitas Aplikasi
 * ============================================================ */

function ApplicationSection() {
  const { queryClient } = useSettings();
  const { values, setValue, status } = useAutoSaveSection('application');
  const app = values as AppSettings['application'];
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: ({ key, file }: { key: string; file: File }) => settingsService.uploadLogo(key, file),
    onSuccess: (res, vars) => {
      const field = vars.key === 'application.logo_path' ? 'logo_path' : 'favicon_path';
      queryClient.setQueryData(['settings'], (old: AppSettings | undefined) =>
        old ? { ...old, application: { ...old.application, [field]: res.path } } : old
      );
      setToast({ msg: 'Berhasil diunggah.', tone: 'success' });
    },
    onError: () => setToast({ msg: 'Gagal mengunggah file. Ukuran maksimal 2 MB.', tone: 'error' }),
  });

  const color = /^#([0-9a-fA-F]{6})$/.test(app.primary_color ?? '') ? app.primary_color : '#059669';

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
      <SectionHeader title="Identitas Aplikasi" subtitle="Nama, logo, dan preferensi aplikasi" right={<SaveIndicator status={status} />} />

      {/* Live preview */}
      <Card>
        <CardHeader>
          <CardTitle>Pratinjau</CardTitle>
          <CardDescription>Live preview identitas aplikasi.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 rounded-2xl p-6 text-white" style={{ backgroundColor: color }}>
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/20">
              <SettingsIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold">{app.app_name || 'Tahfidz Qur\'an'}</p>
              <p className="text-sm opacity-85">{app.tagline || 'Menghafal Al-Qur\'an, Meraih Surga'}</p>
            </div>
            <span className="ml-auto hidden rounded-full bg-white/15 px-3 py-1 text-xs sm:block">
              {app.date_format} · {app.time_format === '24' ? '24 Jam' : '12 Jam'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="app-name">Nama Aplikasi</Label>
              <Input id="app-name" value={app.app_name ?? ''} onChange={(e) => setValue('app_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-tagline">Tagline</Label>
              <Input id="app-tagline" value={app.tagline ?? ''} onChange={(e) => setValue('tagline', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-color">Warna Utama</Label>
              <div className="flex items-center gap-2">
                <input
                  id="app-color"
                  type="color"
                  value={color}
                  onChange={(e) => setValue('primary_color', e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-input bg-white p-1 shadow-sm"
                />
                <Input value={app.primary_color ?? ''} onChange={(e) => setValue('primary_color', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-timezone">Zona Waktu</Label>
              <select id="app-timezone" className={selectCls} value={app.timezone ?? 'Asia/Jakarta'} onChange={(e) => setValue('timezone', e.target.value)}>
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-language">Bahasa</Label>
              <select id="app-language" className={selectCls} value={app.language ?? 'id'} onChange={(e) => setValue('language', e.target.value)}>
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-date-format">Format Tanggal</Label>
              <select id="app-date-format" className={selectCls} value={app.date_format ?? 'DD MMMM YYYY'} onChange={(e) => setValue('date_format', e.target.value)}>
                <option value="DD MMMM YYYY">DD MMMM YYYY (16 Mei 2024)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (16/05/2024)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2024-05-16)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-time-format">Format Waktu</Label>
              <select id="app-time-format" className={selectCls} value={app.time_format ?? '24'} onChange={(e) => setValue('time_format', e.target.value)}>
                <option value="24">24 Jam</option>
                <option value="12">12 Jam (AM/PM)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
            <div className="flex items-center gap-4 rounded-xl border border-slate-100 p-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-100">
                {app.logo_path ? (
                  <img src={`/storage/${app.logo_path}`} alt="Logo aplikasi" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-slate-300" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">Logo Aplikasi</p>
                <p className="truncate text-xs text-slate-500">
                  {app.logo_path ? 'Sudah diunggah — preview di samping.' : 'Belum ada logo.'}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <input
                  ref={logoRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload.mutate({ key: 'application.logo_path', file });
                    e.target.value = '';
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => logoRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Unggah
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-slate-100 p-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-100">
                {app.favicon_path ? (
                  <img src={`/storage/${app.favicon_path}`} alt="Favicon" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-slate-300" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">Favicon</p>
                <p className="truncate text-xs text-slate-500">
                  {app.favicon_path ? 'Sudah diunggah — preview di samping.' : 'Belum ada favicon.'}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <input
                  ref={faviconRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload.mutate({ key: 'application.favicon_path', file });
                    e.target.value = '';
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => faviconRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Unggah
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
 * Pengguna & Peran
 * ============================================================ */

function UsersSection() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['settings-users', page],
    queryFn: () => settingsService.users({ page, per_page: 15 }),
  });
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  const toggle = useMutation({
    mutationFn: settingsService.toggleUserActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
      setToast({ msg: 'Status pengguna diperbarui.', tone: 'success' });
    },
    onError: () => setToast({ msg: 'Gagal mengubah status pengguna.', tone: 'error' }),
  });

  const roleCounts = data?.role_counts ?? {};
  const users: SettingsUser[] = data?.users.data ?? [];
  const total = data?.users.total ?? 0;
  const lastPage = data?.users.last_page ?? 1;

  const stats = [
    { label: 'Total Pengguna', value: total, icon: Users, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Super Admin', value: roleCounts.super_admin ?? 0, icon: ShieldCheck, tone: 'text-sky-600 bg-sky-50' },
    { label: 'Guru/Pembimbing', value: roleCounts.teacher ?? 0, icon: UserRound, tone: 'text-violet-600 bg-violet-50' },
    { label: 'Siswa', value: roleCounts.student ?? 0, icon: GraduationCap, tone: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
      <SectionHeader title="Pengguna & Peran" subtitle="Kelola akun pengguna dan perannya" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight text-slate-900">{s.value}</p>
                <p className="truncate text-xs text-slate-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Nama</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Terakhir Login</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">Memuat...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">Belum ada pengguna.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-emerald-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                          {u.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{u.name}</p>
                          <p className="truncate text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          u.role === 'super_admin'
                            ? 'bg-sky-100 text-sky-700'
                            : u.role === 'teacher'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{fmtDateTime(u.last_login_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={u.is_active ? 'outline' : 'default'}
                        disabled={toggle.isPending}
                        onClick={() => toggle.mutate(u.id)}
                      >
                        {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: tampilan kartu */}
        <div className="divide-y divide-slate-100 md:hidden">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-slate-500">Memuat...</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">Belum ada pengguna.</div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {u.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{u.name}</p>
                      <p className="truncate text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={u.is_active ? 'outline' : 'default'}
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate(u.id)}
                  >
                    {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      u.role === 'super_admin'
                        ? 'bg-sky-100 text-sky-700'
                        : u.role === 'teacher'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {roleLabel(u.role)}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {u.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <span className="text-xs text-slate-400">Login terakhir: {fmtDateTime(u.last_login_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <Pagination page={page} lastPage={lastPage} onChange={setPage} total={total} />
      </Card>
    </div>
  );
}

/* ============================================================
 * Kelas & Halaqah
 * ============================================================ */

function ClassFormModal({
  initial,
  academicYears,
  teachers,
  onSave,
  onClose,
}: {
  initial: ClassRoom | null;
  academicYears: AcademicYear[];
  teachers: Teacher[];
  onSave: (data: { name: string; grade: number; academic_year_id: number; homeroom_teacher_id?: number }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [grade, setGrade] = useState(initial?.grade ?? 7);
  const [yearId, setYearId] = useState(initial?.academic_year_id ? String(initial.academic_year_id) : '');
  const [teacherId, setTeacherId] = useState(initial?.homeroom_teacher_id ? String(initial.homeroom_teacher_id) : '');
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim()) return setError('Nama kelas wajib diisi.');
    if (!yearId) return setError('Tahun ajaran wajib dipilih.');
    onSave({
      name: name.trim(),
      grade: Number(grade) || 7,
      academic_year_id: Number(yearId),
      homeroom_teacher_id: teacherId ? Number(teacherId) : undefined,
    });
  };

  return (
    <Modal title={initial ? 'Edit Kelas' : 'Tambah Kelas'} onClose={onClose}>
      <div className="space-y-4 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="class-name">Nama Kelas *</Label>
          <Input id="class-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kelas A" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="class-grade">Tingkat</Label>
            <select id="class-grade" className={selectCls} value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>Kelas {g}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="class-year">Tahun Ajaran *</Label>
            <select id="class-year" className={selectCls} value={yearId} onChange={(e) => setYearId(e.target.value)}>
              <option value="">Pilih tahun ajaran...</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="class-teacher">Wali Kelas</Label>
          <select id="class-teacher" className={selectCls} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">— Tidak ada —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <Button onClick={submit}>{initial ? 'Simpan Perubahan' : 'Tambah Kelas'}</Button>
          <Button variant="outline" onClick={onClose}>Batal</Button>
        </div>
      </div>
    </Modal>
  );
}

function GroupFormModal({
  initial,
  academicYears,
  teachers,
  onSave,
  onClose,
}: {
  initial: TahfidzGroup | null;
  academicYears: AcademicYear[];
  teachers: Teacher[];
  onSave: (data: { name: string; teacher_id: number; academic_year_id: number; description?: string; status?: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [teacherId, setTeacherId] = useState(initial?.teacher_id ? String(initial.teacher_id) : '');
  const [yearId, setYearId] = useState(initial?.academic_year_id ? String(initial.academic_year_id) : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim()) return setError('Nama halaqah wajib diisi.');
    if (!teacherId) return setError('Pembimbing wajib dipilih.');
    if (!yearId) return setError('Tahun ajaran wajib dipilih.');
    onSave({
      name: name.trim(),
      teacher_id: Number(teacherId),
      academic_year_id: Number(yearId),
      description: description.trim() || undefined,
      status,
    });
  };

  return (
    <Modal title={initial ? 'Edit Halaqah' : 'Tambah Halaqah'} onClose={onClose}>
      <div className="space-y-4 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="group-name">Nama Halaqah *</Label>
          <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Halaqah 01" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="group-teacher">Pembimbing *</Label>
            <select id="group-teacher" className={selectCls} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">Pilih pembimbing...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="group-year">Tahun Ajaran *</Label>
            <select id="group-year" className={selectCls} value={yearId} onChange={(e) => setYearId(e.target.value)}>
              <option value="">Pilih tahun ajaran...</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="group-desc">Deskripsi</Label>
          <textarea
            id="group-desc"
            className={textareaCls}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="group-status">Status</Label>
          <select id="group-status" className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <Button onClick={submit}>{initial ? 'Simpan Perubahan' : 'Tambah Halaqah'}</Button>
          <Button variant="outline" onClick={onClose}>Batal</Button>
        </div>
      </div>
    </Modal>
  );
}

function ClassesSection() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<'classes' | 'groups'>(() => (searchParams.get('tab') === 'groups' ? 'groups' : 'classes'));
  return (
    <div className="space-y-5">
      <SectionHeader title="Kelas & Halaqah" subtitle="Kelola kelas dan kelompok halaqah" />
      <div className="flex gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1">
        <button
          onClick={() => setTab('classes')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'classes' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Kelas
        </button>
        <button
          onClick={() => setTab('groups')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'groups' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Halaqah
        </button>
      </div>
      {tab === 'classes' ? <ClassesTab /> : <GroupsTab />}
    </div>
  );
}

function ClassesTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ClassRoom | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  const { data: classesData, isLoading } = useQuery({
    queryKey: ['classes-settings'],
    queryFn: () => classService.list({ per_page: 100 }),
  });
  const { data: yearsData } = useQuery({
    queryKey: ['academic-years-options'],
    queryFn: () => academicYearService.list({ per_page: 100 }),
  });
  const { data: teachersData } = useQuery({
    queryKey: ['teachers-options'],
    queryFn: () => teacherService.list({ per_page: 100 }),
  });

  const classes = (Array.isArray(classesData) ? classesData : classesData?.data ?? []) as ClassRoom[];
  const academicYears = (Array.isArray(yearsData) ? yearsData : yearsData?.data ?? []) as AcademicYear[];
  const teachers = (Array.isArray(teachersData) ? teachersData : teachersData?.data ?? []) as Teacher[];

  const save = useMutation({
    mutationFn: (data: { name: string; grade: number; academic_year_id: number; homeroom_teacher_id?: number }) =>
      editing ? classService.update(editing.id, data) : classService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes-settings'] });
      setShowForm(false);
      setEditing(null);
      setToast({ msg: 'Kelas berhasil disimpan.', tone: 'success' });
    },
    onError: () => setToast({ msg: 'Gagal menyimpan kelas.', tone: 'error' }),
  });

  const remove = useMutation({
    mutationFn: classService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes-settings'] });
      setToast({ msg: 'Kelas berhasil dihapus.', tone: 'success' });
    },
    onError: () => setToast({ msg: 'Gagal menghapus kelas.', tone: 'error' }),
  });

  return (
    <Card className="overflow-hidden">
      {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">Daftar Kelas ({classes.length})</p>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Tambah Kelas
        </Button>
      </div>
      {isLoading ? (
        <div className="p-8 text-center text-sm text-slate-500">Memuat...</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Nama</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Tingkat</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Wali Kelas</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Tahun Ajaran</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">Belum ada kelas.</td>
                  </tr>
                ) : (
                  classes.map((c) => (
                    <tr key={c.id} className="hover:bg-emerald-50/40">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{c.grade}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{c.homeroom_teacher?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{c.academic_year?.name || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            title="Edit"
                            onClick={() => { setEditing(c); setShowForm(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-rose-600 hover:bg-rose-50"
                            title="Hapus"
                            onClick={() => {
                              if (window.confirm(`Hapus kelas "${c.name}"?`)) remove.mutate(c.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: tampilan kartu */}
          <div className="divide-y divide-slate-100 md:hidden">
            {classes.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Belum ada kelas.</div>
            ) : (
              classes.map((c) => (
                <div key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{c.name}</p>
                      <p className="truncate text-xs text-slate-500">{c.academic_year?.name || '-'}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Tingkat {c.grade}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Wali Kelas: <b className="text-slate-900">{c.homeroom_teacher?.name || '-'}</b>
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(c); setShowForm(true); }}>
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="ml-auto"
                      onClick={() => {
                        if (window.confirm(`Hapus kelas "${c.name}"?`)) remove.mutate(c.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Hapus
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
      {showForm && (
        <ClassFormModal
          initial={editing}
          academicYears={academicYears}
          teachers={teachers}
          onSave={(data) => save.mutate(data)}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </Card>
  );
}

function GroupsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TahfidzGroup | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [manageGroup, setManageGroup] = useState<TahfidzGroup | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['groups-settings'],
    queryFn: () => tahfidzGroupService.list({ per_page: 100 }),
  });
  const { data: yearsData } = useQuery({
    queryKey: ['academic-years-options'],
    queryFn: () => academicYearService.list({ per_page: 100 }),
  });
  const { data: teachersData } = useQuery({
    queryKey: ['teachers-options'],
    queryFn: () => teacherService.list({ per_page: 100 }),
  });

  const groups = (Array.isArray(groupsData) ? groupsData : groupsData?.data ?? []) as TahfidzGroup[];
  const academicYears = (Array.isArray(yearsData) ? yearsData : yearsData?.data ?? []) as AcademicYear[];
  const teachers = (Array.isArray(teachersData) ? teachersData : teachersData?.data ?? []) as Teacher[];

  const save = useMutation({
    mutationFn: (data: { name: string; teacher_id: number; academic_year_id: number; description?: string; status?: string }) =>
      editing ? tahfidzGroupService.update(editing.id, data) : tahfidzGroupService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups-settings'] });
      setShowForm(false);
      setEditing(null);
      setToast({ msg: 'Halaqah berhasil disimpan.', tone: 'success' });
    },
    onError: () => setToast({ msg: 'Gagal menyimpan halaqah.', tone: 'error' }),
  });

  const remove = useMutation({
    mutationFn: tahfidzGroupService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups-settings'] });
      setToast({ msg: 'Halaqah berhasil dihapus.', tone: 'success' });
    },
    onError: () => setToast({ msg: 'Gagal menghapus halaqah.', tone: 'error' }),
  });

  return (
    <Card className="overflow-hidden">
      {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">Daftar Halaqah ({groups.length})</p>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Tambah Halaqah
        </Button>
      </div>
      {isLoading ? (
        <div className="p-8 text-center text-sm text-slate-500">Memuat...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Nama</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Pembimbing</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Jumlah Santri</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">Belum ada halaqah.</td>
                </tr>
              ) : (
                groups.map((g) => (
                  <tr key={g.id} className="hover:bg-emerald-50/40">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{g.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{g.teacher?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{g.members_count ?? 0} santri</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          g.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {g.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          title="Kelola Anggota"
                          onClick={() => setManageGroup(g)}
                        >
                          <Users className="h-4 w-4" />
                          Kelola Anggota
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          title="Edit"
                          onClick={() => { setEditing(g); setShowForm(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50"
                          title="Hapus"
                          onClick={() => {
                            if (window.confirm(`Hapus halaqah "${g.name}"?`)) remove.mutate(g.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <GroupFormModal
          initial={editing}
          academicYears={academicYears}
          teachers={teachers}
          onSave={(data) => save.mutate(data)}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
      {manageGroup && <ManageMembersModal group={manageGroup} onClose={() => setManageGroup(null)} />}
    </Card>
  );
}

/* ============================================================
 * Tahun Ajaran
 * ============================================================ */

function AcademicYearsSection() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['academic-years-settings'],
    queryFn: () => academicYearService.list({ per_page: 100 }),
  });

  const years = (Array.isArray(data) ? data : data?.data ?? []) as AcademicYear[];

  const refresh = (msg: string, tone: 'success' | 'error' = 'success') => {
    queryClient.invalidateQueries({ queryKey: ['academic-years-settings'] });
    queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    queryClient.invalidateQueries({ queryKey: ['academic-years-options'] });
    setShowForm(false);
    setEditing(null);
    setToast({ msg, tone });
  };

  const save = useMutation({
    mutationFn: (form: { name: string; start_date: string; end_date: string }) =>
      editing ? academicYearService.update(editing.id, form) : academicYearService.create(form),
    onSuccess: () => refresh(editing ? 'Tahun ajaran berhasil diperbarui.' : 'Tahun ajaran berhasil ditambahkan.'),
    onError: () => setToast({ msg: 'Gagal menyimpan tahun ajaran.', tone: 'error' }),
  });

  const activate = useMutation({
    mutationFn: academicYearService.activate,
    onSuccess: () => refresh('Tahun ajaran aktif diperbarui.'),
    onError: () => setToast({ msg: 'Gagal mengaktifkan tahun ajaran.', tone: 'error' }),
  });

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Tahun Ajaran"
        subtitle="Kelola periode belajar dan pilih tahun ajaran aktif"
        right={
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Tambah Tahun
          </Button>
        }
      />
      <Card className="overflow-hidden">
        {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat...</div>
        ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Nama</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Mulai</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Selesai</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {years.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">Belum ada tahun ajaran.</td>
                  </tr>
                ) : (
                  years.map((year) => (
                    <tr key={year.id} className="hover:bg-emerald-50/40">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{year.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(year.start_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(year.end_date)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            year.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {year.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {!year.is_active && (
                            <Button
                              size="icon"
                              variant="outline"
                              title="Aktifkan"
                              aria-label={`Aktifkan ${year.name}`}
                              disabled={activate.isPending}
                              onClick={() => activate.mutate(year.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="outline"
                            title="Edit"
                            aria-label={`Edit ${year.name}`}
                            onClick={() => { setEditing(year); setShowForm(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: tampilan kartu */}
          <div className="divide-y divide-slate-100 md:hidden">
            {years.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Belum ada tahun ajaran.</div>
            ) : (
              years.map((year) => (
                <div key={year.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{year.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {formatDate(year.start_date)} – {formatDate(year.end_date)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        year.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {year.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {!year.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={activate.isPending}
                        onClick={() => activate.mutate(year.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Aktifkan
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto"
                      onClick={() => { setEditing(year); setShowForm(true); }}
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
        )}
      </Card>
      {showForm && (
        <AcademicYearFormModal
          initial={editing}
          onSave={(form) => save.mutate(form)}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function AcademicYearFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial: AcademicYear | null;
  onSave: (data: { name: string; start_date: string; end_date: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [startDate, setStartDate] = useState(toDateInputValue(initial?.start_date));
  const [endDate, setEndDate] = useState(toDateInputValue(initial?.end_date));
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim()) return setError('Nama tahun ajaran wajib diisi.');
    if (!startDate) return setError('Tanggal mulai wajib diisi.');
    if (!endDate) return setError('Tanggal selesai wajib diisi.');
    if (endDate < startDate) return setError('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    onSave({ name: name.trim(), start_date: startDate, end_date: endDate });
  };

  return (
    <Modal title={initial ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'} onClose={onClose}>
      <div className="space-y-4 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="ay-name">Nama *</Label>
          <Input id="ay-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="2025/2026" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ay-start">Tanggal Mulai *</Label>
            <Input id="ay-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ay-end">Tanggal Selesai *</Label>
            <Input id="ay-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <Button onClick={submit}>{initial ? 'Simpan Perubahan' : 'Tambah Tahun'}</Button>
          <Button variant="outline" onClick={onClose}>Batal</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
 * Surat & Ayat
 * ============================================================ */

function QuranSection() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 15;

  const { data: surahs, isLoading } = useQuery({
    queryKey: ['quran-surahs-settings'],
    queryFn: () => quranService.surahs(),
  });
  const { data: juzList } = useQuery({
    queryKey: ['quran-juz-settings'],
    queryFn: () => quranService.juz(),
  });

  const allSurahs = (Array.isArray(surahs) ? surahs : surahs?.data ?? []) as QuranSurah[];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allSurahs;
    return allSurahs.filter(
      (s) =>
        s.name_latin?.toLowerCase().includes(q) ||
        s.name_arabic?.includes(q) ||
        s.translation?.toLowerCase().includes(q) ||
        String(s.surah_number) === q
    );
  }, [allSurahs, search]);

  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);
  const lastPage = Math.max(1, Math.ceil(filtered.length / perPage));

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Surat & Ayat"
        subtitle="Referensi data Al-Qur'an (hanya-baca)"
        right={
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <BookOpen className="h-3.5 w-3.5" /> {allSurahs.length || 114} Surat
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <ListChecks className="h-3.5 w-3.5" /> {juzList?.length ?? 30} Juz
            </span>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Cari surat..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat...</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[560px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">No</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Nama Surat</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Arti</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Jumlah Ayat</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Nomor Surat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">Surat tidak ditemukan.</td>
                    </tr>
                  ) : (
                    pageItems.map((s) => (
                      <tr key={s.id} className="hover:bg-emerald-50/40">
                        <td className="px-4 py-3 text-sm text-slate-500">{s.surah_number}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-900">{s.name_latin}</p>
                          <p className="text-xs text-slate-400">{s.name_arabic}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{s.translation || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{s.total_ayahs}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{s.surah_number}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile: tampilan kartu */}
            <div className="divide-y divide-slate-100 md:hidden">
              {pageItems.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">Surat tidak ditemukan.</div>
              ) : (
                pageItems.map((s) => (
                  <div key={s.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{s.name_latin}</p>
                        <p className="truncate text-xs text-slate-400">{s.name_arabic}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        No. {s.surah_number}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{s.translation || '-'}</p>
                    <p className="mt-1 text-xs text-slate-400">{s.total_ayahs} ayat</p>
                  </div>
                ))
              )}
            </div>
            <Pagination page={page} lastPage={lastPage} onChange={setPage} total={filtered.length} />
          </>
        )}
      </Card>
    </div>
  );
}

/* ============================================================
 * Metode Muraja'ah
 * ============================================================ */

function MethodModal({
  initial,
  onSave,
  onClose,
}: {
  initial: MurajaahMethod | null;
  onSave: (data: { name: string; description?: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim()) return setError('Nama metode wajib diisi.');
    onSave({ name: name.trim(), description: description.trim() || undefined });
  };

  return (
    <Modal title={initial ? 'Edit Metode' : 'Tambah Metode'} onClose={onClose}>
      <div className="space-y-4 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="method-name">Nama Metode *</Label>
          <Input id="method-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Muraja'ah Mandiri" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="method-desc">Deskripsi</Label>
          <textarea id="method-desc" className={textareaCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <Button onClick={submit}>{initial ? 'Simpan Perubahan' : 'Tambah Metode'}</Button>
          <Button variant="outline" onClick={onClose}>Batal</Button>
        </div>
      </div>
    </Modal>
  );
}

function MethodsSection() {
  const { values, setValue, status } = useAutoSaveSection('murajaah_methods');
  const methods = ((values as AppSettings['murajaah_methods']).methods ?? []) as MurajaahMethod[];
  const [modal, setModal] = useState<{ open: boolean; method: MurajaahMethod | null }>({ open: false, method: null });

  const replace = (next: MurajaahMethod[]) => setValue('methods', next);

  const saveMethod = (data: { name: string; description?: string }) => {
    if (modal.method) {
      replace(methods.map((m) => (m.id === modal.method!.id ? { ...m, ...data } : m)));
    } else {
      const maxSort = methods.reduce((acc, m) => Math.max(acc, m.sort ?? 0), 0);
      replace([...methods, { id: Date.now(), name: data.name, description: data.description, active: true, sort: maxSort + 1 }]);
    }
    setModal({ open: false, method: null });
  };

  const sorted = [...methods].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Metode Muraja'ah"
        subtitle="Kelola metode muraja'ah beserta urutannya"
        right={
          <div className="flex items-center gap-2">
            <SaveIndicator status={status} />
            <Button size="sm" onClick={() => setModal({ open: true, method: null })}>
              <Plus className="h-4 w-4" /> Tambah Metode
            </Button>
          </div>
        }
      />

      <Card>
        <div className="divide-y divide-slate-100">
          {sorted.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Belum ada metode muraja'ah.</p>
          ) : (
            sorted.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-xs font-bold text-emerald-700">
                    {m.sort ?? '-'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{m.name}</p>
                    <p className="truncate text-xs text-slate-500">{m.description || 'Tanpa deskripsi'}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Switch
                    checked={m.active}
                    aria-label={`Aktifkan ${m.name}`}
                    onCheckedChange={(checked) => replace(methods.map((x) => (x.id === m.id ? { ...x, active: checked } : x)))}
                  />
                  <Button size="icon" variant="outline" title="Edit" onClick={() => setModal({ open: true, method: m })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50"
                    title="Hapus"
                    onClick={() => {
                      if (window.confirm(`Hapus metode "${m.name}"?`)) replace(methods.filter((x) => x.id !== m.id));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {modal.open && <MethodModal initial={modal.method} onSave={saveMethod} onClose={() => setModal({ open: false, method: null })} />}
    </div>
  );
}

/* ============================================================
 * Target Hafalan
 * ============================================================ */

function TargetsSection() {
  const { values, setValue, status } = useAutoSaveSection('targets');
  const targets = values as AppSettings['targets'];

  return (
    <div className="space-y-5">
      <SectionHeader title="Target Hafalan" subtitle="Target default hafalan santri" right={<SaveIndicator status={status} />} />
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="target-daily">Target per Hari (halaman)</Label>
              <Input
                id="target-daily"
                type="number"
                min={0}
                value={targets.daily_pages ?? 0}
                onChange={(e) => setValue('daily_pages', Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target-weekly">Target per Minggu (halaman)</Label>
              <Input
                id="target-weekly"
                type="number"
                min={0}
                value={targets.weekly_pages ?? 0}
                onChange={(e) => setValue('weekly_pages', Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target-monthly">Target per Bulan (halaman)</Label>
              <Input
                id="target-monthly"
                type="number"
                min={0}
                value={targets.monthly_pages ?? 0}
                onChange={(e) => setValue('monthly_pages', Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Target per kelas, program, atau halaqah diambil dari data santri yang sudah ada. Perubahan di sini hanya
            mengubah nilai default — tidak mengubah target santri existing tanpa konfirmasi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
 * Notifikasi
 * ============================================================ */

const notificationItems: { key: string; title: string; desc: string }[] = [
  { key: 'setoran_enabled', title: 'Setoran Hafalan', desc: 'Notifikasi setoran hafalan baru' },
  { key: 'murajaah_enabled', title: 'Muraja\'ah', desc: 'Notifikasi muraja\'ah baru' },
  { key: 'target_enabled', title: 'Target Hafalan', desc: 'Notifikasi pencapaian target' },
  { key: 'announcement_enabled', title: 'Pengumuman', desc: 'Notifikasi pengumuman baru' },
  { key: 'absensi_enabled', title: 'Absensi Santri', desc: 'Notifikasi absensi santri' },
  { key: 'system_enabled', title: 'Sistem', desc: 'Notifikasi sistem dan maintenance' },
];

const templateLabels: Record<string, string> = {
  setoran: 'Template Setoran Hafalan',
  murajaah: 'Template Muraja\'ah',
  target: 'Template Pencapaian Target',
  announcement: 'Template Pengumuman',
  absensi: 'Template Absensi',
  system: 'Template Sistem',
};

function NotificationsSection() {
  const { values, setValue, status } = useAutoSaveSection('notifications');
  const notif = values as AppSettings['notifications'];
  const [showTemplates, setShowTemplates] = useState(false);

  return (
    <div className="space-y-5">
      <SectionHeader title="Notifikasi" subtitle="Atur notifikasi aplikasi" right={<SaveIndicator status={status} />} />
      <Card>
        <div className="divide-y divide-slate-100">
          {notificationItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <Switch
                checked={Boolean((notif as Record<string, unknown>)[item.key])}
                aria-label={`${item.title} ${(notif as Record<string, unknown>)[item.key] ? 'aktif' : 'nonaktif'}`}
                onCheckedChange={(checked) => setValue(item.key, checked)}
              />
            </div>
          ))}
        </div>
      </Card>

      <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
        Notifikasi dikirim sebagai email melalui SMTP yang dikonfigurasi di menu{' '}
        <span className="font-semibold text-slate-600">Integrasi</span>. Template memakai variabel{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">{'{{nama}}'}</code> dan{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">{'{{pesan}}'}</code>.
      </p>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Template Notifikasi</CardTitle>
              <CardDescription>Variabel yang bisa dipakai: {'{{nama}}'}, {'{{pesan}}'}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowTemplates((s) => !s)}>
              {showTemplates ? 'Tutup' : 'Atur Template Notifikasi'}
            </Button>
          </div>
        </CardHeader>
        {showTemplates && (
          <CardContent className="space-y-4">
            {Object.entries(templateLabels).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`tpl-${key}`}>{label}</Label>
                <textarea
                  id={`tpl-${key}`}
                  className={textareaCls}
                  rows={2}
                  value={notif.templates?.[key] ?? ''}
                  onChange={(e) => setValue('templates', { ...(notif.templates ?? {}), [key]: e.target.value })}
                />
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

/* ============================================================
 * Pengecekan Bacaan
 * ============================================================ */

function RecitationSection() {
  const { values, setValue, status } = useAutoSaveSection('recitation_check');
  const rec = values as AppSettings['recitation_check'];

  return (
    <div className="space-y-5">
      <SectionHeader title="Pengecekan Bacaan" subtitle="Pilih mode fitur pengecekan bacaan (Web Speech API)" right={<SaveIndicator status={status} />} />
      <Card>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setValue('save_enabled', false)}
            aria-pressed={!rec.save_enabled}
            className={`rounded-2xl border p-5 text-left transition-colors ${
              !rec.save_enabled
                ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/30'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900">Realtime</p>
              {!rec.save_enabled && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Hasil pengecekan hanya tampil di layar siswa saat itu juga dan tidak disimpan ke database.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setValue('save_enabled', true)}
            aria-pressed={Boolean(rec.save_enabled)}
            className={`rounded-2xl border p-5 text-left transition-colors ${
              rec.save_enabled
                ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/30'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900">Simpan ke Database</p>
              {rec.save_enabled && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Hasil disimpan ke riwayat siswa dan status per-ayat diperbarui otomatis (≥90% hafal, 70–89% sedang dihafal). Hasil
              realtime tetap tampil di layar.
            </p>
          </button>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Mode ini berlaku untuk semua siswa dan disimpan otomatis.
        </p>
      </Card>
    </div>
  );
}

/* ============================================================
 * Backup Data
 * ============================================================ */

function BackupSection() {
  const { settings, queryClient } = useSettings();
  const base = settings?.backup;
  const [form, setForm] = useState<AppSettings['backup'] | null>(null);
  const values = form ?? base;
  const [saving, setSaving] = useState(false);
  const [backing, setBacking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!form && base) setForm({ ...base });
  }, [base, form]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await settingsService.updateGroup('backup', form);
      queryClient.setQueryData(['settings'], (old: AppSettings | undefined) =>
        old ? { ...old, backup: res.values } : old
      );
      setForm(null);
      setToast({ msg: 'Jadwal backup disimpan.', tone: 'success' });
    } catch {
      setToast({ msg: 'Gagal menyimpan jadwal backup.', tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const runBackup = async () => {
    setBacking(true);
    try {
      const res = await settingsService.backupNow();
      queryClient.setQueryData(['settings'], (old: AppSettings | undefined) =>
        old ? { ...old, backup: res.values } : old
      );
      setToast({ msg: 'Backup konfigurasi berhasil dibuat.', tone: 'success' });
    } catch {
      setToast({ msg: 'Gagal membuat backup.', tone: 'error' });
    } finally {
      setBacking(false);
    }
  };

  const downloadBackup = async () => {
    setDownloading(true);
    try {
      await settingsService.downloadBackup();
      setToast({ msg: 'Backup berhasil diunduh.', tone: 'success' });
    } catch {
      setToast({ msg: 'Belum ada backup yang dapat diunduh. Buat backup terlebih dahulu.', tone: 'error' });
    } finally {
      setDownloading(false);
    }
  };

  const restore = async () => {
    if (!restoreFile) return;
    setRestoring(true);
    try {
      await settingsService.restoreBackup(restoreFile);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setRestoreFile(null);
      setToast({ msg: 'Pengaturan berhasil dipulihkan dari backup.', tone: 'success' });
    } catch {
      setToast({ msg: 'Gagal memulihkan backup. Pastikan file JSON valid.', tone: 'error' });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
      <SectionHeader title="Backup Data" subtitle="Jadwal dan riwayat backup konfigurasi" />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Backup Terakhir</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{fmtDateTime(values?.last_backup_at)}</p>
              <p className="text-xs text-slate-500">{values?.last_backup_size || '-'}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
              <span
                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  values?.last_backup_status === 'success'
                    ? 'bg-emerald-100 text-emerald-700'
                    : values?.last_backup_status
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {values?.last_backup_status === 'success'
                  ? 'Berhasil'
                  : values?.last_backup_status === 'failed'
                    ? 'Gagal'
                    : 'Belum pernah'}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Simpan Backup</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{values?.retention_days ?? 30} hari terakhir</p>
              <p className="text-xs text-slate-500">Enkripsi: {values?.encryption_enabled ? 'Aktif' : 'Nonaktif'}</p>
            </div>
          </div>

          <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="backup-time">Jadwal Backup Otomatis</Label>
              <Input
                id="backup-time"
                type="time"
                value={values?.schedule_time ?? '02:00'}
                onChange={(e) => setForm((f) => ({ ...(f ?? (base as AppSettings['backup'])), schedule_time: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="backup-retention">Simpan Selama (hari)</Label>
              <Input
                id="backup-retention"
                type="number"
                min={1}
                value={values?.retention_days ?? 30}
                onChange={(e) => setForm((f) => ({ ...(f ?? (base as AppSettings['backup'])), retention_days: Number(e.target.value) || 30 }))}
              />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex flex-1 items-center justify-between gap-2 rounded-xl border border-slate-100 px-4 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Enkripsi Database</p>
                  <p className="text-xs text-slate-500">{values?.encryption_enabled ? 'Aktif' : 'Nonaktif'}</p>
                </div>
                <Switch
                  checked={Boolean(values?.encryption_enabled)}
                  aria-label="Enkripsi database"
                  onCheckedChange={(checked) => setForm((f) => ({ ...(f ?? (base as AppSettings['backup'])), encryption_enabled: checked }))}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <Button onClick={save} disabled={!form || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Jadwal
            </Button>
            <Button variant="outline" onClick={runBackup} disabled={backing}>
              {backing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Backup Sekarang
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setRestoreFile(file);
                e.target.value = '';
              }}
            />
            <Button variant="outline" onClick={downloadBackup} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Backup
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={restoring}>
              {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Restore Backup
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            Backup menyimpan snapshot konfigurasi aplikasi (JSON) ke storage lokal — data santri & setoran tidak ikut
            diubah.
          </p>
        </CardContent>
      </Card>

      {restoreFile && (
        <Modal title="Pulihkan Backup" subtitle={restoreFile.name} onClose={() => setRestoreFile(null)}>
          <div className="p-6">
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Pengaturan saat ini akan ditimpa</p>
                <p className="mt-1 text-xs text-amber-700">
                  Pengaturan (profil, aplikasi, notifikasi, keamanan, backup, dll.) akan diganti dengan isi file backup.
                  Nilai rahasia (SMTP password, API key) yang termasking tidak akan ditimpa.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRestoreFile(null)}>Batal</Button>
              <Button disabled={restoring} onClick={restore}>
                {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Pulihkan Sekarang
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
 * Keamanan
 * ============================================================ */

function SecuritySection() {
  const { settings, queryClient } = useSettings();
  const base = settings?.security;
  const [form, setForm] = useState<AppSettings['security'] | null>(null);
  const values = form ?? base;
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (!form && base) setForm({ ...base });
  }, [base, form]);

  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ['settings-sessions'],
    queryFn: () => settingsService.sessions(),
    enabled: true,
  });

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await settingsService.updateGroup('security', form);
      queryClient.setQueryData(['settings'], (old: AppSettings | undefined) =>
        old ? { ...old, security: res.values } : old
      );
      setForm(null);
      setToast({ msg: 'Pengaturan keamanan disimpan.', tone: 'success' });
    } catch {
      setToast({ msg: 'Gagal menyimpan pengaturan keamanan.', tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const revokeSession = useMutation({
    mutationFn: settingsService.revokeSession,
    onSuccess: () => {
      refetchSessions();
      setToast({ msg: 'Sesi dicabut.', tone: 'success' });
    },
    onError: () => setToast({ msg: 'Gagal mencabut sesi.', tone: 'error' }),
  });

  const logoutAll = useMutation({
    mutationFn: settingsService.logoutAll,
    onSuccess: (res) => {
      setConfirmLogout(false);
      refetchSessions();
      setToast({ msg: res.message, tone: 'success' });
    },
    onError: () => setToast({ msg: 'Gagal mengakhiri sesi lain.', tone: 'error' }),
  });

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
      <SectionHeader title="Keamanan" subtitle="Kebijakan keamanan akun dan sesi" />

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="sec-timeout">Session Timeout (menit)</Label>
            <Input
              id="sec-timeout"
              type="number"
              min={1}
              value={values?.session_timeout_minutes ?? 30}
              onChange={(e) => setForm((f) => ({ ...(f ?? (base as AppSettings['security'])), session_timeout_minutes: Number(e.target.value) || 30 }))}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-slate-900">Two-Factor Authentication</p>
              <p className="text-xs text-slate-500">Minta kode verifikasi tambahan saat login.</p>
            </div>
            <Switch
              checked={Boolean(values?.two_factor_auth)}
              aria-label="Two-factor authentication"
              onCheckedChange={(checked) => setForm((f) => ({ ...(f ?? (base as AppSettings['security'])), two_factor_auth: checked }))}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifikasi Login</p>
              <p className="text-xs text-slate-500">Beri tahu saat ada login dari perangkat baru.</p>
            </div>
            <Switch
              checked={Boolean(values?.login_notification)}
              aria-label="Notifikasi login"
              onCheckedChange={(checked) => setForm((f) => ({ ...(f ?? (base as AppSettings['security'])), login_notification: checked }))}
            />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <Button onClick={save} disabled={!form || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Perubahan
            </Button>
            <Button variant="outline" className="text-rose-600" onClick={() => setConfirmLogout(true)}>
              <LogOut className="h-4 w-4" /> Logout Semua Perangkat
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sesi Aktif</CardTitle>
          <CardDescription>Perangkat yang sedang login dengan akun Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {!sessions ? (
              <p className="py-4 text-center text-sm text-slate-500">Memuat sesi...</p>
            ) : sessions.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">Tidak ada sesi aktif.</p>
            ) : (
              (sessions as SessionInfo[]).map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                      {s.name}
                      {s.current && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Sesi ini</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      Login {fmtDateTime(s.created_at)} · Terakhir aktif {fmtDateTime(s.last_used_at)}
                    </p>
                  </div>
                  {!s.current && (
                    <Button size="sm" variant="outline" className="text-rose-600" onClick={() => revokeSession.mutate(s.id)}>
                      Cabut
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {confirmLogout && (
        <Modal title="Logout Semua Perangkat" onClose={() => setConfirmLogout(false)} maxWidth="max-w-md">
          <div className="space-y-4 p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <p className="text-sm text-slate-600">
                Semua sesi lain di perangkat berbeda akan diakhiri. Sesi Anda saat ini tetap aktif. Lanjutkan?
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                className="bg-rose-600 hover:bg-rose-700"
                onClick={() => logoutAll.mutate()}
                disabled={logoutAll.isPending}
              >
                {logoutAll.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Ya, Akhiri Sesi Lain
              </Button>
              <Button variant="outline" onClick={() => setConfirmLogout(false)}>Batal</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
 * Integrasi
 * ============================================================ */

function IntegrationToggleRow({
  title,
  desc,
  enabled,
  onToggle,
  children,
  icon: Icon,
}: {
  title: string;
  desc: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">{desc}</p>
          </div>
        </div>
        <Switch checked={enabled} aria-label={`${title} ${enabled ? 'terhubung' : 'tidak terhubung'}`} onCheckedChange={onToggle} />
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

function SecretField({
  id,
  label,
  value,
  onChange,
  reveal,
  onToggleReveal,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  reveal: boolean;
  onToggleReveal: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          type={reveal ? 'text' : 'password'}
          value={value}
          placeholder="••••••••••••"
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
        />
        <Button type="button" variant="outline" size="icon" title={reveal ? 'Sembunyikan' : 'Tampilkan'} onClick={onToggleReveal}>
          {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function IntegrationsSection() {
  const { settings, queryClient } = useSettings();
  const base = settings?.integrations;
  const [form, setForm] = useState<AppSettings['integrations'] | null>(null);
  const values = form ?? base;
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!form && base) setForm({ ...base });
  }, [base, form]);

  const set = <K extends keyof AppSettings['integrations']>(key: K, value: AppSettings['integrations'][K]) =>
    setForm((f) => ({ ...(f ?? (base as AppSettings['integrations'])), [key]: value }));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await settingsService.updateGroup('integrations', form);
      queryClient.setQueryData(['settings'], (old: AppSettings | undefined) =>
        old ? { ...old, integrations: res.values } : old
      );
      setForm(null);
      setToast({ msg: 'Pengaturan integrasi disimpan.', tone: 'success' });
    } catch {
      setToast({ msg: 'Gagal menyimpan integrasi.', tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const [testing, setTesting] = useState(false);

  // Simpan dulu (agar SMTP terbaru terpakai), lalu kirim email uji ke admin.
  const sendTest = async () => {
    setTesting(true);
    try {
      if (form) {
        const res = await settingsService.updateGroup('integrations', form);
        queryClient.setQueryData(['settings'], (old: AppSettings | undefined) =>
          old ? { ...old, integrations: res.values } : old
        );
        setForm(null);
      }
      const result = await settingsService.testEmail();
      setToast({ msg: result.message, tone: result.status === 'sent' ? 'success' : 'error' });
    } catch {
      setToast({ msg: 'Gagal mengirim email uji.', tone: 'error' });
    } finally {
      setTesting(false);
    }
  };

  if (!values) return null;

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
      <SectionHeader title="Integrasi" subtitle="Hubungkan layanan eksternal" />

      <div className="space-y-4">
        <IntegrationToggleRow
          title="WhatsApp"
          desc={values.whatsapp_enabled ? 'Terhubung' : 'Tidak Terhubung'}
          enabled={values.whatsapp_enabled}
          onToggle={(v) => set('whatsapp_enabled', v)}
          icon={Smartphone}
        >
          <div className="space-y-1.5">
            <Label htmlFor="int-wa">Nomor WhatsApp (format internasional)</Label>
            <Input id="int-wa" value={values.whatsapp_number ?? ''} onChange={(e) => set('whatsapp_number', e.target.value)} placeholder="6281234567890" />
          </div>
        </IntegrationToggleRow>

        <IntegrationToggleRow
          title="Email / SMTP"
          desc={values.smtp_enabled ? 'Terhubung' : 'Tidak Terhubung'}
          enabled={values.smtp_enabled}
          onToggle={(v) => set('smtp_enabled', v)}
          icon={Mail}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="int-smtp-host">SMTP Host</Label>
              <Input id="int-smtp-host" value={values.smtp_host ?? ''} onChange={(e) => set('smtp_host', e.target.value)} placeholder="smtp.example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="int-smtp-port">Port</Label>
              <Input id="int-smtp-port" type="number" value={values.smtp_port ?? 587} onChange={(e) => set('smtp_port', Number(e.target.value) || 587)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="int-smtp-from-name">Nama Pengirim</Label>
              <Input id="int-smtp-from-name" value={values.smtp_from_name ?? ''} onChange={(e) => set('smtp_from_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="int-smtp-from-email">Email Pengirim</Label>
              <Input id="int-smtp-from-email" type="email" value={values.smtp_from_email ?? ''} onChange={(e) => set('smtp_from_email', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <SecretField
                id="int-smtp-password"
                label="Password SMTP"
                value={values.smtp_password ?? ''}
                onChange={(v) => set('smtp_password', v)}
                reveal={Boolean(reveal.smtp_password)}
                onToggleReveal={() => setReveal((r) => ({ ...r, smtp_password: !r.smtp_password }))}
              />
            </div>
          </div>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={sendTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Kirim Email Uji
            </Button>
            <p className="mt-2 text-xs text-slate-400">
              Email uji dikirim ke alamat admin Anda untuk memverifikasi konfigurasi SMTP.
            </p>
          </div>
        </IntegrationToggleRow>

        <div className="grid gap-4 md:grid-cols-2">
          <IntegrationToggleRow
            title="Cloud Storage"
            desc={values.cloud_storage_enabled ? 'Terhubung' : 'Tidak Terhubung'}
            enabled={values.cloud_storage_enabled}
            onToggle={(v) => set('cloud_storage_enabled', v)}
            icon={Cloud}
          />
          <IntegrationToggleRow
            title="Google Drive"
            desc={values.google_drive_enabled ? 'Terhubung' : 'Tidak Terhubung'}
            enabled={values.google_drive_enabled}
            onToggle={(v) => set('google_drive_enabled', v)}
            icon={FileText}
          />
        </div>

        <IntegrationToggleRow
          title="API"
          desc={values.api_enabled ? 'Terhubung' : 'Tidak Terhubung'}
          enabled={values.api_enabled}
          onToggle={(v) => set('api_enabled', v)}
          icon={KeyRound}
        >
          <SecretField
            id="int-api-key"
            label="API Key"
            value={values.api_key ?? ''}
            onChange={(v) => set('api_key', v)}
            reveal={Boolean(reveal.api_key)}
            onToggleReveal={() => setReveal((r) => ({ ...r, api_key: !r.api_key }))}
          />
        </IntegrationToggleRow>

        <IntegrationToggleRow
          title="Webhook"
          desc={values.webhook_enabled ? 'Terhubung' : 'Tidak Terhubung'}
          enabled={values.webhook_enabled}
          onToggle={(v) => set('webhook_enabled', v)}
          icon={LinkIcon}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="int-webhook-url">Webhook URL</Label>
              <Input id="int-webhook-url" value={values.webhook_url ?? ''} onChange={(e) => set('webhook_url', e.target.value)} placeholder="https://example.com/hook" />
            </div>
            <SecretField
              id="int-webhook-secret"
              label="Webhook Secret"
              value={values.webhook_secret ?? ''}
              onChange={(v) => set('webhook_secret', v)}
              reveal={Boolean(reveal.webhook_secret)}
              onToggleReveal={() => setReveal((r) => ({ ...r, webhook_secret: !r.webhook_secret }))}
            />
          </div>
        </IntegrationToggleRow>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={!form || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Perubahan
        </Button>
      </div>
      <p className="text-xs text-slate-400">
        API key dan secret tidak pernah ditampilkan secara utuh dan tidak pernah dikirim balik ke klien.
      </p>
    </div>
  );
}

/* ============================================================
 * Log Aktivitas
 * ============================================================ */

function LogsSection() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['settings-activity-logs', page],
    queryFn: () => settingsService.activityLogs({ page, per_page: 15 }),
  });

  const logs: ActivityLog[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const lastPage = data?.last_page ?? 1;

  const clearLogs = useMutation({
    mutationFn: () => settingsService.clearActivityLogs(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['settings-activity-logs'] });
      setPage(1);
      setToast({ msg: res.message, tone: 'success' });
    },
    onError: () => setToast({ msg: 'Gagal menghapus log aktivitas.', tone: 'error' }),
  });

  const handleClear = () => {
    if (window.confirm('Hapus seluruh log aktivitas? Data yang dihapus tidak dapat dikembalikan.')) {
      clearLogs.mutate();
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Log Aktivitas"
        subtitle="Riwayat aktivitas pengguna"
        right={
          logs.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              disabled={clearLogs.isPending}
              onClick={handleClear}
            >
              {clearLogs.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
              {clearLogs.isPending ? 'Menghapus...' : 'Hapus Log'}
            </Button>
          ) : undefined
        }
      />
      <Card className="overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[680px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Waktu</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Aktivitas</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">IP</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">Memuat...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">Belum ada aktivitas tercatat.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-emerald-50/40">
                    <td className="px-4 py-3 text-sm text-slate-600">{fmtDateTime(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{log.user_name || 'Sistem'}</p>
                      {log.user_email && <p className="text-xs text-slate-500">{log.user_email}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {actionLabel(log.action)} <span className="text-slate-400">({modelLabel(log.model)})</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{log.ip_address || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Berhasil
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: tampilan kartu */}
        <div className="divide-y divide-slate-100 md:hidden">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-slate-500">Memuat...</div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">Belum ada aktivitas tercatat.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{log.user_name || 'Sistem'}</p>
                    {log.user_email && <p className="truncate text-xs text-slate-500">{log.user_email}</p>}
                  </div>
                  <span className="inline-flex shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Berhasil
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {actionLabel(log.action)} <span className="text-slate-400">({modelLabel(log.model)})</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {fmtDateTime(log.created_at)} · IP {log.ip_address || '-'}
                </p>
              </div>
            ))
          )}
        </div>
        <Pagination page={page} lastPage={lastPage} onChange={setPage} total={total} />
      </Card>
      {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ============================================================
 * Halaman utama
 * ============================================================ */

type SectionId =
  | 'profile'
  | 'application'
  | 'users'
  | 'classes'
  | 'academic-years'
  | 'quran'
  | 'methods'
  | 'targets'
  | 'notifications'
  | 'recitation'
  | 'backup'
  | 'security'
  | 'integrations'
  | 'logs';

const sections: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: 'profile', label: 'Profil Madrasah', icon: Building2 },
  { id: 'application', label: 'Identitas Aplikasi', icon: Palette },
  { id: 'users', label: 'Pengguna & Peran', icon: Users },
  { id: 'classes', label: 'Kelas & Halaqah', icon: School },
  { id: 'academic-years', label: 'Tahun Ajaran', icon: Calendar },
  { id: 'quran', label: 'Surat & Ayat', icon: BookOpen },
  { id: 'methods', label: 'Metode Muraja\'ah', icon: ListChecks },
  { id: 'targets', label: 'Target Hafalan', icon: Target },
  { id: 'notifications', label: 'Notifikasi', icon: Bell },
  { id: 'recitation', label: 'Pengecekan Bacaan', icon: Mic },
  { id: 'backup', label: 'Backup Data', icon: Database },
  { id: 'security', label: 'Keamanan', icon: ShieldCheck },
  { id: 'integrations', label: 'Integrasi', icon: Plug },
  { id: 'logs', label: 'Log Aktivitas', icon: History },
];

export default function Settings() {
  const [searchParams] = useSearchParams();
  const [active, setActive] = useState<SectionId>(() => {
    const s = searchParams.get('section');
    return s && sections.some((sec) => sec.id === s) ? (s as SectionId) : 'profile';
  });
  const { isLoading } = useSettings();

  const renderSection = () => {
    switch (active) {
      case 'profile':
        return <ProfileSection />;
      case 'application':
        return <ApplicationSection />;
      case 'users':
        return <UsersSection />;
      case 'classes':
        return <ClassesSection />;
      case 'academic-years':
        return <AcademicYearsSection />;
      case 'quran':
        return <QuranSection />;
      case 'methods':
        return <MethodsSection />;
      case 'targets':
        return <TargetsSection />;
      case 'notifications':
        return <NotificationsSection />;
      case 'recitation':
        return <RecitationSection />;
      case 'backup':
        return <BackupSection />;
      case 'security':
        return <SecuritySection />;
      case 'integrations':
        return <IntegrationsSection />;
      case 'logs':
        return <LogsSection />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola pengaturan aplikasi Tahfidz Qur'an</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left settings menu */}
        <aside className="w-full shrink-0 lg:w-72">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <p className="px-5 pt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Menu Pengaturan</p>
            <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-col lg:overflow-visible" aria-label="Menu pengaturan">
              {sections.map((s) => {
                const isActive = active === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:w-full ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <s.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span className="whitespace-nowrap">{s.label}</span>
                    {isActive && <span className="ml-auto hidden h-2 w-2 shrink-0 rounded-full bg-emerald-600 lg:block" />}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <p className="text-sm font-semibold">Perubahan otomatis disimpan</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-emerald-700">
              Setiap perubahan pengaturan akan disimpan secara otomatis.
            </p>
          </div>
        </aside>

        {/* Right panel */}
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="grid place-items-center rounded-2xl border border-slate-100 bg-white py-24 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat pengaturan...
              </div>
            </div>
          ) : (
            renderSection()
          )}
        </div>
      </div>
    </div>
  );
}
