import type { SaleInvoice, SaleInvoiceLineItem } from '../../../api-client/invoices';
import type { DriverStop, DriverTrek } from '../../../api-client/treks';
import type { Product } from '../../../api-client/products';
import type { QueuedAction } from './api';

/** Local preview of goods only. Collections always come from invoice-level summaries. */
export function offlineInvoice(trek: DriverTrek, stop: DriverStop, products: Product[], sales: QueuedAction[], deliveries: QueuedAction[]): SaleInvoice {
  const lines: SaleInvoiceLineItem[] = stop.products.map(product => {
    const pending = deliveries.filter(action => action.payload.stopProductId === product.stopProductId).at(-1);
    const basicDelivered = pending?.payload.basicQtyDelivered ?? product.basicQtyDelivered;
    const packagingDelivered = pending?.payload.packagingQtyDelivered ?? product.packagingQtyDelivered;
    const delivered = basicDelivered != null || packagingDelivered != null;
    const basicQuantity = Number(delivered ? basicDelivered ?? 0 : product.plannedBasicQuantity ?? 0);
    const packagingQuantity = Number(delivered ? packagingDelivered ?? 0 : product.plannedPackagingQuantity ?? 0);
    return { ...product, basicUnitName: product.basicUnitName || 'units', basicQuantity, packagingQuantity,
      basicQtyDelivered: basicDelivered == null ? null : Number(basicDelivered), packagingQtyDelivered: packagingDelivered == null ? null : Number(packagingDelivered),
      lineTotal: basicQuantity * product.basicUnitPrice + packagingQuantity * Number(product.packagingUnitPrice ?? 0),
      amtPaid: null, balance: null, paymentMethod: null, isUnplanned: product.isUnplanned ?? false, deliveredAt: product.deliveredAt ?? null };
  });
  for (const action of sales) {
    const product = products.find(item => item.id === action.payload.productId);
    const basicQuantity = Number(action.payload.basicQtyDelivered ?? 0);
    const packagingQuantity = Number(action.payload.packagingQtyDelivered ?? 0);
    const basicUnitPrice = Number(action.payload.basicUnitPrice ?? product?.basicUnitPrice ?? 0);
    const packagingUnitPrice = Number(action.payload.packagingUnitPrice ?? product?.packagingUnitPrice ?? 0);
    lines.push({ stopProductId: action.serverId || action.clientId, productId: String(action.payload.productId), productName: product?.name || 'Product',
      basicUnitName: product?.basicUnitName || 'units', packagingUnitName: product?.packagingUnitName ?? null,
      basicQuantity, packagingQuantity, plannedBasicQuantity: 0, plannedPackagingQuantity: 0,
      basicQtyDelivered: basicQuantity, packagingQtyDelivered: packagingQuantity, basicUnitPrice, packagingUnitPrice,
      lineTotal: basicQuantity * basicUnitPrice + packagingQuantity * packagingUnitPrice,
      amtPaid: null, balance: null, paymentMethod: null, isUnplanned: true, deliveredAt: action.occurredAt });
  }
  const goodsChanged = sales.length > 0 || deliveries.length > 0;
  const totalAmount = goodsChanged ? lines.reduce((sum, line) => sum + line.lineTotal, 0) : stop.invoiceTotal ?? lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const totalPaid = stop.invoicePaid ?? 0;
  const status = stop.invoiceStatus === 'Voided' ? 'Voided' : totalAmount > 0 && totalPaid >= totalAmount ? 'Paid' : totalPaid > 0 ? 'PartiallyPaid' : 'Issued';
  return { id: stop.invoiceId || '', invoiceNumber: stop.invoiceNumber ?? null, status, issuedAt: trek.scheduledDate,
    createdOffline: !stop.invoiceId, trekkingTripId: trek.trekId, trekNumber: trek.trekNumber, trekDate: trek.scheduledDate,
    driverName: trek.driverName, salesStaffName: trek.salesStaffName, vehicleDisplayName: trek.vehicleDisplayName, regionName: trek.regionName,
    customerAccountId: stop.customerAccountId || '', customerName: stop.customerName, customerCode: stop.customerCode,
    customerTradingName: null, customerPhone: stop.primaryPhoneNumber || '', customerWhatsAppNumber: null, customerRegionName: stop.regionName || '',
    totalAmount, totalPaid, balance: goodsChanged ? Math.max(0, totalAmount - totalPaid) : stop.invoiceBalance ?? Math.max(0, totalAmount - totalPaid), lineItems: lines, payments: [] };
}
