/* UI primitives — buttons, cards, rings, mini charts */

const Card = ({ children, style, onClick, accent, padding = 18 }) => (
  <div onClick={onClick} style={{
    background: 'var(--bg-2)',
    border: '1px solid var(--line-soft)',
    borderRadius: 'var(--r-lg)',
    padding,
    position: 'relative',
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  }}>
    {accent && <div style={{
      position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent,
    }}/>}
    {children}
  </div>
);

const Pill = ({ children, color = 'var(--fg-2)', bg = 'rgba(255,255,255,0.04)', style }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 8px',
    borderRadius: 100,
    background: bg,
    color,
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    ...style,
  }}>{children}</span>
);

const Btn = ({ children, onClick, variant = 'primary', size = 'md', style, disabled }) => {
  const sizes = {
    sm: { padding: '8px 14px', fontSize: 12 },
    md: { padding: '12px 20px', fontSize: 14 },
    lg: { padding: '16px 24px', fontSize: 15 },
  };
  const variants = {
    primary: { background: 'var(--accent-lime)', color: 'var(--accent-on-primary)', border: '1px solid transparent' },
    ghost:   { background: 'transparent', color: 'var(--fg-0)', border: '1px solid var(--line)' },
    soft:    { background: 'var(--bg-3)', color: 'var(--fg-0)', border: '1px solid var(--line-soft)' },
    danger:  { background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      borderRadius: 100,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'transform 120ms var(--ease)',
      ...sizes[size], ...variants[variant], ...style,
    }}>{children}</button>
  );
};

// Progress ring — value 0..1
const Ring = ({ value = 0, size = 160, stroke = 10, color = 'var(--accent-lime)', track = 'var(--bg-3)', children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, value)) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 500ms var(--ease)' }}/>
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      }}>{children}</div>
    </div>
  );
};

// Sparkline / Line chart
const LineChart = ({ data, w = 320, h = 80, stroke = 'var(--accent-violet)', fill = 'rgba(186, 150, 255, 0.08)', goal, goalColor = 'var(--fg-3)', showDots = false, smoothKey = 'smooth' }) => {
  if (!data || data.length < 2) return <div style={{ width: w, height: h }}/>;
  const ys = data.map(d => d.weight).filter(x => x != null);
  const min = Math.min(...ys, goal || Infinity) - 1;
  const max = Math.max(...ys, goal || -Infinity) + 1;
  const xs = (i) => (i / (data.length - 1)) * w;
  const y = (v) => h - ((v - min) / (max - min)) * h;
  const linePts = data.map((d, i) => [xs(i), y(d[smoothKey] ?? d.weight)]);
  const rawPts  = data.map((d, i) => [xs(i), y(d.weight)]);
  const toPath = (pts) => pts.map((p,i) => (i===0?'M':'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = toPath(linePts) + ` L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      {goal != null && (
        <line x1={0} x2={w} y1={y(goal)} y2={y(goal)} stroke={goalColor} strokeDasharray="3 4" strokeWidth="1" opacity="0.7"/>
      )}
      <path d={area} fill={fill}/>
      <path d={toPath(linePts)} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {showDots && rawPts.map(([x,yy], i) => !data[i].interpolated && (
        <circle key={i} cx={x} cy={yy} r="2" fill={stroke} opacity="0.7"/>
      ))}
    </svg>
  );
};

// Bar chart
const BarChart = ({ data, w = 320, h = 80, color = 'var(--accent-amber)', bgColor = 'var(--bg-3)' }) => {
  const max = Math.max(...data, 1);
  const bw = w / data.length;
  return (
    <svg width={w} height={h}>
      {data.map((v, i) => {
        const bh = (v / max) * h;
        return <rect key={i} x={i*bw + 1} y={h - bh} width={bw - 2} height={bh} rx="2" fill={v > 0 ? color : bgColor}/>;
      })}
    </svg>
  );
};

// Tabs
const Tabs = ({ value, onChange, options }) => (
  <div style={{
    display: 'flex', background: 'var(--bg-2)', padding: 3,
    borderRadius: 100, gap: 2, border: '1px solid var(--line-soft)',
  }}>
    {options.map(o => (
      <button key={o.value} onClick={() => onChange(o.value)} style={{
        flex: 1, padding: '8px 10px', fontSize: 12, fontWeight: 600,
        border: 'none', cursor: 'pointer',
        background: value === o.value ? 'var(--bg-4)' : 'transparent',
        color: value === o.value ? 'var(--fg-0)' : 'var(--fg-2)',
        borderRadius: 100, fontFamily: 'inherit', letterSpacing: '-0.01em',
      }}>{o.label}</button>
    ))}
  </div>
);

// Stat tile
const Stat = ({ label, value, unit, delta, color, style }) => (
  <div style={{
    background: 'var(--bg-2)',
    border: '1px solid var(--line-soft)',
    borderRadius: 'var(--r-md)',
    padding: 14,
    ...style,
  }}>
    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--fg-2)' }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
      <div className="tnum" style={{ fontSize: 22, fontWeight: 600, color: color || 'var(--fg-0)', letterSpacing: '-0.02em' }}>{value}</div>
      {unit && <div style={{ fontSize: 11, color: 'var(--fg-2)' }}>{unit}</div>}
    </div>
    {delta != null && (
      <div className="tnum" style={{ fontSize: 11, color: delta < 0 ? 'var(--ok)' : delta > 0 ? 'var(--accent-amber)' : 'var(--fg-2)', marginTop: 2 }}>
        {delta > 0 ? '+' : ''}{delta}
      </div>
    )}
  </div>
);

// Section header
const SectionTitle = ({ children, action }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    marginBottom: 10, marginTop: 4,
  }}>
    <div style={{
      fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
      textTransform: 'uppercase', color: 'var(--fg-2)',
    }}>{children}</div>
    {action}
  </div>
);

Object.assign(window, { Card, Pill, Btn, Ring, LineChart, BarChart, Tabs, Stat, SectionTitle });
