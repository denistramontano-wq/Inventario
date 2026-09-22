export const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'USD', symbol: '$', label: 'Dollaro USA' },
  { code: 'GBP', symbol: '£', label: 'Sterlina' },
  { code: 'CHF', symbol: 'Fr', label: 'Franco svizzero' },
  { code: 'JPY', symbol: '¥', label: 'Yen' },
  { code: 'CAD', symbol: '$', label: 'Dollaro canadese' },
  { code: 'AUD', symbol: '$', label: 'Dollaro australiano' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

const SYMBOL_BY_CODE: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.symbol]),
)

export function currencySymbol(code: string): string {
  return SYMBOL_BY_CODE[code] ?? code
}

export function formatMoney(amount: number, code: string): string {
  return `${currencySymbol(code)}${amount.toFixed(2)}`
}
