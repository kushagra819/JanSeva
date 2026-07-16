import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { CivicApp } from './pages/CivicApp';
import { NotFound } from './pages/NotFound';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AuthProvider } from './features/auth/AuthContext';
const Login = lazy(() => import('./features/auth/Login').then(module => ({ default: module.Login })));
const Register = lazy(() => import('./features/auth/Register').then(module => ({ default: module.Register })));
const CitizenLayout = lazy(() => import('./features/citizen/CitizenLayout').then(module => ({ default: module.CitizenLayout })));
const ComplaintForm = lazy(() => import('./features/citizen/ComplaintForm').then(module => ({ default: module.ComplaintForm })));
const MyComplaints = lazy(() => import('./features/citizen/MyComplaints').then(module => ({ default: module.MyComplaints })));
const ComplaintDetail = lazy(() => import('./features/citizen/ComplaintDetail').then(module => ({ default: module.ComplaintDetail })));
const Notifications = lazy(() => import('./features/citizen/Notifications').then(module => ({ default: module.Notifications })));
const StaffDashboard = lazy(() =>
  import('./features/staff/StaffDashboard').then(module => ({ default: module.StaffDashboard }))
);

const RouteLoader = () => <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--muted)]">Loading JanDhwani...</div>;

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
        <Route path="/" element={<CivicApp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Citizen Routes */}
        <Route element={<ProtectedRoute allowedRoles={['CITIZEN']} />}>
          <Route element={<CitizenLayout />}>
            <Route path="/citizen" element={<Navigate to="/citizen/complaints" replace />} />
            <Route path="/citizen/submit" element={<ComplaintForm />} />
            <Route path="/citizen/complaints" element={<MyComplaints />} />
            <Route path="/citizen/complaints/:id" element={<ComplaintDetail />} />
            <Route path="/citizen/notifications" element={<Notifications />} />
          </Route>
        </Route>
        
        {/* Staff Routes */}
        <Route element={<ProtectedRoute allowedRoles={['OFFICER', 'DEPARTMENT_HEAD', 'ADMIN', 'COMMISSIONER']} />}>
          <Route path="/staff" element={<StaffDashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
