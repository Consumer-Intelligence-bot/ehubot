export default function PlaceholderScreen({ title }) {
  return (
    <div style={{
      padding: '60px 40px',
      textAlign: 'center',
      fontFamily: 'Verdana',
      color: '#999',
    }}>
      <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>{title}</h2>
      <p>This screen will be available when additional data is connected.</p>
    </div>
  );
}
