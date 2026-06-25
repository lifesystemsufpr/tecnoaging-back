import { capitalizeName } from './capitalize-name';

describe('capitalizeName', () => {
  it('capitalizes the first letter of each name', () => {
    expect(capitalizeName('maria silva')).toBe('Maria Silva');
  });

  it('normalizes fully uppercase input', () => {
    expect(capitalizeName('MARIA DA SILVA')).toBe('Maria da Silva');
  });

  it('keeps Portuguese connectives lowercase except as first word', () => {
    expect(capitalizeName('joão de souza dos santos')).toBe(
      'João de Souza dos Santos',
    );
    expect(capitalizeName('da silva')).toBe('Da Silva');
  });

  it('handles hyphens and apostrophes', () => {
    expect(capitalizeName("maria-clara d'ávila")).toBe("Maria-Clara D'Ávila");
  });

  it('collapses extra whitespace and trims', () => {
    expect(capitalizeName('  maria   silva  ')).toBe('Maria Silva');
  });

  it('returns undefined for null/undefined', () => {
    expect(capitalizeName(null)).toBeUndefined();
    expect(capitalizeName(undefined)).toBeUndefined();
  });
});
