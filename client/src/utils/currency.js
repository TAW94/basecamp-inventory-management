// Currency conversion utility
// USD to JPY exchange rate (approximate)
const USD_TO_JPY = 150

export function formatCurrency(amount, currency = 'USD') {
  if (currency === 'JPY') {
    const yenAmount = Math.round(amount * USD_TO_JPY)
    return `¥${yenAmount.toLocaleString('ja-JP')}`
  }
  // Default USD
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function formatCurrencyWithDecimals(amount, currency = 'USD', decimals = 0) {
  if (currency === 'JPY') {
    const yenAmount = Math.round(amount * USD_TO_JPY)
    return `¥${yenAmount.toLocaleString('ja-JP')}`
  }
  // Default USD
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

export function convertAmount(amount, currency = 'USD') {
  if (currency === 'JPY') {
    return Math.round(amount * USD_TO_JPY)
  }
  return amount
}

// Compact axis/label format ($5.2M, $850K, $0). Converts to JPY like the other helpers.
export function formatCompactCurrency(amount, currency = 'USD') {
  const value = convertAmount(amount, currency)
  const symbol = currency === 'JPY' ? '¥' : '$'
  const abs = Math.abs(value)
  const trim = (n) => String(Number(n.toFixed(1)))
  if (abs >= 1e6) return `${symbol}${trim(value / 1e6)}M`
  if (abs >= 1e3) return `${symbol}${trim(value / 1e3)}K`
  return `${symbol}${Math.round(value)}`
}
