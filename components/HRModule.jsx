/* HRModule.jsx — camera PPG with live waveform only during reading, no numeric readings */

function HRModule({ store, setStore, onBack }) {
  const [reading, setReading] = React.useState(false);
  const [phase, setPhase] = React.useState('idle'); // idle | aligning | locking | reading | done
  const [wave, setWave] = React.useState([]);
  const [result, setResult] = React.useState(null);
  const [tag, setTag] = React.useState('resting');
  const rafRef = React.useRef(0);
  const startRef = React.useRef(0);

  const zones = hrZones(store.profile.age);

  React.useEffect(() => {
    if (!reading) return;
    let t = 0; startRef.current = Date.now();
    setPhase('aligning');
    const a = setTimeout(() => setPhase('locking'), 1500);
    const b = setTimeout(() => setPhase('reading'), 3200);

    const tick = () => {
      t += 1;
      const elapsed = (Date.now() - startRef.current) / 1000;
      // Simulated ppg wave
      const bpm = 64 + Math.sin(elapsed * 0.3) * 3;
      const omega = (bpm / 60) * 2 * Math.PI;
      const y = Math.sin(omega * elapsed) * 0.6
              + Math.sin(omega * elapsed * 2) * 0.15
              - Math.cos(omega * elapsed * 0.5) * 0.1
              + (Math.random() - 0.5) * 0.04;
      setWave(w => [...w.slice(-120), y]);

      if (elapsed > 15) {
        setPhase('done');
        setResult({ bpm: Math.round(64 + (Math.random() - 0.5) * 4), quality: 'good' });
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); clearTimeout(a); clearTimeout(b); };
  }, [reading]);

  const saveReading = () => {
    setStore(s => ({ ...s, hr: [...s.hr, {
      id: 'h-' + Date.now(), time: new Date().toISOString(),
      bpm: result.bpm, tag,
    }]}));
    setReading(false); setPhase('idle'); setWave([]); setResult(null);
  };

  if (reading) {
    return <PPGReading phase={phase} wave={wave} result={result}
      onCancel={() => { setReading(false); setPhase('idle'); setWave([]); setResult(null); }}
      onSave={saveReading} tag={tag} setTag={setTag}/>;
  }

  // Resting HR trend
  const byDay = {};
  store.hr.forEach(h => {
    if (h.tag === 'resting') {
      const d = h.time.slice(0, 10);
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(h.bpm);
    }
  });
  const restingTrend = Object.keys(byDay).sort().map(d => ({
    date: d, weight: byDay[d].reduce((a,b)=>a+b,0)/byDay[d].length,
  }));

  const lastResting = [...store.hr].filter(h => h.tag === 'resting').slice(-1)[0];

  return (
    <div style={{ padding: '12px 16px 120px' }}>
      <ModuleHeader icon="heart" title="Heart Rate" onBack={onBack} accent="var(--accent-rose)"/>

      <Card padding={22} style={{ marginBottom: 14, textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 150, height: 150, margin: '0 auto' }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 100,
            border: '2px solid var(--accent-rose)', opacity: 0.4,
            animation: 'pulse-ring 2s ease-out infinite',
          }}/>
          <div style={{
            position: 'absolute', inset: 10, borderRadius: 100,
            background: 'color-mix(in oklch, var(--accent-rose) 20%, var(--bg-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-rose)',
          }}><Icon name="heart" size={54} strokeWidth={1.5}/></div>
        </div>
        <div style={{ fontSize: 14, color: 'var(--fg-1)', margin: '22px 0 4px', fontWeight: 500 }}>Place fingertip on camera</div>
        <div style={{ fontSize: 11, color: 'var(--fg-2)', marginBottom: 18 }}>
          Cover lens and flash fully · hold still · ~15 seconds
        </div>
        <Btn size="lg" onClick={() => setReading(true)}>
          <Icon name="heart" size={14}/>&nbsp;Take reading
        </Btn>
      </Card>

      {lastResting && (
        <Card padding={16} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Resting · latest</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <div className="tnum" style={{ fontSize: 34, fontWeight: 500, letterSpacing: '-0.03em' }}>{lastResting.bpm}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>bpm</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{fmtDate(new Date(lastResting.time), { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })}</div>
            </div>
            <LineChart data={restingTrend} w={140} h={50}
              stroke="var(--accent-rose)" fill="rgba(239, 119, 122, 0.08)"/>
          </div>
        </Card>
      )}

      {/* Zones */}
      <SectionTitle>HR Zones · age {store.profile.age}</SectionTitle>
      <Card padding={14} style={{ marginBottom: 14 }}>
        {zones.map((z, i) => (
          <div key={z.z} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 0',
            borderBottom: i < zones.length - 1 ? '1px solid var(--line-soft)' : 'none',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `color-mix(in oklch, ${z.color} 20%, transparent)`,
              color: z.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
            }}>Z{z.z}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{z.name}</div>
            </div>
            <div className="tnum" style={{ fontSize: 13, color: 'var(--fg-1)' }}>{z.lo}–{z.hi}</div>
          </div>
        ))}
      </Card>

      {/* Recent readings */}
      <SectionTitle>Recent readings</SectionTitle>
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
        {[...store.hr].reverse().slice(0, 6).map((r, i, arr) => (
          <div key={r.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px',
            borderBottom: i < arr.length - 1 ? '1px solid var(--line-soft)' : 'none',
          }}>
            <div>
              <div style={{ fontSize: 13 }}>{fmtDate(new Date(r.time), { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })}</div>
              <Pill style={{ marginTop: 4 }}>{r.tag}</Pill>
            </div>
            <div className="tnum" style={{ fontSize: 16, fontWeight: 500 }}>{r.bpm} <span style={{ color: 'var(--fg-2)', fontSize: 11 }}>bpm</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PPGReading({ phase, wave, result, onCancel, onSave, tag, setTag }) {
  const w = 360, h = 200;
  const path = wave.length > 1 ? wave.map((v, i) => {
    const x = (i / 120) * w;
    const y = h/2 + v * (h/2 - 20);
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ') : '';

  const msg = {
    aligning: 'Finding signal…',
    locking: 'Locking on…',
    reading: 'Reading…',
    done: 'Done',
  }[phase];

  return (
    <div style={{ background: '#000', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* Simulated red camera feed */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 35%, #6e1218 0%, #2a0507 60%, #0a0102 100%)',
        opacity: 0.9,
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: '100%',
        background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 70%)',
      }}/>

      <div style={{ position: 'relative', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onCancel} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', padding: 8, borderRadius: 100, display:'flex' }}>
          <Icon name="close" size={18}/>
        </button>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Camera PPG
        </div>
        <div style={{ width: 36 }}/>
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 32 }}>
        <div style={{
          position: 'absolute', top: '24%', left: '50%', transform: 'translateX(-50%)',
          fontSize: 13, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.85)',
          letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {phase !== 'done' && <div style={{ width: 8, height: 8, borderRadius: 100, background: '#e06565', animation: 'slow-breath 1s ease-in-out infinite' }}/>}
          {msg}
        </div>

        {/* Only the waveform — no numbers during reading */}
        <div style={{ width: w, height: h, position: 'relative' }}>
          <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
            {/* grid */}
            {[0.25, 0.5, 0.75].map(g => (
              <line key={g} x1={0} x2={w} y1={h*g} y2={h*g} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            ))}
            <path d={path} fill="none" stroke="#ff7a85" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 8px rgba(255,90,110,0.6))' }}/>
          </svg>
          {phase !== 'done' && (
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(255,120,140,0.8), transparent)',
              animation: 'scan 1.6s linear infinite',
            }}/>
          )}
        </div>
      </div>

      {phase === 'done' && (
        <div style={{
          position: 'relative', padding: 20,
          background: 'linear-gradient(180deg, transparent, #000 40%)',
        }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
            {['resting','post-coffee','post-workout'].map(t => (
              <button key={t} onClick={() => setTag(t)} style={{
                padding: '6px 12px', borderRadius: 100,
                background: tag === t ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.08)',
                color: tag === t ? '#000' : 'rgba(255,255,255,0.8)',
                border: 'none', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                textTransform: 'capitalize',
              }}>{t.replace('-', ' ')}</button>
            ))}
          </div>
          <Btn size="lg" style={{ width: '100%' }} onClick={onSave}>
            <Icon name="check" size={14}/>&nbsp;Save reading
          </Btn>
        </div>
      )}
    </div>
  );
}

window.HRModule = HRModule;
