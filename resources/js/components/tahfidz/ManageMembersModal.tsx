import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { studentService, tahfidzGroupService } from '@/services/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { Student, TahfidzGroup } from '@/types';
import { Search, Trash2, Loader2, UserPlus } from 'lucide-react';

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed right-5 top-20 z-[60] rounded-2xl border border-emerald-100 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 shadow-xl">
      {msg}
    </div>
  );
}

export default function ManageMembersModal({ group, onClose }: { group: TahfidzGroup; onClose: () => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: groupData, isLoading } = useQuery({
    queryKey: ['tahfidz-group', group.id],
    queryFn: () => tahfidzGroupService.get(group.id),
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students-options', debouncedSearch],
    queryFn: () => studentService.list({ per_page: 20, search: debouncedSearch || undefined }),
  });

  const members: Student[] = groupData?.members ?? [];
  const students: Student[] = Array.isArray(studentsData) ? studentsData : studentsData?.data ?? [];
  const memberIds = new Set(members.map((m) => m.id));
  const candidates = students.filter((s) => !memberIds.has(s.id));

  const addMember = useMutation({
    mutationFn: (studentId: number) => tahfidzGroupService.addMember(group.id, studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tahfidz-group', group.id] });
      qc.invalidateQueries({ queryKey: ['tahfidz-groups'] });
      qc.invalidateQueries({ queryKey: ['groups-settings'] });
      setSearch('');
      setToast('Anggota berhasil ditambahkan.');
    },
  });

  const removeMember = useMutation({
    mutationFn: (studentId: number) => tahfidzGroupService.removeMember(group.id, studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tahfidz-group', group.id] });
      qc.invalidateQueries({ queryKey: ['tahfidz-groups'] });
      qc.invalidateQueries({ queryKey: ['groups-settings'] });
      setToast('Anggota berhasil dihapus.');
    },
  });

  return (
    <Modal title={`Kelola Anggota — ${group.name}`} onClose={onClose}>
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      <div className="space-y-6 p-6">
        {/* Tambah anggota */}
        <section>
          <h4 className="mb-2 text-sm font-bold text-slate-900">Tambah Anggota</h4>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Cari siswa berdasarkan nama, NIS, atau kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-2">
            {candidates.length === 0 ? (
              <p className="p-3 text-center text-sm text-slate-500">
                {debouncedSearch ? 'Tidak ada siswa yang cocok.' : 'Tidak ada siswa baru untuk ditambahkan.'}
              </p>
            ) : (
              candidates.map((student) => (
                <div key={student.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{student.name}</p>
                    <p className="text-xs text-slate-500">{student.student_code} · {student.class_room?.name || 'Kelas -'}</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-gradient-to-br from-[#075B30] to-[#0D753F] text-white hover:from-[#064A27] hover:to-[#075B30] border-transparent"
                    disabled={addMember.isPending}
                    onClick={() => addMember.mutate(student.id)}
                  >
                    {addMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Tambah
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Daftar anggota */}
        <section>
          <h4 className="mb-2 text-sm font-bold text-slate-900">
            Anggota ({isLoading ? '...' : members.length})
          </h4>
          {isLoading ? (
            <p className="p-4 text-center text-sm text-slate-500">Memuat anggota...</p>
          ) : members.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Belum ada anggota di kelompok ini.
            </p>
          ) : (
            <div className="space-y-1.5">
              {members.map((student) => (
                <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {student.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.student_code} · {student.class_room?.name || 'Kelas -'}</p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50"
                    aria-label={`Hapus ${student.name}`}
                    title="Hapus dari kelompok"
                    disabled={removeMember.isPending}
                    onClick={() => removeMember.mutate(student.id)}
                  >
                    {removeMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
