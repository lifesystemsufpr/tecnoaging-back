/**
 * Remove tudo que não for dígito (ex.: máscara "123.456.789-01" → "12345678901").
 */
export function cleanCpf(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

/**
 * Validação oficial de CPF: 11 dígitos, dígitos verificadores corretos
 * e bloqueio de sequências repetidas (ex.: 11111111111).
 */
export function isValidCpf(value: string | null | undefined): boolean {
  const cpf = cleanCpf(value);

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split('').map(Number);

  for (const position of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < position; i++) {
      sum += digits[i] * (position + 1 - i);
    }
    const expected = ((sum * 10) % 11) % 10;
    if (digits[position] !== expected) return false;
  }

  return true;
}
