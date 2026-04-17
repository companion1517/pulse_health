/* FastModule.jsx — start/stop/edit, subtle stage badge, log */

function FastModule({ store, setStore, onBack }) {
  const [view, setView] = React.useState('main');
  const [editing, setEditing] = React.useState(null);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const active = store.activeFast;
  const now = new Date(today().getTime() + 9.5 * 3600 * 1000 + tick * 1000);
  const startD = active ? new Date(active.start) : null;
  const elapsedH = active ? (now - startD) / 3600000 : 0;
  const stage = stageAt(elapsedH);

  // Progress: next stage
  const nextStage = FAST_STAGES.find(s => s.h > elapsedH);
  const prevStageMark = FAST_STAGES.filter(s => s.h <= elapsedH).pop();
  const progressToNext = nextStage
    ? (elapsedH - prevStageMark.h) / (nextStage.h - prevStageMark.h)
    : 1;

  const formatDur = (h) => {
    const hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 60);
    const ss = Math.floor((((h - hh) * 60) - mm) * 60);
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  };

  if (view === 'edit' && editing) {
    return <FastEdit entry={editing}
      onSave={(upd) => {
        setStore(s => ({ ...s, fasts: s.fasts.map(f => f.id === upd.id ? upd : f) }));
        setView('main'); setEditing(null);
      }}
      onDelete={() => {
        setStore(s => ({ ...s, fasts: s.fasts.filter(f => f.id !== editing.id) }));
        setView('main'); setEditing(null);
      }}
      onClose={() => { setView('main'); setEditing(null); }}
    />;
  }

  return (
    <div style={{ padding: '12px 16px 120px' }}>
      <ModuleHeader icon="hourglass" title="Fast" onBack={onBack} accent="var(--accent-teal)"/>

      <Card padding={24} style={{ marginBottom: 14, textAlign: 'center' }}>
        {active ? (
          <>
            <div style={{
              display: 'inline-flex', gap: 6, padding: '4px 10px', borderRadius: 100,
              background: `color-mix(in oklch, ${stage.color} 15%, transparent)`,
              color: stage.color, fontSize: 10, fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
              marginBottom: 20,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 100, background: stage.color, animation: 'slow-breath 2s ease-in-out infinite', alignSelf: 'center' }}/>
              Stage · {stage.name}
            </div>

            <div style={{ position: 'relative', margin: '0 auto', width: 220, height: 220 }}>
              <Ring value={Math.min(1, elapsedH / 24)} size={220} stroke={4} color={stage.color} track="var(--bg-3)">
                <div className="tnum mono" style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em' }}>
                  {formatDur(elapsedH)}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  since {fmtTime(startD)}
                </div>
              </Ring>
            </div>

            <div style={{ marginTop: 18, fontSize: 12, color: 'var(--fg-2)' }}>
              {nextStage
                ? <>Next: <span style={{ color: 'var(--fg-0)', fontWeight: 500 }}>{nextStage.name}</span> in {formatDur(nextStage.h - elapsedH).slice(0,5)}</>
                : 'Deep fast'}
            </div>

            <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Btn variant="soft" size="md" onClick={() => setEditing({ id: 'active', start: active.start, end: null })}>
                <Icon name="edit" size={14}/>&nbsp;Edit start
              </Btn>
              <Btn variant="danger" size="md" onClick={() => {
                setStore(s => ({
                  ...s,
                  activeFast: null,
                  fasts: [...s.fasts, { id: 'f-new-' + Date.now(), start: active.start, end: now.toISOString() }],
                }));
              }}><Icon name="stop" size={14}/>&nbsp;End fast</Btn>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Not fasting</div>
            <div className="tnum" style={{ fontSize: 44, fontWeight: 500, margin: '16px 0', letterSpacing: '-0.03em' }}>
              {(() => {
                const lastFast = store.fasts[store.fasts.length - 1];
                if (!lastFast) return '—';
                const since = (now - new Date(lastFast.end)) / 3600000;
                return formatDur(since);
              })()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-2)', marginBottom: 20 }}>since last fast ended</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Btn onClick={() => {
                setStore(s => ({ ...s, activeFast: { start: now.toISOString() } }));
              }}><Icon name="play" size={14}/>&nbsp;Start now</Btn>
              <Btn variant="ghost" onClick={() => {
                const back = new Date(now.getTime() - 4 * 3600 * 1000);
                setStore(s => ({ ...s, activeFast: { start: back.toISOString() } }));
              }}>Already started</Btn>
            </div>
          </>
        )}
      </Card>

      {/* Stage rail */}
      <Card padding={14} style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Stages · Rule of thumb</div>
        <div style={{ position: 'relative', height: 52 }}>
          {/* rail */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 24, height: 2, background: 'var(--bg-3)' }}/>
          <div style={{
            position: 'absolute', left: 0, top: 24, height: 2,
            width: `${Math.min(100, (elapsedH / 24) * 100)}%`,
            background: stage.color,
          }}/>
          {FAST_STAGES.map((s, i) => {
            const pos = (s.h / 24) * 100;
            const reached = elapsedH >= s.h;
            return (
              <div key={s.name} style={{
                position: 'absolute', left: `${pos}%`, top: 0,
                transform: 'translateX(-50%)', textAlign: 'center',
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 100, margin: '19px auto 0',
                  background: reached ? s.color : 'var(--bg-4)',
                  border: `2px solid ${reached ? s.color : 'var(--line)'}`,
                }}/>
                <div style={{
                  fontSize: 9, fontFamily: 'var(--font-mono)',
                  color: reached ? s.color : 'var(--fg-3)',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  marginTop: 4, whiteSpace: 'nowrap',
                }}>{s.h}h</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Log */}
      <SectionTitle>Log · Last 30 days</SectionTitle>
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
        {[...store.fasts].reverse().slice(0, 6).map((f, i, arr) => {
          const s = new Date(f.start);
          const e = new Date(f.end);
          const dur = (e - s) / 3600000;
          return (
            <div key={f.id} onClick={() => { setEditing(f); setView('edit'); }}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', cursor: 'pointer',
                borderBottom: i < arr.length - 1 ? '1px solid var(--line-soft)' : 'none',
              }}>
              <div>
                <div style={{ fontSize: 13 }}>{fmtDate(s, { month:'short', day:'numeric' })}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-2)' }}>{fmtTime(s)} → {fmtTime(e)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="tnum" style={{ fontSize: 15, fontWeight: 500, color: dur >= 16 ? stageAt(dur).color : 'var(--fg-0)' }}>
                  {dur.toFixed(1)}h
                </div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stageAt(dur).name}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FastEdit({ entry, onSave, onDelete, onClose }) {
  const [start, setStart] = React.useState(new Date(entry.start));
  const [end, setEnd] = React.useState(entry.end ? new Date(entry.end) : null);

  const fmt = (d) => d ? d.toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '—';

  return (
    <div style={{ background: 'var(--bg-0)', height: '100%', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--fg-1)', cursor: 'pointer', padding: 4 }}>
          <Icon name="close" size={22}/>
        </button>
        <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Edit Fast</div>
        <div style={{ width: 22 }}/>
      </div>

      <Card padding={16} style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Start</div>
        <div style={{ fontSize: 20, marginTop: 6, fontWeight: 500 }}>{fmt(start)}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {[-60,-15,15,60].map(m => (
            <button key={m} onClick={() => setStart(new Date(start.getTime() + m*60000))} style={{
              padding: '6px 12px', borderRadius: 100, border: '1px solid var(--line)',
              background: 'transparent', color: 'var(--fg-1)', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
            }}>{m > 0 ? '+' : ''}{m}m</button>
          ))}
        </div>
      </Card>

      {end && (
        <Card padding={16} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>End</div>
          <div style={{ fontSize: 20, marginTop: 6, fontWeight: 500 }}>{fmt(end)}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {[-60,-15,15,60].map(m => (
              <button key={m} onClick={() => setEnd(new Date(end.getTime() + m*60000))} style={{
                padding: '6px 12px', borderRadius: 100, border: '1px solid var(--line)',
                background: 'transparent', color: 'var(--fg-1)', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
              }}>{m > 0 ? '+' : ''}{m}m</button>
            ))}
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <Btn variant="danger" style={{ flex: 1 }} onClick={onDelete}><Icon name="trash" size={14}/>&nbsp;Delete</Btn>
        <Btn style={{ flex: 2 }} onClick={() => onSave({ ...entry, start: start.toISOString(), end: end?.toISOString() })}>
          <Icon name="check" size={14}/>&nbsp;Save
        </Btn>
      </div>
    </div>
  );
}

window.FastModule = FastModule;
