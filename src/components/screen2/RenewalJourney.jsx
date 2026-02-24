import { useMemo, useState, useRef, useEffect } from 'react';
import { sankey, sankeyLeft, sankeyLinkHorizontal } from 'd3-sankey';
import { useDashboard } from '../../context/DashboardContext';
import { COLORS, FONT } from '../../utils/brandConstants';
import { buildSankeyData } from '../../utils/measures/renewalJourneyMeasures';

const NODE_COLORS = {
  0: COLORS.magenta,   // Origin brands
  1: COLORS.blue,      // Engagement
  2: (name) => (name === 'Stayed' ? COLORS.green : COLORS.red),  // Outcome
  3: COLORS.magenta,   // Destination brands
};

export default function RenewalJourney() {
  const { filteredData, selectedInsurer, mode } = useDashboard();
  const [topN, setTopN] = useState(8);
  const [hoveredLink, setHoveredLink] = useState(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const insurer = mode === 'insurer' ? selectedInsurer : null;

  const { nodes: rawNodes, links: rawLinks } = useMemo(
    () => buildSankeyData(filteredData, insurer, topN),
    [filteredData, insurer, topN]
  );

  const { graph, width, height } = useMemo(() => {
    if (rawNodes.length === 0 || rawLinks.length === 0) {
      return { graph: { nodes: [], links: [] }, width: 800, height: 400 };
    }

    const w = containerRef.current?.clientWidth || 800;
    const h = Math.max(400, Math.min(600, rawNodes.length * 20));

    const nodes = rawNodes.map((n) => ({ ...n }));
    const links = rawLinks.map((l) => ({ ...l }));

    const sankeyGenerator = sankey()
      .nodeWidth(20)
      .nodePadding(12)
      .extent([[0, 0], [w, h]])
      .nodeAlign(sankeyLeft);

    const graph = sankeyGenerator({ nodes, links });
    return { graph, width: w, height: h };
  }, [rawNodes, rawLinks]);

  const { nodes, links } = graph;

  const total = useMemo(() => {
    return links.reduce((s, l) => s + l.value, 0);
  }, [links]);

  const getNodeColor = (node) => {
    const tier = node.tier ?? Math.floor(node.depth);
    const c = NODE_COLORS[tier];
    return typeof c === 'function' ? c(node.name) : c || COLORS.grey;
  };

  const linkInvolvesBrand = (link) => {
    if (!insurer) return true;
    const src = link.source?.name ?? link.source;
    const tgt = link.target?.name ?? link.target;
    return String(src).toLowerCase().includes(insurer.toLowerCase()) ||
           String(tgt).toLowerCase().includes(insurer.toLowerCase());
  };

  const getLinkOpacity = (link) => {
    if (hoveredLink) {
      const same =
        link.source?.index === hoveredLink.source?.index &&
        link.target?.index === hoveredLink.target?.index;
      return same ? 0.9 : 0.08;
    }
    if (insurer && !linkInvolvesBrand(link)) return 0.1;
    return 0.4;
  };

  const getLinkStroke = (link) => {
    if (insurer && !linkInvolvesBrand(link)) return COLORS.grey;
    return getNodeColor(link.source);
  };

  if (rawNodes.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#999', fontFamily: FONT.family }}>
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>The Renewal Journey</h2>
        <p>No flow data available. Ensure data is loaded and filters are applied.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ fontFamily: FONT.family }}>
      {/* Controls */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24 }}>
        <label style={{ fontSize: 14, color: '#333' }}>
          Brands to show:
          <input
            type="range"
            min={5}
            max={15}
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            style={{ marginLeft: 8, verticalAlign: 'middle' }}
          />
          <span style={{ marginLeft: 8, fontWeight: 'bold' }}>{topN}</span>
        </label>
      </div>

      {/* Sankey */}
      <div
        style={{
          backgroundColor: COLORS.white,
          borderRadius: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
          padding: 16,
          overflow: 'auto',
        }}
      >
        <svg ref={svgRef} width={width} height={height} style={{ display: 'block' }}>
          <g>
            {links.map((link, i) => (
              <path
                key={i}
                d={sankeyLinkHorizontal()(link)}
                fill="none"
                stroke={getLinkStroke(link)}
                strokeOpacity={getLinkOpacity(link)}
                strokeWidth={Math.max(1, link.width)}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseEnter={() => setHoveredLink(link)}
                onMouseLeave={() => setHoveredLink(null)}
              >
                <title>
                  {link.source.name} → {link.target.name}: {link.value.toLocaleString()} (
                  {total > 0 ? ((link.value / total) * 100).toFixed(1) : 0}%)
                </title>
              </path>
            ))}
          </g>
          <g>
            {nodes.map((node) => (
              <g key={node.index} transform={`translate(${node.x0},${node.y0})`}>
                <rect
                  width={node.x1 - node.x0}
                  height={node.y1 - node.y0}
                  fill={getNodeColor(node)}
                  fillOpacity={0.9}
                  rx={2}
                />
                <text
                  x={(node.x1 - node.x0) / 2}
                  y={(node.y1 - node.y0) / 2}
                  dy="0.35em"
                  textAnchor="middle"
                  fontSize={11}
                  fill="#333"
                  fontFamily={FONT.family}
                >
                  {node.name}
                </text>
              </g>
            ))}
          </g>
        </svg>
        <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
          Total: {total.toLocaleString()} respondents · Hover over links for details
        </div>
      </div>
    </div>
  );
}
