import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tahfidzGroupService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ManageMembersModal from '@/components/tahfidz/ManageMembersModal';
import type { TahfidzGroup } from '@/types';
import { Search, Users, Plus } from 'lucide-react';

export default function TahfidzGroups() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [manageGroup, setManageGroup] = useState<TahfidzGroup | null>(null);
  const isAdmin = user?.role === 'super_admin';

  const { data, isLoading } = useQuery({
    queryKey: ['tahfidz-groups', search],
    queryFn: () => tahfidzGroupService.list({ search }),
  });

  const groups: TahfidzGroup[] = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Tahfidz</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Kelompok Tahfidz</h1>
          <p className="mt-1 text-slate-500">
            {isAdmin
              ? 'Kelola kelompok halaqah dan keanggotaannya.'
              : 'Daftar kelompok halaqah yang Anda bina.'}
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="border-b p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Cari kelompok..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Pembimbing</th>
                  <th className="px-4 py-3">Anggota</th>
                  <th className="px-4 py-3">Status</th>
                  {isAdmin && <th className="px-4 py-3">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.map((group) => (
                  <tr key={group.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-sm font-medium">{group.name}</td>
                    <td className="px-4 py-3 text-sm">{group.teacher?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <Users className="h-4 w-4 text-slate-400" />
                        {group.members_count ?? 0} siswa
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${group.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {group.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-sm">
                        <Button size="sm" variant="outline" onClick={() => setManageGroup(group)}>
                          <Plus className="h-4 w-4" />
                          Kelola Anggota
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {groups.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="px-4 py-10 text-center text-sm text-slate-500">
                      Belum ada kelompok tahfidz.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {manageGroup && <ManageMembersModal group={manageGroup} onClose={() => setManageGroup(null)} />}
    </div>
  );
}
