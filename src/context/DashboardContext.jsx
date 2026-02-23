import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { loadCSV } from '../utils/loadCSV';
import { addDerivedFields } from '../utils/deriveFields';
import { THRESHOLDS } from '../utils/brandConstants';

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const [rawData, setRawData] = useState([]);
  const [mode, setMode] = useState('market');
  const [selectedInsurer, setSelectedInsurer] = useState(null);
  const [product, setProduct] = useState('motor');
  const [timeWindow, setTimeWindow] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data on mount (filename from VITE_DATA_FILE env, fallback to demo)
  useEffect(() => {
    const dataFile = import.meta.env.VITE_DATA_FILE || 'motor_main_data.csv';
    loadCSV(dataFile)
      .then(rows => {
        const enriched = addDerivedFields(rows);
        setRawData(enriched);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Filter data by time window
  const filteredData = useMemo(() => {
    if (rawData.length === 0) return [];
    if (timeWindow === 'all') return rawData;

    const months = timeWindow === '12m' ? 12 : 24;
    const allMonths = [...new Set(rawData.map(r => r.RenewalYearMonth))].sort((a, b) => b - a);
    const cutoffMonths = allMonths.slice(0, months);
    return rawData.filter(r => cutoffMonths.includes(r.RenewalYearMonth));
  }, [rawData, timeWindow]);

  // Build insurer list (those meeting publishable threshold)
  const insurerList = useMemo(() => {
    const counts = {};
    filteredData.forEach(row => {
      const name = row.CurrentCompany;
      if (name) counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts)
      .filter(([_, count]) => count >= THRESHOLDS.publishable)
      .map(([name]) => name)
      .sort();
  }, [filteredData]);

  // TODO: REMOVE BEFORE DELIVERY — dev override for testing with demo data
  const devInsurerList = useMemo(() => {
    const counts = {};
    filteredData.forEach(row => {
      const name = row.CurrentCompany;
      if (name) counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts)
      .filter(([_, count]) => count >= THRESHOLDS.devOverride)
      .map(([name]) => name)
      .sort();
  }, [filteredData]);

  const value = {
    rawData,
    filteredData,
    mode,
    setMode,
    selectedInsurer,
    setSelectedInsurer,
    product,
    setProduct,
    timeWindow,
    setTimeWindow,
    insurerList,
    devInsurerList,
    loading,
    error,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
