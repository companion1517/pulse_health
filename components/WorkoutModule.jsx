/* WorkoutModule.jsx — flexible log, templates, progressive overload hints, HR zones */

function WorkoutModule({ store, setStore, onBack }) {
  const [view, setView] = React.useState('main'); // main | session | template

  if (view === 'session') return <ActiveSession store={store} setStore={setStore}
    onClose={() => setView('main')}/>;
  if (view === 'template') return <TemplatePicker store={store}
    onPick={() => setView('session')} onClose={() => setView('main')}/>;

  // Weekly volume (last 4 weeks) — day-of-week heat
  const vol = new Array(28).fill(0);
  const t0 = today();
  store.workouts.forEach(w => {
    const diff = Math.floor((t0 - new Date(w.start)) / DAY_MS);
    if (diff >= 0 && diff < 28) {
      const total = w.exercises.reduce((s, e) => s + e.sets.reduce((ss, st) => ss + st.weight * st.reps, 0), 0);
      vol[27 - diff] = total;
    }
  });

  const lastW = store.workouts[store.workouts.length - 1];

  return (
    <div style={{ padding: '12px 16px 120px' }}>
      <ModuleHeader icon="dumbbell" title="Workout" onBack={onBack} accent="var(--accent-amber)"/>

      {/* Start */}
      <Card padding={20} style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Ready?</div>
        <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 14, letterSpacing: '-0.02em' }}>Log a workout</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn style={{ flex: 1 }} onClick={() => setView('template')}><Icon name="play" size={14}/>&nbsp;From template</Btn>
          <Btn variant="ghost" style={{ flex: 1 }} onClick={() => setView('session')}>Freestyle</Btn>
        </div>
      </Card>

      {/* Templates */}
      <SectionTitle action={<Btn variant="ghost" size="sm"><Icon name="plus" size={12}/> New</Btn>}>Templates</SectionTitle>
      <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
        {store.templates.map(t => (
          <Card key={t.name} padding={14} onClick={() => setView('session')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>
                  {t.exercises.map(e => e.name).join(' · ')}
                </div>
              </div>
              <div style={{ color: 'var(--fg-2)' }}><Icon name="forward" size={18}/></div>
            </div>
          </Card>
        ))}
      </div>

      {/* Volume chart */}
      <SectionTitle>Volume · 28 days</SectionTitle>
      <Card padding={16} style={{ marginBottom: 14 }}>
        <BarChart data={vol} w={310} h={70} color="var(--accent-amber)"/>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          <span>4w ago</span><span>Today</span>
        </div>
      </Card>

      {/* Recent session */}
      {lastW && (
        <>
          <SectionTitle>Last session</SectionTitle>
          <Card padding={14}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{lastW.template}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-2)' }}>{fmtDate(new Date(lastW.start), { weekday:'short', month:'short', day:'numeric' })} · {lastW.duration} min</div>
              </div>
              <Pill color="var(--accent-amber)" bg="color-mix(in oklch, var(--accent-amber) 15%, transparent)">
                {lastW.exercises.length} exercises
              </Pill>
            </div>
            {lastW.exercises.map((ex, i) => (
              <div key={i} style={{
                padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 13 }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-2)' }}>
                    {ex.sets.map((s, j) => <span key={j}>{s.weight}×{s.reps}{j < ex.sets.length - 1 ? ' · ' : ''}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

function TemplatePicker({ store, onPick, onClose }) {
  return (
    <div style={{ padding: '12px 16px' }}>
      <ModuleHeader icon="dumbbell" title="Pick template" onBack={onClose} accent="var(--accent-amber)"/>
      {store.templates.map(t => (
        <Card key={t.name} padding={16} style={{ marginBottom: 10 }} onClick={onPick}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{t.name}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 6 }}>
            {t.exercises.length} exercises · {t.exercises.reduce((s, e) => s + e.sets.length, 0)} sets
          </div>
        </Card>
      ))}
    </div>
  );
}

function ActiveSession({ store, setStore, onClose }) {
  const tpl = store.templates[0]; // Push A
  const [exs, setExs] = React.useState(tpl.exercises.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s, done: false })) })));
  const [elapsed, setElapsed] = React.useState(0);
  const [liveHR, setLiveHR] = React.useState(118);
  const [restTimer, setRestTimer] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => {
      setElapsed(e => e + 1);
      setLiveHR(h => Math.max(85, Math.min(168, h + (Math.random() - 0.48) * 6)));
      setRestTimer(r => r > 0 ? r - 1 : 0);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const zones = hrZones(store.profile.age);
  const currentZone = zones.find(z => liveHR >= z.lo && liveHR <= z.hi) || zones[0];

  // Previous workout for this template for overload hints
  const prev = [...store.workouts].reverse().find(w => w.template === tpl.name);

  const toggleSet = (ei, si) => {
    setExs(list => list.map((e, i) => i !== ei ? e : {
      ...e, sets: e.sets.map((s, j) => j !== si ? s : { ...s, done: !s.done })
    }));
    setRestTimer(90);
  };

  const allDone = exs.every(e => e.sets.every(s => s.done));
  const fmtMS = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  return (
    <div style={{ padding: '12px 16px 120px', background: 'var(--bg-0)', minHeight: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
      }}>
        <button onClick={onClose} style={{
          width: 38, height: 38, borderRadius: 100,
          background: 'var(--bg-2)', border: '1px solid var(--line-soft)',
          color: 'var(--fg-0)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name="close" size={18}/></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{tpl.name}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>{fmtMS(elapsed)} elapsed</div>
        </div>
        <Btn size="sm" variant={allDone ? 'primary' : 'soft'} onClick={onClose}><Icon name="check" size={14}/>&nbsp;Finish</Btn>
      </div>

      {/* Live HR + rest */}
      <Card padding={14} style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live HR</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <div className="tnum" style={{ fontSize: 28, fontWeight: 600, color: currentZone.color }}>{Math.round(liveHR)}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-2)' }}>bpm</div>
          </div>
          <Pill color={currentZone.color} bg={`color-mix(in oklch, ${currentZone.color} 18%, transparent)`} style={{ marginTop: 4 }}>
            Z{currentZone.z} · {currentZone.name}
          </Pill>
        </div>
        <div style={{ width: 1, background: 'var(--line-soft)' }}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Rest</div>
          <div className="tnum" style={{ fontSize: 28, fontWeight: 600, marginTop: 4, color: restTimer > 0 ? 'var(--accent-lime)' : 'var(--fg-3)' }}>
            {fmtMS(restTimer)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--fg-2)', marginTop: 4 }}>{restTimer > 0 ? 'Recovering' : 'Ready'}</div>
        </div>
      </Card>

      {/* Exercise list */}
      {exs.map((ex, ei) => {
        const prevEx = prev?.exercises.find(p => p.name === ex.name);
        return (
          <Card key={ei} padding={14} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-2)' }}>{ex.group}</div>
              </div>
              {prevEx && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Last time</div>
                  <div className="tnum" style={{ fontSize: 12, color: 'var(--accent-lime)' }}>
                    {prevEx.sets[0].weight}×{prevEx.sets[0].reps}
                  </div>
                </div>
              )}
            </div>
            {ex.sets.map((s, si) => (
              <div key={si} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                borderTop: si === 0 ? '1px solid var(--line-soft)' : 'none',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 100,
                  background: s.done ? 'var(--accent-lime)' : 'transparent',
                  border: s.done ? 'none' : '1.5px solid var(--line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent-on-primary)', cursor: 'pointer',
                }} onClick={() => toggleSet(ei, si)}>
                  {s.done && <Icon name="check" size={14} strokeWidth={3}/>}
                </div>
                <div className="tnum" style={{ fontSize: 12, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)', width: 22 }}>{si + 1}</div>
                <div className="tnum" style={{
                  padding: '4px 10px', background: 'var(--bg-3)', borderRadius: 8,
                  fontSize: 14, fontWeight: 500, minWidth: 62, textAlign: 'center',
                }}>{s.weight} <span style={{ color: 'var(--fg-3)', fontSize: 10 }}>lb</span></div>
                <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>×</div>
                <div className="tnum" style={{
                  padding: '4px 10px', background: 'var(--bg-3)', borderRadius: 8,
                  fontSize: 14, fontWeight: 500, minWidth: 42, textAlign: 'center',
                }}>{s.reps}</div>
                {prevEx && prevEx.sets[si] && (
                  <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>
                    prev {prevEx.sets[si].weight}×{prevEx.sets[si].reps}
                  </div>
                )}
              </div>
            ))}
            <button style={{
              marginTop: 6, width: '100%', padding: 8,
              background: 'transparent', border: '1px dashed var(--line)',
              borderRadius: 10, color: 'var(--fg-2)',
              fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}><Icon name="plus" size={12}/> Add set</button>
          </Card>
        );
      })}
    </div>
  );
}

window.WorkoutModule = WorkoutModule;
