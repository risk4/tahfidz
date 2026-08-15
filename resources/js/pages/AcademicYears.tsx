import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicYearService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AcademicYear } from '@/types';
import { formatDate, toDateInputValue } from '@/utils/date';
import { Plus, Pencil, Check } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  start_date: z.string().min(1, 'Tanggal mulai wajib diisi'),
  end_date: z.string().min(1, 'Tanggal selesai wajib diisi'),
});

type FormData = z.infer<typeof schema>;

export default function AcademicYears() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => academicYearService.list(),
  });

  const createMutation = useMutation({
    mutationFn: academicYearService.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academic-years'] }); setShowForm(false); reset(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormData }) => academicYearService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['academic-years'] }); setEditingId(null); reset(); },
  });

  const activateMutation = useMutation({
    mutationFn: academicYearService.activate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-years'] }),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (formData: FormData) => {
    if (editingId) updateMutation.mutate({ id: editingId, data: formData });
    else createMutation.mutate(formData);
  };

  const handleEdit = (year: AcademicYear) => {
    setEditingId(year.id);
    setValue('name', year.name);
    setValue('start_date', toDateInputValue(year.start_date));
    setValue('end_date', toDateInputValue(year.end_date));
    setShowForm(true);
  };

  const years: AcademicYear[] = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Kalender Akademik</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Tahun Ajaran</h1>
          <p className="mt-1 text-slate-500">Kelola periode belajar dan pilih tahun ajaran aktif.</p>
        </div>
        {!showForm && <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" /> Tambah Tahun</Button>}
      </div>
      {showForm && (
        <Card className="overflow-hidden">
          <CardHeader><CardTitle>{editingId ? 'Edit' : 'Tambah'} Tahun Ajaran</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div><Label>Nama</Label><Input {...register('name')} />{errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}</div>
                <div><Label>Mulai</Label><Input type="date" {...register('start_date')} /></div>
                <div><Label>Selesai</Label><Input type="date" {...register('end_date')} /></div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingId ? 'Update' : 'Simpan'}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); reset(); }}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div> : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
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
                {years.map((year: AcademicYear) => (
                  <tr key={year.id} className="hover:bg-emerald-50/40">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{year.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(year.start_date)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(year.end_date)}</td>
                    <td className="px-4 py-3 text-sm">
                      {year.is_active ? <span className="px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full">Aktif</span> : <span className="px-3 py-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-full">Nonaktif</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex justify-end gap-2">
                        {!year.is_active && <Button size="sm" variant="outline" onClick={() => activateMutation.mutate(year.id)}><Check className="w-4 h-4" /></Button>}
                        <Button size="sm" variant="outline" onClick={() => handleEdit(year)}><Pencil className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
