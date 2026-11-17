export type ConfidenceSortDirection = 'ascending' | 'descending';

interface ConfidenceSource {
  matchStatus: string;
  candidates?: Array<{ similarityScore?: number | null }> | null;
}

interface ConfidenceItem {
  source: ConfidenceSource;
}

export const confidenceSortValue = (source: ConfidenceSource): number | null => {
  if (source.matchStatus === 'Unmatched') return 0;
  return source.candidates?.[0]?.similarityScore ?? null;
};

export const sortItemsByConfidence = <T extends ConfidenceItem>(
  items: T[],
  direction: ConfidenceSortDirection | null,
): T[] => {
  if (!direction) return items;

  return items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((left, right) => {
      const leftValue = confidenceSortValue(left.item.source);
      const rightValue = confidenceSortValue(right.item.source);

      if (leftValue == null && rightValue == null) return left.originalIndex - right.originalIndex;
      if (leftValue == null) return 1;
      if (rightValue == null) return -1;

      const difference = direction === 'ascending'
        ? leftValue - rightValue
        : rightValue - leftValue;
      return difference || left.originalIndex - right.originalIndex;
    })
    .map(({ item }) => item);
};
