import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Caracteres permitidos em campos textuais gerais: letras (com acentos),
 * números, espaços e pontuação comum.
 */
export const SAFE_TEXT_PATTERN = /^[\p{L}\p{M}\p{N}\s'".,:;()/&ºª°-]+$/u;

/**
 * Bloqueia caracteres especiais inválidos em campos textuais.
 */
export function IsSafeText(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSafeText',
      target: object.constructor,
      propertyName,
      options: {
        message: ({ property }) =>
          `O campo ${property} contém caracteres inválidos. Use apenas letras, números, espaços e pontuação comum.`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && SAFE_TEXT_PATTERN.test(value);
        },
      },
    });
  };
}
