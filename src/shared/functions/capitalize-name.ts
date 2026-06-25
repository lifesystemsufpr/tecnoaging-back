/**
 * Conectivos comuns em nomes próprios brasileiros que, por convenção,
 * permanecem em minúsculo quando não são a primeira palavra do nome.
 */
const LOWERCASE_CONNECTIVES = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);

/**
 * Padroniza um nome próprio com a primeira letra de cada palavra em maiúscula,
 * mantendo conectivos (da, de, do, dos, das, e) em minúsculo quando não são a
 * primeira palavra. Preserva separadores como espaços, hífens e apóstrofos.
 *
 * Ex.: "MARIA DA SILVA" -> "Maria da Silva"
 *      "joão pedro d'ávila" -> "João Pedro D'Ávila"
 */
export function capitalizeName(
  name: string | null | undefined,
): string | undefined {
  if (name === null || name === undefined) return undefined;

  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;

  const words = trimmed.split(' ');

  return words
    .map((word, index) => {
      const lower = word.toLocaleLowerCase('pt-BR');

      if (index > 0 && LOWERCASE_CONNECTIVES.has(lower)) {
        return lower;
      }

      // Capitaliza a primeira letra de cada segmento separado por hífen ou apóstrofo,
      // preservando o separador (ex.: "d'ávila" -> "D'Ávila", "maria-clara" -> "Maria-Clara").
      return lower.replace(
        /(^|[-'])(\p{L})/gu,
        (_, sep: string, letter: string) => {
          return sep + letter.toLocaleUpperCase('pt-BR');
        },
      );
    })
    .join(' ');
}
