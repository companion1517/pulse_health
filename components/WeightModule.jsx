/* WeightModule.jsx — numeric keypad entry, trend, BMI, BF%, goal ETA */

function WeightEntryKeypad({ onSave, onClose, sex }) {
  const [raw, setRaw] = React.useState('');
  const [mode, setMode] = React.useState('weight'); // 'weight' | 'bf'

  const press = (k) => {
    if (k === 'del') return setRaw(r => r.slice(0, -1));
    if (k === '.' && raw.includes('.')) return;
    if (raw.replace('.', '').length >= 5) return;
    setRaw(r => r + k);
  };
  const val = raw || '0';
  const display = val.padStart(1, '0');

  const keys = ['1','2','3','4','5','6','7','8','9','.','0','del'];

  return (
    <div style={{ background: 'var(--bg-0)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--fg-1)', cursor: 'pointer', padding: 4 }}>
          <Icon name="close" size={22}/>
        </button>
        <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          New Entry
        </div>
        <div style={{ width: 22 }}/>
      </div>

      <div style={{ padding: '0 20px' }}>
        <Tabs value={mode} onChange={setMode} options={[
          { value: 'weight', label: 'Weight' },
          { value: 'bf', label: 'Body Fat %' },
        ]}/>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div style={{
          fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
        }}>{fmtDate(today(), { weekday: 'long', month:'long', day:'numeric' })}</div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div className="tnum" style={{
            fontSize: 88, fontWeight: 500, letterSpacing: '-0.04em',
            color: raw ? 'var(--accent-lime)' : 'var(--fg-3)',
            lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          }}>{display}</div>
          <div style={{ fontSize: 22, color: 'var(--fg-2)', fontWeight: 500 }}>
            {mode === 'weight' ? 'lb' : '%'}
          </div>
        </div>

        {mode === 'bf' && (
          <div style={{
            marginTop: 16, padding: '8px 14px', borderRadius: 100,
            background: 'var(--bg-2)', border: '1px solid var(--line-soft)',
            fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Navy method · {sex === 'female' ? 'waist + hip + neck' : 'waist + neck'}
          </div>
        )}

        {mode === 'bf' && raw && (
          <div style={{
            marginTop: 20, display: 'grid', gridTemplateColumns: sex === 'female' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8, width: '100%',
          }}>
            <MeasureField label="Waist" value="34.0" unit="in"/>
            <MeasureField label="Neck" value="15.5" unit="in"/>
            {sex === 'female' && <MeasureField label="Hip" value="40.0" unit="in"/>}
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {keys.map(k => (
            <button key={k} onClick={() => press(k)} style={{
              aspectRatio: '1.6 / 1', background: 'var(--bg-2)',
              border: '1px solid var(--line-soft)',
              borderRadius: 18, color: 'var(--fg-0)',
              fontSize: 24, fontWeight: 500, fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{k === 'del' ? <Icon name="back" size={22}/> : k}</button>
          ))}
        </div>
        <button onClick={() => raw && onSave(+raw, mode)} style={{
          marginTop: 12, width: '100%', padding: 16,
          background: raw ? 'var(--accent-lime)' : 'var(--bg-3)',
          color: raw ? 'var(--accent-on-primary)' : 'var(--fg-3)',
          border: 'none', borderRadius: 100,
          fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
          cursor: raw ? 'pointer' : 'not-allowed',
        }}>Save</button>
      </div>
    </div>
  );
}

function MeasureField({ label, value, unit }) {
  return (
    <div style={{
      background: 'var(--bg-2)', borderRadius: 12, padding: '10px 12px',
      border: '1px solid var(--line-soft)',
    }}>
      <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
        <div className="tnum" style={{ fontSize: 16, fontWeight: 600 }}>{value}</div>
        <div style={{ fontSize: 10, color: 'var(--fg-2)' }}>{unit}</div>
      </div>
    </div>
  );
}

function WeightModule({ store, setStore, onBack }) {
  const [entryOpen, setEntryOpen] = React.useState(false);
  const [range, setRange] = React.useState('30');

  const filled = React.useMemo(() => fillGaps(store.weights), [store.weights]);
  const smoothed = React.useMemo(() => smoothWeights(filled), [filled]);
  const rangeN = +range;
  const view = smoothed.slice(-rangeN);

  const latest = store.weights[store.weights.length - 1];
  const prev = store.weights[store.weights.length - 2];
  const weekAgo = smoothed[smoothed.length - 8]?.smooth ?? latest.weight;
  const monthAgo = smoothed[smoothed.length - 31]?.smooth ?? latest.weight;
  const trend = smoothed[smoothed.length - 1]?.smooth ?? latest.weight;

  const bmi = calcBMI(latest.weight, store.profile.height);
  const band = bmiBand(bmi);

  const latestBF = store.bodyFat[store.bodyFat.length - 1];

  const toGoal = latest.weight - store.profile.goal;
  const weeklyRate = (weekAgo - trend);
  const eta = weeklyRate > 0.1 ? Math.round(toGoal / weeklyRate) : null;

  if (entryOpen) return <WeightEntryKeypad
    sex={store.profile.sex}
    onClose={() => setEntryOpen(false)}
    onSave={(v, mode) => {
      if (mode === 'weight') {
        setStore(s => ({ ...s, weights: [...s.weights.filter(w => w.date !== iso(today())), { date: iso(today()), weight: v }].sort((a,b)=>a.date.localeCompare(b.date)) }));
      } else {
        setStore(s => ({ ...s, bodyFat: [...s.bodyFat, { date: iso(today()), value: v }] }));
      }
      setEntryOpen(false);
    }}
  />;

  return (
    <div style={{ padding: '12px 16px 120px' }}>
      <ModuleHeader icon="scale" title="Weight" onBack={onBack} accent="var(--accent-violet)"/>

      {/* Hero card */}
      <Card padding={20} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <div className="tnum" style={{ fontSize: 52, fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1 }}>{latest.weight.toFixed(1)}</div>
              <div style={{ fontSize: 18, color: 'var(--fg-2)' }}>lb</div>
            </div>
            <div className="tnum" style={{ fontSize: 13, color: latest.weight < prev.weight ? 'var(--ok)' : 'var(--accent-amber)', marginTop: 4 }}>
              {latest.weight < prev.weight ? '▼' : '▲'} {Math.abs(latest.weight - prev.weight).toFixed(1)} lb since last
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Pill color={band.color} bg="rgba(255,255,255,0.04)">{band.label}</Pill>
            <div className="tnum" style={{ fontSize: 22, fontWeight: 600, marginTop: 8 }}>{bmi.toFixed(1)}</div>
            <div style={{ fontSize: 10, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>BMI</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Trend · goal {store.profile.goal} lb
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['7','30','90'].map(r => (
              <button key={r} onClick={() => setRange(r)} style={{
                padding: '3px 10px', fontSize: 10, fontWeight: 600,
                border: 'none', background: range===r ? 'var(--bg-4)' : 'transparent',
                color: range===r ? 'var(--fg-0)' : 'var(--fg-2)', borderRadius: 100,
                cursor: 'pointer', fontFamily: 'var(--font-mono)',
              }}>{r}D</button>
            ))}
          </div>
        </div>
        <LineChart data={view} w={316} h={90}
          stroke="var(--accent-violet)" fill="rgba(180, 140, 255, 0.1)"
          goal={store.profile.goal} showDots/>
      </Card>

      {/* Goal projection */}
      <Card padding={16} style={{ marginBottom: 14 }} accent="var(--accent-lime)">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>To Goal</div>
            <div className="tnum" style={{ fontSize: 28, fontWeight: 500, marginTop: 2 }}>
              {toGoal.toFixed(1)} <span style={{ fontSize: 14, color: 'var(--fg-2)' }}>lb</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ETA</div>
            <div className="tnum" style={{ fontSize: 20, fontWeight: 500, marginTop: 2, color: 'var(--accent-lime)' }}>
              {eta != null ? `${eta} wk` : '—'}
            </div>
            <div className="tnum" style={{ fontSize: 10, color: 'var(--fg-2)' }}>
              {weeklyRate > 0 ? `-${weeklyRate.toFixed(2)} lb/wk` : 'rate too low'}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        <Stat label="7D" value={(trend - weekAgo).toFixed(1)} unit="lb"
              color={trend < weekAgo ? 'var(--ok)' : 'var(--fg-0)'}/>
        <Stat label="30D" value={(trend - monthAgo).toFixed(1)} unit="lb"
              color={trend < monthAgo ? 'var(--ok)' : 'var(--fg-0)'}/>
        <Stat label="Body Fat" value={latestBF.value.toFixed(1)} unit="%"/>
      </div>

      {/* Log */}
      <SectionTitle action={<Btn variant="ghost" size="sm"><Icon name="edit" size={12}/> Edit</Btn>}>Log · Last 14 days</SectionTitle>
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
        {[...store.weights].reverse().slice(0, 8).map((w, i) => {
          const d = new Date(w.date + 'T12:00');
          return (
            <div key={w.date} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 14px',
              borderBottom: i < 7 ? '1px solid var(--line-soft)' : 'none',
            }}>
              <div>
                <div style={{ fontSize: 13 }}>{fmtDate(d, { weekday:'short', month:'short', day:'numeric' })}</div>
              </div>
              <div className="tnum" style={{ fontSize: 15, fontWeight: 500 }}>{w.weight.toFixed(1)} <span style={{ color: 'var(--fg-2)', fontSize: 11 }}>lb</span></div>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button onClick={() => setEntryOpen(true)} style={{
        position: 'absolute', right: 20, bottom: 100,
        width: 60, height: 60, borderRadius: 20,
        background: 'var(--accent-lime)', color: 'var(--accent-on-primary)',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 10px 30px rgba(173, 230, 62, 0.3)',
      }}><Icon name="plus" size={26} strokeWidth={2.5}/></button>
    </div>
  );
}

function ModuleHeader({ icon, title, onBack, accent, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
      padding: '6px 0',
    }}>
      <button onClick={onBack} style={{
        width: 38, height: 38, borderRadius: 100,
        background: 'var(--bg-2)', border: '1px solid var(--line-soft)',
        color: 'var(--fg-0)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name="back" size={18}/></button>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 10,
          background: `color-mix(in oklch, ${accent} 18%, transparent)`,
          color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name={icon} size={16}/></div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</div>
      </div>
      {action}
    </div>
  );
}

Object.assign(window, { WeightModule, ModuleHeader });
