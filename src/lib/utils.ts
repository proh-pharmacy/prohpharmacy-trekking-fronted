import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default cn;

const currencyFormatters = new Map<string, Intl.NumberFormat>();

/** Format a monetary value consistently across the application. */
export function formatCurrency(amount: number | null | undefined, currency = 'GHS', locale = 'en-GH'): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  const key = `${locale}:${currency}`;
  let formatter = currencyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    currencyFormatters.set(key, formatter);
  }
  return formatter.format(value);
}

// Full comma-formatted amount for table cells: GHS 1,234,567.89
export function fmtGhs(amount: number | null | undefined): string {
  return formatCurrency(amount);
}

/** Parse a user-entered number, accepting the grouped form shown in inputs. */
export function parseNumericInput(value: string | number | null | undefined): number {
  if (value == null || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

// Abbreviated for stat tiles: 1B / 1.2M / 123.4K / 1,234.56
// Always pair with title={fmtGhs(amount)} for the full value on hover
export function fmtGhsShort(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `GHS ${(amount / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000)     return `GHS ${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000)        return `GHS ${(amount / 1_000).toFixed(1)}K`;
  return fmtGhs(amount);
}
