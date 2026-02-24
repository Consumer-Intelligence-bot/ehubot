import { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { buildFunnelData } from '../../utils/measures/renewalJourneyMeasures';
import { checkSuppression } from '../../utils/governance';
import { COLORS, FONT } from '../../utils/brandConstants';
import { formatGap } from '../../utils/formatters';

const TREND_ARROW = { up: '▲', down: '▼', flat: '—' };

// Layout constants: 3 columns, left-to-right
const COL_WIDTH = 280;
const ROW_GAP = 16;
const COL_GAP = 40;

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
          borderRadius: 8,
          padding: compact ? 8 : 12,
          fontFamily: FONT.family,
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>{label}</div>
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
      </div>
      <Handle type="source" position={Position.Right} style={{ right: 0, visibility: 'hidden' }} />
    </div>
  );
}

function OutcomeListNode({ data }) {
  const { label, items, borderColor } = data;

  return (
    <div className="nodrag" style={{ minWidth: 140 }}>
      <Handle type="target" position={Position.Left} style={{ left: 0, visibility: 'hidden' }} />
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
      <Handle type="source" position={Position.Right} style={{ right: 0, visibility: 'hidden' }} />
    </div>
  );
}

function CustomerBaseNode({ data }) {
  const { retained, newBusiness } = data;

  return (
    <div className="nodrag" style={{ minWidth: 140 }}>
      <Handle type="target" position={Position.Left} style={{ left: 0, visibility: 'hidden' }} />
      <div
        style={{
          backgroundColor: '#B8E4F0',
          borderRadius: 8,
          padding: 10,
          border: '1px solid rgba(0,0,0,0.08)',
          fontFamily: FONT.family,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
          Customer base
        </div>
        <div style={{ fontSize: 11, color: '#444' }}>
          Retained {(retained * 100).toFixed(1)}% · New business {(newBusiness * 100).toFixed(1)}%
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ right: 0, visibility: 'hidden' }} />
    </div>
  );
}

const nodeTypes = {
  funnelBox: FunnelBoxNode,
  outcomeList: OutcomeListNode,
  customerBase: CustomerBaseNode,
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

  // Column 0: pre-renewal
  // Column 1: new-biz, non-shoppers, shoppers, shop-stay, shop-switch
  // Column 2: won-from, retained, lost-to, after-renewal, customer-base

  const col0Defs = [
    { id: 'pre-renewal', type: 'funnelBox', data: { ...funnel.preRenewalShare, semanticColor: getColor('pre-renewal', funnel.preRenewalShare), insurerMode } },
  ];
  const col1Defs = [
    { id: 'new-biz', type: 'funnelBox', data: { ...funnel.newBusiness, semanticColor: getColor('new-biz', funnel.newBusiness), insurerMode } },
    { id: 'non-shoppers', type: 'funnelBox', data: { ...funnel.nonShoppers, semanticColor: getColor('non-shoppers', funnel.nonShoppers), insurerMode } },
    { id: 'shoppers', type: 'funnelBox', data: { ...shoppers, semanticColor: getColor('shoppers', shoppers), insurerMode, compact: true } },
    { id: 'shop-stay', type: 'funnelBox', data: { ...shoppers.shopStay, semanticColor: getColor('shop-stay', shoppers.shopStay), insurerMode, compact: true } },
    { id: 'shop-switch', type: 'funnelBox', data: { ...shoppers.shopSwitch, semanticColor: getColor('shop-switch', shoppers.shopSwitch), insurerMode, compact: true } },
  ];
  const col2Defs = [
    { id: 'won-from', type: 'outcomeList', data: { label: wonFrom.label, items: wonFrom.breakdown, borderColor: COLORS.green } },
    { id: 'retained', type: 'funnelBox', data: { ...retained, semanticColor: getColor('retained', retained), insurerMode } },
    ...(lostTo ? [{ id: 'lost-to', type: 'outcomeList', data: { label: lostTo.label, items: lostTo.breakdown, borderColor: COLORS.red } }] : []),
    { id: 'after-renewal', type: 'funnelBox', data: { ...funnel.afterRenewalShare, semanticColor: getColor('after-renewal', funnel.afterRenewalShare), insurerMode } },
    { id: 'customer-base', type: 'customerBase', data: customerBase },
  ];

  const nodeDefs = [
    ...col0Defs.map((d, i) => ({ ...d, col: 0, row: i })),
    ...col1Defs.map((d, i) => ({ ...d, col: 1, row: i })),
    ...col2Defs.map((d, i) => ({ ...d, col: 2, row: i })),
  ];

  const NODE_HEIGHT = 80;
  const nodes = nodeDefs.map((n) => {
    const colNodes = nodeDefs.filter((d) => d.col === n.col);
    const rowInCol = colNodes.indexOf(n);
    const totalInCol = colNodes.length;
    const startY = (totalInCol - 1) * (NODE_HEIGHT + ROW_GAP) / -2;
    const y = 80 + startY + rowInCol * (NODE_HEIGHT + ROW_GAP);

    return {
      id: n.id,
      type: n.type,
      position: {
        x: n.col * (COL_WIDTH + COL_GAP),
        y,
      },
      data: n.data,
      draggable: false,
    };
  });

  // Edges: filter to only nodes we have, scale stroke by volume
  const nodeIds = new Set(nodes.map((n) => n.id));
  const drawableFlows = flows.filter((f) => f.count > 0 && nodeIds.has(f.from) && nodeIds.has(f.to));

  const edges = drawableFlows.map(({ from, to, count }, i) => ({
    id: `e-${from}-${to}-${i}`,
    source: from,
    target: to,
    type: 'smoothstep',
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: COLORS.grey,
      strokeWidth: Math.max(2, Math.min(10, 2 + (count / maxFlowCount) * 8)),
    },
  }));

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

  return (
    <div style={{ fontFamily: FONT.family }}>
      {/* Stage headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${COL_WIDTH}px ${COL_GAP}px ${COL_WIDTH}px ${COL_GAP}px ${COL_WIDTH}px`,
          gap: 0,
          marginBottom: 8,
          paddingLeft: 20,
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

      <div style={{ height: 520, border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
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
        />
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
