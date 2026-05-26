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

  const playBeep = useCallback(() => {
    try {
      // Inicializa o AudioContext na primeira chamada
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      // Resume se estiver suspenso (política do Chrome)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Cria oscilador e ganho
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      // Configura o som: frequência 880Hz (A5), volume 0.3
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      // Reproduz por 0.5 segundos
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.error('[useNotificationSound] Erro ao reproduzir som:', err);
    }
  }, []);

  return { playBeep };
}
