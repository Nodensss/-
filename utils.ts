export const parseInput = (value: string): number | null => {
  if (!value) return null;
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
};

export const formatNumber = (val: number, decimals: number = 0): string => {
  return val.toFixed(decimals);
};