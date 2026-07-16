import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../features/auth/AuthContext';
import type { Role } from '../../types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="text-primary-600 flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-current border-t-transparent" />
          <p className="text-sm font-medium">Loading JanSeva...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const fallbackPath = user.role === 'CITIZEN' ? '/citizen' : '/staff';
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
};
