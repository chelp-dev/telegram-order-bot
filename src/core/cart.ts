import { MENU, findItem, type Currency, type MenuItem } from '../menu.js';

/** Item id -> quantity. Treated as immutable: every change returns a new cart. */
export type Cart = Readonly<Record<string, number>>;

export const MAX_QTY_PER_ITEM = 10;

export interface CartLine {
  item: MenuItem;
  qty: number;
  /** Line total in minor units. */
  sum: number;
}

/** Adds `delta` to an item's quantity, clamped to 0..MAX_QTY_PER_ITEM. Unknown items are ignored. */
export function changeQty(cart: Cart, itemId: string, delta: number): Cart {
  if (!findItem(itemId)) return cart;
  const qty = Math.min(MAX_QTY_PER_ITEM, Math.max(0, (cart[itemId] ?? 0) + delta));
  const next = { ...cart, [itemId]: qty };
  return Object.fromEntries(Object.entries(next).filter(([, n]) => n > 0));
}

/** Cart lines in menu order, so the cart always reads the same way as the menu. */
export function cartLines(cart: Cart, currency: Currency): CartLine[] {
  return MENU.flatMap((item) => {
    const qty = cart[item.id] ?? 0;
    return qty > 0 ? [{ item, qty, sum: item.price[currency] * qty }] : [];
  });
}

export function cartTotal(cart: Cart, currency: Currency): number {
  return cartLines(cart, currency).reduce((total, line) => total + line.sum, 0);
}

export function cartCount(cart: Cart): number {
  return Object.values(cart).reduce((count, qty) => count + qty, 0);
}
