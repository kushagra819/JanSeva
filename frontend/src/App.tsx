import { Routes, Route, Navigate } from 'react-router';
import { Landing } from './pages/Landing';
import { NotFound } from './pages/NotFound';
import { Login } from './features/auth/Login';
import { Register } from './features/auth/Register';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AuthProvider } from './features/auth/AuthContext';
import { CitizenLayout } from './features/citizen/CitizenLayout';
import { ComplaintForm } from './features/citizen/ComplaintForm';
import { MyComplaints } from './features/citizen/MyComplaints';
import { ComplaintDetail } from './features/citizen/ComplaintDetail';
import { Notifications } from './features/citizen/Notifications';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
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
        <Route element={<ProtectedRoute allowedRoles={['OFFICER', 'DEPARTMENT_HEAD', 'COMMISSIONER']} />}>
          <Route path="/staff" element={<div className="p-8">Staff Queue (Coming Soon)</div>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
