// =============================================================================
// NotificationPrompt.tsx — Componente unificado de opt-in de notificações
// =============================================================================
// [MP-02 FIX] Consolidação de NotificationBanner, NotificationPermissionBanner
// e SoftNotificationPrompt em um único componente configurável

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, Loader2, X } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

type PromptVariant = 'banner-top' | 'banner-bottom' | 'inline' | 'modal';

interface NotificationPromptProps {
  /**
   * Variante visual do componente
   * - banner-top: Banner fixo no topo da página
   * - banner-bottom: Banner fixo no rodapé
   * - inline: Componente inline (para uso em modais/formulários)
   * - modal: Modal centralizado (não implementado ainda)
   */
  variant?: PromptVariant;
  
  /**
   * Se true, exibe botão de fechar (apenas para banners)
   */
  dismissable?: boolean;
  
  /**
   * Chave do localStorage para controlar se foi dispensado
   */
  dismissKey?: string;
  
  /**
   * Texto customizado do botão de ação
   */
  actionText?: string;
  
  /**
   * Texto customizado quando permissão já foi concedida
   */
  grantedText?: string;
}

export const NotificationPrompt: React.FC<NotificationPromptProps> = ({
  variant = 'inline',
  dismissable = true,
  dismissKey = 'notificationPromptDismissed',
  actionText = 'Permitir notificações',
  grantedText = 'Notificações ativas',
}) => {
  const { permission, setPermission, requestPermissionAndGetToken } = usePushNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [justActivated, setJustActivated] = useState(false);

  useEffect(() => {
    // Para banners, verifica se foi dispensado
    if (variant.startsWith('banner')) {
      const dismissed = localStorage.getItem(dismissKey);
      if (!dismissed && permission === 'default') {
        setIsVisible(true);
      }
    } else {
      // Para inline, sempre visível
      setIsVisible(true);
    }
  }, [permission, variant, dismissKey]);

  // Não renderiza se o navegador não suporta notificações
  if (!('Notification' in window)) return null;

  // Não renderiza banners se não estiver visível
  if (variant.startsWith('banner') && !isVisible) return null;

  const handleAllow = async () => {
    setIsLoading(true);
    try {
      const token = await requestPermissionAndGetToken();
      if (token) {
        setJustActivated(true);
        if (variant.startsWith('banner')) {
          // Fecha o banner após 3 segundos
          setTimeout(() => setIsVisible(false), 3000);
        }
      } else {
        // Atualiza o estado local para refletir a decisão do usuário
        if ('Notification' in window) {
          setPermission(Notification.permission);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    if (dismissable && variant.startsWith('banner')) {
      localStorage.setItem(dismissKey, 'true');
      setIsVisible(false);
    }
  };

  // ── Permissão já concedida ────────────────────────────────────────────────
  if (permission === 'granted' || justActivated) {
    if (variant === 'inline') {
      return (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={16} className="shrink-0 text-green-500" />
          <span className="font-medium">{grantedText}</span>
        </div>
      );
    }
    
    if (variant.startsWith('banner')) {
      return (
        <div className={`fixed left-0 right-0 z-[100] bg-green-600 text-white shadow-lg animate-in slide-in-from-${variant === 'banner-top' ? 'top' : 'bottom'} duration-300 ${variant === 'banner-top' ? 'top-0' : 'bottom-0'}`}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              <span className="text-sm font-semibold">{grantedText}</span>
            </div>
            <button onClick={handleDismiss} className="p-1 hover:bg-white/10 rounded">
              <X size={18} />
            </button>
          </div>
        </div>
      );
    }
  }

  // ── Permissão bloqueada pelo usuário ─────────────────────────────────────
  if (permission === 'denied') {
    if (variant === 'inline') {
      return (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <BellOff size={16} className="shrink-0 mt-0.5 text-amber-500" />
          <span>
            As notificações estão bloqueadas no seu navegador. Para receber alertas,{' '}
            <strong>clique no cadeado ao lado da URL</strong> e libere as notificações.
          </span>
        </div>
      );
    }
    
    // Banners não exibem estado "denied" (usuário já tomou decisão)
    return null;
  }

  // ── Estado padrão: permissão ainda não solicitada ─────────────────────────
  
  // Variante INLINE (para modais/formulários)
  if (variant === 'inline') {
    return (
      <button
        onClick={handleAllow}
        disabled={isLoading}
        className="w-full flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10 active:bg-primary/15 disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="Ativar notificações"
      >
        <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          {isLoading ? (
            <Loader2 size={16} className="animate-spin text-primary" />
          ) : (
            <Bell size={16} className="text-primary" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary leading-tight">
            {isLoading ? 'Ativando notificações...' : `🔔 ${actionText}`}
          </p>
          {!isLoading && (
            <p className="text-xs text-muted mt-0.5">
              Receba alertas no celular sobre o status do seu pedido.
            </p>
          )}
        </div>
      </button>
    );
  }

  // Variante BANNER-TOP
  if (variant === 'banner-top') {
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
              {dismissable && (
                <>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-2 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-colors whitespace-nowrap hidden sm:block"
                  >
                    Agora não
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors sm:hidden"
                    aria-label="Fechar"
                  >
                    <X size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Variante BANNER-BOTTOM
  if (variant === 'banner-bottom') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[100] bg-primary/10 border-t border-primary/20 p-3 sm:p-4 text-center text-sm md:text-base animate-in slide-in-from-bottom duration-500 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="flex items-center gap-2 text-primary-dark font-medium">
            <Bell size={18} className="animate-pulse" />
            <span>Quer saber em primeira mão quando tivermos novas ofertas?</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <button
              onClick={handleAllow}
              disabled={isLoading}
              className="bg-primary text-white px-4 py-1.5 rounded-full font-bold text-xs sm:text-sm hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-70"
            >
              {isLoading ? 'Ativando...' : 'Sim avisar'}
            </button>
            {dismissable && (
              <button
                onClick={handleDismiss}
                className="text-gray-500 px-3 py-1.5 rounded-full font-medium text-xs sm:text-sm hover:bg-black/5 transition-colors"
              >
                Agora Não
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
