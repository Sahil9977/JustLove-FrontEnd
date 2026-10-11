import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// 1) Owner pages: must be logged in AND be the owner
export default function Protected() {
  const { status, user } = useAuth();

  if (status === 'loading') return null;
// const isOwner = status === 'authed'
  const isOwner = status === 'authed' && (user?.id === 'owner' || user?.id ==='preview');
  return isOwner ? <Outlet /> : <Navigate to="/" replace />;
}

// 2) Guest page: must be logged in AND be the guest
export function ProtectedG() {
  const { status, user } = useAuth();

  if (status === 'loading') return null;

  const isGuest = status === 'authed' && user?.id === 'guest';
  return isGuest ? <Outlet /> : <Navigate to="/" replace />;
}