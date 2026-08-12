import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { studentService, teacherService, classService, tahfidzGroupService, academicYearService } from '@/services/api';
import { formatDate } from '@/utils/date';
import { Users, GraduationCap, School, BookOpen, Calendar } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => academicYearService.list({ per_page: 1 }),
  });

  const { data: students } = useQuery({
    queryKey: ['students-count'],
    queryFn: () => studentService.list({ per_page: 1 }),
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers-count'],
    queryFn: () => teacherService.list({ per_page: 1 }),
  });

  const { data: classes } = useQuery({
    queryKey: ['classes-count'],
    queryFn: () => classService.list({ per_page: 1 }),
  });

  const { data: tahfidzGroups } = useQuery({
    queryKey: ['tahfidz-groups-count'],
    queryFn: () => tahfidzGroupService.list({ per_page: 1 }),
  });

  const academicYearItems = Array.isArray(academicYears) ? academicYears : academicYears?.data ?? [];
  const activeYear = academicYearItems.find((y: { is_active: boolean }) => y.is_active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Selamat datang, {user?.name}</p>
      </div>

      {user?.role === 'super_admin' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Siswa</CardTitle>
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students?.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Guru</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teachers?.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Kelas</CardTitle>
              <School className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classes?.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Kelompok Tahfidz</CardTitle>
              <BookOpen className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tahfidzGroups?.total || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Tahun Ajaran Aktif</CardTitle>
          <Calendar className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {activeYear ? (
            <div>
              <div className="text-2xl font-bold">{activeYear.name}</div>
              <p className="text-sm text-gray-500">
                {formatDate(activeYear.start_date)} - {formatDate(activeYear.end_date)}
              </p>
            </div>
          ) : (
            <p className="text-gray-500">Belum ada tahun ajaran aktif</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
