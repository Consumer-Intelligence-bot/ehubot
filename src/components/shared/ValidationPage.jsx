import { useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { runValidation } from '../../utils/validation';
import { FONT, COLORS } from '../../utils/brandConstants';

/**
 * Hidden /validation route: renders validation results in a table.
 * TODO: REMOVE BEFORE DELIVERY — dev-only validation view.
 */
export default function ValidationPage() {
  const { rawData, loading, error } = useDashboard();

  const results = useMemo(() => {
    if (!rawData.length) return [];
    return runValidation(rawData);
  }, [rawData]);

  const allPass = results.length > 0 && results.every(r => r.pass);
  const passCount = results.filter(r => r.pass).length;

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: FONT.family, fontSize: FONT.body }}>
        Loading data…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, fontFamily: FONT.family, fontSize: FONT.body, color: COLORS.red }}>
        Error: {error}
      </div>
    );
  }

  if (rawData.length === 0) {
    return (
      <div style={{ padding: 24, fontFamily: FONT.family, fontSize: FONT.body }}>
        No data loaded. Load the dashboard first.
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: FONT.family, maxWidth: 800 }}>
      <h1 style={{ fontSize: FONT.heading, marginBottom: 8 }}>Validation</h1>
      <p style={{ fontSize: FONT.body, color: COLORS.grey, marginBottom: 16 }}>
        {passCount} / {results.length} checks passed
        {allPass ? ' — all pass.' : '.'}
        {' '}
        <span style={{ fontSize: '12px' }}>(Ctrl+Shift+V logs to console)</span>
      </p>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px' }}>Check</th>
            <th style={{ padding: '8px 12px' }}>Expected</th>
            <th style={{ padding: '8px 12px' }}>Actual</th>
            <th style={{ padding: '8px 12px' }}>Pass</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr
              key={i}
              style={{
                borderBottom: '1px solid #eee',
                backgroundColor: r.pass ? 'transparent' : 'rgba(244,54,76,0.08)',
              }}
            >
              <td style={{ padding: '8px 12px' }}>{r.check}</td>
              <td style={{ padding: '8px 12px' }}>{String(r.expected)}</td>
              <td style={{ padding: '8px 12px' }}>{String(r.actual)}</td>
              <td style={{ padding: '8px 12px', color: r.pass ? COLORS.green : COLORS.red, fontWeight: 'bold' }}>
                {r.pass ? '✓' : '✗'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
