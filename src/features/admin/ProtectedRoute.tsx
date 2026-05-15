import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3 text-muted">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Verificando acesso...</span>
        </div>
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
