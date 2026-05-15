import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import type { FeedbackState } from '../types';

interface FeedbackBannerProps {
  feedback: FeedbackState;
  onDismiss: () => void;
}

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({ feedback, onDismiss }) => {
  if (!feedback) return null;

  const isSuccess = feedback.type === 'success';

  return (
    <div
      className={`p-4 rounded-[10px] border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
        isSuccess
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {isSuccess ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      </div>
      <div className="flex-1">
        <p className="text-[14px] font-[600]">{isSuccess ? 'Sucesso!' : 'Ocorreu um erro'}</p>
        <p className="text-[13px] opacity-90">{feedback.message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors"
        aria-label="Fechar"
      >
        <X size={16} />
      </button>
    </div>
  );
};
