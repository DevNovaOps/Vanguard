import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ children, requiredModule }) {
  const { isAuthenticated, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--background-primary)',
        color: 'var(--text-primary)',
        fontSize: 'var(--text-lg)',
        fontWeight: 'var(--font-semibold)'
      }}>
        Verifying Security Session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredModule && !hasPermission(requiredModule)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
