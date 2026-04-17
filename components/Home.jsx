/* Home.jsx — three home screen variations */

// Empty-state defaults so home screens render before any data is logged.
const EMPTY_WEIGHT = { date: new Date().toISOString().slice(0,10), weight: 0 };

// Variation A: Single dashboard — all four modules visible, scrollable
function HomeDashboard({ store, go }) {
  const hasWeights = (store.weights || []).length > 0;
  const latest = hasWeights ? store.weights[store.weights.length - 1] : EMPTY_WEIGHT;
  const prev = (store.weights || [])[store.weights.length - 2] || latest;
  const filled = fillGaps(store.weights);
  const smoothed = smoothWeights(filled);

  const active = store.activeFast;
  const now = new Date(today().getTime() + 9.5 * 3600 * 1000);
  const elapsedH = active ? (now - new Date(active.start)) / 3600000 : 0;
  const stage = stageAt(elapsedH);

  const lastHR = [...store.hr].filter(h => h.tag === 'resting').slice(-1)[0];
  const lastW = store.workouts[store.workouts.length - 1];

  return (
    <div style={{ padding: '12px 16px 120px' }}>
      <TopGreet name={store.profile.name} onProfile={() => go('profile')}/>

      {/* Weight */}
      <Card padding={18} accent="var(--accent-violet)" onClick={() => go('weight')} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Weight</div>
            {hasWeights ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <div className="tnum" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.03em' }}>{latest.weight.toFixed(1)}</div>
                  <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>lb</div>
                </div>
                {prev && prev !== latest && (
                  <div className="tnum" style={{ fontSize: 11, color: latest.weight < prev.weight ? 'var(--ok)' : 'var(--accent-amber)' }}>
                    {latest.weight < prev.weight ? '▼' : '▲'} {Math.abs(latest.weight - prev.weight).toFixed(1)}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--fg-3)', marginTop: 6 }}>Tap to log your first weigh‑in</div>
            )}
          </div>
          {hasWeights && (
            <LineChart data={smoothed.slice(-30)} w={160} h={60}
              stroke="var(--accent-violet)" fill="rgba(180,140,255,0.1)"
              goal={store.profile.goal}/>
          )}
        </div>
      </Card>

      {/* Fasting */}
      <Card padding={18} accent="var(--accent-teal)" onClick={() => go('fast')} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Fasting</div>
              {active && <Pill color={stage.color} bg={`color-mix(in oklch, ${stage.color} 15%, transparent)`}>{stage.name}</Pill>}
            </div>
            <div className="tnum" style={{ fontSize: 32, fontWeight: 500, marginTop: 4, letterSpacing: '-0.03em', color: active ? 'var(--fg-0)' : 'var(--fg-3)' }}>
              {active ? `${Math.floor(elapsedH)}h ${Math.floor((elapsedH % 1)*60)}m` : 'Not fasting'}
            </div>
          </div>
          <Ring value={active ? Math.min(1, elapsedH/24) : 0} size={60} stroke={4} color={stage.color}>
            <Icon name="hourglass" size={20} color="var(--fg-2)"/>
          </Ring>
        </div>
      </Card>

      {/* HR + Workout row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <Card padding={14} accent="var(--accent-rose)" onClick={() => go('hr')}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Resting HR</div>
          <div className="tnum" style={{ fontSize: 24, fontWeight: 500, marginTop: 4, letterSpacing: '-0.02em' }}>
            {lastHR?.bpm || '—'}<span style={{ fontSize: 11, color: 'var(--fg-2)', marginLeft: 3 }}>bpm</span>
          </div>
          <Icon name="heart" size={16} color="var(--accent-rose)" style={{ marginTop: 6 }}/>
        </Card>
        <Card padding={14} accent="var(--accent-amber)" onClick={() => go('workout')}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Last lift</div>
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{lastW?.template || '—'}</div>
          <div style={{ fontSize: 10, color: 'var(--fg-2)' }}>{lastW ? fmtDate(new Date(lastW.start), { month:'short', day:'numeric' }) : ''}</div>
        </Card>
      </div>

      {/* Today preview */}
      <SectionTitle action={<Btn size="sm" variant="ghost" onClick={() => go('timeline')}>Full view</Btn>}>Today</SectionTitle>
      <Card padding={14} onClick={() => go('timeline')}>
        <TimelineRow color="var(--accent-teal)" icon="hourglass" label={active ? `Fasting · ${stage.name}` : 'No active fast'} time={active ? `${elapsedH.toFixed(1)}h` : ''}/>
        <TimelineRow color="var(--accent-violet)" icon="scale" label="Weigh-in" time={hasWeights ? latest.weight.toFixed(1) + ' lb' : '—'} last/>
      </Card>

      <div style={{ marginTop: 12 }}>
        <Btn variant="ghost" style={{ width: '100%' }} onClick={() => go('achievements')}>
          <Icon name="trophy" size={14}/>&nbsp;Achievements
        </Btn>
      </div>
    </div>
  );
}

