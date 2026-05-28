// =============================================================================
// SoftNotificationPrompt.tsx
// Banner de opt-in de notificações push seguindo o padrão "Soft Prompt".
//
// Regras de exibição:
//   - 'default'  → mostra o botão de opt-in
//   - 'granted'  → mostra badge "Notificações Ativas" (sem botão de ação)
//   - 'denied'   → mostra mensagem orientando o usuário a desbloquear
//   - Não suportado → não renderiza nada
// =============================================================================

import React, { useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export const SoftNotificationPrompt: React.FC = () => {
  const { permission, setPermission, requestPermissionAndGetToken } = usePushNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [justActivated, setJustActivated] = useState(false);

  // Não renderiza se o navegador não suporta notificações
  if (!('Notification' in window)) return null;

  // ── Permissão já concedida ────────────────────────────────────────────────
  if (permission === 'granted' || justActivated) {
    return null;
  }

  // ── Permissão bloqueada pelo usuário ─────────────────────────────────────
  if (permission === 'denied') {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        <BellOff size={16} className="shrink-0 mt-0.5 text-amber-500" />
        <span>
          As notifica\u00E7\u00F5es est\u00E3o bloqueadas no seu navegador. Para receber alertas do pedido,{' '}
          <strong>clique no cadeado ao lado da URL</strong> e libere as notifica\u00E7\u00F5es.
        </span>
      </div>
    );
  }

  // ── Estado padrão: permissão ainda não solicitada ─────────────────────────
  const handleClick = async () => {
    setIsLoading(true);
    try {
      const token = await requestPermissionAndGetToken();
      if (token) {
        setJustActivated(true);
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

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="w-full flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10 active:bg-primary/15 disabled:opacity-60 disabled:cursor-not-allowed"
      aria-label="Ativar notificações de pedido"
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
          {isLoading ? 'Ativando notifica\u00E7\u00F5es...' : '\u{1F514} Me avise quando o pedido sair para entrega'}
        </p>
        {!isLoading && (
          <p className="text-xs text-muted mt-0.5">
            Receba alertas no celular sobre o status do seu pedido.
          </p>
        )}
      </div>
    </button>
  );
};
