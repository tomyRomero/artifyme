import { describe, expect, it } from '@jest/globals';
import { artworkWords, newPassword, personName } from '@/lib/validation';

describe('newPassword', () => {
  it('accepts 12 to 128 characters of any kind, as the API does', () => {
    expect(newPassword.isValidSync('a'.repeat(12))).toBe(true);
    expect(newPassword.isValidSync('correct horse battery staple')).toBe(true);
    expect(newPassword.isValidSync('x'.repeat(128))).toBe(true);
  });

  it('refuses shorter, longer and missing passwords', () => {
    expect(newPassword.isValidSync('a'.repeat(11))).toBe(false);
    expect(newPassword.isValidSync('x'.repeat(129))).toBe(false);
    expect(newPassword.isValidSync('')).toBe(false);
  });
});

describe('personName', () => {
  const firstName = personName('First name');

  it('checks the name without surrounding spaces', () => {
    expect(firstName.isValidSync(' Ada ')).toBe(true);
    expect(firstName.isValidSync('   ')).toBe(false);
    expect(firstName.isValidSync(` ${'a'.repeat(50)} `)).toBe(true);
    expect(firstName.isValidSync('a'.repeat(51))).toBe(false);
  });
});

describe('artwork words', () => {
  const valid = (description: string, title = 'Couch') => artworkWords.isValidSync({ description, title });

  it('checks the words without surrounding spaces, as the API saves them', () => {
    expect(valid(' a red couch ', '  Couch  ')).toBe(true);
    expect(valid(' ab ')).toBe(false);
    expect(valid('     ')).toBe(false);
  });

  it('needs a title', () => {
    expect(valid('a red couch', '   ')).toBe(false);
    expect(valid('a red couch', 'Couch')).toBe(true);
  });

  it('keeps descriptions to 3 to 500 characters and titles to 60', () => {
    expect(valid('cat', 't'.repeat(60))).toBe(true);
    expect(valid('d'.repeat(500))).toBe(true);
    expect(valid('d'.repeat(501))).toBe(false);
    expect(valid('a red couch', 't'.repeat(61))).toBe(false);
  });
});
