import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin, loading } = useAuth();

  // CAMADA DE PROTEÇÃO 2: Enquanto o Firebase verifica a sessão,
  // não tomamos nenhuma decisão de roteamento.
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

  // DECISÃO FINAL: Só após o loading terminar, verificamos as credenciais.
  if (!currentUser || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
