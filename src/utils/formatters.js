/**
 * Format a decimal as a percentage string.
 * formatPct(0.491) → "49.1%"
 */
export function formatPct(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number with commas.
 * formatNumber(1234) → "1,234"
 */
export function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return value.toLocaleString('en-GB');
}

/**
 * Format as currency.
 * formatCurrency(31.5) → "£32"
 */
export function formatCurrency(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `£${value.toFixed(decimals)}`;
}

/**
 * Format a gap value with a + or - prefix and colour hint.
 * formatGap(0.05, "pct") → "+5.0pts"
 */
export function formatGap(value, format = 'pct') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const prefix = value > 0 ? '+' : '';
  if (format === 'pct') {
    return `${prefix}${(value * 100).toFixed(1)}pts`;
  }
  return `${prefix}${value.toFixed(1)}`;
}
