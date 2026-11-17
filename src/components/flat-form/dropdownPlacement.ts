export interface DropdownViewport { left: number; top: number; width: number; height: number }
export interface DropdownAnchor { left: number; top: number; bottom: number; width: number }

/** Fixed-position coordinates, including the visible viewport when a keyboard is open. */
export function dropdownPlacement(anchor: DropdownAnchor, viewport: DropdownViewport, desiredHeight: number) {
  const margin = 8;
  const gap = 4;
  const leftEdge = viewport.left + margin;
  const topEdge = viewport.top + margin;
  const rightEdge = viewport.left + viewport.width - margin;
  const bottomEdge = viewport.top + viewport.height - margin;
  const width = Math.min(Math.max(260, anchor.width), Math.max(0, viewport.width - margin * 2));
  const below = Math.max(0, bottomEdge - anchor.bottom - gap);
  const above = Math.max(0, anchor.top - gap - topEdge);
  const side = below >= desiredHeight || below >= above ? 'below' : 'above';
  const available = side === 'below' ? below : above;
  // In a very short visual viewport, allow overlap so search and footer remain usable.
  const viewportHeight = Math.max(0, viewport.height - margin * 2);
  const maxHeight = available < 140 ? viewportHeight : Math.min(available, viewportHeight);
  const height = Math.min(desiredHeight, maxHeight);
  const top = Math.max(topEdge, Math.min(side === 'below' ? anchor.bottom + gap : anchor.top - gap - height, bottomEdge - height));
  return { top, left: Math.max(leftEdge, Math.min(anchor.left, rightEdge - width)), width, maxHeight,
    minLeft: leftEdge, maxLeft: rightEdge - width, side };
}
