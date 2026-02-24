import { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  Background,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { buildFunnelData } from '../../utils/measures/renewalJourneyMeasures';
import { checkSuppression } from '../../utils/governance';
import { COLORS, FONT } from '../../utils/brandConstants';
import { formatGap } from '../../utils/formatters';

const TREND_ARROW = { up: '▲', down: '▼', flat: '—' };

// Layout constants: 1400x800 canvas, explicit grid
const CANVAS_W = 1400;
const CANVAS_H = 800;
const MARGIN = 20;

const COL_LEFT_X = 40;
const COL_MID_X = 490;
const COL_RIGHT_A_X = 940;
const COL_RIGHT_B_X = 1170;

const NODE_W_WIDE = 340;
const NODE_W_NARROW = 165;
const NODE_H = 90;
const OUTCOME_W_A = 220;
const OUTCOME_W_B = 210;
const OUTCOME_H_TALL = 130;
const OUTCOME_H_SHORT = 110;
const OUTCOME_H_SUMMARY = 120;

const ROW_1_Y = 290;
const ROW_2_Y = 410;
const ROW_3_Y = 520;
const ROW_4_Y = 640;

const RIGHT_WON_FROM_Y = 290;
const RIGHT_RETAINED_Y = 430;
const RIGHT_LOST_TO_Y = 500;
const RIGHT_SUMMARY_Y = 560;

const LEFT_CARD_Y = 480;
const LEFT_CARD_W = 260;
const LEFT_CARD_H = 120;

// Stage header widths (for alignment with columns)
const STAGE_LEFT_W = 300;
const STAGE_MID_W = 500;
const STAGE_RIGHT_W = 440;
const STAGE_GAP = 80;

function getSemanticColor(metricKey, value, marketValue, count, insurerMode) {
  const supp = checkSuppression(count ?? 0);
  if (!supp.show) return COLORS.lightGrey;

  if (!insurerMode) {
    if (metricKey === 'pre-renewal') return COLORS.yellow;
    return '#B8E4F0';
  }

  if (metricKey === 'pre-renewal') return COLORS.yellow;

  const processKeys = ['new-biz', 'non-shoppers', 'shoppers', 'shop-stay', 'shop-switch'];
  if (processKeys.includes(metricKey)) return '#B8E4F0';

  const delta = value != null && marketValue != null ? value - marketValue : null;
  if (delta === null) return '#B8E4F0';

  const favourableHigher = ['retained', 'after-renewal', 'pre-renewal'];
  const favourableLower = ['shop-switch'];
  const isGood =
    favourableHigher.includes(metricKey) ? delta > 0 :
    favourableLower.includes(metricKey) ? delta < 0 :
    delta > 0;
  return isGood ? COLORS.green : COLORS.red;
}

function FunnelBoxNode({ data }) {
  const {
    label,
    pct,
    count,
    semanticColor,
    marketPct,
    delta,
    insurerMode,
    compact,
    isOutcome,
  } = data;

  const pctStr = pct != null ? `${(pct * 100).toFixed(1)}%` : '—';
  const supp = checkSuppression(count ?? 0);
  const showMarket = insurerMode && marketPct != null && delta != null && supp.show;
  const trend = showMarket && delta !== 0 ? (delta > 0 ? 'up' : 'down') : 'flat';

  return (
    <div className="nodrag" style={{ minWidth: 140 }}>
      <Handle type="target" position={Position.Left} style={{ left: 0, visibility: 'hidden' }} />
      <div
        style={{
          backgroundColor: semanticColor,
          borderRadius: isOutcome ? 8 : compact ? 6 : 8,
          padding: compact ? 8 : 12,
          fontFamily: FONT.family,
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: isOutcome ? '0 2px 6px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.darkGrey, marginBottom: 4, letterSpacing: '0.3px' }}>{label}</div>
        <div style={{ fontSize: isOutcome ? 16 : 14, fontWeight: 'bold', color: '#111' }}>{pctStr}</div>
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
              {TREND_ARROW[trend]} {delta === 0 ? '—' : formatGap(delta, 'pct')}
            </span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ right: 0, visibility: 'hidden' }} />
    </div>
  );
}

function OutcomeListNode({ data }) {
  const { label, items, borderColor, backgroundColor } = data;

  return (
    <div className="nodrag" style={{ minWidth: 140 }}>
      <Handle type="target" position={Position.Left} style={{ left: 0, visibility: 'hidden' }} />
      <div
        style={{
          backgroundColor: backgroundColor || '#FAFAFA',
          borderRadius: 8,
          padding: 10,
          border: '1px solid rgba(0,0,0,0.06)',
          borderLeft: `6px solid ${borderColor}`,
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          fontFamily: FONT.family,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.darkGrey, marginBottom: 6, letterSpacing: '0.3px' }}>{label}</div>
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
      <Handle type="source" position={Position.Right} style={{ right: 0, visibility: 'hidden' }} />
    </div>
  );
}

function SummaryMergeNode({ data }) {
  const { afterRenewal, customerBase, semanticColor, insurerMode } = data;
  const pctStr = afterRenewal.pct != null ? `${(afterRenewal.pct * 100).toFixed(1)}%` : '—';
  const supp = checkSuppression(afterRenewal.count ?? 0);
  const showMarket = insurerMode && afterRenewal.marketPct != null && afterRenewal.delta != null && supp.show;
  const trend = showMarket && afterRenewal.delta !== 0 ? (afterRenewal.delta > 0 ? 'up' : 'down') : 'flat';

  return (
    <div className="nodrag" style={{ width: OUTCOME_W_B, minHeight: OUTCOME_H_SUMMARY }}>
      <Handle type="target" position={Position.Left} style={{ left: 0, visibility: 'hidden' }} />
      <div
        style={{
          backgroundColor: semanticColor,
          borderRadius: 8,
          padding: 10,
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          fontFamily: FONT.family,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.darkGrey, marginBottom: 4, letterSpacing: '0.3px' }}>
          After renewal market share
        </div>
        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#111' }}>{pctStr}</div>
        {afterRenewal.count != null && (
          <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>n={afterRenewal.count.toLocaleString()}</div>
        )}
        {showMarket && (
          <div style={{ fontSize: 11, color: COLORS.grey, marginTop: 4 }}>
            (Market: {(afterRenewal.marketPct * 100).toFixed(1)}%){' '}
            <span
              style={{
                color: afterRenewal.delta > 0 ? COLORS.green : afterRenewal.delta < 0 ? COLORS.red : COLORS.grey,
                fontWeight: 'bold',
              }}
            >
              {TREND_ARROW[trend]} {afterRenewal.delta === 0 ? '—' : formatGap(afterRenewal.delta, 'pct')}
            </span>
          </div>
        )}
        <div style={{ fontSize: 11, color: '#444', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          Retained {(customerBase.retained * 100).toFixed(1)}% · New business {(customerBase.newBusiness * 100).toFixed(1)}%
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ right: 0, visibility: 'hidden' }} />
    </div>
  );
}

const nodeTypes = {
  funnelBox: FunnelBoxNode,
  outcomeList: OutcomeListNode,
  summaryMerge: SummaryMergeNode,
};

function buildNodesAndEdges(funnel, insurerMode) {
  if (!funnel) return { nodes: [], edges: [] };

  const { shoppers, retained, wonFrom, lostTo, customerBase } = funnel;
  const flows = funnel.flows || [];
  const maxFlowCount = flows.length ? Math.max(...flows.map((f) => f.count)) : 1;

  const getColor = (key, metric) =>
    getSemanticColor(
      key,
      metric?.pct,
      metric?.marketPct,
      metric?.count,
      insurerMode
    );

  // Won-from: hide when n < 30 (sum of flows into won-from)
  const wonFromN = flows.filter((f) => f.to === 'won-from').reduce((s, f) => s + f.count, 0);
  const showWonFrom = checkSuppression(wonFromN).show;

  // Explicit layout: left column, middle column, right column (2x2 grid)
  const nodes = [
    // Left: Pre-renewal (centred vertically)
    {
      id: 'pre-renewal',
      type: 'funnelBox',
      position: { x: COL_LEFT_X, y: LEFT_CARD_Y },
      data: { ...funnel.preRenewalShare, semanticColor: getColor('pre-renewal', funnel.preRenewalShare), insurerMode },
      draggable: false,
      style: { width: LEFT_CARD_W },
    },
    // Middle: Shopping behaviour
    {
      id: 'new-biz',
      type: 'funnelBox',
      position: { x: COL_MID_X, y: ROW_1_Y },
      data: { ...funnel.newBusiness, semanticColor: getColor('new-biz', funnel.newBusiness), insurerMode },
      draggable: false,
      style: { width: NODE_W_WIDE },
    },
    {
      id: 'non-shoppers',
      type: 'funnelBox',
      position: { x: COL_MID_X, y: ROW_2_Y },
      data: { ...funnel.nonShoppers, semanticColor: getColor('non-shoppers', funnel.nonShoppers), insurerMode },
      draggable: false,
      style: { width: NODE_W_WIDE },
    },
    {
      id: 'shoppers',
      type: 'funnelBox',
      position: { x: COL_MID_X, y: ROW_3_Y },
      data: { ...shoppers, semanticColor: getColor('shoppers', shoppers), insurerMode, compact: true },
      draggable: false,
      style: { width: NODE_W_WIDE },
    },
    {
      id: 'shop-stay',
      type: 'funnelBox',
      position: { x: COL_MID_X, y: ROW_4_Y },
      data: { ...shoppers.shopStay, semanticColor: getColor('shop-stay', shoppers.shopStay), insurerMode, compact: true },
      draggable: false,
      style: { width: NODE_W_NARROW },
    },
    {
      id: 'shop-switch',
      type: 'funnelBox',
      position: { x: COL_MID_X + NODE_W_NARROW + 10, y: ROW_4_Y },
      data: { ...shoppers.shopSwitch, semanticColor: getColor('shop-switch', shoppers.shopSwitch), insurerMode, compact: true },
      draggable: false,
      style: { width: NODE_W_NARROW },
    },
    // Right column A (left half): Won from (suppress if n < 30), Lost to
    ...(showWonFrom
      ? [{
          id: 'won-from',
          type: 'outcomeList',
          position: { x: COL_RIGHT_A_X, y: RIGHT_WON_FROM_Y },
          data: {
            label: wonFrom.label,
            items: wonFrom.breakdown?.slice(0, 3) || [],
            borderColor: COLORS.green,
            backgroundColor: '#F8FAFA',
          },
          draggable: false,
          style: { width: OUTCOME_W_A, minHeight: OUTCOME_H_TALL },
        }]
      : []),
    ...(lostTo
      ? [{
          id: 'lost-to',
          type: 'outcomeList',
          position: { x: COL_RIGHT_A_X, y: RIGHT_LOST_TO_Y },
          data: {
            label: lostTo.label,
            items: lostTo.breakdown?.slice(0, 3) || [],
            borderColor: COLORS.red,
            backgroundColor: '#FFF8F8',
          },
          draggable: false,
          style: { width: OUTCOME_W_A, minHeight: OUTCOME_H_TALL },
        }]
      : []),
    // Right column B (right half): Retained, Summary (merged)
    {
      id: 'retained',
      type: 'funnelBox',
      position: { x: COL_RIGHT_B_X, y: RIGHT_RETAINED_Y },
      data: { ...retained, semanticColor: getColor('retained', retained), insurerMode, isOutcome: true },
      draggable: false,
      style: { width: OUTCOME_W_B },
    },
    {
      id: 'summary',
      type: 'summaryMerge',
      position: { x: COL_RIGHT_B_X, y: RIGHT_SUMMARY_Y },
      data: {
        afterRenewal: funnel.afterRenewalShare,
        customerBase,
        semanticColor: getColor('after-renewal', funnel.afterRenewalShare),
        insurerMode,
      },
      draggable: false,
      style: { width: OUTCOME_W_B },
    },
  ];

  // Edges: volume-weighted stroke (base 2px, +0.5 per 200 respondents, cap 6)
  const nodeIds = new Set(nodes.map((n) => n.id));
  const drawableFlows = flows.filter((f) => {
    if (f.count <= 0) return false;
    const toId = (f.to === 'after-renewal' || f.to === 'customer-base') ? 'summary' : f.to;
    return nodeIds.has(f.from) && nodeIds.has(toId);
  });

  const edges = drawableFlows.map(({ from, to, count }, i) => {
    const toId = (to === 'after-renewal' || to === 'customer-base') ? 'summary' : to;
    const strokeWidth = Math.min(6, 2 + (count / 200) * 0.5);
    return {
      id: `e-${from}-${toId}-${i}`,
      source: from,
      target: toId,
      type: 'default',
      animated: false,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: {
        stroke: COLORS.grey,
        strokeWidth: Math.max(2, strokeWidth),
      },
    };
  });

  return { nodes, edges };
}

export default function RenewalFunnel({ data, insurer, topN }) {
  const funnel = useMemo(
    () => buildFunnelData(data, insurer, topN),
    [data, insurer, topN]
  );

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildNodesAndEdges(funnel, !!insurer),
    [funnel, insurer]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { nodes: n, edges: e } = buildNodesAndEdges(funnel, !!insurer);
    setNodes(n);
    setEdges(e);
  }, [funnel, insurer, setNodes, setEdges]);

  if (!funnel) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#999', fontFamily: FONT.family }}>
        No funnel data available.
      </div>
    );
  }

  const diagramWidth = CANVAS_W;
  const diagramHeight = CANVAS_H;

  return (
    <div style={{ fontFamily: FONT.family, maxWidth: diagramWidth + 40 }}>
      {/* Stage headers - same width as diagram for alignment */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${STAGE_LEFT_W}px ${STAGE_GAP}px ${STAGE_MID_W}px ${STAGE_GAP}px ${STAGE_RIGHT_W}px`,
          gap: 0,
          marginBottom: 8,
          width: diagramWidth,
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
        <div />
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
        <div />
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

      <div
        style={{
          width: diagramWidth,
          height: diagramHeight,
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: '#FAFBFC',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.5}
          maxZoom={1.2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          preventScrolling={true}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant="dots" gap={16} size={1} color="#E5E7EB" style={{ opacity: 0.5 }} />
        </ReactFlow>
      </div>

      <div style={{ fontSize: 12, color: '#666', marginTop: 12 }}>
        Total: {funnel.total.toLocaleString()} respondents
        {insurer && funnel.insurerTotal != null && (
          <> · {insurer}: {funnel.insurerTotal.toLocaleString()}</>
        )}
      </div>
    </div>
  );
}
