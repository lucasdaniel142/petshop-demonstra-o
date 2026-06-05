// =============================================================================
// useNotificationSound.ts — Hook para reproduzir som de notificação
// =============================================================================
// [BP-02 FIX] Move o contexto de áudio global para dentro de um hook,
// evitando compartilhamento indesejado entre instâncias de componentes

import { useRef, useCallback, useEffect } from 'react';

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

  const playBeep = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
        } catch (e) {
          console.warn('[useNotificationSound] Áudio bloqueado. O usuário precisa interagir com a página antes do primeiro bipe.');
          return;
        }
      }

      // Bipe 1 (Mais alto)
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.type = 'square'; // Onda quadrada é muito mais perceptível
      osc1.frequency.setValueAtTime(600, audioContext.currentTime);
      gain1.gain.setValueAtTime(0, audioContext.currentTime);
      gain1.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
      gain1.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
      osc1.start(audioContext.currentTime);
      osc1.stop(audioContext.currentTime + 0.25);

      // Bipe 2 (Mais agudo)
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(800, audioContext.currentTime + 0.3);
      gain2.gain.setValueAtTime(0, audioContext.currentTime + 0.3);
      gain2.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.35);
      gain2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
      osc2.start(audioContext.currentTime + 0.3);
      osc2.stop(audioContext.currentTime + 0.55);

      console.log('[useNotificationSound] Bipe duplo reproduzido com sucesso!');
    } catch (err) {
      console.error('[useNotificationSound] Erro ao reproduzir som:', err);
    }
  }, []);

  return { playBeep };
}
