export const collectionMethods = ['Cash', 'MobileMoney', 'Cheque', 'BankTransfer'] as const;

export function invoiceStatusLabel(status?: string | null): string {
  if (status === 'Issued') return 'Awaiting payment';
  if (status === 'PartiallyPaid') return 'Partially paid';
  return status || 'Awaiting sync';
}

export function paymentError(amount: number, balance: number, method: string): string | null {
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 1_000_000_000_000) return 'Enter a positive payment amount.';
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001) return 'Use no more than two decimal places.';
  if (!Number.isFinite(balance) || amount > balance) return 'Payment cannot exceed the current invoice balance.';
  if (!(collectionMethods as readonly string[]).includes(method)) return 'Select a collected payment method.';
  return null;
}

export function hasLegacyCollection(action: { type: string; payload: Record<string, unknown> }): boolean {
  return ['RecordDelivery', 'RecordUnplannedSale'].includes(action.type)
    && ['amtPaid', 'balance', 'paymentMethod'].some(key => action.payload[key] != null);
}

/** Only use after explicit reconciliation; never silently drop a saved collection. */
export function goodsOnly(payload: Record<string, unknown>): Record<string, unknown> {
  const { amtPaid: _paid, balance: _balance, paymentMethod: _method, ...goods } = payload;
  return goods;
}
