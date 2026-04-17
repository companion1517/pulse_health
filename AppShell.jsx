/* AppShell.jsx — the real Pulse Health app chrome (not a design canvas).
 * Single full-screen app, bottom tabs, screen router.
 * Writes through every mutation to IndexedDB via `actions`, then reloads.
 */

function AppShell({ store, setStore, reload, actions }) {
  const [screen, setScreen] = React.useState('home');
  const [screenParams, setScreenParams] = React.useState(null);
  const go = (s, params = null) => { setScreen(s); setScreenParams(params); };

  // Bridge: legacy screens call setStore(fn). We intercept and persist.
  const setStorePersistent = React.useCallback((updater) => {
    setStore(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      persistDiff(prev, next, actions, reload);
      return next;
    });
  }, [setStore, actions, reload]);

  const showBottomTabs = ['home', 'timeline', 'achievements', 'profile'].includes(screen);
  const setTheme = (t) => {
    setStorePersistent(s => ({ ...s, profile: { ...s.profile, theme: t } }));
  };

  const body = (() => {
    switch (screen) {
      case 'weight': return <WeightModule store={store} setStore={setStorePersistent} onBack={() => go('home')}/>;
      case 'fast':   return <FastModule   store={store} setStore={setStorePersistent} onBack={() => go('home')}/>;
      case 'hr':     return <HRModule     store={store} setStore={setStorePersistent} onBack={() => go('home')} onMeasureCamera={() => go('hr-camera')}/>;
      case 'hr-camera': return <HRCameraScreen onBack={() => go('hr')} onSave={async (reading) => {
        await actions.addHR(reading); await reload(); go('hr');
      }}/>;
      case 'workout':return <WorkoutModule store={store} setStore={setStorePersistent} onBack={() => go('home')}/>;
      case 'timeline':     return <TimelineScreen store={store} onBack={() => go('home')}/>;
      case 'achievements': return <AchievementsScreen store={store} onBack={() => go('home')}/>;
      case 'profile':      return <ProfileScreen store={store} setStore={setStorePersistent} onBack={() => go('home')}
                              theme={store.profile.theme || 'dark'} setTheme={setTheme}
                              onExport={async () => exportToFile()}
                              onImport={async () => importFromFile(reload)}
                              onClearAll={async () => { if (confirm('Delete ALL Pulse Health data from this device? This cannot be undone.')) { await PulseDB.clearAll(); await reload(); } }}
                           />;
      default: return <HomeHub store={store} go={go}/>;
    }
  })();

  return (
    <div className="app-root">
      <div className="app-body-scroll">
        {body}
      </div>
      {showBottomTabs && <BottomTabs current={screen} go={go}/>}
    </div>
  );
}

// Persist the delta between two store snapshots. This is a pragmatic bridge:
// we diff the collections (weights, fasts, hr, workouts) and profile, and
// forward the appropriate dbActions calls. Achievements + templates are derived,
// so we skip them.
async function persistDiff(prev, next, actions, reload) {
  try {
    // Profile diff
    if (prev.profile !== next.profile) {
      await actions.saveProfile(next.profile);
    }

    // Weights: new entries (by id OR by date if no id)
    const prevW = new Map((prev.weights || []).map(w => [w.id || w.date, w]));
    for (const w of (next.weights || [])) {
      const key = w.id || w.date;
      if (!prevW.has(key)) {
        await actions.addWeight(w);
      }
    }

    // HR readings
    const prevH = new Map((prev.hr || []).map(h => [h.id, h]));
    for (const h of (next.hr || [])) {
      if (!prevH.has(h.id)) {
        await actions.addHR({ bpm: h.bpm, context: h.tag, method: h.method || 'manual' });
      }
    }

    // Fasts: active -> ended, or new completed
    if (prev.activeFast && !next.activeFast) {
      // fast was ended/broken
      if (prev.activeFast.id) await actions.endFast(prev.activeFast.id);
    }
    if (!prev.activeFast && next.activeFast && !next.activeFast.id) {
      // new fast started - persist and give it an id
      const saved = await actions.startFast({ targetHours: next.activeFast.targetHours || 16 });
      // Note: next render will pick up the id via reload
    }
    const prevF = new Map((prev.fasts || []).map(f => [f.id, f]));
    for (const f of (next.fasts || [])) {
      if (!prevF.has(f.id) && f.end) {
        // brand new completed fast
        await PulseDB.put('fasts', {
          id: f.id, startedAt: f.start, endedAt: f.end,
          targetHours: f.targetHours || 16, status: 'completed',
        });
      } else if (prevF.has(f.id)) {
        const p = prevF.get(f.id);
        if (p.start !== f.start || p.end !== f.end) {
          await PulseDB.put('fasts', {
            id: f.id, startedAt: f.start, endedAt: f.end,
            targetHours: f.targetHours || 16,
            status: f.end ? 'completed' : 'active',
          });
        }
      }
    }
    // deletions
    for (const id of prevF.keys()) {
      if (!(next.fasts || []).find(f => f.id === id)) {
        await PulseDB.softDelete('fasts', id);
      }
    }

    // Workouts: new or updated
    const prevWO = new Map((prev.workouts || []).map(w => [w.id, w]));
    for (const w of (next.workouts || [])) {
      const p = prevWO.get(w.id);
      if (!p || JSON.stringify(p) !== JSON.stringify(w)) {
        await actions.saveWorkout(w);
      }
    }
  } catch (err) {
    console.error('Pulse persist error', err);
  }
}

// --- Export / Import ------------------------------------------------------

async function exportToFile() {
  const data = await PulseDB.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.download = `pulse_health_${ts}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importFromFile(reload) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = await PulseDB.importAll(json, { mode: 'merge' });
      await reload();
      alert(`Imported ${result.counts.weights} weights, ${result.counts.fasts} fasts, ${result.counts.hr} HR readings, ${result.counts.workouts} workouts.`);
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };
  input.click();
}

// --- Bottom tabs (replaces the Phone version) -----------------------------
function BottomTabs({ current, go }) {
  const tabs = [
    { id: 'home', icon: 'grid', label: 'Home' },
    { id: 'timeline', icon: 'pulse', label: 'Timeline' },
    { id: 'achievements', icon: 'star', label: 'Goals' },
    { id: 'profile', icon: 'user', label: 'Profile' },
  ];
  return (
    <div className="bottom-tabs">
      {tabs.map(t => {
        const active = current === t.id;
        return (
          <button key={t.id}
            className={`bottom-tab ${active ? 'active' : ''}`}
            onClick={() => go(t.id)}
            aria-label={t.label}>
            <Icon name={t.icon} size={22} color={active ? 'var(--accent-lime)' : 'var(--fg-2)'}/>
            <span className="tab-label">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { AppShell, BottomTabs, persistDiff, exportToFile, importFromFile });
