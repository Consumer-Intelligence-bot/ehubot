import { useMemo } from 'react';
import { buildFunnelData } from '../../utils/measures/renewalJourneyMeasures';
import { COLORS, FONT } from '../../utils/brandConstants';

const PHASE_COLORS = {
  pre: COLORS.yellow,
  action: '#B8E4F0',
  outcome: COLORS.green,
};

function FunnelBox({ label, pct, count, breakdown, phase, compact }) {
  const pctStr = pct != null ? `${(pct * 100).toFixed(1)}%` : '—';
  return (
    <div
      style={{
        backgroundColor: PHASE_COLORS[phase] || COLORS.lightGrey,
        borderRadius: 8,
        padding: compact ? 8 : 12,
        minWidth: compact ? 100 : 140,
        fontFamily: FONT.family,
        border: `1px solid rgba(0,0,0,0.08)`,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 'bold', color: '#111' }}>{pctStr}</div>
      {count != null && (
        <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>n={count.toLocaleString()}</div>
      )}
      {breakdown?.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 10, color: '#444' }}>
          {breakdown.map(({ brand, pct: bp }) => (
            <div key={brand}>
              {brand} {(bp * 100).toFixed(1)}%
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Arrow({ direction = 'right' }) {
  const isDown = direction === 'down';
  return (
    <div
      style={{
        width: isDown ? 20 : 24,
        height: isDown ? 24 : 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: COLORS.grey,
        fontSize: 12,
      }}
    >
      {isDown ? '↓' : '→'}
    </div>
  );
}

export default function RenewalFunnel({ data, insurer, topN }) {
  const funnel = useMemo(
    () => buildFunnelData(data, insurer, topN),
    [data, insurer, topN]
  );

  if (!funnel) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#999', fontFamily: FONT.family }}>
        No funnel data available.
      </div>
    );
  }

  const { shoppers, retained, wonFrom, lostTo, customerBase } = funnel;

  return (
    <div style={{ fontFamily: FONT.family, overflow: 'auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto 1fr auto',
          alignItems: 'start',
          gap: 12,
          padding: 20,
          maxWidth: 1200,
        }}
      >
        {/* Phase 1: Pre-renewal */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: COLORS.grey, fontWeight: 'bold' }}>RENEWAL</span>
          <FunnelBox
            label={funnel.preRenewalShare.label}
            pct={funnel.preRenewalShare.pct}
            count={funnel.preRenewalShare.count}
            phase="pre"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', paddingTop: 40 }}>
          <Arrow />
        </div>

        {/* Phase 2: Actions - New biz, Non-shoppers, Shoppers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <FunnelBox
            label={funnel.newBusiness.label}
            pct={funnel.newBusiness.pct}
            count={funnel.newBusiness.count}
            phase="action"
          />
          <FunnelBox
            label={funnel.nonShoppers.label}
            pct={funnel.nonShoppers.pct}
            count={funnel.nonShoppers.count}
            phase="action"
          />
          <div>
            <FunnelBox
              label={shoppers.label}
              pct={shoppers.pct}
              count={shoppers.count}
              phase="action"
              compact
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 6, marginLeft: 8 }}>
              <FunnelBox
                label={shoppers.shopStay.label}
                pct={shoppers.shopStay.pct}
                count={shoppers.shopStay.count}
                phase="action"
                compact
              />
              <FunnelBox
                label={shoppers.shopSwitch.label}
                pct={shoppers.shopSwitch.pct}
                count={shoppers.shopSwitch.count}
                phase="action"
                compact
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', paddingTop: 40 }}>
          <Arrow />
        </div>

        {/* Phase 3: Outcomes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <FunnelBox
            label={wonFrom.label}
            breakdown={wonFrom.breakdown}
            phase="outcome"
          />
          <FunnelBox
            label={retained.label}
            pct={retained.pct}
            count={retained.count}
            phase="outcome"
          />
          {lostTo && (
            <FunnelBox
              label={lostTo.label}
              breakdown={lostTo.breakdown}
              phase="outcome"
            />
          )}
          <FunnelBox
            label={funnel.afterRenewalShare.label}
            pct={funnel.afterRenewalShare.pct}
            count={funnel.afterRenewalShare.count}
            phase="outcome"
          />
          <div
            style={{
              backgroundColor: PHASE_COLORS.outcome,
              borderRadius: 8,
              padding: 10,
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
              Customer base
            </div>
            <div style={{ fontSize: 11, color: '#444' }}>
              Retained {(customerBase.retained * 100).toFixed(1)}% · New business{' '}
              {(customerBase.newBusiness * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#666', marginTop: 12, paddingLeft: 20 }}>
        Total: {funnel.total.toLocaleString()} respondents
        {insurer && funnel.insurerTotal != null && (
          <> · {insurer}: {funnel.insurerTotal.toLocaleString()}</>
        )}
      </div>
    </div>
  );
}
