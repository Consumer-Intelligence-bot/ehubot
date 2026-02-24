import { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { getChannels } from '../../api';
import { FONT } from '../../utils/brandConstants';
import RenewalFunnel from './RenewalFunnel';

export default function RenewalJourney() {
  const { filteredData, selectedInsurer, mode, product } = useDashboard();
  const [channels, setChannels] = useState(null);

  const insurer = mode === 'insurer' ? selectedInsurer : null;

  useEffect(() => {
    if (!insurer || !product) {
      setChannels(null);
      return;
    }
    getChannels({ product, brand: insurer })
      .then(setChannels)
      .catch(() => setChannels(null));
  }, [insurer, product]);

  if (!filteredData?.length) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#999', fontFamily: FONT.family }}>
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>Shopping Journey</h2>
        <p>No flow data available. Ensure data is loaded and filters are applied.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT.family }}>
      <h2 style={{ fontSize: 24, marginBottom: 16 }}>
        Shopping Journey{insurer ? ` - ${insurer}` : ''}
      </h2>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
          overflow: 'auto',
        }}
      >
        <RenewalFunnel data={filteredData} insurer={insurer} channels={channels} />
      </div>
    </div>
  );
}
