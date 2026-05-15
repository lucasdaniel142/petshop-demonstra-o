import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

export const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIosGuide, setIsIosGuide] = useState(false);

  useEffect(() => {
    // 1. Detecção de iOS (UX-01)
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

    // 2. Handler para Android/Chrome
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 3. Lógica para mostrar o guia no iOS
    if (isIos && !isInStandaloneMode) {
      // Pequeno delay para não assustar o usuário logo no carregamento
      const timer = setTimeout(() => setIsVisible(true), 3000);
      setIsIosGuide(true);
      return () => clearTimeout(timer);
    }

    // Verifica se já está instalado (Geral)
    if (isInStandaloneMode) {
      setIsVisible(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (isIosGuide) {
      // No iOS apenas mostramos as instruções, não há prompt programático
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    // UX-06: Remover console.log em produção
    if (import.meta.env.DEV) {
      console.log(`Usuário escolheu: ${outcome}`);
    }

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-primary text-white p-4 rounded-2xl shadow-2xl flex flex-col gap-4 border border-white/20 backdrop-blur-md bg-primary/95">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Download size={24} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-[14px]">
                {isIosGuide ? 'Instalar no iPhone' : 'Instalar Aplicativo'}
              </h3>
              <p className="text-[11px] opacity-90">
                {isIosGuide 
                  ? 'Acesse a loja como um aplicativo nativo.' 
                  : 'Acesse a loja mais rápido direto da sua tela inicial!'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {isIosGuide ? (
          <div className="bg-white/10 rounded-xl p-3 space-y-2 border border-white/10">
            <p className="text-[11px] font-medium flex items-center gap-2">
              <span className="bg-white text-primary w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
              Clique no botão de <span className="font-bold flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded">Compartilhar <Share size={12} /></span> abaixo.
            </p>
            <p className="text-[11px] font-medium flex items-center gap-2">
              <span className="bg-white text-primary w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
              Role para baixo e clique em <span className="font-bold flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded">Adicionar à Tela de Início <PlusSquare size={12} /></span>.
            </p>
          </div>
        ) : (
          <button
            onClick={handleInstallClick}
            className="w-full bg-white text-primary py-2.5 rounded-xl font-[800] text-[13px] hover:bg-gray-100 transition-colors shadow-sm"
          >
            INSTALAR AGORA
          </button>
        )}
      </div>
    </div>
  );
};
