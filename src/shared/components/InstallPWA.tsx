import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

const DISMISS_KEY = 'pwa-install-dismissed';
const IGNORE_KEY = 'pwa-install-ignored-at';
const IGNORE_DURATION_MS = 24 * 60 * 60 * 1000;

export const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIosGuide, setIsIosGuide] = useState(false);

  const isPromptIgnored = () => {
    try {
      const stored = Number(localStorage.getItem(IGNORE_KEY) || '0');
      return stored > 0 && Date.now() - stored < IGNORE_DURATION_MS;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

    if (isInStandaloneMode || isPromptIgnored()) {
      setIsVisible(false);
      return;
    }

    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;

      const visits = Number(localStorage.getItem('pwa-visit-count') || '0') + 1;
      localStorage.setItem('pwa-visit-count', String(visits));
      if (visits < 1) return;
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

  const handleIgnore = () => {
    try {
      localStorage.setItem(IGNORE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      <style>{`
        @keyframes pwa-slide-in {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .pwa-toast-animate {
          animation: pwa-slide-in 0.5s ease-out forwards;
        }
      `}</style>
      <div
        className="fixed bottom-20 left-4 right-4 pwa-toast-animate"
        style={{ zIndex: 9999 }}
      >
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
              onClick={handleIgnore}
              className="p-2 min-w-11 min-h-11 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Ignorar instalação do app"
            >
              <X size={18} />
            </button>
          </div>

          <div className="rounded-2xl bg-white/10 p-4 border border-white/15">
            <p className="text-[13px] font-[600]">Quer abrir a loja direto como um app?</p>
            <p className="text-[12px] opacity-90 mt-1">Receba o atalho na tela inicial e acesse sua loja sem esperar o carregamento.</p>
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
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full min-h-11 bg-white text-primary py-2.5 rounded-xl font-[800] text-[13px] hover:bg-gray-100 shadow-sm"
              >
                Instalar agora
              </button>
              <button
                type="button"
                onClick={handleIgnore}
                className="w-full min-h-11 bg-white/10 text-white py-2.5 rounded-xl font-[800] text-[13px] hover:bg-white/20 border border-white/20 shadow-sm"
              >
                Ignorar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

