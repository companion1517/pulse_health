/* ExtraScreens.jsx — Timeline, Achievements, Profile, Fasting-calendar-with-weight overlay */

function TimelineScreen({ store, onBack }) {
  // Unified 'today' timeline — fasting blocks, HR readings, workouts, weigh-in
  const t0 = today();
  const events = [];

  // Today's weigh-in
  const todaysW = store.weights.find(w => w.date === iso(t0));
  if (todaysW) events.push({
    t: 7.5, kind: 'weight', color: 'var(--accent-violet)', icon: 'scale',
    label: 'Weigh-in', detail: `${todaysW.weight.toFixed(1)} lb`,
  });

  // Active fast
  if (store.activeFast) {
    const s = new Date(store.activeFast.start);
    const h = s.getHours() + s.getMinutes() / 60;
    events.push({
      t: h, kind: 'fast-start', color: 'var(--accent-teal)', icon: 'hourglass',
      label: 'Fast started', detail: fmtTime(s),
    });
  }

  // Recent HR
  const todayHR = store.hr.filter(h => h.time.slice(0,10) === iso(t0));
  todayHR.forEach(h => {
    const d = new Date(h.time);
    events.push({
      t: d.getHours() + d.getMinutes()/60, kind: 'hr',
      color: 'var(--accent-rose)', icon: 'heart',
      label: `HR · ${h.tag}`, detail: `${h.bpm} bpm`,
    });
  });

  // Planned workout
  events.push({
    t: 17.5, kind: 'workout', color: 'var(--accent-amber)', icon: 'dumbbell',
    label: 'Push A · planned', detail: '4 exercises',
  });

  events.sort((a,b) => a.t - b.t);

  return (
    <div style={{ padding: '12px 16px 120px' }}>
      <ModuleHeader icon="timeline" title="Today" onBack={onBack} accent="var(--accent-lime)"/>

      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
        {fmtDate(t0, { weekday:'long', month:'long', day:'numeric' })}
      </div>

      <div style={{ position: 'relative', paddingLeft: 30 }}>
        <div style={{ position: 'absolute', left: 14, top: 8, bottom: 8, width: 2, background: 'var(--line-soft)' }}/>
        {events.map((e, i) => (
          <div key={i} style={{ marginBottom: 14, position: 'relative' }}>
            <div style={{
              position: 'absolute', left: -30, top: 6,
              width: 28, height: 28, borderRadius: 100,
              background: `color-mix(in oklch, ${e.color} 20%, var(--bg-0))`,
              border: `2px solid ${e.color}`,
              color: e.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon name={e.icon} size={14}/></div>
            <Card padding={12}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{e.label}</div>
                <div className="tnum" style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)' }}>
                  {String(Math.floor(e.t)).padStart(2,'0')}:{String(Math.floor((e.t%1)*60)).padStart(2,'0')}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>{e.detail}</div>
            </Card>
          </div>
        ))}
      </div>

      <SectionTitle>Fasting × Weight · 30 days</SectionTitle>
      <FastCalendarOverlay store={store}/>
    </div>
  );
}

function FastCalendarOverlay({ store }) {
  const t0 = today();
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = addDays(t0, -i);
    const di = iso(d);
    const fastForDay = store.fasts.find(f => new Date(f.end).toISOString().slice(0,10) === di);
    const dur = fastForDay ? (new Date(fastForDay.end) - new Date(fastForDay.start)) / 3600000 : 0;
    const wEntry = fillGaps(store.weights).find(w => w.date === di);
    days.push({ date: di, dur, weight: wEntry?.weight });
  }

  const weights = days.map(d => d.weight).filter(x => x != null);
  const wMin = Math.min(...weights) - 1;
  const wMax = Math.max(...weights) + 1;

  return (
    <Card padding={14}>
      <div style={{ position: 'relative', height: 140 }}>
        <svg width="100%" height="140" viewBox="0 0 310 140" preserveAspectRatio="none">
          {/* Fasting bars */}
          {days.map((d, i) => {
            const x = (i / 30) * 310;
            const w = 310 / 30 - 1;
            const h = (d.dur / 24) * 90;
            return <rect key={i} x={x} y={100 - h} width={w} height={h}
              fill="var(--accent-teal)" opacity={d.dur > 0 ? 0.5 : 0} rx="1"/>;
          })}
          {/* Weight trend */}
          <path d={days.map((d, i) => {
            if (d.weight == null) return '';
            const x = (i / 29) * 310;
            const y = 100 - ((d.weight - wMin) / (wMax - wMin)) * 90;
            return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
          }).join(' ')} fill="none" stroke="var(--accent-violet)" strokeWidth="2" strokeLinejoin="round"/>
          {/* axis */}
          <line x1="0" x2="310" y1="100" y2="100" stroke="var(--line-soft)" strokeWidth="1"/>
        </svg>
        <div style={{ position: 'absolute', left: 0, bottom: 0, display: 'flex', gap: 12, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 2, background: 'var(--accent-violet)' }}/>Weight</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: 'var(--accent-teal)', opacity: 0.5 }}/>Fast hours</span>
        </div>
      </div>
    </Card>
  );
}

