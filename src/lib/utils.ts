import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default cn;

// Full comma-formatted amount for table cells: GHS 1,234,567.89
export function fmtGhs(amount: number): string {
  return `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
