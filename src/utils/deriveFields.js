const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Add derived fields to each row at load time.
 * Includes spec-derived fields: journey_segment, brand_switched_from, brand_switched_to,
 * price_direction, is_pcw_user, nps_category, tenure_band.
 */
export function addDerivedFields(rows) {
  return rows.map(row => ({
    ...row,
    RenewalMonth: row.RenewalYearMonth ? row.RenewalYearMonth % 100 : null,
    RenewalMonthDisplay: formatYearMonth(row.RenewalYearMonth),
    SurveyMonthDisplay: formatYearMonth(row.SurveyYearMonth),
    journey_segment: deriveJourneySegment(row),
    brand_switched_from: deriveBrandSwitchedFrom(row),
    brand_switched_to: deriveBrandSwitchedTo(row),
    price_direction: derivePriceDirection(row),
    is_pcw_user: deriveIsPcwUser(row),
    nps_category: deriveNpsCategory(row),
    tenure_band: deriveTenureBand(row),
  }));
}

function deriveJourneySegment(row) {
  const shoppers = row.Shoppers;
  const switchers = row.Switchers;
  if (switchers === 'New-to-market') return 'New to Market';
  if (shoppers === 'Shoppers' && switchers === 'Switcher') return 'Shopped & Switched';
  if (shoppers === 'Shoppers' && switchers === 'Non-switcher') return 'Shopped & Stayed';
  if (shoppers === 'Non-shoppers' && switchers === 'Non-switcher') return 'Did Not Shop & Stayed';
  return null;
}

function deriveBrandSwitchedFrom(row) {
  return row.Switchers === 'Switcher' ? row.PreRenewalCompany : null;
}

function deriveBrandSwitchedTo(row) {
  return row.Switchers === 'Switcher' ? row.CurrentCompany : null;
}

function derivePriceDirection(row) {
  const change = row['Renewal premium change'] ?? row['Renewal premium change combined'] ?? '';
  const s = String(change).toLowerCase();
  if (s.includes('higher') || s === 'up') return 'Up';
  if (s.includes('lower') || s === 'down') return 'Down';
  if (s.includes('unchanged')) return 'Unchanged';
  if (s.includes("didn't have") || s.includes('new') || s.includes('purchase')) return 'New';
  return null;
}

function deriveIsPcwUser(row) {
  const val = row['Did you use a PCW for shopping'];
  return val === 'Yes' || val === true || val === '1';
}

function deriveNpsCategory(row) {
  const nps = parseNumeric(row.Q48);
  if (nps === null) return null;
  if (nps >= 9) return 'Promoter';
  if (nps >= 7) return 'Passive';
  return 'Detractor';
}

function deriveTenureBand(row) {
  const tenure = row.Q21;
  if (!tenure) return null;
  const s = String(tenure).toLowerCase();
  if (s.includes('1 year') && !s.includes('2') && !s.includes('3')) return '1yr';
  if (s.includes('2 year') || s.includes('3 year')) return '2-3yr';
  if (s.includes('4 year') || s.includes('5 year')) return '4-5yr';
  if (s.includes('6') || s.includes('7') || s.includes('8') || s.includes('9') || s.includes('more')) return '6+yr';
  const years = parseYearsFromTenure(s);
  if (years !== null) {
    if (years <= 1) return '1yr';
    if (years <= 3) return '2-3yr';
    if (years <= 5) return '4-5yr';
    return '6+yr';
  }
  return null;
}

function parseNumeric(val) {
  if (val === '' || val === null || val === undefined) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function parseYearsFromTenure(s) {
  const m = s.match(/(\d+)\s*year/);
  return m ? parseInt(m[1], 10) : null;
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
