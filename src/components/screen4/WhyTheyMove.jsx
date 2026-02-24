import { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { getReasons } from '../../api';
import ReasonChart from './ReasonChart';
import Placeholder from '../shared/Placeholder';
import {
  proxyReasonsForShopping,
  proxyReasonsForNotShopping,
  proxyReasonsForSwitching,
} from '../../utils/measures/whyTheyMoveMeasures';
import { FONT, COLORS } from '../../utils/brandConstants';

const SECTIONS = [
  {
    key: 'shopping',
    title: 'Why Customers Shop (Q8)',
    questionGroup: 'reasons-for-shopping',
    proxyFn: proxyReasonsForShopping,
    placeholderText: 'Requires response data file',
  },
  {
    key: 'switching',
    title: 'Why They Switched (Q31)',
    questionGroup: 'reasons-for-switching',
    proxyFn: proxyReasonsForSwitching,
    placeholderText: 'Requires response data file',
  },
  {
    key: 'not-shopping',
    title: "Why Customers Don't Shop (Q19)",
    questionGroup: 'reasons-for-not-shopping',
    proxyFn: proxyReasonsForNotShopping,
    placeholderText: 'Requires response data file',
  },
];

export default function WhyTheyMove() {
  const { filteredData, selectedInsurer, mode, product } = useDashboard();
  const insurerMode = mode === 'insurer' && selectedInsurer;

  const [apiData, setApiData] = useState({});
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setApiError(false);
    const load = async () => {
      const results = {};
      for (const s of SECTIONS) {
        try {
          const res = await getReasons({
            product: product || 'motor',
            brand: insurerMode ? selectedInsurer : null,
            questionGroup: s.questionGroup,
          });
          if (!cancelled && res?.reasons?.length) {
            results[s.key] = {
              reasons: res.reasons,
              base_n: res.base_n,
            };
          }
        } catch {
          if (!cancelled) setApiError(true);
        }
      }
      if (!cancelled) setApiData(results);
    };
    load();
    return () => { cancelled = true; };
  }, [insurerMode, selectedInsurer, product]);

  return (
    <div style={{ fontFamily: FONT.family }}>
      <h2 style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.darkGrey, marginBottom: 20 }}>
        Why They Move
      </h2>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
        Reasons behind shopping, switching, and not shopping. Actionable insight for insurers.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
        }}
      >
        {SECTIONS.map((section) => {
          const apiResult = apiData[section.key];
          const proxyReasons = section.proxyFn(filteredData);

          let content;
          if (apiResult?.reasons?.length) {
            content = (
              <ReasonChart
                title={section.title}
                reasons={apiResult.reasons}
                baseN={apiResult.base_n}
                insurerMode={!!insurerMode}
              />
            );
          } else if (proxyReasons?.length && apiError) {
            content = (
              <ReasonChart
                title={`${section.title} (proxy)`}
                reasons={proxyReasons}
                baseN={{ market: filteredData.length }}
                insurerMode={false}
              />
            );
          } else {
            content = (
              <Placeholder
                title={section.title}
                dataNeeded={section.placeholderText}
              />
            );
          }

          return <div key={section.key}>{content}</div>;
        })}
      </div>
    </div>
  );
}
