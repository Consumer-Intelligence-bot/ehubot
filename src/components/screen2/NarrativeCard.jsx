import { COLORS, FONT } from '../../utils/brandConstants';

/**
 * NarrativeCard — insurer mode only.
 * Displays auto-generated narrative text with the insurer name bolded.
 * Left border in CI Magenta.
 */
export default function NarrativeCard({ insurer, text }) {
  if (!text || !insurer) return null;

  // Bold every occurrence of the insurer name in the text
  const parts = text.split(insurer);

  return (
    <div style={{
      backgroundColor: COLORS.white,
      borderRadius: '8px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
      padding: '16px',
      borderLeft: `4px solid ${COLORS.magenta}`,
      fontFamily: FONT.family,
      fontSize: '14px',
      lineHeight: '1.6',
      marginBottom: '24px',
    }}>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <strong>{insurer}</strong>}
          {part}
        </span>
      ))}
    </div>
  );
}
