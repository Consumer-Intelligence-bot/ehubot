import { THRESHOLDS } from './brandConstants';

/**
 * Determine confidence level for a given sample size.
 * Returns: "publishable" | "indicative" | "suppressed"
 */
export function getConfidenceLevel(n) {
  if (n >= THRESHOLDS.publishable) return 'publishable';
  if (n >= THRESHOLDS.indicative) return 'indicative';
  return 'suppressed';
}

/**
 * Check if a value should be displayed.
 * Returns { show: boolean, level: string, message: string|null }
 */
export function checkSuppression(n) {
  const level = getConfidenceLevel(n);
  if (level === 'suppressed') {
    return {
      show: false,
      level,
      message: `Insufficient data: only ${n} responses. A minimum of ${THRESHOLDS.minimum} is required.`,
    };
  }
  return {
    show: true,
    level,
    message: level === 'indicative'
      ? `Indicative result based on ${n} responses (small sample size).`
      : null,
  };
}

/**
 * Check if a trend comparison is valid.
 * Both periods must have n >= minimum threshold.
 */
export function checkTrendSuppression(nRecent, nPrevious) {
  if (nRecent < THRESHOLDS.minimum || nPrevious < THRESHOLDS.minimum) {
    return {
      show: false,
      message: 'Insufficient data in one or both comparison periods for trend analysis.',
    };
  }
  return { show: true, message: null };
}

/**
 * Get the confidence level description for the banner.
 * Returns { level, colour, label, n }
 */
export function getConfidenceBannerInfo(n) {
  if (n >= 200) return { level: 'high', colour: '#48A23F', label: 'High confidence', n };
  if (n >= 50) return { level: 'good', colour: '#48A23F', label: 'Good confidence', n };
  if (n >= 30) return { level: 'moderate', colour: '#F5A623', label: 'Indicative — small sample', n };
  return { level: 'low', colour: '#F4364C', label: 'Insufficient data — results suppressed', n };
}
