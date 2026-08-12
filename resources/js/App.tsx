import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import AppLayout from '@/layouts/AppLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import AcademicYears from '@/pages/AcademicYears';
import Teachers from '@/pages/Teachers';
import Students from '@/pages/Students';
import Classes from '@/pages/Classes';
import TahfidzGroups from '@/pages/TahfidzGroups';
import Submissions from '@/pages/Submissions';
import Murajaah from '@/pages/Murajaah';
import Progress from '@/pages/Progress';
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
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/"
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
            {user?.role === 'super_admin' ? <AcademicYears /> : <Navigate to="/" replace />}
          </PrivateRoute>
        }
      />
      <Route
        path="/teachers"
        element={
          <PrivateRoute>
            {user?.role === 'super_admin' ? <Teachers /> : <Navigate to="/" replace />}
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
              <Navigate to="/" replace />
            )}
          </PrivateRoute>
        }
      />
      <Route
        path="/classes"
        element={
          <PrivateRoute>
            {user?.role === 'super_admin' ? <Classes /> : <Navigate to="/" replace />}
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
              <Navigate to="/" replace />
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
              <Navigate to="/" replace />
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
              <Navigate to="/" replace />
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
