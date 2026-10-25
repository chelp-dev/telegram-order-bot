import { describe, expect, it } from 'vitest';
import { dict, pickLang } from '../src/i18n/index.js';
import { CATEGORIES, MENU } from '../src/data/menu.js';

describe('i18n', () => {
  it('uk and en have exactly the same keys', () => {
    expect(Object.keys(dict.en).sort()).toEqual(Object.keys(dict.uk).sort());
  });

  it('every key has the same kind of value (and functions take the same arguments)', () => {
    for (const key of Object.keys(dict.uk) as (keyof typeof dict.uk)[]) {
      const ukValue = dict.uk[key];
      const enValue = dict.en[key];
      expect(typeof enValue, key).toBe(typeof ukValue);
      if (typeof ukValue === 'function' && typeof enValue === 'function')
        expect(enValue.length, key).toBe(ukValue.length);
      if (typeof ukValue === 'string') expect(ukValue.trim(), key).not.toBe('');
    }
  });

  it('menu data is named in both languages', () => {
    for (const entry of [...MENU, ...CATEGORIES]) {
      const names = 'name' in entry ? entry.name : entry.title;
      expect(names.uk.trim(), entry.id).not.toBe('');
      expect(names.en.trim(), entry.id).not.toBe('');
    }
  });

  it('picks Ukrainian for uk/ru clients and English for everyone else', () => {
    expect(pickLang('uk')).toBe('uk');
    expect(pickLang('ru')).toBe('uk');
    expect(pickLang('ru-RU')).toBe('uk');
    expect(pickLang('en')).toBe('en');
    expect(pickLang('es')).toBe('en');
    expect(pickLang(undefined)).toBe('en');
  });
});
