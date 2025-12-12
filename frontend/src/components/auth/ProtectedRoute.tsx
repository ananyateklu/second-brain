import { Navigate } from 'react-router-dom';
import { useBoundStore } from '../../store/bound-store';
import { AppLoadingScreen } from '../ui/AppLoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useBoundStore((state) => state.isAuthenticated);
  const isLoading = useBoundStore((state) => state.isLoading);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <AppLoadingScreen
        message="Checking authentication..."
        showLogo={true}
      />
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
}
