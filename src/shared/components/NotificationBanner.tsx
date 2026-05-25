// =============================================================================
// NotificationBanner.tsx
// Banner alternativo de opt-in — padrão Soft Prompt.
// Exibido apenas quando o usuário ainda não respondeu à permissão.
// NÃO solicita permissão automaticamente por timer.
// =============================================================================

import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export const NotificationBanner: React.FC = () => {
  const { permission, requestPermissionAndGetToken } = usePushNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('notificationBannerDismissed');
    if (!dismissed && permission === 'default') {
      setIsVisible(true);
    }
  }, [permission]);

  if (!isVisible || permission !== 'default') return null;

  const handleAllow = async () => {
    setLoading(true);
    await requestPermissionAndGetToken();
    setLoading(false);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('notificationBannerDismissed', 'true');
    setIsVisible(false);
  };

  return (
    <div className="bg-primary/10 border-b border-primary/20 p-3 sm:p-4 text-center text-sm md:text-base animate-in slide-in-from-top-full duration-500 z-40 relative flex flex-col sm:flex-row items-center justify-center gap-3 shadow-sm">
      <div className="flex items-center gap-2 text-primary-dark font-medium">
        <Bell size={18} className="animate-pulse" />
        <span>Quer saber em primeira m\u00E3o quando tivermos novas ofertas?</span>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <button
          onClick={handleAllow}
          disabled={loading}
          className="bg-primary text-white px-4 py-1.5 rounded-full font-bold text-xs sm:text-sm hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-70"
        >
          {loading ? 'Ativando...' : 'Sim, avisar!'}
        </button>
        <button
          onClick={handleDismiss}
          className="text-gray-500 px-3 py-1.5 rounded-full font-medium text-xs sm:text-sm hover:bg-black/5 transition-colors"
        >
          Agora n\u00E3o
        </button>
      </div>
    </div>
  );
};
