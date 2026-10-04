/** Currency amounts are rounded half-up to two decimal places at line level. */
export function calculateLineAmount(quantity: number, rate: number): number {
  const amount = quantity * rate;
  return Math.round((amount + Math.sign(amount || 1) * Number.EPSILON) * 100) / 100;
}
