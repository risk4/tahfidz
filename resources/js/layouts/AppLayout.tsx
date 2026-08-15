import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  LogOut,
  Menu,
  X,
  Moon,
  ClipboardList,
  BarChart3,
  BookMarked,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ChevronDown,
  UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'teacher', 'student'] },
  { path: '/teachers', label: 'Guru', icon: Users, roles: ['super_admin'] },
  { path: '/students', label: 'Siswa', icon: GraduationCap, roles: ['super_admin', 'teacher'] },
  { path: '/submissions', label: 'Setoran Hafalan', icon: ClipboardList, roles: ['super_admin', 'teacher'] },
  { path: '/murajaah', label: 'Murajaah', icon: BookMarked, roles: ['super_admin', 'teacher'] },
  { path: '/surah-ayat', label: 'Surat & Ayat', icon: BookOpen, roles: ['super_admin', 'teacher'] },
  { path: '/progress', label: 'Progress', icon: BarChart3, roles: ['super_admin', 'teacher', 'student'] },
  { path: '/settings', label: 'Pengaturan', icon: Settings, roles: ['super_admin'] },
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

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login');
  };

  const roleLabel = user?.role === 'super_admin' ? 'Admin' : user?.role === 'teacher' ? 'Guru' : 'Siswa';
  const initials = (user?.name ?? '?')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

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
            const disabled = 'disabled' in item && item.disabled === true;
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
                      ? 'bg-gradient-to-br from-[#075B30] to-[#0D753F] text-white hover:from-[#064A27] hover:to-[#075B30]'
                      : 'text-[#64748B] hover:bg-slate-50'
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
          <div className="ml-auto" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 shadow-sm transition-colors hover:bg-slate-50"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                {initials || <UserRound className="h-4 w-4" />}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[140px] truncate text-sm font-semibold leading-tight text-slate-900">{user?.name}</span>
                <span className="block text-xs leading-tight text-slate-500">{roleLabel}</span>
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>
            {profileOpen && (
              <div
                role="menu"
                className="absolute right-4 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl sm:right-6"
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-bold text-slate-900">{user?.name}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
                <div className="p-1.5">
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
