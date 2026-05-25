import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../shared/contexts/AuthContext';
import { Home } from '../features/catalog/Home';
import { PrivacyPolicy } from '../shared/pages/PrivacyPolicy';
import { InstallPWA } from '../shared/components/InstallPWA';
import { LoadingFallback } from '../shared/components/LoadingFallback';
import { ToastProvider } from '../shared/components/ToastProvider';
import { ProtectedRoute } from '../features/admin/ProtectedRoute';

/**
 * Lazy Loading de Componentes Administrativos
 * Isso garante que o bundle inicial do cliente seja leve e não contenha
 * o código pesado do painel de administração.
 */
const Login = lazy(() => import('../features/admin/Login').then(m => ({ default: m.Login })));
const AdminLayout = lazy(() => import('../features/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const PriceManager = lazy(() => import('../features/admin/PriceManager').then(m => ({ default: m.PriceManager })));
const TeamManager = lazy(() => import('../features/admin/TeamManager').then(m => ({ default: m.TeamManager })));
const ProductManager = lazy(() => import('../features/admin/ProductManager').then(m => ({ default: m.ProductManager })));
const OrderManager = lazy(() => import('../features/admin/OrderManager').then(m => ({ default: m.OrderManager })));
const SettingsManager = lazy(() => import('../features/admin/SettingsManager').then(m => ({ default: m.SettingsManager })));

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <InstallPWA />
          
          {/* Suspense envolve todas as rotas para capturar o carregamento dos chunks lazy */}
          <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* --- ROTAS PÚBLICAS (Importação Normal para SEO e Performance Inicial) --- */}
            <Route path="/" element={<Home />} />
            <Route path="/privacidade" element={<PrivacyPolicy />} />

            {/* --- ROTAS ADMINISTRATIVAS (Lazy Loaded) --- */}
            <Route path="/login" element={<Login />} />
            
            {/* Todas as rotas começando com /admin são protegidas e carregadas sob demanda */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              {/* Sub-rotas do Admin */}
              <Route index element={<PriceManager />} />
              <Route path="equipe" element={<TeamManager />} />
              <Route path="produtos" element={<ProductManager />} />
              <Route path="pedidos" element={<OrderManager />} />
              <Route path="configuracoes" element={<SettingsManager />} />
            </Route>

            {/* Redirecionamento de rotas não encontradas para Home */}
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  </AuthProvider>
  );
};

