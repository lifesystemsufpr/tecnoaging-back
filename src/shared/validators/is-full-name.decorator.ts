import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Caracteres permitidos em nomes de pessoas: letras (com acentos),
 * espaços, apóstrofo, ponto e hífen.
 */
export const PERSON_NAME_PATTERN = /^[\p{L}\p{M}\s'.-]+$/u;

/**
 * Exige nome completo: pelo menos duas palavras, contendo apenas
 * caracteres válidos para nomes.
 */
export function IsFullName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFullName',
      target: object.constructor,
      propertyName,
      options: {
        message:
          'Informe o nome completo (nome e sobrenome), usando apenas letras.',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          const trimmed = value.trim();
          if (!PERSON_NAME_PATTERN.test(trimmed)) return false;
          const words = trimmed
            .split(/\s+/)
            .filter((word) => /\p{L}/u.test(word));
          return words.length >= 2;
        },
      },
    });
  };
}
