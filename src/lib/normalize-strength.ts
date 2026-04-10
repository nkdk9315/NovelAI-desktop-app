export function normalizeStrengths(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 1 || sum === 0) return values;
  return values.map((v) => Math.round((v / sum) * 100) / 100);
}
