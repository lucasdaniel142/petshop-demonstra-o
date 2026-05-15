import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../shared/contexts/AuthContext';
import { Home } from '../features/catalog/Home';
import { Login } from '../features/admin/Login';
import { ProtectedRoute } from '../features/admin/ProtectedRoute';
import { AdminLayout } from '../features/admin/AdminLayout';
import { PriceManager } from '../features/admin/PriceManager';
import { TeamManager } from '../features/admin/TeamManager';
import { ProductManager } from '../features/admin/ProductManager';
import { OrderManager } from '../features/admin/OrderManager';
import { PrivacyPolicy } from '../shared/pages/PrivacyPolicy';
import { InstallPWA } from '../shared/components/InstallPWA';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <InstallPWA />
        <Routes>
          {/* Rota Pública (Vitrine) */}
          <Route path="/" element={<Home />} />
          <Route path="/privacidade" element={<PrivacyPolicy />} />

          {/* Rotas Administrativas */}
          <Route path="/login" element={<Login />} />
          
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
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
