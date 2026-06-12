import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidCpf } from '../functions/cpf';

/**
 * Valida CPF pelo algoritmo oficial (dígitos verificadores),
 * rejeitando sequências repetidas. Aceita valor com ou sem máscara.
 */
export function IsCpf(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCpf',
      target: object.constructor,
      propertyName,
      options: {
        message: 'O CPF informado é inválido.',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && isValidCpf(value);
        },
      },
    });
  };
}
