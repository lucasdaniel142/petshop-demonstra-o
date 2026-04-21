// src/components/ui/FeedbackBanner.tsx
// Banner de feedback reutilizável para operações de sucesso/erro.
// Substitui o padrão duplicado em TeamManager, PriceManager, ProductManager.

import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import type { FeedbackState } from '../../types';

interface FeedbackBannerProps {
  feedback: FeedbackState;
  /** Callback opcional para fechar/limpar o banner */
  onDismiss?: () => void;
}

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({ feedback, onDismiss }) => {
  if (!feedback) return null;

  const isSuccess = feedback.type === 'success';

  return (
    <div
      role="alert"
      className={`p-4 rounded-[8px] flex items-center gap-3 border ${
        isSuccess
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-red-50 border-red-200 text-red-700'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={20} className="shrink-0" />
      ) : (
        <AlertCircle size={20} className="shrink-0" />
      )}
      <span className="text-[14px] font-medium flex-1">{feedback.message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-current opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded"
          aria-label="Fechar mensagem"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
