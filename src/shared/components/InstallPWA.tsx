import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

const DISMISS_KEY = 'pwa-install-dismissed';
const VISITS_KEY = 'pwa-visit-count';

export const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIosGuide, setIsIosGuide] = useState(false);

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

    if (isInStandaloneMode) {
      setIsVisible(false);
      return;
    }

    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;

      const visits = Number(localStorage.getItem(VISITS_KEY) || '0') + 1;
      localStorage.setItem(VISITS_KEY, String(visits));
      if (visits < 2) return;
    } catch {
      /* modo privado / storage indisponível */
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIos) {
      iosTimer = setTimeout(() => {
        setIsIosGuide(true);
        setIsVisible(true);
      }, 8000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIosGuide) return;
    const promptEvent = deferredPrompt as unknown as {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    } | null;
    if (!promptEvent?.prompt) return;

    promptEvent.prompt();
    await promptEvent.userChoice;
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
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
                {isIosGuide ? 'Instalar no iPhone' : 'Instalar aplicativo'}
              </h3>
              <p className="text-[11px] opacity-90">
                {isIosGuide
                  ? 'Acesse a loja como um app na tela inicial.'
                  : 'Abra a loja mais rápido pelo ícone na tela inicial.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 min-w-11 min-h-11 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Dispensar instalação do app"
          >
            <X size={18} />
          </button>
        </div>

        {isIosGuide ? (
          <div className="bg-white/10 rounded-xl p-3 space-y-2 border border-white/10">
            <p className="text-[11px] font-medium flex items-center gap-2">
              <span className="bg-white text-primary w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
              Toque em <span className="font-bold flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded">Compartilhar <Share size={12} /></span>.
            </p>
            <p className="text-[11px] font-medium flex items-center gap-2">
              <span className="bg-white text-primary w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
              Escolha <span className="font-bold flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded">Adicionar à Tela de Início <PlusSquare size={12} /></span>.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full min-h-11 bg-white text-primary py-2.5 rounded-xl font-[800] text-[13px] hover:bg-gray-100 shadow-sm"
          >
            Instalar agora
          </button>
        )}
      </div>
    </div>
  );
};
