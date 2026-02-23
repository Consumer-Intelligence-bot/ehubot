import { getConfidenceBannerInfo } from '../../utils/governance';
import { FONT } from '../../utils/brandConstants';

/**
 * Full-width confidence banner for insurer mode.
 * Props:
 *   n: number — sample size for selected insurer
 */
export default function ConfidenceBanner({ n }) {
  const { colour, label } = getConfidenceBannerInfo(n);

  return (
    <div style={{
      backgroundColor: colour,
      color: '#fff',
      fontFamily: FONT.family,
      fontSize: '12px',
      padding: '8px 16px',
      borderRadius: '4px',
      width: '100%',
    }}>
      {label} — based on {n} responses
    </div>
  );
}
