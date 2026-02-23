import { useMemo } from 'react';
import { COLORS, FONT } from '../../utils/brandConstants';

/**
 * Three horizontal bars representing the customer journey funnel.
 * Props:
 *   data        array   The filtered data rows
 *   activeStage "renewals" | "shoppers" | "switchers"
 *   insurer     string | null   Filter to insurer if set
 */
export default function FunnelIndicator({ data, activeStage, insurer }) {
  const counts = useMemo(() => {
    const rows = insurer
      ? data.filter(r => r.CurrentCompany === insurer)
      : data;

    const allRenewals = rows.length;
    const shoppers = rows.filter(r => r.Shoppers === 'Shoppers').length;
    const switchers = rows.filter(r => r.Switchers === 'Switcher').length;

    return { allRenewals, shoppers, switchers };
  }, [data, insurer]);

  const stages = [
    { key: 'renewals', label: 'All Renewals', count: counts.allRenewals },
    { key: 'shoppers', label: 'Shoppers', count: counts.shoppers },
    { key: 'switchers', label: 'Switchers', count: counts.switchers },
  ];

  const maxCount = counts.allRenewals || 1;

  return (
    <div style={{ fontFamily: FONT.family, fontSize: '12px', width: '100%' }}>
      {stages.map(stage => {
        const isActive = stage.key === activeStage;
        const widthPct = Math.round((stage.count / maxCount) * 100);

        return (
          <div key={stage.key} style={{ marginBottom: '6px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2px',
            }}>
              <span style={{ color: isActive ? COLORS.magenta : COLORS.grey, fontWeight: isActive ? 'bold' : 'normal' }}>
                {stage.label}
              </span>
              <span style={{ color: isActive ? COLORS.magenta : COLORS.grey, fontWeight: isActive ? 'bold' : 'normal' }}>
                {stage.count.toLocaleString('en-GB')}
              </span>
            </div>
            <div style={{
              height: '10px',
              backgroundColor: '#eee',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${widthPct}%`,
                backgroundColor: isActive ? COLORS.magenta : '#bbb',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
