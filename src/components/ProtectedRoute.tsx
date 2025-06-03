
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  allowedRoles?: string[];
  requireSuperAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  allowedRoles, 
  requireSuperAdmin 
}) => {
  const { user, userRole, loading } = useAuth();

  console.log('ProtectedRoute - user:', user?.email, 'userRole:', userRole, 'loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check for superadmin access - yugandhar@whiteindia.in should always have access
  if (requireSuperAdmin) {
    const isSuperAdmin = user.email === 'yugandhar@whiteindia.in' || user.email === 'wiadmin' || userRole === 'admin';
    if (!isSuperAdmin) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">Only superadmin can access this page.</p>
          </div>
        </div>
      );
    }
  }

  // Special handling for yugandhar@whiteindia.in - always grant access
  if (user.email === 'yugandhar@whiteindia.in') {
    console.log('Granting full access to yugandhar@whiteindia.in');
    return <>{children}</>;
  }

  // Check role permissions for other users
  const hasAccess = () => {
    // If user is admin, grant access to everything
    if (userRole === 'admin') {
      return true;
    }
    
    if (requiredRole && userRole !== requiredRole) {
      return false;
    }
    
    if (allowedRoles && !allowedRoles.includes(userRole as string)) {
      return false;
    }
    
    return true;
  };

  if (!hasAccess()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <p className="text-xs text-gray-400 mt-2">User: {user.email}, Role: {userRole}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
