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

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X, Loader2 } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

const DISMISSED_KEY = 'notif_prompt_dismissed_until';
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  try {
    const val = localStorage.getItem(DISMISSED_KEY);
    if (!val) return false;
    return Date.now() < Number(val);
  } catch {
    return false;
  }
}

function setDismissed() {
  try {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSED_KEY, String(until));
  } catch {}
}

export const SoftNotificationPrompt: React.FC = () => {
  const { permission, setPermission, requestPermissionAndGetToken } = usePushNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [justActivated, setJustActivated] = useState(false);
  const [dismissed, setDismissedState] = useState(false);

  useEffect(() => {
    setDismissedState(isDismissed());
  }, []);

  // Não renderiza se o navegador não suporta notificações
  if (!('Notification' in window)) return null;

  // ── Permissão já concedida ou usuário dispensou recentemente ─────────────
  if (permission === 'granted' || justActivated || dismissed) {
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
  const handleAllow = async () => {
    setIsLoading(true);
    try {
      const token = await requestPermissionAndGetToken();
      if (token) {
        setJustActivated(true);
      } else {
        if ('Notification' in window) {
          setPermission(Notification.permission);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed();
    setDismissedState(true);
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
        {isLoading ? (
          <Loader2 size={16} className="animate-spin text-primary" />
        ) : (
          <Bell size={16} className="text-primary" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary leading-tight">
          {isLoading ? 'Ativando notificações…' : '🔔 Acompanhar meu pedido'}
        </p>
        {!isLoading && (
          <p className="text-xs text-muted mt-0.5">
            Receba alertas quando seu pedido sair para entrega.
          </p>
        )}
      </div>

      {!isLoading && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleAllow}
            className="text-xs font-bold text-white bg-primary rounded-lg px-3 py-1.5 hover:bg-primary/90 transition-colors"
          >
            Ativar
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dispensar notificações"
            className="p-1.5 text-muted hover:text-text rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
