import { PipeTransform, Injectable } from '@nestjs/common';

// Caracteres invisíveis: controles C0/C1, zero-width, marcas direcionais e BOM.
const INVISIBLE_CHARS =
  // eslint-disable-next-line no-control-regex, sonarjs/no-control-regex
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;

// Espaços não convencionais (NBSP e variantes) convertidos em espaço comum.
const NON_STANDARD_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;

/**
 * Remove caracteres invisíveis de todos os campos string do payload e
 * apara espaços nas extremidades. Campos compostos apenas por caracteres
 * invisíveis viram string vazia e são bloqueados pelas validações
 * de obrigatoriedade (IsNotEmpty).
 *
 * Deve ser registrado ANTES do ValidationPipe para que a validação
 * ocorra sobre o valor já sanitizado.
 */
@Injectable()
export class SanitizationPipe implements PipeTransform {
  transform(value: unknown): unknown {
    return this.sanitize(value);
  }

  private sanitize(value: unknown): unknown {
    if (typeof value === 'string') {
      return value
        .replace(INVISIBLE_CHARS, '')
        .replace(NON_STANDARD_SPACES, ' ')
        .trim();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (this.isObject(value)) {
      for (const key of Object.keys(value)) {
        value[key] = this.sanitize(value[key]);
      }
    }

    return value;
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
