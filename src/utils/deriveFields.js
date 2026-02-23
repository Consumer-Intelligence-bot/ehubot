const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Add derived fields to each row at load time.
 */
export function addDerivedFields(rows) {
  return rows.map(row => ({
    ...row,
    RenewalMonth: row.RenewalYearMonth ? row.RenewalYearMonth % 100 : null,
    RenewalMonthDisplay: formatYearMonth(row.RenewalYearMonth),
    SurveyMonthDisplay: formatYearMonth(row.SurveyYearMonth),
  }));
}

/**
 * Format YYYYMM integer as "Mon YY".
 * e.g. 202502 → "Feb 25"
 */
function formatYearMonth(ym) {
  if (!ym) return '';
  const year = Math.floor(ym / 100);
  const month = ym % 100;
  const monthName = MONTH_NAMES[month - 1] || '???';
  const shortYear = String(year).slice(-2);
  return `${monthName} ${shortYear}`;
}
