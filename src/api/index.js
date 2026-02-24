/**
 * API client for Shopping & Switching Dashboard.
 * Switches between mockApi and realApi based on VITE_USE_MOCKS.
 * @see docs/api-contract.md
 */

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

const api = useMocks
  ? await import('./mockApi.js').then(m => m.mockApi)
  : await import('./realApi.js');

export const getKpis = api.getKpis;
export const getReasons = api.getReasons;
export const getTrends = api.getTrends;
export const getFlows = api.getFlows;
export const getChannels = api.getChannels;
export const getComparison = api.getComparison;
export const requestExport = api.requestExport;
