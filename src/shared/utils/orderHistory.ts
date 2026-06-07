import type { LocalOrderHistoryEntry } from '../types';

const STORAGE_KEY = 'order-history';
const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function isValidEntry(value: unknown): value is LocalOrderHistoryEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any).orderId === 'string' &&
    typeof (value as any).phone === 'string' &&
    typeof (value as any).createdAt === 'number' &&
    (value as any).createdAt > 0
  );
}

function parseStoredHistory(): LocalOrderHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isValidEntry)
      .map((entry) => ({
        orderId: entry.orderId,
        phone: normalizePhone(entry.phone),
        storeId: entry.storeId,
        createdAt: entry.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

function saveHistory(entries: LocalOrderHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

export function cleanOrderHistory(entries?: LocalOrderHistoryEntry[]): LocalOrderHistoryEntry[] {
  const now = Date.now();
  const list = entries ?? parseStoredHistory();
  return list
    .filter((entry) => now - entry.createdAt <= HISTORY_TTL_MS)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getOrderHistory(): LocalOrderHistoryEntry[] {
  const clean = cleanOrderHistory();
  saveHistory(clean);
  return clean;
}

export function addOrderHistoryEntry(entry: LocalOrderHistoryEntry): LocalOrderHistoryEntry[] {
  const clean = cleanOrderHistory();
  const normalized = {
    ...entry,
    phone: normalizePhone(entry.phone),
    createdAt: entry.createdAt || Date.now(),
  };

  const existing = clean.filter((item) => item.orderId !== normalized.orderId);
  const next = [normalized, ...existing].sort((a, b) => b.createdAt - a.createdAt);
  saveHistory(next);
  return next;
}
