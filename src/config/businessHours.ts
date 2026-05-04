// src/config/businessHours.ts
// ============================================================
// Controle de horário de funcionamento da loja.
// Bloqueia checkout fora do horário configurado.
//
// Configurável via .env.local:
//   VITE_STORE_OPEN_HOUR=07:00
//   VITE_STORE_CLOSE_HOUR=22:00
//
// Se não configurado, assume 07:00–22:00 como padrão.
// ============================================================

const OPEN_HOUR = import.meta.env.VITE_STORE_OPEN_HOUR || '07:00';
const CLOSE_HOUR = import.meta.env.VITE_STORE_CLOSE_HOUR || '22:00';

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

/**
 * Retorna true se a loja está aberta no horário atual.
 * Usa o horário local do navegador do cliente.
 */
export function isStoreOpen(): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const open = parseTime(OPEN_HOUR);
  const close = parseTime(CLOSE_HOUR);

  const openMinutes = open.hours * 60 + open.minutes;
  const closeMinutes = close.hours * 60 + close.minutes;

  // Suporte para horário que cruza meia-noite (ex: 18:00-02:00)
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Retorna o horário de funcionamento formatado para exibição.
 * Ex: "07:00 às 22:00"
 */
export function getStoreHoursLabel(): string {
  return `${OPEN_HOUR} às ${CLOSE_HOUR}`;
}
