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
  Moon,
  ClipboardList,
  BarChart3,
  BookMarked,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useState } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'teacher', 'student'] },
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar-collapsed') === '1';
  });

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', next ? '1' : '0');
      return next;
    });
  };

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
        className={`fixed top-0 left-0 z-50 h-full w-64 border-r border-slate-100 bg-white text-slate-900 shadow-xl transform transition-all duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} lg:translate-x-0`}
      >
        <div
          className={`flex items-center justify-between h-20 px-5 border-b border-slate-100 ${
            sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''
          }`}
        >
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Moon className="h-5 w-5" fill="white" strokeWidth={2} />
            </span>
            <span className={`leading-tight ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <span className="block text-[15px] font-extrabold tracking-tight text-slate-900">Tahfidz</span>
              <span className="block text-[15px] font-extrabold tracking-tight text-slate-900">Qur'an</span>
            </span>
          </Link>
          <button className="lg:hidden rounded-lg p-2 hover:bg-slate-100" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {filteredMenu.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            const disabled = 'disabled' in item && item.disabled;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''
                } ${
                  disabled
                    ? 'pointer-events-none text-slate-400'
                    : isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                aria-label={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span className={`flex-1 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                {disabled && (
                  <span className={`rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                    soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className={`transition-[padding] duration-200 ease-in-out ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button className="lg:hidden rounded-xl border bg-white p-2 shadow-sm" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <button
              onClick={toggleSidebarCollapsed}
              title={sidebarCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
              aria-label={sidebarCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
              className="hidden lg:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
          </div>
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
