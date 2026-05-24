import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const ADMIN_ROLES = new Set(['ADMIN', 'LEAGUE_ADMIN']);

export default function AdminRoute() {
  const user = useAuthStore((s) => s.user);
  if (!user?.role || !ADMIN_ROLES.has(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
