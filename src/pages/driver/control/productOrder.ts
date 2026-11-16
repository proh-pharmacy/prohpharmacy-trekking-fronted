import type { DriverStopProduct } from '../../../api-client/treks';
import type { QueuedAction } from './api';

type ProductEntry = { product: DriverStopProduct; action?: never } | { product?: never; action: QueuedAction };
const timestamp = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
};

/** Use addition time only: recording/editing a delivery must not move the row. */
export function orderDriverProducts(
  products: readonly DriverStopProduct[], sales: readonly QueuedAction[], queue: readonly QueuedAction[],
): ProductEntry[] {
  const saleTimes = new Map<string, number>();
  for (const action of queue) {
    if (action.type !== 'RecordUnplannedSale') continue;
    const time = timestamp(action.occurredAt);
    if (time === null) continue;
    saleTimes.set(action.clientId, time);
    if (action.serverId) saleTimes.set(action.serverId, time);
  }
  const entries: Array<{ entry: ProductEntry; time: number | null }> = [
    ...products.map(product => ({ entry: { product }, time: timestamp(product.addedAt)
      ?? saleTimes.get(product.stopProductId) ?? saleTimes.get(product.clientGeneratedId || '') ?? null })),
    ...sales.map(action => ({ entry: { action }, time: timestamp(action.occurredAt) })),
  ];
  // Array.sort is stable: equal dates and historical nulls retain their order.
  entries.sort((a, b) => a.time === b.time ? 0 : a.time === null ? 1 : b.time === null ? -1 : b.time - a.time);
  return entries.map(({ entry }) => entry);
}
