/**
 * Mock API for Shopping & Switching Dashboard.
 * Returns response shapes matching the API contract. Used when VITE_USE_MOCKS=true.
 * Includes at least 2 insurers with n < 30 to test suppression rendering.
 */

const BASE = '/api/v1/ss';

function buildUrl(path, params = {}) {
  const search = new URLSearchParams(params).toString();
  return `${BASE}${path}${search ? '?' + search : ''}`;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getKpis(params) {
  await delay(100);
  return {
    screen: params.screen || 'switch-or-stay',
    filters: {
      product: params.product || 'motor',
      timeRange: params.timeRange || 'latest',
      brand: params.brand || null,
      region: params.region || 'uk',
      ageGroup: params.ageGroup || 'all',
    },
    kpis: [
      {
        id: 'retention_rate',
        label: 'Retention Rate',
        market: { value: 0.72, n: 10200, ci_lower: 0.71, ci_upper: 0.73 },
        insurer: params.brand ? { value: 0.68, n: 340, ci_lower: 0.63, ci_upper: 0.73, smoothed_value: 0.69 } : null,
        confidence: 'publishable',
        format: 'percentage',
        trend: params.brand ? { previous_value: 0.65, direction: 'up', previous_n: 310 } : null,
      },
      {
        id: 'switch_rate',
        label: 'Switch Rate',
        market: { value: 0.28, n: 10200 },
        insurer: params.brand ? { value: 0.32, n: 340 } : null,
        confidence: 'publishable',
        format: 'percentage',
        trend: null,
      },
      {
        id: 'retention_rate_small',
        label: 'Retention (small sample)',
        market: { value: 0.72, n: 10200 },
        insurer: params.brand === 'small-mutual' ? { value: null, n: 22 } : null,
        confidence: params.brand === 'small-mutual' ? 'suppressed' : 'publishable',
        format: 'percentage',
        trend: null,
      },
    ],
    governance: { min_publishable: 50, min_indicative: 30, smoothing_applied: true },
  };
}

const REASONS_BY_GROUP = {
  'reasons-for-shopping': {
    surveyRef: 'Q8',
    reasons: [
      { code: 'Q8_1', label: "I usually shop around to make sure I'm getting the best deal", market_pct: 0.62, insurer_pct: 0.58 },
      { code: 'Q8_3', label: "My premium had gone up a lot compared with last year", market_pct: 0.45, insurer_pct: 0.51 },
      { code: 'Q8_5', label: "It's time to review my cover", market_pct: 0.38, insurer_pct: 0.42 },
      { code: 'Q8_7', label: "I wanted to see if I could save money", market_pct: 0.34, insurer_pct: 0.31 },
      { code: 'Q8_2', label: "My policy was due for renewal", market_pct: 0.28, insurer_pct: 0.25 },
    ],
  },
  'reasons-for-not-shopping': {
    surveyRef: 'Q19',
    reasons: [
      { code: 'Q19_1', label: "I was happy with my current insurer", market_pct: 0.71, insurer_pct: 0.68 },
      { code: 'Q19_3', label: "I didn't have time to shop around", market_pct: 0.42, insurer_pct: 0.45 },
      { code: 'Q19_5', label: "I assumed it would be too much hassle", market_pct: 0.28, insurer_pct: 0.31 },
      { code: 'Q19_2', label: "My premium hadn't changed much", market_pct: 0.24, insurer_pct: 0.22 },
      { code: 'Q19_4', label: "I'm loyal to my insurer", market_pct: 0.19, insurer_pct: 0.21 },
    ],
  },
  'reasons-for-switching': {
    surveyRef: 'Q31',
    reasons: [
      { code: 'Q31_1', label: "Found a cheaper quote elsewhere", market_pct: 0.58, insurer_pct: 0.62 },
      { code: 'Q31_3', label: "My premium went up too much", market_pct: 0.49, insurer_pct: 0.52 },
      { code: 'Q31_5', label: "Wanted better cover or terms", market_pct: 0.31, insurer_pct: 0.28 },
      { code: 'Q31_2', label: "Poor service from previous insurer", market_pct: 0.22, insurer_pct: 0.19 },
      { code: 'Q31_4', label: "Saw a good deal advertised", market_pct: 0.18, insurer_pct: 0.21 },
    ],
  },
};

async function getReasons(params) {
  await delay(80);
  const group = params.questionGroup || 'reasons-for-shopping';
  const config = REASONS_BY_GROUP[group] || REASONS_BY_GROUP['reasons-for-shopping'];
  const hasBrand = !!params.brand;
  return {
    questionGroup: group,
    surveyRef: config.surveyRef,
    base_n: { market: 5100, insurer: hasBrand ? 180 : null },
    confidence: 'publishable',
    reasons: config.reasons.map((r) => ({
      ...r,
      insurer_pct: hasBrand ? r.insurer_pct : null,
    })),
  };
}

async function getTrends(params) {
  await delay(80);
  return {
    metric: params.metric || 'retention_rate',
    points: [
      { period: '2025-Q1', market: { value: 0.71, n: 2400 }, insurer: params.brand ? { value: 0.66, n: 78, smoothed_value: 0.68 } : null, confidence: 'publishable' },
      { period: '2025-Q2', market: { value: 0.72, n: 2500 }, insurer: params.brand ? { value: 0.63, n: 45, smoothed_value: 0.67 } : null, confidence: 'indicative' },
    ],
  };
}

async function getFlows(params) {
  await delay(100);
  if (params.brand) {
    return {
      view: 'insurer',
      brand: params.brand,
      kpis: { gained: { value: 280, confidence: 'publishable' }, lost: { value: 305, confidence: 'publishable' }, net: { value: -25, direction: 'down' } },
      winning_from: [{ insurer: 'Direct Line', count: 52 }, { insurer: 'Churchill', count: 41 }],
      losing_to: [{ insurer: 'Direct Line', count: 45 }, { insurer: 'Admiral', count: 42 }],
      purchase_channels: [{ channel: 'PCW click-through', pct: 0.39 }, { channel: 'Direct web', pct: 0.34 }],
    };
  }
  return {
    view: 'market',
    total_switchers: 2850,
    matrix: {
      insurers: ['Aviva', 'Direct Line', 'Admiral', 'Churchill', 'AA'],
      flows: [
        { source: 'Aviva', destination: 'Direct Line', count: 45, suppressed: false },
        { source: 'Direct Line', destination: 'Aviva', count: 52, suppressed: false },
        { source: 'Churchill', destination: 'AA', count: 8, suppressed: true },
      ],
    },
    net_flows: [{ insurer: 'Admiral', gained: 320, lost: 210, net: 110 }, { insurer: 'Aviva', gained: 280, lost: 305, net: -25 }],
    purchase_channels: [{ channel: 'PCW click-through', pct: 0.42 }, { channel: 'Direct web', pct: 0.28 }],
    governance: { min_flow_cell: 10, suppressed_cells_hidden: true },
  };
}

async function getChannels(params) {
  await delay(80);
  return {
    channel_usage: [
      { channel: 'Q9b_3', label: 'PCW', market_pct: 0.68, insurer_pct: params.brand ? 0.72 : null },
      { channel: 'Q9b_1', label: 'Direct web', market_pct: 0.41, insurer_pct: params.brand ? 0.38 : null },
    ],
    pcw_share: [
      { pcw: 'Q11_1', label: 'MoneySupermarket', market_pct: 0.52, insurer_pct: params.brand ? 0.48 : null },
    ],
    base_n: { market: 5100, insurer: params.brand ? 180 : null },
    confidence: 'publishable',
  };
}

async function getComparison(params) {
  await delay(100);
  return {
    insurers: [
      { brand: 'admiral', label: 'Admiral', n: 520, confidence: 'publishable', retention_rate: { raw: 0.74, smoothed: 0.74, ci_lower: 0.70, ci_upper: 0.78 }, shopping_rate: 0.61, switch_rate: 0.26, net_flow: 110, trend: 'up' },
      { brand: 'aviva', label: 'Aviva', n: 340, confidence: 'publishable', retention_rate: { raw: 0.68, smoothed: 0.69, ci_lower: 0.63, ci_upper: 0.73 }, shopping_rate: 0.65, switch_rate: 0.32, net_flow: -25, trend: 'down' },
      { brand: 'small-mutual', label: 'Small Mutual', n: 22, confidence: 'suppressed', retention_rate: { raw: null, smoothed: null }, shopping_rate: null, switch_rate: null, net_flow: null, trend: null },
    ],
    market: { retention_rate: 0.72, shopping_rate: 0.63, switch_rate: 0.28 },
  };
}

async function requestExport(body) {
  await delay(200);
  return {
    download_url: `${BASE}/export/files/mock-abc123.xlsx`,
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    filename: `SS_${body.filters?.product || 'motor'}_${body.filters?.brand || 'market'}_${new Date().toISOString().slice(0, 7)}.xlsx`,
  };
}

export const mockApi = {
  getKpis,
  getReasons,
  getTrends,
  getFlows,
  getChannels,
  getComparison,
  requestExport,
};
