import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  GraduationCap,
  BookOpen,
  BarChart3,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Eye,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Upload,
  Loader2,
  Printer,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  ClipboardList,
  BookMarked,
  UserRound,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { classService, tahfidzGroupService, teacherService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import type {
  ClassRoom,
  TahfidzGroup,
  Teacher,
  TeacherDetail,
  TeacherPerformanceRange,
  TeacherStats,
} from '@/types';
import { formatDate, toDateInputValue } from '@/utils/date';

/* ================================================================
 * Helpers & small building blocks
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

function Toast({ msg, tone = 'success', onClose }: { msg: string; tone?: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed right-5 top-20 z-[70] rounded-2xl border px-5 py-3 text-sm font-semibold shadow-xl ${
        tone === 'success' ? 'border-emerald-100 bg-white text-emerald-700' : 'border-rose-100 bg-white text-rose-600'
      }`}
    >
      {msg}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
      }`}
    >
      {status === 'active' ? 'Aktif' : 'Tidak Aktif'}
    </span>
  );
}

function RoleBadge({ teacher }: { teacher: Teacher }) {
  const isPembimbing = (teacher.tahfidz_groups_count ?? 0) > 0;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isPembimbing ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
      }`}
    >
      {isPembimbing ? 'Pembimbing' : 'Guru Tahfidz'}
    </span>
  );
}

const photoUrl = (p?: string | null) => (p ? (p.startsWith('/storage/') || p.startsWith('http') ? p : `/storage/${p}`) : '');

function Avatar({ teacher, size = 'md' }: { teacher: { name?: string; photo_path?: string | null }; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-16 w-16 text-lg' : size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-10 w-10 text-xs';
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-100 font-bold text-emerald-700 ${cls}`}>
      {teacher.photo_path ? (
        <img src={photoUrl(teacher.photo_path)} alt="" className="h-full w-full object-cover" />
      ) : (
        nameInitials(teacher.name)
      )}
    </span>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50">
        <Users className="h-7 w-7 text-emerald-500" />
      </span>
      <div>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="mx-auto mt-1 max-w-xs text-xs text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${className ?? ''}`}>{children}</div>;
}

function Pagination({
  page,
  lastPage,
  total,
  perPage,
  onPage,
  onPerPage,
}: {
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Menampilkan <b>{from}</b>-<b>{to}</b> dari <b>{total}</b> data
      </p>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <select
            value={perPage}
            onChange={(e) => onPerPage(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / halaman
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Halaman sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-sm font-semibold text-slate-700">
            {page} / {lastPage}
          </span>
          <Button size="icon" variant="outline" disabled={page >= lastPage} onClick={() => onPage(page + 1)} aria-label="Halaman berikutnya">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
 * Statistik
 * ================================================================ */

function StatsRow({ stats, loading }: { stats?: TeacherStats; loading?: boolean }) {
  const items = [
    { label: 'Total Guru', value: stats?.total ?? 0, icon: Users, bg: 'bg-emerald-50', color: 'text-emerald-600', secondary: 'seluruh guru terdaftar' },
    { label: 'Guru Aktif', value: stats?.active ?? 0, icon: UserCheck, bg: 'bg-sky-50', color: 'text-sky-600', secondary: stats?.total ? `${((stats.active / stats.total) * 100).toFixed(1)}% dari total` : 'dari total' },
    { label: 'Pembimbing Aktif', value: stats?.pembimbing_active ?? 0, icon: GraduationCap, bg: 'bg-violet-50', color: 'text-violet-600', secondary: stats?.total ? `${((stats.pembimbing_active / stats.total) * 100).toFixed(1)}% dari total` : 'dari total' },
    { label: 'Membimbing Santri', value: stats?.supervised_students ?? 0, icon: BookOpen, bg: 'bg-amber-50', color: 'text-amber-600', secondary: 'total santri dibimbing' },
    { label: 'Rata-rata Santri / Guru', value: stats?.avg_per_teacher ?? 0, icon: BarChart3, bg: 'bg-cyan-50', color: 'text-cyan-600', secondary: 'santri per guru' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label}>
          {loading ? (
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-slate-500">{item.label}</p>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.bg}`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} strokeWidth={2} />
                </span>
              </div>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{item.value}</p>
              <p className="mt-1 text-xs text-slate-400">{item.secondary}</p>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ================================================================
 * Filter
 * ================================================================ */

const SUBJECTS = ['Tahfidz Qur\'an', 'Muraja\'ah', 'Tahsin', 'Lainnya'];

function FiltersCard({
  draft,
  setDraft,
  classes,
  halaqahs,
  onApply,
  onReset,
}: {
  draft: { search: string; status: string; subject: string; role: string; class_id: string; halaqah_id: string };
  setDraft: (d: typeof draft) => void;
  classes: ClassRoom[];
  halaqahs: TahfidzGroup[];
  onApply: () => void;
  onReset: () => void;
}) {
  const set = (k: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft({ ...draft, [k]: e.target.value });

  const selectCls =
    'h-9 w-full rounded-lg border border-input bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40';

  return (
    <Card className="p-4">
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="relative lg:col-span-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Cari guru, email, NIP/NUPTK, atau mata pelajaran..."
            value={draft.search}
            onChange={set('search')}
            aria-label="Cari guru"
          />
        </div>
        <div className="lg:col-span-2">
          <select className={selectCls} value={draft.role} onChange={set('role')} aria-label="Filter role">
            <option value="">Semua Role</option>
            <option value="pembimbing">Pembimbing</option>
            <option value="guru">Guru Tahfidz</option>
          </select>
        </div>
        <div className="lg:col-span-2">
          <select className={selectCls} value={draft.status} onChange={set('status')} aria-label="Filter status">
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Tidak Aktif</option>
          </select>
        </div>
        <div className="lg:col-span-2">
          <select className={selectCls} value={draft.subject} onChange={set('subject')} aria-label="Filter mata pelajaran">
            <option value="">Semua Mata Pelajaran</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-1">
          <select className={selectCls} value={draft.class_id} onChange={set('class_id')} aria-label="Filter kelas">
            <option value="">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-1">
          <select className={selectCls} value={draft.halaqah_id} onChange={set('halaqah_id')} aria-label="Filter halaqah">
            <option value="">Semua Halaqah</option>
            {halaqahs.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 lg:col-span-1">
          <Button size="sm" className="flex-1" onClick={onApply}>
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <Button size="sm" variant="outline" onClick={onReset} aria-label="Reset filter">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ================================================================
 * Form guru
 * ================================================================ */

function TeacherFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Teacher | null;
  onSave: (data: Record<string, unknown>, photo: File | null) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initial?.name ?? '');
  const [teacherCode, setTeacherCode] = useState(initial?.teacher_code ?? '');
  const [gender, setGender] = useState(initial?.gender ?? '');
  const [nip, setNip] = useState(initial?.nip ?? '');
  const [nuptk, setNuptk] = useState(initial?.nuptk ?? '');
  const [birthPlace, setBirthPlace] = useState(initial?.birth_place ?? '');
  const [birthDate, setBirthDate] = useState(toDateInputValue(initial?.birth_date));
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [makeAccount, setMakeAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);

  const inputCls = 'h-9 w-full rounded-lg border border-input bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40';
  const selectCls = inputCls;

  const chooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoError('');
    e.target.value = '';
  };

  const deletePhoto = async () => {
    if (!initial) return;
    setUploadingPhoto(true);
    setPhotoError('');
    try {
      await teacherService.deletePhoto(initial.id);
      setPendingPhoto(null);
      setPhotoPreview(null);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-detail'] });
    } catch {
      setPhotoError('Gagal menghapus foto.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) return setError('Nama lengkap wajib diisi.');
    if (!teacherCode.trim()) return setError('Kode guru wajib diisi.');
    if (makeAccount) {
      if (!email.trim()) return setError('Email wajib diisi untuk membuat akun login.');
      if (password.length < 8) return setError('Password minimal 8 karakter.');
      if (password !== passwordConfirm) return setError('Konfirmasi password tidak cocok.');
    }
    setError('');
    setPhotoError('');

    const payload: Record<string, unknown> = {
      name: name.trim(),
      teacher_code: teacherCode.trim(),
      gender: gender || undefined,
      nip: nip.trim() || undefined,
      nuptk: nuptk.trim() || undefined,
      birth_place: birthPlace.trim() || undefined,
      birth_date: birthDate || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      subject: subject || undefined,
      status,
      ...(makeAccount ? { password, password_confirmation: passwordConfirm } : {}),
    };

    // Saat edit: unggah foto dulu agar path-nya ikut tersimpan bersama data guru.
    if (initial && pendingPhoto) {
      setUploadingPhoto(true);
      try {
        const r = await teacherService.uploadPhoto(initial.id, pendingPhoto);
        payload.photo_path = r.photo_path;
        setPendingPhoto(null);
        setPhotoPreview(null);
      } catch {
        setPhotoError('Gagal mengunggah foto. Ukuran maksimal 2 MB.');
        setUploadingPhoto(false);
        return;
      }
      setUploadingPhoto(false);
    }

    onSave(payload, !initial ? pendingPhoto : null);
  };

  return (
    <Modal title={initial ? 'Edit Guru' : 'Tambah Guru'} onClose={onClose} maxWidth="max-w-3xl">
      <div className="max-h-[78vh] space-y-6 overflow-y-auto p-6">
        {/* Foto profil */}
        <section>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-700">Foto Profil</h4>
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-sm">
              {photoPreview ?? (initial?.photo_path ? photoUrl(initial.photo_path) : null) ? (
                <img
                  src={photoPreview ?? (initial?.photo_path ? photoUrl(initial.photo_path) : '')}
                  alt="Foto guru"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-slate-300">{nameInitials(name)}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={chooseFile} />
              <Button type="button" variant="outline" size="sm" disabled={uploadingPhoto} onClick={() => photoRef.current?.click()}>
                {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Pilih Foto
              </Button>
              {(photoPreview ?? initial?.photo_path) && initial && (
                <Button type="button" variant="ghost" size="sm" className="text-rose-600" disabled={uploadingPhoto} onClick={deletePhoto}>
                  <Trash2 className="h-4 w-4" /> Hapus Foto
                </Button>
              )}
            </div>
            <p className="w-full text-xs text-slate-400 sm:w-auto sm:flex-1">
              JPG, PNG, atau WebP — maksimal 2 MB.
              {pendingPhoto && !initial ? ' Foto akan diunggah setelah guru disimpan.' : ''}
            </p>
          </div>
          {photoError && <p className="mt-1 text-xs text-rose-600">{photoError}</p>}
        </section>

        <section>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-700">Data Personal</h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="g-name">Nama Lengkap *</Label>
              <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ust. Muhammad Iqbal" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-code">Kode Guru *</Label>
              <Input id="g-code" value={teacherCode} onChange={(e) => setTeacherCode(e.target.value)} placeholder="GR-001" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-gender">Jenis Kelamin</Label>
              <select id="g-gender" className={selectCls} value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">— Pilih —</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-nip">NIP</Label>
              <Input id="g-nip" value={nip} onChange={(e) => setNip(e.target.value)} placeholder="Opsional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-nuptk">NUPTK</Label>
              <Input id="g-nuptk" value={nuptk} onChange={(e) => setNuptk(e.target.value)} placeholder="Opsional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-birth-place">Tempat Lahir</Label>
              <Input id="g-birth-place" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} placeholder="Opsional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-birth-date">Tanggal Lahir</Label>
              <Input id="g-birth-date" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-700">Kontak</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="g-email">Email {makeAccount && '*'}</Label>
              <Input id="g-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guru@example.sch.id" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-phone">No. HP</Label>
              <Input id="g-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="g-address">Alamat</Label>
              <textarea
                id="g-address"
                rows={2}
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-700">Data Kepegawaian</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="g-status">Status</Label>
              <select id="g-status" className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}>
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-subject">Mata Pelajaran</Label>
              <select id="g-subject" className={selectCls} value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">— Pilih —</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-700">Akun Login</h4>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-sm">
            <input type="checkbox" checked={makeAccount} onChange={(e) => setMakeAccount(e.target.checked)} className="mt-0.5" />
            <span>
              <b>{initial ? 'Perbarui password akun' : 'Buat akun login'}</b>
              <span className="block text-xs text-slate-500">Akun User role Guru/Pembimbing (email memakai kolom kontak di atas).</span>
            </span>
          </label>
          {makeAccount && (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="g-password">Password *</Label>
                <Input id="g-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-password-confirm">Konfirmasi Password *</Label>
                <Input id="g-password-confirm" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
              </div>
            </div>
          )}
        </section>

        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button className="bg-[#0D753F] hover:bg-[#075B30]" disabled={uploadingPhoto} onClick={submit}>
            {uploadingPhoto && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? 'Simpan Perubahan' : 'Simpan Guru'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================
 * Detail drawer
 * ================================================================ */

function Drawer({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fixed right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-l-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Detail guru"
      >
        {children}
      </div>
    </div>
  );
}

function TeacherDrawer({ teacherId, onClose }: { teacherId: number; onClose: () => void }) {
  const [range, setRange] = useState<TeacherPerformanceRange>('30d');

  const { data: detail, isLoading } = useQuery({
    queryKey: ['teacher-detail', teacherId],
    queryFn: () => teacherService.get(teacherId),
  });

  const { data: perfData } = useQuery({
    queryKey: ['teacher-performance', teacherId, range],
    queryFn: () => teacherService.performance(teacherId, range),
    enabled: !isLoading,
  });

  const d = detail as TeacherDetail | undefined;
  const teacher = d?.teacher;
  const perf = perfData as Array<{ date: string; label: string; setoran: number; murajaah: number; target: number }> | undefined;

  const perfRanges: { id: TeacherPerformanceRange; label: string }[] = [
    { id: '7d', label: '7 Hari' },
    { id: '30d', label: '30 Hari' },
    { id: '3m', label: '3 Bulan' },
  ];

  return (
    <Drawer onClose={onClose}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-bold text-slate-900">Detail Guru</h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading || !teacher ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="space-y-5 p-6">
            {/* Profil */}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-emerald-50/60 to-slate-50 p-5 sm:flex-row sm:items-center">
              <Avatar teacher={teacher} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xl font-extrabold text-slate-900">{teacher.name}</h4>
                  <RoleBadge teacher={teacher} />
                  <StatusBadge status={teacher.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {teacher.teacher_code}
                  {teacher.nip ? ` · NIP ${teacher.nip}` : ''}
                  {teacher.nuptk ? ` · NUPTK ${teacher.nuptk}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {teacher.email && <span>{teacher.email}</span>}
                  {teacher.phone && <span>· {teacher.phone}</span>}
                  {teacher.subject && <span>· {teacher.subject}</span>}
                </div>
              </div>
            </div>

            {/* Statistik pembimbing */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: 'Total Santri', value: d?.statistics.total_santri ?? 0, icon: Users },
                { label: 'Total Setoran', value: d?.statistics.total_setoran ?? 0, icon: ClipboardList },
                { label: 'Total Muraja\'ah', value: d?.statistics.total_murajaah ?? 0, icon: BookMarked },
                { label: 'Rata-rata Progress', value: `${d?.statistics.avg_progress ?? 0}%`, icon: TrendingUp },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                  <s.icon className="h-4 w-4 text-emerald-600" />
                  <p className="mt-1.5 text-xl font-extrabold text-slate-900">{s.value}</p>
                  <p className="text-[11px] text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Santri dibimbing */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">Santri yang Dibimbing ({d?.students.length ?? 0})</h4>
                <Link to="/students" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                  Lihat Semua Santri
                </Link>
              </div>
              {d?.students.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                  Belum ada santri dalam bimbingan guru ini.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5">Santri</th>
                        <th className="px-3 py-2.5">Kelas</th>
                        <th className="px-3 py-2.5">Hafalan</th>
                        <th className="px-3 py-2.5">Progress</th>
                        <th className="px-3 py-2.5">Setoran Terakhir</th>
                        <th className="px-3 py-2.5">Muraja\'ah Terakhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {d?.students.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2.5 font-semibold text-slate-900">{s.name}</td>
                          <td className="px-3 py-2.5 text-slate-600">{s.class_name ?? '-'}</td>
                          <td className="px-3 py-2.5 text-slate-600">{s.total_juz} Juz</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, s.progress_percentage)}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-slate-700">{s.progress_percentage}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">{s.last_submission_at ? formatDate(s.last_submission_at) : '-'}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">{s.last_murajaah_at ? formatDate(s.last_murajaah_at) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Link
                to="/settings?section=classes&tab=groups"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700"
              >
                <UserRound className="h-3.5 w-3.5" /> Kelola anggota halaqah di Pengaturan
              </Link>
            </div>

            {/* Performa */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900">Performa Santri Bimbingan</h4>
                <div className="flex gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1">
                  {perfRanges.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRange(r.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                        range === r.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-56 rounded-xl border border-slate-100 p-2">
                {perf ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={perf} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradTS" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradTM" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={7} />
                      <Area type="monotone" dataKey="setoran" name="Setoran" stroke="#10b981" strokeWidth={2} fill="url(#gradTS)" />
                      <Area type="monotone" dataKey="murajaah" name="Muraja'ah" stroke="#0ea5e9" strokeWidth={2} fill="url(#gradTM)" />
                      <Area type="monotone" dataKey="target" name="Target" stroke="#f59e0b" strokeWidth={2} fill="transparent" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                  </div>
                )}
              </div>
            </div>

            {/* Aktivitas */}
            <div>
              <h4 className="mb-2 text-sm font-bold text-slate-900">Aktivitas Terbaru</h4>
              {!d || d.activities.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                  Belum ada aktivitas tercatat.
                </p>
              ) : (
                <div className="relative space-y-1">
                  <span className="absolute bottom-2 left-[17px] top-2 w-px bg-slate-100" aria-hidden />
                  {d.activities.map((a, i) => (
                    <div key={i} className="relative flex items-start gap-3 rounded-xl p-2 hover:bg-slate-50">
                      <span
                        className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                          a.type === 'submission' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'
                        }`}
                      >
                        {a.type === 'submission' ? <ClipboardList className="h-4 w-4" /> : <BookMarked className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700">
                          <b className="text-slate-900">{a.action}</b> {a.student_name} {a.detail ? `· ${a.detail}` : ''}
                        </p>
                        <p className="text-xs text-slate-400">{a.time || a.datetime || '-'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

/* ================================================================
 * Import modal
 * ================================================================ */

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: (m: string, tone: 'success' | 'error') => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'update' | 'insert_only'>('update');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: Array<{ row: number; data: string; errors: string[] }> } | null>(null);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const res = await teacherService.import(file, mode);
      setResult(res);
      onDone(res.message, 'success');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Import gagal. Periksa file Anda.');
      onDone(e?.response?.data?.message || 'Import gagal.', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal title="Import Data Guru" onClose={onClose}>
      <div className="space-y-5 p-6">
        <p className="text-sm text-slate-600">
          Unggah file <b>.csv</b> atau <b>.xlsx</b> dengan kolom sesuai template. Kolom wajib: <b>teacher_code</b>, <b>name</b>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => teacherService.downloadTemplate('csv')}>
            <Download className="h-4 w-4" /> Template CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => teacherService.downloadTemplate('xlsx')}>
            <FileSpreadsheet className="h-4 w-4" /> Template XLSX
          </Button>
        </div>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Pilih file</span>
          <input
            type="file"
            accept=".csv,.txt,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
          />
        </label>
        <div>
          <span className="text-sm font-semibold text-slate-700">Mode import</span>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm transition-colors ${mode === 'update' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
              <input type="radio" name="import-mode" value="update" checked={mode === 'update'} onChange={() => setMode('update')} className="mt-0.5" />
              <span>
                <b>Update</b> — tambah baru & perbarui data lama sesuai kolom yang terisi; kolom kosong tidak menimpa data lama.
              </span>
            </label>
            <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm transition-colors ${mode === 'insert_only' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
              <input type="radio" name="import-mode" value="insert_only" checked={mode === 'insert_only'} onChange={() => setMode('insert_only')} className="mt-0.5" />
              <span>
                <b>Insert saja</b> — hanya menambah data baru; baris dengan kode yang sudah ada dilewati.
              </span>
            </label>
          </div>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {result && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">{result.imported} data berhasil diimpor.</p>
            {result.skipped.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium text-emerald-700">{result.skipped.length} baris dilewati</summary>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
                  {result.skipped.map((s, i) => (
                    <li key={i}>
                      {s.data || `Baris ${s.row}`}: {s.errors.join(', ')}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button disabled={!file || importing} className="bg-[#0D753F] hover:bg-[#075B30]" onClick={handleImport}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? 'Mengimpor...' : 'Import'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================
 * Halaman utama
 * ================================================================ */

export default function Teachers() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({ search: '', status: '', subject: '', role: '', class_id: '', halaqah_id: '' });
  const [filters, setFilters] = useState({ search: '', status: '', subject: '', role: '', class_id: '', halaqah_id: '' });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Teacher | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  // Search debounce 400ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(draft.search.trim()), 400);
    return () => clearTimeout(t);
  }, [draft.search]);

  // Reset halaman saat search/filter berubah
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status, filters.subject, filters.role, filters.class_id, filters.halaqah_id]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['teachers', { ...filters, search: debouncedSearch, page, perPage }],
    queryFn: () =>
      teacherService.list({
        page,
        per_page: perPage,
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        subject: filters.subject || undefined,
        role: filters.role || undefined,
        class_id: filters.class_id ? Number(filters.class_id) : undefined,
        halaqah_id: filters.halaqah_id ? Number(filters.halaqah_id) : undefined,
      }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['teachers-stats'],
    queryFn: () => teacherService.stats(),
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes-options'],
    queryFn: () => classService.list({ per_page: 100 }),
  });
  const { data: halaqahData } = useQuery({
    queryKey: ['halaqah-options'],
    queryFn: () => tahfidzGroupService.list({ per_page: 100 }),
  });

  const classes: ClassRoom[] = Array.isArray(classesData) ? classesData : classesData?.data ?? [];
  const halaqahs: TahfidzGroup[] = Array.isArray(halaqahData) ? halaqahData : halaqahData?.data ?? [];

  const teachers: Teacher[] = Array.isArray(data) ? data : data?.data ?? [];
  const total = (data as any)?.total ?? teachers.length;
  const lastPage = (data as any)?.last_page ?? (data as any)?.meta?.last_page ?? 1;

  const notify = (msg: string, tone: 'success' | 'error' = 'success') => setToast({ msg, tone });

  const save = useMutation({
    mutationFn: async ({ payload, photo }: { payload: Record<string, unknown>; photo: File | null }) => {
      if (editing) return teacherService.update(editing.id, payload as never);
      // Guru baru: simpan dulu, lalu unggah foto agar path-nya tersimpan di DB.
      const created: any = await teacherService.create(payload as never);
      if (photo && created?.id) {
        await teacherService.uploadPhoto(created.id, photo);
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teachers-stats'] });
      setShowForm(false);
      setEditing(null);
      notify(editing ? 'Data guru berhasil diperbarui.' : 'Data guru berhasil ditambahkan.');
    },
    onError: (e: any) => notify(e?.response?.data?.message || 'Gagal menyimpan data guru.', 'error'),
  });

  const remove = useMutation({
    mutationFn: teacherService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teachers-stats'] });
      setDeleting(null);
      notify('Guru berhasil dihapus.');
    },
    onError: () => {
      setDeleting(null);
      notify('Gagal menghapus guru.', 'error');
    },
  });

  const applyFilters = () => {
    setFilters({ ...draft });
    setMenuOpen(false);
  };

  const resetFilters = () => {
    setDraft({ search: '', status: '', subject: '', role: '', class_id: '', halaqah_id: '' });
    setFilters({ search: '', status: '', subject: '', role: '', class_id: '', halaqah_id: '' });
  };

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Master Data</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Guru / Pembimbing</h1>
          <p className="mt-1 text-slate-500">Kelola data guru dan pembimbing tahfidz</p>
        </div>
        <div className="relative">
          <Button className="rounded-xl bg-gradient-to-br from-[#075B30] to-[#0D753F] shadow-lg shadow-[#0D753F]/20 hover:from-[#064A27] hover:to-[#075B30]" onClick={() => setMenuOpen(!menuOpen)}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Guru <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border bg-white p-2 shadow-xl">
              <button
                className="flex w-full items-center gap-2 rounded-xl bg-gradient-to-br from-[#075B30] to-[#0D753F] px-3 py-2 text-sm text-white hover:from-[#064A27] hover:to-[#075B30]"
                onClick={() => {
                  setMenuOpen(false);
                  setEditing(null);
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4" /> Tambah Guru
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => {
                  setMenuOpen(false);
                  setImportOpen(true);
                }}
              >
                <Upload className="h-4 w-4" /> Import Data
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50"
                disabled={exporting}
                onClick={async () => {
                  setMenuOpen(false);
                  setExporting(true);
                  try {
                    await teacherService.export({
                      search: debouncedSearch || undefined,
                      status: filters.status || undefined,
                      subject: filters.subject || undefined,
                      role: filters.role || undefined,
                      class_id: filters.class_id ? Number(filters.class_id) : undefined,
                      halaqah_id: filters.halaqah_id ? Number(filters.halaqah_id) : undefined,
                      format: 'csv',
                    });
                  } catch {
                    notify('Gagal mengunduh data.', 'error');
                  } finally {
                    setExporting(false);
                  }
                }}
              >
                <Download className="h-4 w-4" /> {exporting ? 'Mengunduh...' : 'Export CSV'}
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50"
                disabled={exporting}
                onClick={async () => {
                  setMenuOpen(false);
                  setExporting(true);
                  try {
                    await teacherService.export({
                      search: debouncedSearch || undefined,
                      status: filters.status || undefined,
                      subject: filters.subject || undefined,
                      role: filters.role || undefined,
                      class_id: filters.class_id ? Number(filters.class_id) : undefined,
                      halaqah_id: filters.halaqah_id ? Number(filters.halaqah_id) : undefined,
                      format: 'xlsx',
                    });
                  } catch {
                    notify('Gagal mengunduh data.', 'error');
                  } finally {
                    setExporting(false);
                  }
                }}
              >
                <FileSpreadsheet className="h-4 w-4" /> {exporting ? 'Mengunduh...' : 'Export XLSX'}
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => {
                  setMenuOpen(false);
                  window.print();
                }}
              >
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Statistik */}
      <StatsRow stats={statsData as TeacherStats | undefined} loading={false} />

      {/* Filter */}
      <FiltersCard
        draft={draft}
        setDraft={setDraft}
        classes={classes}
        halaqahs={halaqahs}
        onApply={applyFilters}
        onReset={resetFilters}
      />

      {/* Error */}
      {isError && (
        <Card className="border-rose-100 bg-rose-50">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <div>
                <p className="text-sm font-bold text-rose-700">Data guru gagal dimuat.</p>
                <p className="text-xs text-rose-500">Terjadi masalah saat mengambil data.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RotateCcw className="h-4 w-4" /> Coba Lagi
            </Button>
          </div>
        </Card>
      )}

      {/* Tabel */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
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
        ) : teachers.length === 0 ? (
          <EmptyState
            title="Belum ada data guru"
            description="Tambahkan guru atau pembimbing untuk mulai mengelola program Tahfidz."
            action={
              <Button
                className="bg-gradient-to-br from-[#075B30] to-[#0D753F] hover:from-[#064A27] hover:to-[#075B30]"
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4" /> Tambah Guru
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">No</th>
                  <th className="px-3 py-3">Foto</th>
                  <th className="px-3 py-3">Nama Guru</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Mata Pelajaran</th>
                  <th className="px-3 py-3">Kelas / Halaqah</th>
                  <th className="px-3 py-3">Santri</th>
                  <th className="px-3 py-3">No. HP</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((teacher, i) => (
                  <tr key={teacher.id} className="transition-colors hover:bg-emerald-50/40">
                    <td className="px-4 py-3 text-slate-400">{(page - 1) * perPage + i + 1}</td>
                    <td className="px-3 py-3">
                      <Avatar teacher={teacher} />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-900">{teacher.name}</p>
                      <p className="text-xs text-slate-400">{teacher.teacher_code}</p>
                    </td>
                    <td className="px-3 py-3">
                      <RoleBadge teacher={teacher} />
                    </td>
                    <td className="px-3 py-3 text-slate-600">{teacher.subject ?? '-'}</td>
                    <td className="px-3 py-3">
                      <div className="text-slate-600">
                        {teacher.homeroom_classes?.length ? teacher.homeroom_classes.map((c) => c.name).join(', ') : '-'}
                        {teacher.tahfidz_groups?.length ? ` · ${teacher.tahfidz_groups.map((g) => g.name).join(', ')}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {teacher.supervised_students ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{teacher.phone ?? '-'}</td>
                    <td className="px-3 py-3 text-slate-600">{teacher.email ?? '-'}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={teacher.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="outline" title="Detail" aria-label={`Detail ${teacher.name}`} onClick={() => setDetailId(teacher.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          title="Edit"
                          aria-label={`Edit ${teacher.name}`}
                          onClick={() => {
                            setEditing(teacher);
                            setShowForm(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50"
                          title="Hapus"
                          aria-label={`Hapus ${teacher.name}`}
                          onClick={() => setDeleting(teacher)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && teachers.length > 0 && (
          <Pagination
            page={page}
            lastPage={lastPage}
            total={total}
            perPage={perPage}
            onPage={setPage}
            onPerPage={(n) => {
              setPerPage(n);
              setPage(1);
            }}
          />
        )}
      </Card>

      {/* Modal & drawer */}
      {showForm && (
        <TeacherFormModal
          initial={editing}
          onSave={(payload, photo) => save.mutate({ payload, photo })}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {detailId !== null && <TeacherDrawer teacherId={detailId} onClose={() => setDetailId(null)} />}

      {deleting && (
        <Modal title="Hapus Guru" onClose={() => setDeleting(null)}>
          <div className="space-y-4 p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </span>
              <div>
                <p className="text-sm text-slate-700">
                  Hapus guru <b className="text-slate-900">"{deleting.name}"</b>? Data yang dihapus tidak dapat dikembalikan.
                </p>
                <p className="mt-1 text-xs text-slate-400">Aktivitas setoran & murajaah yang tercatat akan tetap tersimpan.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setDeleting(null)}>
                Batal
              </Button>
              <Button className="bg-rose-600 hover:bg-rose-700" disabled={remove.isPending} onClick={() => remove.mutate(deleting.id)}>
                {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Hapus
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onDone={(m, tone) => {
            notify(m, tone);
            queryClient.invalidateQueries({ queryKey: ['teachers'] });
            queryClient.invalidateQueries({ queryKey: ['teachers-stats'] });
          }}
        />
      )}
    </div>
  );
}
