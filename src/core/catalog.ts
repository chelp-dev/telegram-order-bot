// Lookups over the menu data, and money formatting.
import { CATEGORIES, MENU, type Category, type Currency, type MenuItem } from '../data/menu.js';

const ITEMS_BY_ID = new Map(MENU.map((item) => [item.id, item]));
const CATEGORIES_BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]));

export function findItem(id: string): MenuItem | undefined {
  return ITEMS_BY_ID.get(id);
}

export function findCategory(id: string): Category | undefined {
  return CATEGORIES_BY_ID.get(id);
}

export function itemsIn(categoryId: string): MenuItem[] {
  return MENU.filter((item) => item.category === categoryId);
}

/** 14500 UAH -> "145 ₴", 14550 UAH -> "145.50 ₴", 320 EUR -> "€3.20". */
export function formatMoney(minor: number, currency: Currency): string {
  const major = minor / 100;
  if (currency === 'EUR') return `€${major.toFixed(2)}`;
  return `${Number.isInteger(major) ? String(major) : major.toFixed(2)} ₴`;
}
