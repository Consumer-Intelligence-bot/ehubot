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

/**
 * Build decision funnel tree data for Renewal Journey.
 * Returns nodes with id, label, pct (0-1), count, children, breakdown (for Won from / Lost to).
 * @param {Array} data - filtered rows
 * @param {string|null} insurer - selected insurer (null = market view)
 * @param {number} topN - top N brands for Won from / Lost to
 */
export function buildFunnelData(data, insurer, topN = 3) {
  if (!data?.length) return null;

  const total = data.length;

  // Market: all data. Insurer: rows where insurer is involved (pre or post)
  const relevant = insurer
    ? data.filter((r) => r.PreRenewalCompany === insurer || r.CurrentCompany === insurer)
    : data;

  if (relevant.length === 0 && insurer) return null;

  const newToMarket = data.filter((r) => r.Switchers === 'New-to-market');
  const existing = data.filter((r) => r.Switchers !== 'New-to-market');
  const nonShoppers = existing.filter((r) => r.Shoppers === 'Non-shoppers');
  const shoppers = existing.filter((r) => r.Shoppers === 'Shoppers');
  const shopStay = shoppers.filter((r) => r.Switchers === 'Non-switcher');
  const shopSwitch = shoppers.filter((r) => r.Switchers === 'Switcher');

  const pct = (n, base) => (base > 0 ? n / base : 0);

  // Insurer-specific segments
  const insurerExisting = insurer ? existing.filter((r) => r.PreRenewalCompany === insurer) : [];
  const insurerNewBiz = insurer ? newToMarket.filter((r) => r.CurrentCompany === insurer) : [];
  const insurerNonShop = insurer ? insurerExisting.filter((r) => r.Shoppers === 'Non-shoppers') : [];
  const insurerShoppers = insurer ? insurerExisting.filter((r) => r.Shoppers === 'Shoppers') : [];
  const insurerShopStay = insurer ? insurerShoppers.filter((r) => r.Switchers === 'Non-switcher') : [];
  const insurerShopSwitch = insurer ? insurerShoppers.filter((r) => r.Switchers === 'Switcher') : [];

  const topBrandsByCount = (arr, brandField) => {
    const counts = {};
    arr.forEach((r) => {
      const b = r[brandField];
      if (b) counts[b] = (counts[b] || 0) + 1;
    });
    const base = arr.length || 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([brand, c]) => ({ brand, pct: c / base }));
  };

  if (insurer) {
    const insurerTotal = insurerExisting.length + insurerNewBiz.length;
    const preShare = total > 0 ? insurerExisting.length / total : 0;
    const afterShare = total > 0 ? relevant.filter((r) => r.CurrentCompany === insurer).length / total : 0;
    const retained = insurerNonShop.length + insurerShopStay.length;
    const retainedPct = insurerTotal > 0 ? retained / insurerTotal : 0;
    const newBizPct = insurerTotal > 0 ? insurerNewBiz.length / insurerTotal : 0;

    const lostTo = topBrandsByCount(
      data.filter((r) => r.Switchers === 'Switcher' && r.PreRenewalCompany === insurer),
      'CurrentCompany'
    );
    const switchersToUs = data.filter((r) => r.Switchers === 'Switcher' && r.CurrentCompany === insurer);
    const newBizToUs = newToMarket.filter((r) => r.CurrentCompany === insurer);
    const totalWon = switchersToUs.length + newBizToUs.length;
    const fromCounts = {};
    switchersToUs.forEach((r) => {
      const b = r.PreRenewalCompany;
      if (b) fromCounts[b] = (fromCounts[b] || 0) + 1;
    });
    if (newBizToUs.length > 0) fromCounts['New to market'] = newBizToUs.length;
    const wonFrom = Object.entries(fromCounts)
      .map(([brand, c]) => ({ brand, pct: totalWon > 0 ? c / totalWon : 0 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, topN);

    return {
      preRenewalShare: { label: 'Pre-renewal market share', pct: preShare, count: insurerExisting.length },
      newBusiness: {
        label: 'New business acquisition',
        pct: insurerTotal > 0 ? insurerNewBiz.length / insurerTotal : 0,
        count: insurerNewBiz.length,
      },
      nonShoppers: {
        label: 'Non-shoppers',
        pct: insurerExisting.length > 0 ? insurerNonShop.length / insurerExisting.length : 0,
        count: insurerNonShop.length,
      },
      shoppers: {
        label: 'Shoppers',
        pct: insurerExisting.length > 0 ? insurerShoppers.length / insurerExisting.length : 0,
        count: insurerShoppers.length,
        shopStay: {
          label: 'Shopped then stayed',
          pct: insurerShoppers.length > 0 ? insurerShopStay.length / insurerShoppers.length : 0,
          count: insurerShopStay.length,
        },
        shopSwitch: {
          label: 'Shopped then switched',
          pct: insurerShoppers.length > 0 ? insurerShopSwitch.length / insurerShoppers.length : 0,
          count: insurerShopSwitch.length,
        },
      },
      retained: { label: 'Retained', pct: retainedPct, count: retained },
      wonFrom: { label: 'Won from (top 3)', breakdown: wonFrom, count: wonFrom.reduce((s, b) => s + 1, 0) },
      lostTo: { label: 'Lost to (top 3)', breakdown: lostTo, count: lostTo.length },
      afterRenewalShare: { label: 'After renewal market share', pct: afterShare, count: relevant.filter((r) => r.CurrentCompany === insurer).length },
      customerBase: {
        retained: retainedPct,
        newBusiness: newBizPct,
      },
      total,
      insurerTotal,
    };
  }

  // Market view
  const newBizPct = pct(newToMarket.length, total);
  const existingPct = pct(existing.length, total);
  const nonShopPct = existing.length > 0 ? pct(nonShoppers.length, existing.length) : 0;
  const shopPct = existing.length > 0 ? pct(shoppers.length, existing.length) : 0;
  const shopStayPct = shoppers.length > 0 ? pct(shopStay.length, shoppers.length) : 0;
  const shopSwitchPct = shoppers.length > 0 ? pct(shopSwitch.length, shoppers.length) : 0;
  const retainedCount = nonShoppers.length + shopStay.length;
  const retainedPct = total > 0 ? retainedCount / total : 0;

  const switchedTo = topBrandsByCount(shopSwitch, 'CurrentCompany');

  return {
    preRenewalShare: { label: 'Pre-renewal market share', pct: 1, count: total },
    newBusiness: { label: 'New business acquisition', pct: newBizPct, count: newToMarket.length },
    nonShoppers: { label: 'Non-shoppers', pct: nonShopPct, count: nonShoppers.length },
    shoppers: {
      label: 'Shoppers',
      pct: shopPct,
      count: shoppers.length,
      shopStay: { label: 'Shopped then stayed', pct: shopStayPct, count: shopStay.length },
      shopSwitch: { label: 'Shopped then switched', pct: shopSwitchPct, count: shopSwitch.length },
    },
    retained: { label: 'Retained', pct: retainedPct, count: retainedCount },
    wonFrom: { label: 'Switched to (top 3)', breakdown: switchedTo, count: switchedTo.length },
    lostTo: null,
    afterRenewalShare: { label: 'After renewal market share', pct: 1, count: total },
    customerBase: {
      retained: retainedPct,
      newBusiness: newBizPct,
    },
    total,
    insurerTotal: null,
  };
}
