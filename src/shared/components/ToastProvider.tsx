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
  info: <Info size={18} className="text-sky-600" />,
  success: <CheckCircle size={18} className="text-emerald-600" />,
  error: <XCircle size={18} className="text-rose-600" />,
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

      const duration = detail.duration ?? 5000;
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
      {createPortal(
        <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto max-w-sm rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-2xl ring-1 ring-slate-200/60 backdrop-blur-md"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{ICON_MAP[toast.type]}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-sm text-slate-600">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="text-slate-400 transition-colors hover:text-slate-700"
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
