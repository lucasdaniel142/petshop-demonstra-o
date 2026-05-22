import React, { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { requestNotificationToken } from '../lib/notifications';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const NotificationPermissionBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Verificar se o usuário já respondeu à pergunta
    const hasResponded = localStorage.getItem('notificationPermissionAsked');
    const permission = Notification.permission;
    
    // Mostrar banner se:
    // 1. Nunca perguntou antes
    // 2. Permissão ainda não foi concedida
    // 3. Permissão não foi negada permanentemente
    if (!hasResponded && permission === 'default') {
      // Pequeno delay para não aparecer imediatamente
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAllow = async () => {
    setIsLoading(true);
    try {
      const token = await requestNotificationToken();
      if (token) {
        // Salvar token no Firestore
        await setDoc(doc(db, 'fcmTokens', token), {
          lastUsed: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        console.log('[NotificationBanner] Token salvo com sucesso');
      }
      // Marcar que já perguntou
      localStorage.setItem('notificationPermissionAsked', 'true');
      setIsVisible(false);
    } catch (error) {
      console.error('[NotificationBanner] Erro ao solicitar permissão:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeny = () => {
    localStorage.setItem('notificationPermissionAsked', 'true');
    setIsVisible(false);
  };

  const handleClose = () => {
    localStorage.setItem('notificationPermissionAsked', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="shrink-0 bg-white/20 p-2 rounded-full">
              <Bell size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold sm:text-base">
                Receber notificações no celular?
              </p>
              <p className="text-xs text-white/80 sm:text-sm hidden sm:block">
                Avisaremos quando seu pedido sair para entrega
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAllow}
              disabled={isLoading}
              className="px-4 py-2 bg-white text-primary text-sm font-bold rounded-lg hover:bg-white/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isLoading ? 'Ativando...' : 'Permitir'}
            </button>
            <button
              onClick={handleDeny}
              className="px-3 py-2 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-colors whitespace-nowrap hidden sm:block"
            >
              Agora não
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors sm:hidden"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
