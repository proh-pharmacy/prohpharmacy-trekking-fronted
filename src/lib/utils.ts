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

/** Format a Ghana Card number while it is being entered. */
export function formatGhanaCardNumber(value: string | null | undefined): string {
  const normalized = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalized === 'G' || normalized === 'GH') return normalized;
  if (normalized === 'GHA') return 'GHA-';
  const digits = (normalized.startsWith('GHA') ? normalized.slice(3) : normalized)
    .replace(/\D/g, '')
    .slice(0, 10);
  if (!digits) return '';
  return `GHA-${digits.slice(0, 9)}${digits.length > 9 ? `-${digits.slice(9)}` : ''}`;
}

/** Format a Ghana phone number for display while it is being entered. */
export function formatGhanaPhoneNumber(value: string | null | undefined): string {
  const source = String(value ?? '').replace(/\D/g, '');
  if (source === '0') return '0';
  const digits = (source.startsWith('233') ? source.slice(3) : source.startsWith('0') ? source.slice(1) : source).slice(0, 9);
  if (!digits) return '';
  return `+233 ${digits.slice(0, 2)}${digits.length > 2 ? ` ${digits.slice(2, 5)}` : ''}${digits.length > 5 ? ` ${digits.slice(5)}` : ''}`;
}

/** Return a Ghana phone number in the API-friendly E.164 form. */
export function normalizeGhanaPhoneNumber(value: string | null | undefined): string {
  const source = String(value ?? '').replace(/\D/g, '');
  const digits = (source.startsWith('233') ? source.slice(3) : source.startsWith('0') ? source.slice(1) : source).slice(0, 9);
  return digits ? `+233${digits}` : '';
}

/** Convert an API/input date (YYYY-MM-DD) to a local calendar date. */
export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (![year, month, day].every(Number.isFinite)) return null;
  return new Date(year, month - 1, day);
}

/** Format a calendar date without a timezone shift for API date fields. */
export function formatDateInput(value: Date | null | undefined): string {
  if (!value || Number.isNaN(value.getTime())) return '';
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
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
