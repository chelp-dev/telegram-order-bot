export const TEXT_LIMITS = { name: 60, address: 200, comment: 200 } as const;

/** Collapses whitespace; returns undefined for empty or over-long input. */
export function cleanText(input: string, maxLength: number): string | undefined {
  const text = input.replace(/\s+/g, ' ').trim();
  return text.length > 0 && text.length <= maxLength ? text : undefined;
}

/** Accepts "+380 67 123-45-67" style input; returns "+380671234567", or undefined if it is not a phone number. */
export function normalizePhone(input: string): string | undefined {
  const text = input.trim();
  if (!/^\+?[\d\s\-()]{7,24}$/.test(text)) return undefined;
  const digits = text.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return undefined;
  return `+${digits}`;
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
