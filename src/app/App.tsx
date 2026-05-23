import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../shared/contexts/AuthContext';
import { Home } from '../features/catalog/Home';
import { PrivacyPolicy } from '../shared/pages/PrivacyPolicy';
import { InstallPWA } from '../shared/components/InstallPWA';
import { LoadingFallback } from '../shared/components/LoadingFallback';
import { ToastProvider } from '../shared/components/ToastProvider';
import { ProtectedRoute } from '../features/admin/ProtectedRoute';
import { requestNotificationToken } from '../shared/lib/notifications';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../shared/lib/firebase';

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
  // ---------------------------------------------------------------------------
  // Silent token registration - registra token FCM automaticamente na primeira carga
  // sem depender de UI de opt-in ou banners
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const registerSilentToken = async () => {
      try {
        // Verifica suporte e permissão
        if (!('Notification' in window)) {
          console.log('[App] Navegador não suporta notificações');
          return;
        }
        
        const permission = Notification.permission;
        console.log('[App] Permissão de notificação atual:', permission);
        
        // Se permissão já foi concedida, obtém o token silenciosamente
        if (permission === 'granted') {
          console.log('[App] Permissão já concedida, obtendo token FCM silenciosamente...');
          
          try {
            const token = await requestNotificationToken();
            if (token) {
              console.log('[App] Token obtido com sucesso:', token.slice(0, 20) + '...');
              console.log('[App] Salvando token no Firestore...');
              
              try {
                await setDoc(doc(db, 'fcmTokens', token), {
                  lastUsed: serverTimestamp(),
                  createdAt: serverTimestamp(),
                  platform: navigator.userAgent,
                  phone: null, // Será atualizado quando o cliente fornecer o telefone
                });
                // Salva no localStorage para uso no checkout
                localStorage.setItem('fcmToken', token);
                console.log('[App] Token FCM salvo no localStorage e Firestore');
                alert('✅ Notificações ativadas com sucesso!');
              } catch (firestoreError) {
                console.error('[App] Erro ao salvar no Firestore:', firestoreError);
                // Mesmo se falhar no Firestore, salva no localStorage
                localStorage.setItem('fcmToken', token);
                console.log('[App] Token salvo apenas no localStorage (Firestore falhou)');
                alert('✅ Notificações ativadas (localStorage apenas)');
              }
            } else {
              console.warn('[App] requestNotificationToken retornou null');
              alert('⚠️ Erro ao obter token de notificação');
            }
          } catch (tokenError) {
            console.error('[App] Erro ao obter token FCM:', tokenError);
            alert('⚠️ Erro ao obter token: ' + (tokenError as Error).message);
          }
        } else if (permission === 'default') {
          // Permissão ainda não foi pedida - solicita silenciosamente
          console.log('[App] Solicitando permissão de notificação silenciosamente...');
          
          try {
            const token = await requestNotificationToken();
            if (token) {
              console.log('[App] Token obtido após permissão:', token.slice(0, 20) + '...');
              console.log('[App] Salvando token no Firestore...');
              
              try {
                await setDoc(doc(db, 'fcmTokens', token), {
                  lastUsed: serverTimestamp(),
                  createdAt: serverTimestamp(),
                  platform: navigator.userAgent,
                  phone: null, // Será atualizado quando o cliente fornecer o telefone
                });
                // Salva no localStorage para uso no checkout
                localStorage.setItem('fcmToken', token);
                console.log('[App] Token FCM salvo no localStorage e Firestore');
                alert('✅ Notificações ativadas com sucesso!');
              } catch (firestoreError) {
                console.error('[App] Erro ao salvar no Firestore:', firestoreError);
                // Mesmo se falhar no Firestore, salva no localStorage
                localStorage.setItem('fcmToken', token);
                console.log('[App] Token salvo apenas no localStorage (Firestore falhou)');
                alert('✅ Notificações ativadas (localStorage apenas)');
              }
            } else {
              console.log('[App] Permissão negada ou token não obtido');
              alert('⚠️ Permissão de notificação negada');
            }
          } catch (tokenError) {
            console.error('[App] Erro ao obter token FCM:', tokenError);
            alert('⚠️ Erro ao obter token: ' + (tokenError as Error).message);
          }
        } else {
          console.log('[App] Permissão negada pelo usuário, não solicitando');
          alert('⚠️ Permissão de notificação negada');
        }
      } catch (error) {
        console.error('[App] Erro geral ao registrar token FCM:', error);
        alert('⚠️ Erro ao registrar token: ' + (error as Error).message);
      }
    };

    registerSilentToken();
  }, []);

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

