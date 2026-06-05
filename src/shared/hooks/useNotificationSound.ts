// =============================================================================
// useNotificationSound.ts — Hook para reproduzir som de notificação
// =============================================================================
// [BP-02 FIX] Move o contexto de áudio global para dentro de um hook,
// evitando compartilhamento indesejado entre instâncias de componentes

import { useRef, useCallback } from 'react';

/**
 * Hook para reproduzir um beep de notificação usando Web Audio API.
 * 
 * @returns Objeto com função playBeep para reproduzir o som
 * 
 * @example
 * const { playBeep } = useNotificationSound();
 * 
 * // Reproduz o som quando um novo pedido chega
 * useEffect(() => {
 *   if (newOrderDetected) {
 *     playBeep();
 *   }
 * }, [newOrderDetected]);
 */
export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };
    
    // Tenta inicializar em qualquer interação do usuário com a página
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
  }, []);

  const playBeep = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {
          console.warn('[useNotificationSound] Áudio bloqueado pelo navegador. O usuário precisa interagir com a página.');
        });
      }

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      gain.gain.setValueAtTime(0.5, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.error('[useNotificationSound] Erro ao reproduzir som:', err);
    }
  }, []);

  return { playBeep };
}
