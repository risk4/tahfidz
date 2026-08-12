import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  BookOpen,
  Calendar,
  LogOut,
  Menu,
  X,
  Sparkles,
  ClipboardList,
  BarChart3,
  BookMarked,
} from 'lucide-react';
import { useState } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'teacher', 'student'] },
  { path: '/academic-years', label: 'Tahun Ajaran', icon: Calendar, roles: ['super_admin'] },
  { path: '/teachers', label: 'Guru', icon: Users, roles: ['super_admin'] },
  { path: '/students', label: 'Siswa', icon: GraduationCap, roles: ['super_admin', 'teacher'] },
  { path: '/classes', label: 'Kelas', icon: School, roles: ['super_admin'] },
  { path: '/tahfidz-groups', label: 'Kelompok Tahfidz', icon: BookOpen, roles: ['super_admin', 'teacher'] },
  { path: '/submissions', label: 'Setoran Hafalan', icon: ClipboardList, roles: ['super_admin', 'teacher'] },
  { path: '/murajaah', label: 'Murajaah', icon: BookMarked, roles: ['super_admin', 'teacher'] },
  { path: '/progress', label: 'Progress', icon: BarChart3, roles: ['super_admin', 'teacher', 'student'] },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredMenu = menuItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_30%)]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-slate-950 text-white shadow-2xl transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-20 px-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/20">
              <Sparkles className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-extrabold tracking-tight">Tahfidz App</span>
              <span className="block text-xs text-emerald-200">Manajemen Hafalan</span>
            </span>
          </Link>
          <button className="lg:hidden rounded-lg p-2 hover:bg-white/10" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1.5">
          {filteredMenu.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            const disabled = 'disabled' in item && item.disabled;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  disabled
                    ? 'pointer-events-none text-slate-500'
                    : isActive
                      ? 'bg-white text-slate-950 shadow-lg'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {disabled && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-400">soon</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 flex items-center justify-between px-4 sm:px-6">
          <button className="lg:hidden rounded-xl border bg-white p-2 shadow-sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden text-right text-sm sm:block">
              <span className="block font-semibold text-slate-900">{user?.name}</span>
              <span className="text-slate-500">{user?.role === 'super_admin' ? 'Admin' : user?.role === 'teacher' ? 'Guru' : 'Siswa'}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
