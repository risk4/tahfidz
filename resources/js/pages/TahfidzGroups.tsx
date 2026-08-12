import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tahfidzGroupService } from '@/services/api';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import type { TahfidzGroup } from '@/types';
import { Search } from 'lucide-react';

export default function TahfidzGroups() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tahfidz-groups', search],
    queryFn: () => tahfidzGroupService.list({ search }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Kelompok Tahfidz</h1></div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Cari kelompok..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          {isLoading ? <div className="p-8 text-center text-gray-500">Memuat...</div> : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Nama</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Pembimbing</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data?.data?.map((group: TahfidzGroup) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{group.name}</td>
                    <td className="px-4 py-3 text-sm">{group.teacher?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${group.status === 'active' ? 'text-green-700 bg-green-100' : 'text-gray-700 bg-gray-100'}`}>
                        {group.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
