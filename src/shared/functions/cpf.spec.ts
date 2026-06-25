import { cleanCpf, isValidCpf } from './cpf';

describe('cleanCpf', () => {
  it('removes mask characters', () => {
    expect(cleanCpf('529.982.247-25')).toBe('52998224725');
  });

  it('keeps unmasked values unchanged', () => {
    expect(cleanCpf('52998224725')).toBe('52998224725');
  });

  it('returns empty string for null/undefined', () => {
    expect(cleanCpf(null)).toBe('');
    expect(cleanCpf(undefined)).toBe('');
  });
});

describe('isValidCpf', () => {
  it('accepts a valid CPF without mask', () => {
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('accepts a valid CPF with mask', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
  });

  it('rejects repeated sequences', () => {
    for (let d = 0; d <= 9; d++) {
      expect(isValidCpf(String(d).repeat(11))).toBe(false);
    }
  });

  it('rejects CPFs with wrong check digits', () => {
    expect(isValidCpf('52998224724')).toBe(false);
    expect(isValidCpf('12345678901')).toBe(false);
  });

  it('rejects values with wrong length', () => {
    expect(isValidCpf('5299822472')).toBe(false);
    expect(isValidCpf('529982247255')).toBe(false);
    expect(isValidCpf('')).toBe(false);
  });
});
