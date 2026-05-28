// =============================================================================
// NotificationPermissionBanner.tsx
// Banner de opt-in de notificações — padrão Soft Prompt.
//
// IMPORTANTE: Este componente NÃO solicita permissão automaticamente.
// Ele apenas exibe um banner informativo e aguarda o clique do usuário.
// O timer de exibição foi removido — o banner só aparece se o usuário
// ainda não respondeu à pergunta de permissão E não dispensou o banner antes.
// =============================================================================

import React, { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export const NotificationPermissionBanner: React.FC = () => {
  const { permission, requestPermissionAndGetToken } = usePushNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Exibe o banner somente se:
    // 1. O usuário ainda não respondeu à permissão ('default')
    // 2. Nunca dispensou o banner antes
    const dismissed = localStorage.getItem('notificationBannerDismissed');
    if (!dismissed && permission === 'default') {
      setIsVisible(true);
    }
  }, [permission]);

  if (!isVisible || permission !== 'default') return null;

  const handleAllow = async () => {
    setIsLoading(true);
    try {
      await requestPermissionAndGetToken();
    } finally {
      setIsLoading(false);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notificationBannerDismissed', 'true');
    setIsVisible(false);
  };

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
                Receber notifica\u00E7\u00F5es no celular?
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
              onClick={handleDismiss}
              className="px-3 py-2 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-colors whitespace-nowrap hidden sm:block"
            >
              Agora Não
            </button>
            <button
              onClick={handleDismiss}
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
