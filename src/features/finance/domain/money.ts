const MAX_AMOUNT = 999999999.99;

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function isValidAmount(amount: unknown): amount is number {
  return (
    typeof amount === 'number' &&
    Number.isFinite(amount) &&
    amount > 0 &&
    amount <= MAX_AMOUNT &&
    Math.abs(amount * 100 - toCents(amount)) < 0.0001
  );
}

/** Reject partial parses (e.g. "1.2.3"), nonfinite values and fractions of a cent. */
export function parseAmount(input: string): number | null {
  const value = input.trim();
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(value)) return null;
  const amount = Number(value);
  return isValidAmount(amount) ? toCents(amount) / 100 : null;
}

export function formatMoney(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
