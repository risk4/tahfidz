import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import AppLayout from '@/layouts/AppLayout';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import ChangePassword from '@/pages/ChangePassword';
import Dashboard from '@/pages/Dashboard';
import AcademicYears from '@/pages/AcademicYears';
import Teachers from '@/pages/Teachers';
import Students, { SantriProfile } from '@/pages/Students';
import Classes from '@/pages/Classes';
import TahfidzGroups from '@/pages/TahfidzGroups';
import Submissions from '@/pages/Submissions';
import Murajaah from '@/pages/Murajaah';
import Progress from '@/pages/Progress';
import Settings from '@/pages/Settings';
import '../css/app.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Memuat...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wajib ganti password: hanya halaman change-password yang boleh diakses.
  if (location.pathname === '/change-password') {
    if (user.must_change_password) {
      return <ChangePassword />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  if (user.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Memuat...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route path="/change-password" element={<PrivateRoute>{null}</PrivateRoute>} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/academic-years"
        element={
          <PrivateRoute>
            {user?.role === 'super_admin' ? <AcademicYears /> : <Navigate to="/dashboard" replace />}
          </PrivateRoute>
        }
      />
      <Route
        path="/teachers"
        element={
          <PrivateRoute>
            {user?.role === 'super_admin' ? <Teachers /> : <Navigate to="/dashboard" replace />}
          </PrivateRoute>
        }
      />
      <Route
        path="/students"
        element={
          <PrivateRoute>
            {(user?.role === 'super_admin' || user?.role === 'teacher') ? (
              <Students />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </PrivateRoute>
        }
      />
      <Route
        path="/santri/:id"
        element={
          <PrivateRoute>
            {(user?.role === 'super_admin' || user?.role === 'teacher') ? (
              <SantriProfile />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </PrivateRoute>
        }
      />
      <Route
        path="/classes"
        element={
          <PrivateRoute>
            {user?.role === 'super_admin' ? <Classes /> : <Navigate to="/dashboard" replace />}
          </PrivateRoute>
        }
      />
      <Route
        path="/tahfidz-groups"
        element={
          <PrivateRoute>
            {(user?.role === 'super_admin' || user?.role === 'teacher') ? (
              <TahfidzGroups />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </PrivateRoute>
        }
      />
      <Route
        path="/submissions"
        element={
          <PrivateRoute>
            {(user?.role === 'super_admin' || user?.role === 'teacher') ? (
              <Submissions />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </PrivateRoute>
        }
      />
      <Route
        path="/murajaah"
        element={
          <PrivateRoute>
            {(user?.role === 'super_admin' || user?.role === 'teacher') ? (
              <Murajaah />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </PrivateRoute>
        }
      />
      <Route
        path="/progress"
        element={
          <PrivateRoute>
            <Progress />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            {user?.role === 'super_admin' ? <Settings /> : <Navigate to="/dashboard" replace />}
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
