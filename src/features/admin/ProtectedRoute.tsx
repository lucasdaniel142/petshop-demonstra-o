import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';

/**
 * ProtectedRoute Component
 * 
 * Ensures that only authenticated users with 'admin' privileges can access
 * administrative routes. If not authenticated or not an admin, redirects to Home (/).
 */
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin, loading } = useAuth();

  // Enquanto verifica a autenticação, mostra um estado de carregamento elegante
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="relative">
          {/* Spinner animado com estilo premium */}
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="mt-4 text-primary font-semibold text-center animate-pulse">
            Verificando Credenciais...
          </div>
        </div>
      </div>
    );
  }

  // Se não estiver logado ou não for admin, redireciona para a Home (/)
  // Conforme solicitado pelo usuário para garantir que clientes não acessem o admin
  if (!currentUser || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

