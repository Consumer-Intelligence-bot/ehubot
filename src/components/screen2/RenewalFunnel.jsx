import { useMemo, useRef, useLayoutEffect, useState } from 'react';
import { buildFunnelData } from '../../utils/measures/renewalJourneyMeasures';
import { checkSuppression } from '../../utils/governance';
import { COLORS, FONT } from '../../utils/brandConstants';
import { formatGap } from '../../utils/formatters';

const TREND_ARROW = { up: '▲', down: '▼', flat: '—' };

// Semantic colour mapping
function getSemanticColor(metricKey, value, marketValue, count, insurerMode) {
  const supp = checkSuppression(count ?? 0);
  if (!supp.show) return COLORS.lightGrey;

  if (!insurerMode) {
    // Market view: neutral blue for process/outcome
    if (metricKey === 'pre-renewal') return COLORS.yellow;
    return '#B8E4F0';
  }

  if (metricKey === 'pre-renewal') return COLORS.yellow;

  // Process stages: blue
  const processKeys = ['new-biz', 'non-shoppers', 'shoppers', 'shop-stay', 'shop-switch'];
  if (processKeys.includes(metricKey)) return '#B8E4F0';

  // Outcome metrics: green/red based on delta
  const delta = value != null && marketValue != null ? value - marketValue : null;
  if (delta === null) return '#B8E4F0';

  const favourableHigher = ['retained', 'after-renewal', 'pre-renewal'];
  const favourableLower = ['shop-switch'];
  const isGood =
    favourableHigher.includes(metricKey) ? delta > 0 :
    favourableLower.includes(metricKey) ? delta < 0 :
    delta > 0; // default: higher is better
  return isGood ? COLORS.green : COLORS.red;
}

