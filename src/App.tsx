/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Home } from './pages/Home';
import { Login } from './pages/admin/Login';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import { AdminLayout } from './pages/admin/AdminLayout';
import { PriceManager } from './pages/admin/PriceManager';
import { TeamManager } from './pages/admin/TeamManager';
import ProductManager from './pages/admin/ProductManager';
import { OrderManager } from './pages/admin/OrderManager';
import { PrivacyPolicy } from './pages/PrivacyPolicy';

import { InstallPWA } from './components/InstallPWA';

export default function App() {
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
}

