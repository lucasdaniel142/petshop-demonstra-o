// src/config/businessHours.ts
// ============================================================
// Controle de horário de funcionamento da loja.
// Bloqueia checkout fora do horário configurado.
//
// Bichos PetShop:
//   Segunda a Sexta: 08:00 às 18:00
//   Sábados: 08:00 às 17:30
//   Domingos: 08:00 às 11:00
// ============================================================

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

/**
 * Retorna o horário de funcionamento para um dia específico.
 */
function getHoursForDay(dayOfWeek: number): { open: string; close: string } {
  // dayOfWeek: 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  if (dayOfWeek === 0) {
    // Domingo: 08:00 às 11:00
    return { open: '08:00', close: '11:00' };
  } else if (dayOfWeek === 6) {
    // Sábado: 08:00 às 17:30
    return { open: '08:00', close: '17:30' };
  } else {
    // Segunda a Sexta: 08:00 às 18:00
    return { open: '08:00', close: '18:00' };
  }
}

/**
 * Retorna true se a loja está aberta no horário atual.
 * Usa o horário local do navegador do cliente.
 */
export function isStoreOpen(): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const { open, close } = getHoursForDay(dayOfWeek);
  const openTime = parseTime(open);
  const closeTime = parseTime(close);

  const openMinutes = openTime.hours * 60 + openTime.minutes;
  const closeMinutes = closeTime.hours * 60 + closeTime.minutes;

  // Suporte para horário que cruza meia-noite (ex: 18:00-02:00)
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Retorna o horário de funcionamento formatado para exibição.
 * Ex: "Seg-Sex: 08:00 às 18:00 | Sáb: 08:00 às 17:30 | Dom: 08:00 às 11:00"
 */
export function getStoreHoursLabel(): string {
  return 'Seg-Sex: 08:00 às 18:00 | Sáb: 08:00 às 17:30 | Dom: 08:00 às 11:00';
}
