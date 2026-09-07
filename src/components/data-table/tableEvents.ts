// Global table events and helper utilities for Fast Refresh compliance

export const resetTableData = () => {
  document.dispatchEvent(new Event('tableRefreshEvent'));
};

export const resetDefaultData = () => {
  document.dispatchEvent(new Event('tableResetEvent'));
};

export const scrollDataTableToTop = () => {
  const table = document.querySelector('.p-datatable-wrapper');
  if (table) table.scrollTo({ top: 0, behavior: 'smooth' });
};
