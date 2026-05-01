// Striped SVG placeholder — deterministic, no fake product art
function StripedPlaceholder({ swatch, label, ratio = '4 / 5', mono = true, sublabel }) {
  const [a, b] = swatch;
  const stripeId = `s-${a.replace('#', '')}-${b.replace('#', '')}`;
  return (
    <div
      className="ph"
      style={{
        aspectRatio: ratio,
        background: a,
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        <defs>
          <pattern id={stripeId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={a} />
            <rect width="3" height="6" fill={b} />
          </pattern>
        </defs>
        <rect width="100" height="100" fill={`url(#${stripeId})`} />
      </svg>
      {label && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            color: 'rgba(255,255,255,0.78)',
            fontFamily: mono ? 'JetBrains Mono, ui-monospace, monospace' : 'Inter, sans-serif',
            fontSize: 11,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            textAlign: 'center',
            padding: '0 12px',
            mixBlendMode: 'difference',
          }}
        >
          <span style={{ opacity: 0.85 }}>{label}</span>
          {sublabel && <span style={{ opacity: 0.55, fontSize: 10 }}>{sublabel}</span>}
        </div>
      )}
    </div>
  );
}

window.StripedPlaceholder = StripedPlaceholder;
