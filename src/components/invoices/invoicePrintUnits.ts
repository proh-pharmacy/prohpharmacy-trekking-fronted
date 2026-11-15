export interface InvoicePrintQuantities {
  basicQuantity: number;
  basicUnitName: string;
  basicUnitPrice: number;
  packagingQuantity: number | null;
  packagingUnitName: string | null;
  packagingUnitPrice: number | null;
}

// Keep each stored rate alongside its own unit; never derive prices from totals.
export function invoicePrintUnits(line: InvoicePrintQuantities) {
  const units: { quantity: number; name: string; price: number | null }[] = [];
  if (line.basicQuantity !== 0 || !line.packagingQuantity) {
    units.push({ quantity: line.basicQuantity, name: line.basicUnitName || 'unit', price: line.basicUnitPrice });
  }
  if (line.packagingQuantity) {
    units.push({ quantity: line.packagingQuantity, name: line.packagingUnitName || 'pack', price: line.packagingUnitPrice });
  }
  return units;
}
