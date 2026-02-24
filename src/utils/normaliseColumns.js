/**
 * Normalise column names from Power BI export format.
 * MainData[Renewal premium change combined] → Renewal premium change combined
 * RespondentProfile[Q57] → Q57
 */
export function normaliseColumns(rows) {
  if (!rows || rows.length === 0) return [];

  return rows.map(row => {
    const cleaned = {};
    for (const [key, value] of Object.entries(row)) {
      let cleanKey = key;
      // Strip BOM
      cleanKey = cleanKey.replace(/^\uFEFF/, '');
      // Strip MainData[ or MainData_Motor[ prefix
      cleanKey = cleanKey.replace(/^MainData_Motor\[/, '').replace(/^MainData\[/, '');
      // Strip RespondentProfile[ prefix (handles RespondentProfile[Q57] → Q57)
      cleanKey = cleanKey.replace(/^RespondentProfile\[/, '');
      // Strip trailing ] only if it closes a bracket (avoid breaking nested keys)
      cleanKey = cleanKey.replace(/\]$/, '');
      // Collapse double spaces
      cleanKey = cleanKey.replace(/\s{2,}/g, ' ');
      // Trim
      cleanKey = cleanKey.trim();
      cleaned[cleanKey] = typeof value === 'string' ? value.trim() : value;
    }
    return cleaned;
  });
}
