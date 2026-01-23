import { Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth();

  // If still loading initial auth state, show loader
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  // If a specific role is required
  if (requiredRole) {
    // If user doesn't have a role yet, redirect to dashboard to select/assign one
    if (!user.role) {
      return <Navigate to="/dashboard" replace />;
    }
    
    // If user has wrong role, redirect to dashboard
    if (user.role !== requiredRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