function AchievementsScreen({ store, onBack }) {
  const cats = { weight: 'Weight', fast: 'Fast', workout: 'Workout', hr: 'Heart rate' };
  const unlocked = store.achievements.filter(a => a.unlocked);
  const tierColor = { gold: 'var(--accent-amber)', silver: 'var(--fg-1)', bronze: 'var(--accent-rose)' };

  return (
    <div style={{ padding: '12px 16px 120px' }}>
      <ModuleHeader icon="trophy" title="Achievements" onBack={onBack} accent="var(--accent-amber)"/>

      <Card padding={18} style={{
        marginBottom: 16,
        background: 'linear-gradient(135deg, color-mix(in oklch, var(--accent-amber) 22%, var(--bg-2)), var(--bg-2))',
      }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-1)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Your progress</div>
        <div className="tnum" style={{ fontSize: 44, fontWeight: 500, letterSpacing: '-0.03em', margin: '6px 0' }}>
          {unlocked.length}<span style={{ fontSize: 20, color: 'var(--fg-2)' }}>/{store.achievements.length}</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(unlocked.length / store.achievements.length) * 100}%`, background: 'var(--accent-amber)' }}/>
        </div>
      </Card>

      {Object.entries(cats).map(([k, label]) => {
        const list = store.achievements.filter(a => a.cat === k);
        return (
          <div key={k} style={{ marginBottom: 14 }}>
            <SectionTitle>{label}</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {list.map(a => (
                <Card key={a.id} padding={14} style={{
                  opacity: a.unlocked ? 1 : 0.55,
                  textAlign: 'center',
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 100, margin: '0 auto 10px',
                    background: a.unlocked
                      ? `color-mix(in oklch, ${tierColor[a.tier]} 22%, var(--bg-3))`
                      : 'var(--bg-3)',
                    border: `2px solid ${a.unlocked ? tierColor[a.tier] : 'var(--line)'}`,
                    color: a.unlocked ? tierColor[a.tier] : 'var(--fg-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Icon name={a.unlocked ? 'trophy' : 'target'} size={20}/></div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: a.unlocked ? 'var(--fg-0)' : 'var(--fg-2)', lineHeight: 1.3 }}>{a.title}</div>
                  {!a.unlocked && a.progress != null && (
                    <div style={{ height: 3, background: 'var(--bg-3)', borderRadius: 100, marginTop: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${a.progress * 100}%`, background: 'var(--fg-2)' }}/>
                    </div>
                  )}
                  {a.unlocked && a.date && (
                    <div style={{ fontSize: 9, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', marginTop: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {fmtDate(new Date(a.date + 'T12:00'), { month:'short', day:'numeric' })}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfileScreen({ store, setStore, onBack, theme = 'dark', setTheme }) {
  const p = store.profile;
  const update = (k, v) => setStore(s => ({ ...s, profile: { ...s.profile, [k]: v } }));
  const themeLabel = { dark: 'Dark', light: 'Light', system: 'System' }[theme] || 'Dark';

  return (
    <div style={{ padding: '12px 16px 120px' }}>
      <ModuleHeader icon="user" title="Profile" onBack={onBack} accent="var(--accent-lime)"/>

      <Card padding={20} style={{ marginBottom: 14, textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 100, margin: '0 auto 12px',
          background: 'linear-gradient(135deg, var(--accent-lime), var(--accent-teal))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 700, color: 'var(--accent-on-primary)',
        }}>A</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</div>
      </Card>

      <SectionTitle>Biometrics</SectionTitle>
      <Card padding={0} style={{ marginBottom: 14 }}>
        <Row label="Sex">
          <div style={{ display: 'flex', gap: 4 }}>
            {['male','female'].map(s => (
              <button key={s} onClick={() => update('sex', s)} style={{
                padding: '6px 14px', borderRadius: 100,
                background: p.sex === s ? 'var(--accent-lime)' : 'transparent',
                color: p.sex === s ? 'var(--accent-on-primary)' : 'var(--fg-1)',
                border: p.sex === s ? 'none' : '1px solid var(--line)',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                textTransform: 'capitalize',
              }}>{s}</button>
            ))}
          </div>
        </Row>
        <Row label="Height"><Val>{Math.floor(p.height/12)}′ {p.height % 12}″</Val></Row>
        <Row label="Age"><Val>{p.age}</Val></Row>
        <Row label="Weight goal"><Val>{p.goal} lb</Val></Row>
        <Row label="Body fat goal" last><Val>{p.bfGoal} %</Val></Row>
      </Card>

      <SectionTitle>Data</SectionTitle>
      <Card padding={0}>
        <Row label="Export all data"><Icon name="forward" size={16} color="var(--fg-3)"/></Row>
        <Row label="Import"><Icon name="forward" size={16} color="var(--fg-3)"/></Row>
        <Row label="Theme">
          <div style={{ display: 'flex', gap: 4 }}>
            {['dark','light','system'].map(t => (
              <button key={t} onClick={() => setTheme && setTheme(t)} style={{
                padding: '5px 11px', borderRadius: 100,
                background: theme === t ? 'var(--accent-lime)' : 'transparent',
                color: theme === t ? 'var(--accent-on-primary)' : 'var(--fg-1)',
                border: theme === t ? 'none' : '1px solid var(--line)',
                fontFamily: 'inherit', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                textTransform: 'capitalize',
              }}>{t}</button>
            ))}
          </div>
        </Row>
        <Row label="Units"><Val>lb · in</Val></Row>
        <Row label="About" last><Icon name="forward" size={16} color="var(--fg-3)"/></Row>
      </Card>
    </div>
  );
}

function Row({ label, children, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 16px',
      borderBottom: last ? 'none' : '1px solid var(--line-soft)',
    }}>
      <div style={{ fontSize: 13, color: 'var(--fg-1)' }}>{label}</div>
      {children}
    </div>
  );
}
function Val({ children }) {
  return <div className="tnum" style={{ fontSize: 13, color: 'var(--fg-0)', fontWeight: 500 }}>{children}</div>;
}

Object.assign(window, { TimelineScreen, AchievementsScreen, ProfileScreen });
