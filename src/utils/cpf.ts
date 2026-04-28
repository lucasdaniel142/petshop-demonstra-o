// src/utils/cpf.ts
// ============================================================
// Validação e formatação de CPF.
// Implementa o algoritmo oficial da Receita Federal (módulo 11).
// O CPF NUNCA é armazenado no Firestore — é enviado apenas para
// o Mercado Pago via API serverless (backend) para processar Pix.
// ============================================================

/**
 * Remove caracteres não-numéricos do CPF.
 */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Formata o CPF enquanto o usuário digita: 000.000.000-00
 */
export function formatCPF(value: string): string {
  const digits = cleanCPF(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Valida CPF usando o algoritmo oficial (módulo 11).
 * Retorna true se o CPF é válido, false caso contrário.
 */
export function isValidCPF(cpf: string): boolean {
  const digits = cleanCPF(cpf);

  // Deve ter exatamente 11 dígitos
  if (digits.length !== 11) return false;

  // Rejeitar CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Validar primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;

  // Validar segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[10])) return false;

  return true;
}
