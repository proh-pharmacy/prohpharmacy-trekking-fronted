interface MatchReviewQuantityRow {
  basicQty: number | string | null;
  quantity: number | string | null;
  packagingQty?: number | string | null;
  basicQtyText?: string | null;
  quantityText?: string | null;
  packagingQtyText?: string | null;
}

const numericQuantity = (value: number | string | null | undefined): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const firstToken = value.trim().split(/\s+/)[0]?.replaceAll(',', '');
  if (!firstToken) return null;
  const parsed = Number(firstToken);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const reviewBasicQuantity = (row: MatchReviewQuantityRow): number | null => {
  const candidates = [
    row.basicQty,
    row.quantity,
    row.packagingQty,
    row.basicQtyText,
    row.quantityText,
    row.packagingQtyText,
  ];

  for (const candidate of candidates) {
    const quantity = numericQuantity(candidate);
    if (quantity != null) return quantity;
  }
  return null;
};
