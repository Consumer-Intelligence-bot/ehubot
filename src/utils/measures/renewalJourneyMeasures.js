/**
 * Renewal Journey measures (Screen 2 - Sankey diagram).
 * Builds nodes and links for Origin Brand → Engagement → Outcome → Destination.
 */

function filterByInsurer(data, insurer) {
  if (!insurer) return data;
  return data.filter((row) => row.CurrentCompany === insurer || row.PreRenewalCompany === insurer);
}

/**
 * Get engagement tier from row.
 * Tier 2: New to Market, Negotiated, Shopped, Did Not Shop
 */
function getEngagement(row) {
  if (row.Switchers === 'New-to-market') return 'New to Market';
  if (row.Shoppers === 'Shoppers' && row.Q34a === 'Yes') return 'Negotiated';
  if (row.Shoppers === 'Shoppers') return 'Shopped';
  if (row.Shoppers === 'Non-shoppers') return 'Did Not Shop';
  return 'Shopped'; // fallback
}

/**
 * Get outcome tier from row.
 */
function getOutcome(row) {
  if (row.Switchers === 'Switcher') return 'Switched';
  return 'Stayed';
}

/**
 * Get destination: CurrentCompany for switchers, "Renewed" for stayers.
 */
function getDestination(row) {
  if (row.Switchers === 'Switcher') return row.CurrentCompany || 'Other';
  return 'Renewed';
}

/**
 * Group brand into top-N or "Other".
 */
function groupBrand(brand, topBrands) {
  if (!brand) return 'Other';
  return topBrands.includes(brand) ? brand : 'Other';
}

/**
 * Build Sankey nodes and links for the renewal journey.
 * @param {Array} data - filtered rows
 * @param {string|null} insurer - selected insurer for focus mode
 * @param {number} topN - number of brands to show (rest as "Other")
 */
export function buildSankeyData(data, insurer, topN = 8) {
  const filtered = filterByInsurer(data, insurer);
  if (filtered.length === 0) return { nodes: [], links: [] };

  // Top N brands by PreRenewalCompany volume
  const originCounts = {};
  filtered.forEach((r) => {
    const b = r.PreRenewalCompany;
    if (b) originCounts[b] = (originCounts[b] || 0) + 1;
  });
  const topBrands = Object.entries(originCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([b]) => b);

  // Same for destination brands (switchers)
  const destCounts = {};
  filtered.filter((r) => r.Switchers === 'Switcher').forEach((r) => {
    const b = r.CurrentCompany;
    if (b) destCounts[b] = (destCounts[b] || 0) + 1;
  });
  const topDestBrands = Object.entries(destCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([b]) => b);

  // Aggregate flows: (origin, engagement, outcome, destination) -> count
  const flowCounts = {};
  filtered.forEach((row) => {
    const origin = groupBrand(row.PreRenewalCompany, topBrands);
    const engagement = getEngagement(row);
    const outcome = getOutcome(row);
    const dest = outcome === 'Switched' ? groupBrand(row.CurrentCompany, topDestBrands) : 'Renewed';
    const key = `${origin}|${engagement}|${outcome}|${dest}`;
    flowCounts[key] = (flowCounts[key] || 0) + 1;
  });

  // Build unique nodes with tier
  const nodeMap = new Map();
  const addNode = (name, tier) => {
    const id = `${tier}:${name}`;
    if (!nodeMap.has(id)) nodeMap.set(id, { id, name, tier });
  };

  Object.keys(flowCounts).forEach((key) => {
    const [origin, engagement, outcome, dest] = key.split('|');
    addNode(origin, 0);
    addNode(engagement, 1);
    addNode(outcome, 2);
    addNode(dest, 3);
  });

  const nodes = Array.from(nodeMap.values()).sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.name.localeCompare(b.name);
  });
  const nodeById = new Map(nodes.map((n, i) => [n.id, { ...n, index: i }]));

  // Build links (only between adjacent tiers)
  const links = [];
  Object.entries(flowCounts).forEach(([key, value]) => {
    const [origin, engagement, outcome, dest] = key.split('|');
    const n0 = nodeById.get(`0:${origin}`);
    const n1 = nodeById.get(`1:${engagement}`);
    const n2 = nodeById.get(`2:${outcome}`);
    const n3 = nodeById.get(`3:${dest}`);
    if (n0 && n1) links.push({ source: n0.index, target: n1.index, value });
    if (n1 && n2) links.push({ source: n1.index, target: n2.index, value });
    if (n2 && n3) links.push({ source: n2.index, target: n3.index, value });
  });

  // Deduplicate links (same source-target can come from different flows)
  const linkMap = new Map();
  links.forEach((l) => {
    const k = `${l.source}-${l.target}`;
    linkMap.set(k, { ...l, value: (linkMap.get(k)?.value || 0) + l.value });
  });

  return {
    nodes: nodes.map(({ id, name, tier }) => ({ id, name, tier })),
    links: Array.from(linkMap.values()).map(({ source, target, value }) => ({ source, target, value })),
  };
}
