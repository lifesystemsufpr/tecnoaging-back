import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class NormalizationPipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (this.isObject(value)) {
      this.normalizeObject(value);
    }
    return value;
  }

  private normalizeObject(obj: Record<string, unknown>): void {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        if (key === 'fullName' && typeof value === 'string') {
          obj['fullName_normalized'] = this.normalizeString(value);
        }

        if (this.isObject(value)) {
          this.normalizeObject(value);
        }
      }
    }
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private normalizeString(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
