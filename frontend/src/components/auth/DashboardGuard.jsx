// src/components/auth/DashboardGuard.jsx
// MarketHub's own dashboard routes ship with no role check at all (anyone
// could hit /dashboard/admin directly) — that gap isn't part of what's being
// replicated, so this guard restricts each /dashboard/{role} tree to its
// matching account role (or admin, which can reach any of them).
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const DashboardGuard = ({ roles }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to='/login' state={{ from: location.pathname + location.search }} replace />;
  }

  if (!roles.includes(user.role) && user.role !== 'admin') {
    return <Navigate to='/' replace />;
  }

  return <Outlet />;
};

export default DashboardGuard;
