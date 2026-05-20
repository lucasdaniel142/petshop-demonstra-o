import React, { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, Info, X, XCircle } from 'lucide-react';

type ToastType = 'info' | 'success' | 'error';

interface ToastPayload {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastItem extends ToastPayload {
  id: string;
}

const ICON_MAP: Record<ToastType, ReactNode> = {
  info: <Info size={18} className="text-sky-600 toast-icon-info" />,
  success: <CheckCircle size={18} className="text-emerald-600" />,
  error: <XCircle size={18} className="text-rose-600 toast-icon-error" />,
};

const EMOJI_MAP: Record<ToastType, string> = {
  success: '✨ ✅',
  error: '⚠️ ❌',
  info: '🔵 🔔',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleAppToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastPayload>;
      const detail = customEvent.detail;
      if (!detail || !detail.title) return;

      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

      // Reduzimos o tempo padrão de exibição de 5s para 3s para dar mais dinamismo
      const duration = detail.duration ?? 3000;
      const nextToast: ToastItem = {
        id,
        title: detail.title,
        description: detail.description,
        type: detail.type ?? 'info',
        duration,
      };

      setToasts((current) => [...current, nextToast]);

      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, duration);
    };

    window.addEventListener('app-toast', handleAppToast as EventListener);
    return () => window.removeEventListener('app-toast', handleAppToast as EventListener);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  return (
    <>
      {children}
      <style>{`
        @keyframes toast-slide-in {
          0% {
            transform: translate3d(120%, 0, 0) scale(0.9);
            opacity: 0;
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
        }
        @keyframes toast-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        @keyframes toast-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .toast-item {
          animation: toast-slide-in 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          transition: all 0.25s ease-in-out;
        }
        .toast-icon-error {
          animation: toast-shake 0.3s ease-in-out 2 alternate;
        }
        .toast-icon-info {
          animation: toast-bounce 0.4s ease-in-out 2 alternate;
        }
      `}</style>
      {createPortal(
        <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto max-w-sm rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-2xl ring-1 ring-slate-200/60 backdrop-blur-md toast-item hover:scale-[1.02]"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{ICON_MAP[toast.type ?? 'info']}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {EMOJI_MAP[toast.type ?? 'info']} {toast.title}
                  </p>
                  {toast.description ? (
                    <p className="mt-1 text-sm text-slate-600">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="text-slate-400 transition-colors hover:text-slate-700 p-1"
                  aria-label="Fechar notificação"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};
