const OPEN_HOUR = import.meta.env.VITE_STORE_OPEN_HOUR || '07:00';
const CLOSE_HOUR = import.meta.env.VITE_STORE_CLOSE_HOUR || '22:00';

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

export function isStoreOpen(): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const open = parseTime(OPEN_HOUR);
  const close = parseTime(CLOSE_HOUR);

  const openMinutes = open.hours * 60 + open.minutes;
  const closeMinutes = close.hours * 60 + close.minutes;

  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

export function getStoreHoursLabel(): string {
  return `${OPEN_HOUR} às ${CLOSE_HOUR}`;
}
