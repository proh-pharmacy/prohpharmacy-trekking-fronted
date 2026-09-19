export const formatTrekDate = (date: Date | null | undefined): string => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseTrekDate = (value: string): Date | null =>
  value ? new Date(`${value}T00:00:00`) : null;
