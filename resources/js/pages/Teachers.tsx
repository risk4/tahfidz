import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teacherService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Teacher } from '@/types';
import { Pencil, Plus, Search, Trash2, UserRound, X } from 'lucide-react';

const schema = z.object({
  teacher_code: z.string().min(1, 'Kode guru wajib diisi'),
  name: z.string().min(1, 'Nama guru wajib diisi'),
  nip: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export default function Teachers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', search],
    queryFn: () => teacherService.list({ search }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    reset();
  };

  const createMutation = useMutation({
    mutationFn: teacherService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: FormData }) => teacherService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: teacherService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  });

  const teachers: Teacher[] = Array.isArray(data) ? data : data?.data ?? [];
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (formData: FormData) => {
    if (editingId) updateMutation.mutate({ id: editingId, payload: formData });
    else createMutation.mutate(formData);
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingId(teacher.id);
    reset({
      teacher_code: teacher.teacher_code,
      name: teacher.name,
      nip: teacher.nip ?? '',
      phone: teacher.phone ?? '',
      email: teacher.email ?? '',
    });
    setShowForm(true);
  };

  const handleDelete = (teacher: Teacher) => {
    if (window.confirm(`Hapus guru "${teacher.name}"? Data yang dihapus tidak dapat dikembalikan.`)) {
      deleteMutation.mutate(teacher.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-500 p-6 text-white shadow-xl shadow-emerald-500/20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-100">Master Data</p>
          <h1 className="text-2xl font-black sm:text-3xl">Guru</h1>
          <p className="mt-1 text-sm text-emerald-50">Kelola data pengajar dan pembimbing tahfidz.</p>
        </div>
        <Button className="bg-white text-emerald-700 hover:bg-emerald-50" onClick={() => { reset(); setEditingId(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Tambah Guru
        </Button>
      </div>

      {showForm && (
        <Card className="border-0 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingId ? 'Edit Guru' : 'Tambah Guru Baru'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={closeForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2"><Label>Kode Guru *</Label><Input placeholder="GR-001" {...register('teacher_code')} />{errors.teacher_code && <p className="text-sm text-red-500">{errors.teacher_code.message}</p>}</div>
                <div className="space-y-2"><Label>Nama Lengkap *</Label><Input placeholder="Ustadz Ahmad" {...register('name')} />{errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}</div>
                <div className="space-y-2"><Label>NIP</Label><Input placeholder="Opsional" {...register('nip')} /></div>
                <div className="space-y-2"><Label>No. HP</Label><Input placeholder="08xxxxxxxxxx" {...register('phone')} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Email</Label><Input type="email" placeholder="guru@email.com" {...register('email')} />{errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}</div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Menyimpan...' : editingId ? 'Update Guru' : 'Simpan Guru'}</Button>
                <Button type="button" variant="outline" onClick={closeForm}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-0 shadow-xl">
        <CardContent className="p-0">
          <div className="border-b bg-white p-4"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" placeholder="Cari guru..." value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
          {isLoading ? <div className="p-8 text-center text-slate-500">Memuat...</div> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[860px]"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Guru</th><th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Kode</th><th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">NIP</th><th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Kontak</th><th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Status</th><th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{teachers.map((teacher) => (<tr key={teacher.id} className="hover:bg-emerald-50/50"><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-700"><UserRound className="h-5 w-5" /></div><div><div className="font-semibold text-slate-900">{teacher.name}</div><div className="text-xs text-slate-500">{teacher.email || '-'}</div></div></div></td><td className="px-4 py-3 text-sm text-slate-600">{teacher.teacher_code}</td><td className="px-4 py-3 text-sm text-slate-600">{teacher.nip || '-'}</td><td className="px-4 py-3 text-sm text-slate-600">{teacher.phone || '-'}</td><td className="px-4 py-3 text-sm"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${teacher.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{teacher.status === 'active' ? 'Aktif' : 'Nonaktif'}</span></td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => handleEdit(teacher)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="destructive" disabled={deleteMutation.isPending} onClick={() => handleDelete(teacher)}><Trash2 className="h-4 w-4" /></Button></div></td></tr>))}</tbody></table></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
