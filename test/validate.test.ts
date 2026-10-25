import { describe, expect, it } from 'vitest';
import { cleanText, escapeHtml, normalizePhone } from '../src/core/validate.js';

describe('normalizePhone', () => {
  it('accepts common formats and returns +digits', () => {
    expect(normalizePhone('+380 (67) 123-45-67')).toBe('+380671234567');
    expect(normalizePhone('380671234567')).toBe('+380671234567');
    expect(normalizePhone(' +44 7700 900123 ')).toBe('+447700900123');
  });

  it('rejects words, too few digits and too many digits', () => {
    expect(normalizePhone('call me maybe')).toBeUndefined();
    expect(normalizePhone('123')).toBeUndefined();
    expect(normalizePhone('1234567890123456')).toBeUndefined();
    expect(normalizePhone('+38 067 <b>')).toBeUndefined();
  });
});

describe('cleanText', () => {
  it('collapses whitespace and enforces the length limit', () => {
    expect(cleanText('  Alex \n  K ', 10)).toBe('Alex K');
    expect(cleanText('   ', 10)).toBeUndefined();
    expect(cleanText('x'.repeat(10), 10)).toBe('x'.repeat(10));
    expect(cleanText('x'.repeat(11), 10)).toBeUndefined();
  });
});

describe('escapeHtml', () => {
  it('escapes everything Telegram HTML treats as markup', () => {
    expect(escapeHtml('<b>"Tom" & Jerry</b>')).toBe('&lt;b&gt;&quot;Tom&quot; &amp; Jerry&lt;/b&gt;');
  });
});
