const CO2_WEIGHTS: Record<string, number> = {
  FURNITURE: 40,
  ELECTRONICS: 15,
  FASHION: 5,
  BOOKS: 2,
  SPORTS: 8,
  KITCHEN: 10,
  OTHERS: 12,
}

export function calculateCO2Saved(category: string): number {
  return CO2_WEIGHTS[category] ?? 12
}

export function formatCO2(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} tan`
  return `${kg}kg`
}
