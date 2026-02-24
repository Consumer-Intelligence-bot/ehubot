import { FONT, COLORS } from '../../utils/brandConstants';

/**
 * Horizontal ranked bar chart for reason breakdowns.
 * Spec: CI Blue bars, brand in CI Violet when insurer selected. Longest bar at top.
 */
export default function ReasonChart({ title, reasons, baseN, insurerMode }) {
  if (!reasons?.length) return null;

  const maxPct = Math.max(...reasons.map((r) => r.market_pct ?? r.insurer_pct ?? 0), 0.01);

  return (
    <div
      style={{
        backgroundColor: COLORS.white,
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
        padding: 16,
        minHeight: 280,
        fontFamily: FONT.family,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 12 }}>
        {title}
      </div>
      {baseN && (
        <div style={{ fontSize: 11, color: '#666', marginBottom: 10 }}>
          n={baseN.market?.toLocaleString?.() ?? baseN}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {reasons.map((r, i) => {
          const pct = insurerMode && r.insurer_pct != null ? r.insurer_pct : r.market_pct;
          const marketPct = r.market_pct ?? 0;
          const insurerPct = r.insurer_pct ?? null;
          const showBoth = insurerMode && insurerPct != null;

          return (
            <div key={r.code || i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div
                style={{
                  fontSize: 12,
                  color: '#333',
                  lineHeight: 1.3,
                  marginBottom: 2,
                }}
              >
                {r.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    height: 20,
                    backgroundColor: COLORS.lightGrey,
                    borderRadius: 3,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {/* Market bar (background) */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${(marketPct / maxPct) * 100}%`,
                      backgroundColor: showBoth ? 'transparent' : COLORS.blue,
                      border: showBoth ? `2px solid ${COLORS.blue}` : 'none',
                      borderRadius: 3,
                      boxSizing: 'border-box',
                    }}
                  />
                  {/* Insurer bar (overlay when both) */}
                  {showBoth && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${(insurerPct / maxPct) * 100}%`,
                        backgroundColor: COLORS.magenta,
                        borderRadius: 3,
                      }}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: '#333',
                    minWidth: 48,
                    textAlign: 'right',
                  }}
                >
                  {((pct ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
