// The cafe's menu: categories, items, names in both languages and prices.
// To adapt the bot for another business, this is the file to edit first.
import type { Lang } from '../i18n/index.js';

export type Currency = 'UAH' | 'EUR';

/** Ukrainian users see hryvnias, everyone else sees euros. */
export const CURRENCY: Record<Lang, Currency> = { uk: 'UAH', en: 'EUR' };

export interface Category {
  /** Used in button data: letters, digits and underscores only. */
  id: string;
  title: Record<Lang, string>;
}

export interface MenuItem {
  /** Used in button data: letters, digits and underscores only. */
  id: string;
  category: string;
  name: Record<Lang, string>;
  /** Prices in minor units (kopiyky / cents). */
  price: Record<Currency, number>;
}

export const CATEGORIES: readonly Category[] = [
  { id: 'coffee', title: { uk: '☕ Кава', en: '☕ Coffee' } },
  { id: 'breakfast', title: { uk: '🍳 Сніданки', en: '🍳 Breakfast' } },
  { id: 'desserts', title: { uk: '🍰 Десерти', en: '🍰 Desserts' } },
];

export const MENU: readonly MenuItem[] = [
  { id: 'espresso', category: 'coffee', name: { uk: 'Еспресо', en: 'Espresso' }, price: { UAH: 4500, EUR: 200 } },
  { id: 'americano', category: 'coffee', name: { uk: 'Американо', en: 'Americano' }, price: { UAH: 5500, EUR: 250 } },
  { id: 'cappuccino', category: 'coffee', name: { uk: 'Капучино', en: 'Cappuccino' }, price: { UAH: 7000, EUR: 320 } },
  { id: 'flatwhite', category: 'coffee', name: { uk: 'Флет вайт', en: 'Flat white' }, price: { UAH: 8000, EUR: 360 } },

  { id: 'syrnyky', category: 'breakfast', name: { uk: 'Сирники', en: 'Syrnyky' }, price: { UAH: 14500, EUR: 650 } },
  { id: 'shakshuka', category: 'breakfast', name: { uk: 'Шакшука', en: 'Shakshuka' }, price: { UAH: 16500, EUR: 750 } },
  {
    id: 'avotoast',
    category: 'breakfast',
    name: { uk: 'Тост з авокадо', en: 'Avocado toast' },
    price: { UAH: 17500, EUR: 790 },
  },
  {
    id: 'granola',
    category: 'breakfast',
    name: { uk: 'Гранола', en: 'Granola bowl' },
    price: { UAH: 13000, EUR: 590 },
  },

  { id: 'medovyk', category: 'desserts', name: { uk: 'Медовик', en: 'Honey cake' }, price: { UAH: 9500, EUR: 420 } },
  {
    id: 'cheesecake',
    category: 'desserts',
    name: { uk: 'Чизкейк', en: 'Cheesecake' },
    price: { UAH: 11000, EUR: 480 },
  },
  { id: 'croissant', category: 'desserts', name: { uk: 'Круасан', en: 'Croissant' }, price: { UAH: 6000, EUR: 280 } },
];
