/**
 * Normalise column names from Power BI export format.
 * "MainData[Renewal  premium change combined]" → "Renewal premium change combined"
 */
export function normaliseColumns(rows) {
  if (!rows || rows.length === 0) return [];

  return rows.map(row => {
    const cleaned = {};
    for (const [key, value] of Object.entries(row)) {
      let cleanKey = key;
      // Strip BOM
      cleanKey = cleanKey.replace(/^\uFEFF/, '');
      // Strip MainData[ prefix and ] suffix
      cleanKey = cleanKey.replace(/^MainData\[/, '').replace(/\]$/, '');
      // Collapse double spaces
      cleanKey = cleanKey.replace(/\s{2,}/g, ' ');
      // Trim
      cleanKey = cleanKey.trim();
      cleaned[cleanKey] = typeof value === 'string' ? value.trim() : value;
    }
    return cleaned;
  });
}
