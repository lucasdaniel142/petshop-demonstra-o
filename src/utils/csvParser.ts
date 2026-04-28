// src/utils/csvParser.ts
// ============================================================
// Parser de CSV para importação em massa de produtos.
// Suporta UTF-8 (acentos em português), valida campos
// obrigatórios e retorna dados prontos para o Firestore.
// ============================================================

import { DEFAULT_STORE_PRICE } from '../types';
import { STORE_IDS } from './constants';

/** Tamanho máximo do CSV aceito (5MB) — previne upload de arquivos gigantes */
export const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Remove tags HTML de uma string para prevenir Stored XSS.
 */
function sanitizeString(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

export interface ParsedProduct {
  nome: string;
  categoria: string;
  unit: 'un' | 'kg';
  preco: number;
  imagemUrl: string;
  imagemNomeArquivo: string;
}

export interface ParsedRow {
  line: number;
  product: ParsedProduct | null;
  error: string | null;
}

export interface ParseResult {
  rows: ParsedRow[];
  validCount: number;
  errorCount: number;
  categories: string[];
}

/**
 * Parseia o conteúdo de um arquivo CSV e retorna produtos validados.
 *
 * Formato esperado (com cabeçalho):
 *   nome,categoria,unidade,preco,imagem
 */
export function parseCSV(content: string): ParseResult {
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { rows: [{ line: 1, product: null, error: 'Arquivo vazio ou sem dados.' }], validCount: 0, errorCount: 1, categories: [] };
  }

  const dataLines = lines.slice(1);
  const rows: ParsedRow[] = [];
  const categoriesSet = new Set<string>();
  let validCount = 0;
  let errorCount = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const lineNumber = i + 2;
    const raw = dataLines[i];
    const fields = parseCSVLine(raw);

    if (fields.length < 2) {
      rows.push({ line: lineNumber, product: null, error: 'Linha com poucos campos. Esperado: nome, categoria, unidade, preco, imagem' });
      errorCount++;
      continue;
    }

    const nome = sanitizeString(fields[0] ?? '');
    const categoria = sanitizeString(fields[1] ?? '');
    const unitRaw = (fields[2]?.trim() ?? 'un').toLowerCase();
    const precoRaw = fields[3]?.trim() ?? '0';
    const imagemRaw = fields[4]?.trim() ?? '';

    if (!nome) {
      rows.push({ line: lineNumber, product: null, error: 'Nome do produto é obrigatório.' });
      errorCount++;
      continue;
    }

    if (!categoria) {
      rows.push({ line: lineNumber, product: null, error: 'Categoria é obrigatória.' });
      errorCount++;
      continue;
    }

    const unit: 'un' | 'kg' = unitRaw === 'kg' ? 'kg' : 'un';
    const preco = parseFloat(precoRaw.replace(',', '.'));

    if (isNaN(preco) || preco < 0) {
      rows.push({ line: lineNumber, product: null, error: `Preço inválido: "${precoRaw}". Use número positivo.` });
      errorCount++;
      continue;
    }

    const isUrl = imagemRaw.startsWith('http://') || imagemRaw.startsWith('https://');
    const imagemUrl = isUrl ? imagemRaw : '';
    const imagemNomeArquivo = !isUrl ? imagemRaw : '';

    categoriesSet.add(categoria);
    rows.push({
      line: lineNumber,
      product: { nome, categoria, unit, preco, imagemUrl, imagemNomeArquivo },
      error: null,
    });
    validCount++;
  }

  return { rows, validCount, errorCount, categories: Array.from(categoriesSet) };
}

/**
 * Converte um ParsedProduct em objeto pronto para o Firestore.
 */
export function toFirestorePayload(
  product: ParsedProduct,
  imageUrl: string = ''
) {
  const precos: Record<string, typeof DEFAULT_STORE_PRICE> = {};
  for (const storeId of STORE_IDS) {
    precos[storeId] = {
      ...DEFAULT_STORE_PRICE,
      valor: product.preco,
    };
  }

  return {
    nome: product.nome,
    descricao: '',
    imageUrl: imageUrl || product.imagemUrl || '',
    categoria: product.categoria,
    unit: product.unit,
    precos,
  };
}

/**
 * Normaliza um nome para comparação (remove acentos, lowercase, remove extensão).
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Helpers internos ──

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}
