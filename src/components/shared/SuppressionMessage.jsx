import { FONT } from '../../utils/brandConstants';

/**
 * Displayed when data cannot be shown due to insufficient sample size.
 * Props:
 *   message: string — the reason for suppression (never blank when shown)
 */
export default function SuppressionMessage({ message }) {
  return (
    <div style={{
      padding: '24px',
      border: '1px dashed #ccc',
      borderRadius: '8px',
      backgroundColor: '#FAFAFA',
      textAlign: 'center',
      fontFamily: FONT.family,
      fontSize: FONT.body,
      color: '#666',
    }}>
      <p style={{ margin: 0 }}>
        <strong>Data suppressed</strong>
      </p>
      <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
        {message || 'Insufficient data for this view.'}
      </p>
    </div>
  );
}
