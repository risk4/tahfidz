import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { academicYearService, classService, studentService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AcademicYear, ClassRoom, Student } from '@/types';
import { toDateInputValue } from '@/utils/date';
import { GraduationCap, Pencil, Plus, Search, Trash2, X } from 'lucide-react';

const schema = z.object({
  student_code: z.string().min(1, 'Kode siswa wajib diisi'),
  name: z.string().min(1, 'Nama siswa wajib diisi'),
  nis: z.string().optional(),
  nisn: z.string().optional(),
  gender: z.enum(['L', 'P']),
  birth_place: z.string().optional(),
  birth_date: z.string().optional(),
  class_id: z.coerce.number().min(1, 'Kelas wajib dipilih'),
  academic_year_id: z.coerce.number().min(1, 'Tahun ajaran wajib dipilih'),
});

type FormData = z.infer<typeof schema>;

export default function Students() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['students', search], queryFn: () => studentService.list({ search }) });
  const { data: classes } = useQuery({ queryKey: ['classes-options'], queryFn: () => classService.list({ per_page: 100 }) });
  const { data: years } = useQuery({ queryKey: ['academic-years'], queryFn: () => academicYearService.list() });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { gender: 'L' } });

  const closeForm = () => { setShowForm(false); setEditingId(null); reset({ gender: 'L' }); };
  const students: Student[] = Array.isArray(data) ? data : data?.data ?? [];
  const classOptions: ClassRoom[] = Array.isArray(classes) ? classes : classes?.data ?? [];
  const yearOptions: AcademicYear[] = Array.isArray(years) ? years : years?.data ?? [];

  const createMutation = useMutation({ mutationFn: studentService.create, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['students'] }); closeForm(); } });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }: { id: number; payload: FormData }) => studentService.update(id, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['students'] }); closeForm(); } });
  const deleteMutation = useMutation({ mutationFn: studentService.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }) });
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (formData: FormData) => editingId ? updateMutation.mutate({ id: editingId, payload: formData }) : createMutation.mutate(formData);
  const handleEdit = (student: Student) => { reset({ student_code: student.student_code, name: student.name, nis: student.nis ?? '', nisn: student.nisn ?? '', gender: student.gender, birth_place: student.birth_place ?? '', birth_date: toDateInputValue(student.birth_date), class_id: student.class_id, academic_year_id: student.academic_year_id }); setEditingId(student.id); setShowForm(true); };
  const handleDelete = (student: Student) => { if (window.confirm(`Hapus siswa "${student.name}"? Data yang dihapus tidak dapat dikembalikan.`)) deleteMutation.mutate(student.id); };

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-violet-600 to-fuchsia-500 p-6 text-white shadow-xl shadow-violet-500/20 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-violet-100">Data Santri</p><h1 className="text-2xl font-black sm:text-3xl">Siswa</h1><p className="mt-1 text-sm text-violet-50">Kelola identitas siswa, kelas, dan tahun ajaran.</p></div><Button className="bg-white text-violet-700 hover:bg-violet-50" onClick={() => { reset({ gender: 'L' }); setEditingId(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Tambah Siswa</Button></div>
    {showForm && <Card className="border-0 shadow-xl"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{editingId ? 'Edit Siswa' : 'Tambah Siswa Baru'}</CardTitle><Button variant="ghost" size="icon" onClick={closeForm}><X className="h-4 w-4" /></Button></CardHeader><CardContent><form onSubmit={handleSubmit(onSubmit)} className="space-y-4"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><div className="space-y-2"><Label>Kode Siswa *</Label><Input placeholder="SW-001" {...register('student_code')} />{errors.student_code && <p className="text-sm text-red-500">{errors.student_code.message}</p>}</div><div className="space-y-2"><Label>Nama Lengkap *</Label><Input placeholder="Ahmad Fauzan" {...register('name')} />{errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}</div><div className="space-y-2"><Label>NIS</Label><Input {...register('nis')} /></div><div className="space-y-2"><Label>NISN</Label><Input {...register('nisn')} /></div><div className="space-y-2"><Label>Gender *</Label><select className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm" {...register('gender')}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div><div className="space-y-2"><Label>Tempat Lahir</Label><Input {...register('birth_place')} /></div><div className="space-y-2"><Label>Tanggal Lahir</Label><Input type="date" {...register('birth_date')} /></div><div className="space-y-2"><Label>Kelas *</Label><select className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm" {...register('class_id')}><option value="">Pilih kelas</option>{classOptions.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}</select>{errors.class_id && <p className="text-sm text-red-500">{errors.class_id.message}</p>}</div><div className="space-y-2 md:col-span-2"><Label>Tahun Ajaran *</Label><select className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm" {...register('academic_year_id')}><option value="">Pilih tahun</option>{yearOptions.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select>{errors.academic_year_id && <p className="text-sm text-red-500">{errors.academic_year_id.message}</p>}</div></div><div className="flex gap-2"><Button type="submit" disabled={isSaving}>{isSaving ? 'Menyimpan...' : editingId ? 'Update Siswa' : 'Simpan Siswa'}</Button><Button type="button" variant="outline" onClick={closeForm}>Batal</Button></div></form></CardContent></Card>}
    <Card className="overflow-hidden border-0 shadow-xl"><CardContent className="p-0"><div className="border-b bg-white p-4"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" placeholder="Cari siswa..." value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>{isLoading ? <div className="p-8 text-center text-slate-500">Memuat...</div> : <div className="overflow-x-auto"><table className="w-full min-w-[960px]"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Siswa</th><th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Kode</th><th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">NIS</th><th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Kelas</th><th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Gender</th><th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Status</th><th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{students.map((student) => <tr key={student.id} className="hover:bg-violet-50/50"><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-violet-100 text-violet-700"><GraduationCap className="h-5 w-5" /></div><div><div className="font-semibold text-slate-900">{student.name}</div><div className="text-xs text-slate-500">NISN: {student.nisn || '-'}</div></div></div></td><td className="px-4 py-3 text-sm text-slate-600">{student.student_code}</td><td className="px-4 py-3 text-sm text-slate-600">{student.nis || '-'}</td><td className="px-4 py-3 text-sm text-slate-600">{student.class_room?.name || '-'}</td><td className="px-4 py-3 text-sm text-slate-600">{student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td><td className="px-4 py-3 text-sm"><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">{student.status}</span></td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => handleEdit(student)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="destructive" disabled={deleteMutation.isPending} onClick={() => handleDelete(student)}><Trash2 className="h-4 w-4" /></Button></div></td></tr>)}</tbody></table></div>}</CardContent></Card>
  </div>;
}
