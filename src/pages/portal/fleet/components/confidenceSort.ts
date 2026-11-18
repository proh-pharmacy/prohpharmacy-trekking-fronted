export type ConfidenceSortDirection = 'ascending' | 'descending';

interface ConfidenceSource {
  matchStatus: string;
  autoCreated?: boolean;
  candidates?: Array<{ similarityScore?: number | null }> | null;
}

interface ConfidenceItem {
  source: ConfidenceSource;
}

export const confidenceSortValue = (source: ConfidenceSource): number | null => {
  if (source.matchStatus === 'Unmatched') return 0;
  return source.candidates?.[0]?.similarityScore ?? null;
};

const isAutoCreated = (source: ConfidenceSource) => (
  source.autoCreated === true || source.matchStatus === 'AutoCreated'
);

const defaultGroup = (source: ConfidenceSource) => {
  if (isAutoCreated(source)) return 0;
  if (source.matchStatus === 'Unmatched') return 1;
  if (source.matchStatus === 'Manual') return 3;
  return 2;
};

export const sortItemsForDefaultReview = <T extends ConfidenceItem>(items: T[]): T[] => (
  items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((left, right) => {
      const groupDifference = defaultGroup(left.item.source) - defaultGroup(right.item.source);
      if (groupDifference) return groupDifference;

      if (defaultGroup(left.item.source) === 2) {
        const leftScore = confidenceSortValue(left.item.source);
        const rightScore = confidenceSortValue(right.item.source);
        if (leftScore == null && rightScore != null) return 1;
        if (leftScore != null && rightScore == null) return -1;
        if (leftScore != null && rightScore != null && leftScore !== rightScore) {
          return leftScore - rightScore;
        }
      }

      return left.originalIndex - right.originalIndex;
    })
    .map(({ item }) => item)
);

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
