import type { DriverTrek } from '../../../api-client/treks';
import type { StockItem } from '../../../api-client/vehicleStock';
import type { QueuedAction } from './api';

export interface StockEstimate {
  productId: string;
  productName: string;
  basicUnitName: string;
  packagingUnitName: string | null;
  basicOnHand: number | null;
  packagingOnHand: number | null;
  basicUsed: number;
  packagingUsed: number;
  basicRemaining: number | null;
  packagingRemaining: number | null;
  lowStockThreshold: number | null;
  needsReview: boolean;
  updatedAt: string | null;
}
export interface StockUsage { basic: number; packaging: number }
export interface TrekStockEstimate {
  byProduct: ReadonlyMap<string, StockEstimate>;
  byDelivery: ReadonlyMap<string, StockUsage>;
}
const quantity = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};
export const roundStock = (value: number) => Math.round(value * 100) / 100;

/** O(stock + stop products + queue). Draft input values never enter this index.
 * Warehouse balances already include approved returns, so do not add returns.
 * Completed treks have already been deducted by the server.
 */
export function estimateTrekStock(
  stock: readonly StockItem[], trek: DriverTrek | null, queue: readonly QueuedAction[],
): TrekStockEstimate {
  const byProduct = new Map<string, StockEstimate>();
  const byDelivery = new Map<string, StockUsage>();
  for (const item of stock) byProduct.set(item.productId, {
    productId: item.productId, productName: item.productName,
    basicUnitName: item.basicUnitName, packagingUnitName: item.packagingUnitName,
    basicOnHand: item.basicQuantityOnHand, packagingOnHand: item.packagingQuantityOnHand,
    basicUsed: 0, packagingUsed: 0, basicRemaining: item.basicQuantityOnHand,
    packagingRemaining: item.packagingQuantityOnHand, lowStockThreshold: item.lowStockThreshold,
    needsReview: false, updatedAt: item.updatedAt,
  });
  if (!trek) return { byProduct, byDelivery };
  const active = trek.status === 'Scheduled' || trek.status === 'InProgress';
  const stopIds = new Set(trek.stops.map(stop => stop.stopId));
  const localStopIds = new Set<string>();
  const deliveryUpdates = new Map<string, QueuedAction>();
  const clientIds = new Set<string>();
  const productRows = new Map<string, DriverTrek['stops'][number]['products'][number]>();
  for (const stop of trek.stops) for (const product of stop.products) {
    productRows.set(product.stopProductId, product);
    if (product.clientGeneratedId) clientIds.add(product.clientGeneratedId);
    if (!byProduct.has(product.productId)) byProduct.set(product.productId, {
      productId: product.productId, productName: product.productName,
      basicUnitName: product.basicUnitName || 'units', packagingUnitName: product.packagingUnitName,
      basicOnHand: null, packagingOnHand: null, basicUsed: 0, packagingUsed: 0,
      basicRemaining: null, packagingRemaining: null, lowStockThreshold: null,
      needsReview: false, updatedAt: null,
    });
  }
  for (const action of queue) {
    if (action.type === 'AddWalkInStop' && (action.payload.trekId === trek.trekId || (action.serverId && stopIds.has(action.serverId)))) {
      localStopIds.add(action.clientId);
      if (action.serverId) stopIds.add(action.serverId);
    }
    if (action.type === 'RecordDelivery') {
      const id = String(action.payload.stopProductId || '');
      const previous = deliveryUpdates.get(id);
      if (!previous || action.occurredAt >= previous.occurredAt) deliveryUpdates.set(id, action);
    }
  }
  const addUsage = (id: string, basic: number, packaging: number, review: boolean) => {
    const item = byProduct.get(id);
    if (!item) return;
    item.basicUsed += basic; item.packagingUsed += packaging;
    item.needsReview ||= review;
  };
  if (active) {
    for (const [id, product] of productRows) {
      const update = deliveryUpdates.get(id);
      // A confirmed newer server edit wins over an older retained queue entry.
      const overlay = update && (update.status !== 'synced' || !product.deliveredAt || update.occurredAt > product.deliveredAt) ? update : undefined;
      const basic = quantity(overlay?.payload.basicQtyDelivered ?? product.basicQtyDelivered);
      const packaging = quantity(overlay?.payload.packagingQtyDelivered ?? product.packagingQtyDelivered);
      byDelivery.set(id, { basic, packaging });
      addUsage(product.productId, basic, packaging, overlay?.status === 'conflict' || !!overlay?.legacyPaymentReview);
    }
    for (const action of queue) {
      if (action.type !== 'RecordUnplannedSale') continue;
      if (!stopIds.has(String(action.payload.stopId || '')) && !localStopIds.has(String(action.payload.stopClientId || ''))) continue;
      // The same sale may be present in both the refreshed trek and durable queue.
      if (clientIds.has(action.clientId) || (action.serverId && productRows.has(action.serverId))) continue;
      const id = String(action.payload.productId || '');
      addUsage(id, quantity(action.payload.basicQtyDelivered), quantity(action.payload.packagingQtyDelivered), action.status === 'conflict' || !!action.legacyPaymentReview);
    }
  }
  for (const item of byProduct.values()) {
    item.basicUsed = roundStock(item.basicUsed); item.packagingUsed = roundStock(item.packagingUsed);
    item.basicRemaining = item.basicOnHand === null ? null : roundStock(item.basicOnHand - item.basicUsed);
    item.packagingRemaining = item.packagingOnHand === null ? null : roundStock(item.packagingOnHand - item.packagingUsed);
  }
  return { byProduct, byDelivery };
}

export function stockLevel(item?: StockEstimate) {
  if (!item || item.basicRemaining === null) return { label: 'Stock unavailable', tone: 'text-portal-muted' };
  if (item.needsReview) return { label: 'Needs review', tone: 'text-portal-orange' };
  if (item.basicRemaining < 0 || (item.packagingUnitName && (item.packagingRemaining ?? 0) < 0)) return { label: 'Shortfall', tone: 'text-red-accent' };
  if (item.basicRemaining === 0 && (!item.packagingUnitName || item.packagingRemaining === 0)) return { label: 'Out of stock', tone: 'text-red-accent' };
  if (item.lowStockThreshold !== null && item.basicRemaining <= item.lowStockThreshold) return { label: 'Low stock', tone: 'text-portal-orange' };
  return { label: 'Available', tone: 'text-portal-accent' };
}

/** Replacing a recorded delivery releases its previous quantity before previewing. */
export function projectStock(item: StockEstimate, basic: number, packaging: number, replacing?: StockUsage) {
  if (item.basicRemaining === null) return null;
  const availableBasic = roundStock(item.basicRemaining + (replacing?.basic ?? 0));
  const availablePackaging = roundStock((item.packagingRemaining ?? 0) + (replacing?.packaging ?? 0));
  const afterBasic = roundStock(availableBasic - (Number.isFinite(basic) ? basic : replacing?.basic ?? 0));
  const afterPackaging = roundStock(availablePackaging - (Number.isFinite(packaging) ? packaging : replacing?.packaging ?? 0));
  return { availableBasic, availablePackaging, afterBasic, afterPackaging,
    exceeds: afterBasic < 0 || (!!item.packagingUnitName && afterPackaging < 0) };
}
