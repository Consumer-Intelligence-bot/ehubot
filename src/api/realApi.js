/**
 * Real API client for Shopping & Switching Dashboard.
 * Fetches from backend at /api/v1/ss. Used when VITE_USE_MOCKS is not set.
 */

const BASE = import.meta.env.VITE_API_BASE || '/api/v1/ss';

function buildUrl(path, params = {}) {
  const search = new URLSearchParams(params).toString();
  return `${BASE}${path}${search ? '?' + search : ''}`;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || res.statusText);
  }
  return res.json();
}

export async function getKpis(params) {
  return fetchJson(buildUrl('/kpis', params));
}

export async function getReasons(params) {
  return fetchJson(buildUrl('/reasons', params));
}

export async function getTrends(params) {
  return fetchJson(buildUrl('/trends', params));
}

export async function getFlows(params) {
  return fetchJson(buildUrl('/flows', params));
}

export async function getChannels(params) {
  return fetchJson(buildUrl('/channels', params));
}

export async function getComparison(params) {
  return fetchJson(buildUrl('/comparison', params));
}

export async function requestExport(body) {
  return fetchJson(buildUrl('/export'), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
