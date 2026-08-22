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
  Mic,
  Award,
  Settings,
  ChevronDown,
  UserRound,
  Bell,
  ArrowUp,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService, settingsService } from '@/services/api';
import type { AppSettings } from '@/types';

const NOTIF_TYPE_LABEL: Record<string, string> = {
  setoran: 'Setoran Hafalan',
  murajaah: "Muraja'ah",
  target: 'Target Tercapai',
  announcement: 'Pengumuman',
  absensi: 'Absensi',
  system: 'Sistem',
  test: 'Email Uji',
};

const NOTIF_STATUS_META: Record<string, { label: string; cls: string }> = {
  sent: { label: 'Terkirim', cls: 'bg-emerald-100 text-emerald-700' },
  skipped: { label: 'Dilewati', cls: 'bg-amber-100 text-amber-700' },
  failed: { label: 'Gagal', cls: 'bg-rose-100 text-rose-700' },
};

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Kembali ke atas"
      title="Kembali ke atas"
      className={`fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition-all duration-300 hover:-translate-y-1 hover:bg-emerald-700 active:scale-95 ${
        visible
          ? 'translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none translate-y-4 scale-75 opacity-0'
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

function notifTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface AppLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'teacher', 'student'] },
  { path: '/teachers', label: 'Guru', icon: Users, roles: ['super_admin'] },
  { path: '/students', label: 'Siswa', icon: GraduationCap, roles: ['super_admin', 'teacher'] },
  { path: '/submissions', label: 'Setoran Hafalan', icon: ClipboardList, roles: ['super_admin', 'teacher'] },
  { path: '/murajaah', label: 'Murajaah', icon: BookMarked, roles: ['super_admin', 'teacher'] },
  { path: '/pengecekan-bacaan', label: 'Pengecekan Bacaan', icon: Mic, roles: ['super_admin', 'teacher', 'student'] },
  { path: '/surah-ayat', label: 'Surat & Ayat', icon: BookOpen, roles: ['super_admin', 'teacher'] },
  { path: '/progress', label: 'Progress', icon: BarChart3, roles: ['super_admin', 'teacher', 'student'] },
  { path: '/sertifikat', label: 'Sertifikat', icon: Award, roles: ['super_admin', 'teacher', 'student'] },
  { path: '/settings', label: 'Pengaturan', icon: Settings, roles: ['super_admin'] },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: settings } = useQuery<AppSettings>({
    queryKey: ['settings'],
    queryFn: () => settingsService.all(),
    // Hanya ambil settings bila ada token; hindari loop 401 → redirect /login.
    enabled: !!localStorage.getItem('token'),
    staleTime: 5 * 60 * 1000,
  });
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
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.list({ per_page: 8 }),
    refetchInterval: 60_000,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
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

  const logoPath = settings?.application?.logo_path ?? settings?.profile?.logo_path ?? null;
  const logoUrl = logoPath ? `/storage/${logoPath}` : null;
  const appName = settings?.application?.app_name || settings?.profile?.name || 'Tahfidz Qur\'an';

  // Terapkan favicon + judul tab dari settings (identitas aplikasi).
  useEffect(() => {
    if (settings?.application?.favicon_path) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = `/storage/${settings.application.favicon_path}`;
    }
    const title = settings?.application?.app_name || settings?.profile?.name;
    if (title) document.title = title;
  }, [settings]);

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
          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            {logoUrl ? (
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-100">
                <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
              </span>
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                <Moon className="h-5 w-5" fill="white" strokeWidth={2} />
              </span>
            )}
            <span className={`leading-tight truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <span className="block truncate bg-gradient-to-r from-[#075B30] via-[#0D753F] to-[#059669] bg-clip-text text-base font-extrabold tracking-tight text-transparent">
                {appName}
              </span>
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
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Pusat notifikasi in-app */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={notifOpen}
                title="Notifikasi"
                className="relative rounded-xl border border-slate-200 bg-white p-2 shadow-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Bell className="h-5 w-5" />
                {(notifData?.unread_count ?? 0) > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {(notifData?.unread_count ?? 0) > 99 ? '99+' : notifData?.unread_count}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Notifikasi</p>
                      <p className="text-xs text-slate-400">{notifData?.unread_count ?? 0} belum dibaca</p>
                    </div>
                    {(notifData?.unread_count ?? 0) > 0 && (
                      <button
                        onClick={() => markAllReadMutation.mutate()}
                        disabled={markAllReadMutation.isPending}
                        className="text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700 disabled:opacity-50"
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>

                  <div className="max-h-[22rem] overflow-y-auto">
                    {!notifData || notifData.data.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                        <Bell className="h-8 w-8 text-slate-200" />
                        <p className="text-sm font-semibold text-slate-700">Belum ada notifikasi</p>
                        <p className="text-xs text-slate-400">Notifikasi setoran, murajaah, dan target akan muncul di sini.</p>
                      </div>
                    ) : (
                      notifData.data.map((n) => {
                        const meta = NOTIF_STATUS_META[n.status] ?? { label: n.status, cls: 'bg-slate-100 text-slate-600' };
                        return (
                          <button
                            key={n.id}
                            onClick={() => {
                              if (!n.is_read) markReadMutation.mutate(n.id);
                              setNotifOpen(false);
                            }}
                            className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50 ${
                              n.is_read ? '' : 'bg-emerald-50/40'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900">{NOTIF_TYPE_LABEL[n.type] ?? n.type}</span>
                                {!n.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />}
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.subject || n.body || '-'}</p>
                              <p className="mt-1 truncate text-[11px] text-slate-400">
                                {n.student_name ? `${n.student_name} · ` : ''}
                                {notifTime(n.created_at)}
                                {n.status === 'skipped' && n.error ? ` · ${n.error}` : ''}
                              </p>
                            </div>
                            <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>{meta.label}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
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
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <BackToTop />
    </div>
  );
}