function TimelineRow({ color, icon, label, time, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 0',
      borderBottom: last ? 'none' : '1px solid var(--line-soft)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 100,
        background: `color-mix(in oklch, ${color} 20%, transparent)`,
        color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name={icon} size={14}/></div>
      <div style={{ flex: 1, fontSize: 13 }}>{label}</div>
      <div className="tnum" style={{ fontSize: 12, color: 'var(--fg-2)' }}>{time}</div>
    </div>
  );
}

// Variation B: Today-focused hub — single hero card, small module tiles
function HomeHub({ store, go }) {
  const hasWeights = (store.weights || []).length > 0;
  const latest = hasWeights ? store.weights[store.weights.length - 1] : EMPTY_WEIGHT;
  const active = store.activeFast;
  const now = new Date(today().getTime() + 9.5 * 3600 * 1000);
  const elapsedH = active ? (now - new Date(active.start)) / 3600000 : 0;
  const stage = stageAt(elapsedH);

  const tiles = [
    { key: 'weight', label: 'Weight', icon: 'scale', color: 'var(--accent-violet)', value: hasWeights ? latest.weight.toFixed(1) : '—', unit: 'lb' },
    { key: 'fast', label: 'Fast', icon: 'hourglass', color: 'var(--accent-teal)', value: active ? Math.floor(elapsedH) + 'h' : '—', unit: active ? stage.name.toLowerCase() : 'idle' },
    { key: 'hr', label: 'HR', icon: 'heart', color: 'var(--accent-rose)', value: [...store.hr].filter(h=>h.tag==='resting').slice(-1)[0]?.bpm || '—', unit: 'bpm' },
    { key: 'workout', label: 'Workout', icon: 'dumbbell', color: 'var(--accent-amber)', value: store.workouts.length, unit: 'logged' },
  ];

  return (
    <div style={{ padding: '12px 16px 120px' }}>
      <TopGreet name={store.profile.name} onProfile={() => go('profile')}/>

      {/* Hero — the thing demanding attention right now */}
      <Card padding={24} style={{
        marginBottom: 16,
        background: active
          ? `linear-gradient(160deg, color-mix(in oklch, ${stage.color} 28%, var(--bg-2)), var(--bg-2))`
          : 'var(--bg-2)',
        textAlign: 'center',
      }} onClick={() => go('fast')}>
        {active ? (
          <>
            <Pill color={stage.color} bg="rgba(0,0,0,0.2)" style={{ marginBottom: 14 }}>
              <span style={{ width: 6, height: 6, borderRadius: 100, background: stage.color, animation: 'slow-breath 2s ease-in-out infinite' }}/>
              Stage · {stage.name}
            </Pill>
            <div className="tnum" style={{ fontSize: 54, fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {Math.floor(elapsedH)}<span style={{ fontSize: 22, color: 'var(--fg-2)', marginLeft: 4 }}>h</span>
              <span style={{ marginLeft: 10 }}>{Math.floor((elapsedH%1)*60)}</span>
              <span style={{ fontSize: 22, color: 'var(--fg-2)', marginLeft: 4 }}>m</span>
            </div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 10 }}>
              Fasting since {fmtTime(new Date(active.start))}
            </div>
          </>
        ) : (
          <>
            <Icon name="hourglass" size={36} color="var(--fg-2)"/>
            <div style={{ fontSize: 20, fontWeight: 500, marginTop: 10 }}>Not fasting</div>
          </>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {tiles.map(t => (
          <Card key={t.key} padding={14} onClick={() => go(t.key)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 10,
                background: `color-mix(in oklch, ${t.color} 20%, transparent)`,
                color: t.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name={t.icon} size={14}/></div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t.label}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
              <div className="tnum" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{t.value}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-2)' }}>{t.unit}</div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Btn variant="ghost" onClick={() => go('timeline')}><Icon name="timeline" size={14}/>&nbsp;Timeline</Btn>
        <Btn variant="ghost" onClick={() => go('achievements')}><Icon name="trophy" size={14}/>&nbsp;Progress</Btn>
      </div>
    </div>
  );
}

// Variation C: Focus card — one big rotating primary metric, minimal chrome
function HomeFocus({ store, go }) {
  const [focus, setFocus] = React.useState(0);
  const hasWeights = (store.weights || []).length > 0;
  const latest = hasWeights ? store.weights[store.weights.length - 1] : EMPTY_WEIGHT;
  const prev = (store.weights || [])[store.weights.length - 2] || latest;
  const active = store.activeFast;
  const now = new Date(today().getTime() + 9.5 * 3600 * 1000);
  const elapsedH = active ? (now - new Date(active.start)) / 3600000 : 0;
  const stage = stageAt(elapsedH);
  const filled = fillGaps(store.weights);
  const smoothed = smoothWeights(filled);

  const toGoal = hasWeights ? latest.weight - store.profile.goal : 0;
  const weekAgo = smoothed[smoothed.length - 8]?.smooth ?? latest.weight;

  const slides = [
    {
      key: 'fast',
      color: 'var(--accent-teal)',
      pretitle: active ? `Fasting · ${stage.name}` : 'Not fasting',
      big: active ? `${Math.floor(elapsedH)}:${String(Math.floor((elapsedH%1)*60)).padStart(2,'0')}` : '—',
      sub: active ? `Started ${fmtTime(new Date(active.start))}` : 'Start anytime',
      action: () => go('fast'),
      ring: active ? Math.min(1, elapsedH/24) : 0,
    },
    {
      key: 'weight',
      color: 'var(--accent-violet)',
      pretitle: 'Weight · today',
      big: hasWeights ? latest.weight.toFixed(1) : '—',
      bigUnit: 'lb',
      sub: hasWeights ? `${toGoal.toFixed(1)} lb to goal · ${weekAgo > latest.weight ? '▼' : '▲'} ${Math.abs(weekAgo - latest.weight).toFixed(1)} 7d` : 'Log a weigh-in to start',
      action: () => go('weight'),
      ring: hasWeights ? Math.min(1, (200 - latest.weight) / Math.max(1, 200 - store.profile.goal)) : 0,
    },
    {
      key: 'workout',
      color: 'var(--accent-amber)',
      pretitle: 'Next · Push A',
      big: '4',
      bigUnit: 'exercises',
      sub: 'Suggested · last done 3 days ago',
      action: () => go('workout'),
      ring: 0.6,
    },
  ];

  const s = slides[focus];

  return (
    <div style={{ padding: '12px 16px 120px' }}>
      <TopGreet name={store.profile.name} onProfile={() => go('profile')}/>

      <Card padding={28} style={{
        marginBottom: 14,
        background: `linear-gradient(160deg, color-mix(in oklch, ${s.color} 24%, var(--bg-2)), var(--bg-2) 70%)`,
        minHeight: 320, display: 'flex', flexDirection: 'column',
      }} onClick={s.action}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: s.color, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
          {s.pretitle}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ring value={s.ring} size={200} stroke={3} color={s.color}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <div className="tnum" style={{ fontSize: 52, fontWeight: 500, letterSpacing: '-0.04em' }}>{s.big}</div>
              {s.bigUnit && <div style={{ fontSize: 15, color: 'var(--fg-2)' }}>{s.bigUnit}</div>}
            </div>
          </Ring>
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-1)', textAlign: 'center' }}>{s.sub}</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          {slides.map((_, i) => (
            <div key={i} onClick={(e) => { e.stopPropagation(); setFocus(i); }} style={{
              width: i === focus ? 24 : 6, height: 6, borderRadius: 100,
              background: i === focus ? s.color : 'var(--bg-4)',
              cursor: 'pointer', transition: 'width 300ms var(--ease)',
            }}/>
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { k: 'weight', i: 'scale', c: 'var(--accent-violet)' },
          { k: 'fast', i: 'hourglass', c: 'var(--accent-teal)' },
          { k: 'hr', i: 'heart', c: 'var(--accent-rose)' },
          { k: 'workout', i: 'dumbbell', c: 'var(--accent-amber)' },
        ].map(t => (
          <button key={t.k} onClick={() => go(t.k)} style={{
            aspectRatio: '1', background: 'var(--bg-2)', border: '1px solid var(--line-soft)',
            borderRadius: 16, color: t.c, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name={t.i} size={22}/></button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Btn variant="ghost" onClick={() => go('timeline')}><Icon name="timeline" size={14}/>&nbsp;Today</Btn>
        <Btn variant="ghost" onClick={() => go('achievements')}><Icon name="trophy" size={14}/>&nbsp;Achievements</Btn>
      </div>
    </div>
  );
}

function TopGreet({ name, onProfile }) {
  const safeName = name || 'there';
  const initial = (name && name[0]) || 'P';
  const t0 = today();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, padding: '6px 0' }}>
      <div>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {fmtDate(t0, { weekday:'long' })} · {fmtDate(t0, { month:'short', day:'numeric' })}
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, marginTop: 2, letterSpacing: '-0.02em' }}>Hey, {safeName}</div>
      </div>
      <button onClick={onProfile} style={{
        width: 40, height: 40, borderRadius: 100,
        background: 'linear-gradient(135deg, var(--accent-lime), var(--accent-teal))',
        border: 'none', color: 'var(--accent-on-primary)', fontWeight: 700, cursor: 'pointer', fontSize: 15,
      }}>{initial}</button>
    </div>
  );
}

// Bottom tab bar used under every home variant
function BottomTabs({ current, go }) {
  const tabs = [
    { k: 'home', i: 'home', label: 'Home' },
    { k: 'weight', i: 'scale', label: 'Weight' },
    { k: 'fast', i: 'hourglass', label: 'Fast' },
    { k: 'hr', i: 'heart', label: 'HR' },
    { k: 'workout', i: 'dumbbell', label: 'Workout' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 22,
      background: 'color-mix(in oklch, var(--bg-1) 96%, transparent)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--line-soft)',
      padding: '6px 6px 8px', display: 'flex',
    }}>
      {tabs.map(t => (
        <button key={t.k} onClick={() => go(t.k)} style={{
          flex: 1, background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '6px 2px',
          color: current === t.k ? 'var(--fg-0)' : 'var(--fg-3)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          fontFamily: 'inherit',
        }}>
          <div style={{
            padding: '4px 14px', borderRadius: 100,
            background: current === t.k ? 'var(--bg-3)' : 'transparent',
          }}><Icon name={t.i} size={18}/></div>
          <div style={{ fontSize: 10, fontWeight: 500 }}>{t.label}</div>
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { HomeDashboard, HomeHub, HomeFocus, BottomTabs });
