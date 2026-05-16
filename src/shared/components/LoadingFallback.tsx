import React from 'react';

/**
 * LoadingFallback Component
 * 
 * A premium loading screen used as fallback for React.Suspense during 
 * code-splitting (Lazy Loading).
 */
export const LoadingFallback: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        {/* Animated Shopping Basket/Logo Placeholder */}
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-primary font-black text-xl">SF</span>
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-primary mb-2">Carregando...</h2>
        <p className="text-muted text-sm font-medium animate-pulse">
          Preparando sua experiência premium
        </p>
        
        {/* Progress bar simulation */}
        <div className="w-48 h-1 bg-gray-100 rounded-full mt-6 overflow-hidden">
          <div className="h-full bg-primary animate-progress-indeterminate" />
        </div>
      </div>
      
      <style>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 1.5s infinite linear;
          width: 50%;
        }
      `}</style>
    </div>
  );
};
