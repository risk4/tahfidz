import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { academicYearService, classService, teacherService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AcademicYear, ClassRoom, Teacher } from '@/types';
import { Pencil, Plus, School, Search, Trash2, X } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Nama kelas wajib diisi'),
  grade: z.coerce.number().min(1, 'Tingkat minimal 1').max(12, 'Tingkat maksimal 12'),
  academic_year_id: z.coerce.number().min(1, 'Tahun ajaran wajib dipilih'),
  homeroom_teacher_id: z.coerce.number().optional(),
});

type FormData = z.infer<typeof schema>;

export default function Classes() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['classes', search], queryFn: () => classService.list({ search }) });
  const { data: years } = useQuery({ queryKey: ['academic-years'], queryFn: () => academicYearService.list() });
  const { data: teachers } = useQuery({ queryKey: ['teachers-options'], queryFn: () => teacherService.list({ per_page: 100 }) });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.input<typeof schema>, any, z.output<typeof schema>>({ resolver: zodResolver(schema) });

  const classes: ClassRoom[] = Array.isArray(data) ? data : data?.data ?? [];
  const yearOptions: AcademicYear[] = Array.isArray(years) ? years : years?.data ?? [];
  const teacherOptions: Teacher[] = Array.isArray(teachers) ? teachers : teachers?.data ?? [];
  const closeForm = () => { setShowForm(false); setEditingId(null); reset(); };

  const normalizePayload = (formData: FormData) => ({ ...formData, homeroom_teacher_id: formData.homeroom_teacher_id || undefined });
  const createMutation = useMutation({ mutationFn: classService.create, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }); queryClient.invalidateQueries({ queryKey: ['classes-options'] }); closeForm(); } });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }: { id: number; payload: FormData }) => classService.update(id, normalizePayload(payload)), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }); queryClient.invalidateQueries({ queryKey: ['classes-options'] }); closeForm(); } });
  const deleteMutation = useMutation({ mutationFn: classService.delete, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }); queryClient.invalidateQueries({ queryKey: ['classes-options'] }); } });
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (formData: FormData) => editingId ? updateMutation.mutate({ id: editingId, payload: formData }) : createMutation.mutate(normalizePayload(formData));
  const handleEdit = (cls: ClassRoom) => { reset({ name: cls.name, grade: cls.grade, academic_year_id: cls.academic_year_id, homeroom_teacher_id: cls.homeroom_teacher_id ?? undefined }); setEditingId(cls.id); setShowForm(true); };
  const handleDelete = (cls: ClassRoom) => { if (window.confirm(`Hapus kelas "${cls.name}"? Data yang dihapus tidak dapat dikembalikan.`)) deleteMutation.mutate(cls.id); };

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-emerald-600">Akademik</p><h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Kelas</h1><p className="mt-1 text-slate-500">Atur rombongan belajar dan wali kelas.</p></div><Button onClick={() => { reset(); setEditingId(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Tambah Kelas</Button></div>
    {showForm && <Card className="overflow-hidden"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{editingId ? 'Edit Kelas' : 'Tambah Kelas Baru'}</CardTitle><Button variant="ghost" size="icon" onClick={closeForm}><X className="h-4 w-4" /></Button></CardHeader><CardContent><form onSubmit={handleSubmit(onSubmit)} className="space-y-4"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><div className="space-y-2"><Label>Nama Kelas *</Label><Input placeholder="7A" {...register('name')} />{errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}</div><div className="space-y-2"><Label>Tingkat *</Label><Input type="number" min="1" max="12" placeholder="7" {...register('grade')} />{errors.grade && <p className="text-sm text-red-500">{errors.grade.message}</p>}</div><div className="space-y-2"><Label>Tahun Ajaran *</Label><select className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40" {...register('academic_year_id')}><option value="">Pilih tahun</option>{yearOptions.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select>{errors.academic_year_id && <p className="text-sm text-red-500">{errors.academic_year_id.message}</p>}</div><div className="space-y-2"><Label>Wali Kelas</Label><select className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40" {...register('homeroom_teacher_id')}><option value="">Tanpa wali</option>{teacherOptions.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></div></div><div className="flex gap-2"><Button type="submit" disabled={isSaving}>{isSaving ? 'Menyimpan...' : editingId ? 'Update Kelas' : 'Simpan Kelas'}</Button><Button type="button" variant="outline" onClick={closeForm}>Batal</Button></div></form></CardContent></Card>}
    <Card className="overflow-hidden"><CardContent className="p-0"><div className="border-b bg-white p-4"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" placeholder="Cari kelas..." value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>{isLoading ? <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div> : <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">{classes.map((cls) => <div key={cls.id} className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><School className="h-6 w-6" /></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => handleEdit(cls)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="destructive" disabled={deleteMutation.isPending} onClick={() => handleDelete(cls)}><Trash2 className="h-4 w-4" /></Button></div></div><div className="mt-4 flex items-center justify-between gap-3"><h3 className="text-xl font-black text-slate-900">Kelas {cls.name}</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Tingkat {cls.grade}</span></div><p className="mt-1 text-sm text-slate-500">Wali kelas: {cls.homeroom_teacher?.name || 'Belum ditentukan'}</p></div>)}</div>}</CardContent></Card>
  </div>;
}
