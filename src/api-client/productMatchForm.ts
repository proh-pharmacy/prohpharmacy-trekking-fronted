export const createProductMatchFormData = (
  files: File[],
  excelMappings: unknown[] | undefined,
  createUnmatchedProducts: boolean,
) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  formData.append('createUnmatchedProducts', String(createUnmatchedProducts));
  if (excelMappings?.length) formData.append('excelMappings', JSON.stringify(excelMappings));
  return formData;
};
