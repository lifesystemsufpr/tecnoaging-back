export function normalizeString(
  str: string | null | undefined,
): string | undefined {
  if (!str) return undefined;
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