function FunnelBox({
  label,
  pct,
  count,
  breakdown,
  semanticColor,
  marketPct,
  delta,
  insurerMode,
  compact,
}) {
  const pctStr = pct != null ? `${(pct * 100).toFixed(1)}%` : '—';
  const supp = checkSuppression(count ?? 0);
  const showMarket = insurerMode && marketPct != null && delta != null && supp.show;
  const trend = showMarket && delta !== 0 ? (delta > 0 ? 'up' : 'down') : 'flat';

  return (
    <div
      style={{
        backgroundColor: semanticColor,
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
      {showMarket && (
        <div style={{ fontSize: 11, color: COLORS.grey, marginTop: 4 }}>
          (Market: {(marketPct * 100).toFixed(1)}%){' '}
          <span
            style={{
              color: delta > 0 ? COLORS.green : delta < 0 ? COLORS.red : COLORS.grey,
              fontWeight: 'bold',
            }}
          >
            {TREND_ARROW[trend]} {formatGap(delta, 'pct')}
          </span>
        </div>
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

function OutcomeBreakdownList({ label, items, borderColor }) {
  return (
    <div
      style={{
        backgroundColor: '#FAFAFA',
        borderRadius: 8,
        padding: 10,
        borderLeft: `4px solid ${borderColor}`,
        fontFamily: FONT.family,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 'bold', color: '#333', marginBottom: 6 }}>{label}</div>
      {items?.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map(({ brand, pct }) => (
            <div
              key={brand}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                fontWeight: 'bold',
                color: '#111',
              }}
            >
              <span>{brand}</span>
              <span>{(pct * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: '#666' }}>—</div>
      )}
    </div>
  );
}

function FlowArrows({ flows, boxRefs, maxCount }) {
  const [paths, setPaths] = useState([]);

  useLayoutEffect(() => {
    if (!flows?.length || !boxRefs.current) return;

    const refs = boxRefs.current;
    const newPaths = [];

    const drawableFlows = flows.filter((f) => f.count > 0);
    drawableFlows.forEach(({ from, to, count }) => {
      const fromEl = refs[from];
      const toEl = refs[to];
      if (!fromEl || !toEl) return;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      const containerRect = fromEl.closest('[data-funnel-container]')?.getBoundingClientRect();
      if (!containerRect) return;

      const strokeWidth = Math.max(1, Math.min(8, 2 + (count / (maxCount || 1)) * 6));

      const fromX = fromRect.right - containerRect.left;
      const fromY = fromRect.top + fromRect.height / 2 - containerRect.top;
      const toX = toRect.left - containerRect.left;
      const toY = toRect.top + toRect.height / 2 - containerRect.top;

      const midX = (fromX + toX) / 2;
      const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;

      newPaths.push({ path, strokeWidth });
    });

    setPaths(newPaths);
  }, [flows, maxCount]);

  if (paths.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.grey} />
        </marker>
      </defs>
      {paths.map(({ path, strokeWidth }, i) => (
        <path
          key={i}
          d={path}
          fill="none"
          stroke={COLORS.grey}
          strokeWidth={strokeWidth}
          markerEnd="url(#arrowhead)"
        />
      ))}
    </svg>
  );
}

export default function RenewalFunnel({ data, insurer, topN }) {
  const funnel = useMemo(
    () => buildFunnelData(data, insurer, topN),
    [data, insurer, topN]
  );

  const boxRefs = useRef({});

  if (!funnel) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#999', fontFamily: FONT.family }}>
        No funnel data available.
      </div>
    );
  }

  const { shoppers, retained, wonFrom, lostTo, customerBase } = funnel;
  const insurerMode = !!insurer;
  const flows = funnel.flows || [];
  const maxFlowCount = flows.length ? Math.max(...flows.map((f) => f.count)) : 1;

  const setRef = (id) => (el) => {
    if (el) boxRefs.current[id] = el;
  };

  return (
    <div style={{ fontFamily: FONT.family, overflow: 'auto' }}>
      <div
        data-funnel-container
        style={{ position: 'relative', padding: 20, maxWidth: 1200 }}
      >
        {/* Stage headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(120px, 15%) minmax(200px, 35%) minmax(280px, 50%)',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 'bold',
              color: COLORS.grey,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '6px 0',
              backgroundColor: COLORS.lightGrey,
              borderRadius: 4,
              textAlign: 'center',
            }}
          >
            Pre-Renewal
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 'bold',
              color: COLORS.grey,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '6px 0',
              backgroundColor: COLORS.lightGrey,
              borderRadius: 4,
              textAlign: 'center',
            }}
          >
            Shopping Behaviour
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 'bold',
              color: COLORS.grey,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '6px 0',
              backgroundColor: COLORS.lightGrey,
              borderRadius: 4,
              textAlign: 'center',
            }}
          >
            Outcomes
          </div>
        </div>

        {/* Main grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(120px, 15%) minmax(200px, 35%) minmax(280px, 50%)',
            alignItems: 'start',
            gap: 12,
          }}
        >
          {/* Column 1: Pre-renewal */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div ref={setRef('pre-renewal')} data-flow-id="pre-renewal">
              <FunnelBox
                label={funnel.preRenewalShare.label}
              pct={funnel.preRenewalShare.pct}
              count={funnel.preRenewalShare.count}
              semanticColor={getSemanticColor(
                'pre-renewal',
                funnel.preRenewalShare.pct,
                funnel.preRenewalShare.marketPct,
                funnel.preRenewalShare.count,
                insurerMode
              )}
              marketPct={funnel.preRenewalShare.marketPct}
              delta={funnel.preRenewalShare.delta}
              insurerMode={insurerMode}
            />
            </div>
          </div>

          {/* Column 2: Shopping behaviour */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div ref={setRef('new-biz')}>
              <FunnelBox
                label={funnel.newBusiness.label}
                pct={funnel.newBusiness.pct}
                count={funnel.newBusiness.count}
                semanticColor={getSemanticColor(
                  'new-biz',
                  funnel.newBusiness.pct,
                  funnel.newBusiness.marketPct,
                  funnel.newBusiness.count,
                  insurerMode
                )}
                marketPct={funnel.newBusiness.marketPct}
                delta={funnel.newBusiness.delta}
                insurerMode={insurerMode}
              />
            </div>
            <div ref={setRef('non-shoppers')}>
              <FunnelBox
                label={funnel.nonShoppers.label}
                pct={funnel.nonShoppers.pct}
                count={funnel.nonShoppers.count}
                semanticColor={getSemanticColor(
                  'non-shoppers',
                  funnel.nonShoppers.pct,
                  funnel.nonShoppers.marketPct,
                  funnel.nonShoppers.count,
                  insurerMode
                )}
                marketPct={funnel.nonShoppers.marketPct}
                delta={funnel.nonShoppers.delta}
                insurerMode={insurerMode}
              />
            </div>
            <div>
              <div ref={setRef('shoppers')}>
                <FunnelBox
                  label={shoppers.label}
                  pct={shoppers.pct}
                  count={shoppers.count}
                  semanticColor={getSemanticColor(
                    'shoppers',
                    shoppers.pct,
                    shoppers.marketPct,
                    shoppers.count,
                    insurerMode
                  )}
                  marketPct={shoppers.marketPct}
                  delta={shoppers.delta}
                  insurerMode={insurerMode}
                  compact
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, marginLeft: 8 }}>
                <div ref={setRef('shop-stay')}>
                  <FunnelBox
                    label={shoppers.shopStay.label}
                    pct={shoppers.shopStay.pct}
                    count={shoppers.shopStay.count}
                    semanticColor={getSemanticColor(
                      'shop-stay',
                      shoppers.shopStay.pct,
                      shoppers.shopStay.marketPct,
                      shoppers.shopStay.count,
                      insurerMode
                    )}
                    marketPct={shoppers.shopStay.marketPct}
                    delta={shoppers.shopStay.delta}
                    insurerMode={insurerMode}
                    compact
                  />
                </div>
                <div ref={setRef('shop-switch')}>
                  <FunnelBox
                    label={shoppers.shopSwitch.label}
                    pct={shoppers.shopSwitch.pct}
                    count={shoppers.shopSwitch.count}
                    semanticColor={getSemanticColor(
                      'shop-switch',
                      shoppers.shopSwitch.pct,
                      shoppers.shopSwitch.marketPct,
                      shoppers.shopSwitch.count,
                      insurerMode
                    )}
                    marketPct={shoppers.shopSwitch.marketPct}
                    delta={shoppers.shopSwitch.delta}
                    insurerMode={insurerMode}
                    compact
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Outcomes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div ref={setRef('won-from')}>
              <OutcomeBreakdownList
                label={wonFrom.label}
                items={wonFrom.breakdown}
                borderColor={COLORS.green}
              />
            </div>
            <div ref={setRef('retained')}>
              <FunnelBox
                label={retained.label}
                pct={retained.pct}
                count={retained.count}
                semanticColor={getSemanticColor(
                  'retained',
                  retained.pct,
                  retained.marketPct,
                  retained.count,
                  insurerMode
                )}
                marketPct={retained.marketPct}
                delta={retained.delta}
                insurerMode={insurerMode}
              />
            </div>
            {lostTo && (
              <div ref={setRef('lost-to')}>
                <OutcomeBreakdownList
                  label={lostTo.label}
                  items={lostTo.breakdown}
                  borderColor={COLORS.red}
                />
              </div>
            )}
            <FunnelBox
              label={funnel.afterRenewalShare.label}
              pct={funnel.afterRenewalShare.pct}
              count={funnel.afterRenewalShare.count}
              semanticColor={getSemanticColor(
                'after-renewal',
                funnel.afterRenewalShare.pct,
                funnel.afterRenewalShare.marketPct,
                funnel.afterRenewalShare.count,
                insurerMode
              )}
              marketPct={funnel.afterRenewalShare.marketPct}
              delta={funnel.afterRenewalShare.delta}
              insurerMode={insurerMode}
            />
            <div
              style={{
                backgroundColor: '#B8E4F0',
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

        <FlowArrows flows={flows} boxRefs={boxRefs} maxCount={maxFlowCount} />
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
