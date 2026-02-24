import { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { FONT } from '../../utils/brandConstants';
import RenewalFunnel from './RenewalFunnel';

export default function RenewalJourney() {
  const { filteredData, selectedInsurer, mode } = useDashboard();
  const [topN, setTopN] = useState(5);

  const insurer = mode === 'insurer' ? selectedInsurer : null;

  if (!filteredData?.length) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#999', fontFamily: FONT.family }}>
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>The Renewal Journey</h2>
        <p>No flow data available. Ensure data is loaded and filters are applied.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT.family }}>
      {/* Controls */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24 }}>
        <label style={{ fontSize: 14, color: '#333' }}>
          Top brands in breakdown:
          <input
            type="range"
            min={3}
            max={8}
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            style={{ marginLeft: 8, verticalAlign: 'middle' }}
          />
          <span style={{ marginLeft: 8, fontWeight: 'bold' }}>{topN}</span>
        </label>
      </div>

      {/* Decision Funnel */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
          overflow: 'auto',
        }}
      >
        <RenewalFunnel data={filteredData} insurer={insurer} topN={topN} />
      </div>
    </div>
  );
}
