import { describe, expect, it } from 'vitest';
import { MAX_QTY_PER_ITEM, cartCount, cartLines, cartTotal, changeQty, type Cart } from '../src/core/cart.js';
import { formatMoney } from '../src/core/catalog.js';

describe('cart', () => {
  it('adds and removes items without mutating the original cart', () => {
    const empty: Cart = {};
    const one = changeQty(empty, 'cappuccino', 1);
    const two = changeQty(one, 'cappuccino', 1);
    expect(empty).toEqual({});
    expect(one).toEqual({ cappuccino: 1 });
    expect(two).toEqual({ cappuccino: 2 });
    expect(changeQty(changeQty(two, 'cappuccino', -1), 'cappuccino', -1)).toEqual({});
  });

  it('never goes below zero or above the per-item maximum', () => {
    expect(changeQty({}, 'espresso', -1)).toEqual({});
    let cart: Cart = {};
    for (let i = 0; i < MAX_QTY_PER_ITEM + 5; i++) cart = changeQty(cart, 'espresso', 1);
    expect(cart.espresso).toBe(MAX_QTY_PER_ITEM);
  });

  it('ignores unknown items', () => {
    expect(changeQty({}, 'caviar', 1)).toEqual({});
  });

  it('totals in the right currency', () => {
    const cart: Cart = { cappuccino: 2, syrnyky: 1 };
    expect(cartTotal(cart, 'UAH')).toBe(2 * 7000 + 14500);
    expect(cartTotal(cart, 'EUR')).toBe(2 * 320 + 650);
    expect(cartCount(cart)).toBe(3);
    expect(cartTotal({}, 'EUR')).toBe(0);
  });

  it('lists lines in menu order with line sums', () => {
    const lines = cartLines({ medovyk: 1, espresso: 3 }, 'EUR');
    expect(lines.map((line) => [line.item.id, line.qty, line.sum])).toEqual([
      ['espresso', 3, 600],
      ['medovyk', 1, 420],
    ]);
  });

  it('formats money per currency', () => {
    expect(formatMoney(14500, 'UAH')).toBe('145 ₴');
    expect(formatMoney(14550, 'UAH')).toBe('145.50 ₴');
    expect(formatMoney(320, 'EUR')).toBe('€3.20');
  });
});
