import { en } from './en.js';
import { uk, type Dict } from './uk.js';

export type Lang = 'uk' | 'en';
export type { Dict };

export const dict: Record<Lang, Dict> = { uk, en };

/** Ukrainian for uk/ru Telegram clients, English for everyone else. */
export function pickLang(languageCode: string | undefined): Lang {
  const base = languageCode?.toLowerCase().split('-')[0];
  return base === 'uk' || base === 'ru' ? 'uk' : 'en';
}

export function otherLang(lang: Lang): Lang {
  return lang === 'uk' ? 'en' : 'uk';
}
