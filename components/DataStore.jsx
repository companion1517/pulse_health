/* DataStore.jsx — React hook + adapter from IndexedDB to the legacy store shape
 *
 * The existing components use a store shaped like:
 *   { profile, weights:[{date,weight}], fasts:[{id,start,end}],
 *     activeFast:{start}, hr:[{id,time,bpm,tag}], workouts:[...], templates, achievements }
 *
 * This module:
 *  1. On first load, populates IDB with either the user's prior data or empty state.
 *  2. Exposes useDataStore() returning [store, setStore] matching that legacy shape.
 *  3. Wraps mutations to write through to IndexedDB (debounced where helpful).
 *
 * We DO NOT seed fake data on first run. New installs start empty.
 * Import from previously-exported JSON, or start logging.
 */

const { useState: _useState, useEffect: _useEffect, useRef: _useRef, useCallback: _useCallback } = React;

// --- Legacy-shape <-> IDB record mapping ------------------------------------
// The UI uses lb/in; internally we store kg/cm.
// Keep the legacy display layer (lb) unchanged for now — convert at the boundary.

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

const _lbToKg = (lb) => lb * KG_PER_LB;
const _kgToLb = (kg) => kg / KG_PER_LB;
const _inToCm = (i) => i * CM_PER_IN;
const _cmToIn = (c) => c / CM_PER_IN;

const dateToIsoDay = (isoOrDate) => {
  if (typeof isoOrDate === 'string' && isoOrDate.length === 10) return isoOrDate;
  const d = new Date(isoOrDate);
  return d.toISOString().slice(0, 10);
};

// Legacy weight entry ({date:'2026-04-15', weight:193.2}) -> IDB record
function weightToRecord(e) {
  return {
    id: e.id || PulseDB.uuid(),
    timestamp: new Date(e.date + 'T12:00:00').toISOString(),
    weightKg: _lbToKg(e.weight),
    bodyFatPct: e.bodyFat ?? null,
    note: e.note || '',
    source: e.source || 'manual',
  };
}
function recordToWeight(r) {
  return {
    id: r.id,
    date: r.timestamp.slice(0, 10),
    weight: +_kgToLb(r.weightKg).toFixed(1),
    bodyFat: r.bodyFatPct,
    note: r.note,
  };
}

function fastToRecord(f) {
  return {
    id: f.id || PulseDB.uuid(),
    startedAt: f.start,
    endedAt: f.end || null,
    targetHours: f.targetHours || 16,
    note: f.note || '',
    status: f.end ? 'completed' : 'active',
  };
}
function recordToFast(r) {
  return { id: r.id, start: r.startedAt, end: r.endedAt, targetHours: r.targetHours, note: r.note };
}

function hrToRecord(h) {
  return {
    id: h.id || PulseDB.uuid(),
    timestamp: h.time,
    bpm: h.bpm,
    durationSec: h.durationSec || 15,
    method: h.method || 'manual',
    context: h.tag || h.context || 'resting',
    note: h.note || '',
  };
}
function recordToHR(r) {
  return { id: r.id, time: r.timestamp, bpm: r.bpm, tag: r.context, method: r.method };
}

function workoutToRecord(w) {
  return {
    id: w.id || PulseDB.uuid(),
    startedAt: w.start,
    endedAt: w.end || null,
    durationSec: (w.duration || 0) * 60,
    template: w.template || '',
    notes: w.notes || '',
    exercises: (w.exercises || []).map(ex => ({
      name: ex.name,
      group: ex.group,
      sets: (ex.sets || []).map(s => ({
        reps: s.reps, weightKg: _lbToKg(s.weight || 0),
        rpe: s.rpe ?? null, restSec: s.restSec ?? null, done: !!s.done,
      })),
    })),
  };
}
function recordToWorkout(r) {
  return {
    id: r.id,
    start: r.startedAt,
    end: r.endedAt,
    duration: Math.round((r.durationSec || 0) / 60),
    template: r.template,
    exercises: (r.exercises || []).map(ex => ({
      name: ex.name, group: ex.group,
      sets: (ex.sets || []).map(s => ({
        weight: Math.round(_kgToLb(s.weightKg || 0)),
        reps: s.reps, done: s.done,
      })),
    })),
  };
}

// --- Profile mapping --------------------------------------------------------
function profileToRecord(p) {
  return {
    id: 'me',
    name: p.name || '',
    sex: p.sex || 'male',
    dob: p.dob || null,
    heightCm: p.height ? _inToCm(p.height) : (p.heightCm || 180),
    unitsWeight: p.unitsWeight || 'lb',
    unitsHeight: p.unitsHeight || 'in',
    goals: {
      weightKg: p.goal ? _lbToKg(p.goal) : null,
      bodyFatPct: p.bfGoal ?? null,
      weeklyFasts: p.goals?.weeklyFasts ?? 3,
      weeklyWorkouts: p.goals?.weeklyWorkouts ?? 3,
    },
    theme: p.theme || 'dark',
    age: p.age || null, // kept for UI convenience
  };
}
function recordToProfile(r) {
  return {
    name: r.name || '',
    sex: r.sex || 'male',
    height: r.heightCm ? Math.round(_cmToIn(r.heightCm)) : 72,
    age: r.age || 34,
    goal: r.goals?.weightKg ? Math.round(_kgToLb(r.goals.weightKg)) : 180,
    bfGoal: r.goals?.bodyFatPct ?? 15,
    theme: r.theme || 'dark',
    heightCm: r.heightCm,
    unitsWeight: r.unitsWeight || 'lb',
    unitsHeight: r.unitsHeight || 'in',
    goals: r.goals || {},
  };
}

// --- Load full store from IDB ----------------------------------------------
async function loadFromDB() {
  const [profileRec, wEntries, fEntries, hEntries, woEntries] = await Promise.all([
    PulseDB.loadProfile(),
    PulseDB.getAll('weight_entries'),
    PulseDB.getAll('fasts'),
    PulseDB.getAll('hr_readings'),
    PulseDB.getAll('workouts'),
  ]);
  await PulseDB.ensureAppMeta();

  const weights = wEntries.map(recordToWeight).sort((a,b) => a.date.localeCompare(b.date));
  const fastRecs = fEntries.map(recordToFast).sort((a,b) => (a.start > b.start ? 1 : -1));
  const activeFastRec = fEntries.find(r => r.status === 'active' && !r.endedAt);

  return {
    profile: recordToProfile(profileRec),
    weights,
    bodyFat: [], // derived from weight_entries.bodyFatPct
    activeFast: activeFastRec ? { id: activeFastRec.id, start: activeFastRec.startedAt, targetHours: activeFastRec.targetHours } : null,
    fasts: fastRecs.filter(f => f.end), // only completed ones in the log
    hr: hEntries.map(recordToHR).sort((a,b) => (a.time > b.time ? -1 : 1)),
    workouts: woEntries.map(recordToWorkout).sort((a,b) => (a.start > b.start ? -1 : 1)),
    templates: window.TEMPLATES || [],
    achievements: [], // derived
    _loaded: true,
  };
}

// --- Write helpers ---------------------------------------------------------
const dbActions = {
  async addWeight({ date, weight, bodyFat, note }) {
    const rec = weightToRecord({ date, weight, bodyFat, note });
    await PulseDB.insert('weight_entries', rec);
    return recordToWeight(rec);
  },
  async deleteWeight(id) { await PulseDB.softDelete('weight_entries', id); },

  async startFast({ targetHours = 16 } = {}) {
    const rec = fastToRecord({ start: PulseDB.now(), targetHours });
    await PulseDB.insert('fasts', rec);
    return recordToFast(rec);
  },
  async endFast(id) {
    const existing = await PulseDB.getById('fasts', id);
    if (!existing) return null;
    await PulseDB.put('fasts', { ...existing, endedAt: PulseDB.now(), status: 'completed' });
  },

  async addHR({ bpm, context = 'resting', method = 'manual', durationSec = 15, raw }) {
    const rec = {
      id: PulseDB.uuid(), timestamp: PulseDB.now(),
      bpm, durationSec, method, context, raw: raw || null,
    };
    await PulseDB.insert('hr_readings', rec);
    return recordToHR(rec);
  },
  async deleteHR(id) { await PulseDB.softDelete('hr_readings', id); },

  async saveWorkout(w) {
    const rec = workoutToRecord(w);
    await PulseDB.put('workouts', rec);
    return recordToWorkout(rec);
  },
  async deleteWorkout(id) { await PulseDB.softDelete('workouts', id); },

  async saveProfile(profilePatch) {
    const rec = profileToRecord(profilePatch);
    await PulseDB.saveProfile(rec);
    return recordToProfile(await PulseDB.loadProfile());
  },
};

// --- React hook ------------------------------------------------------------
function useDataStore() {
  const [store, setStoreRaw] = _useState(null); // null until loaded

  _useEffect(() => {
    loadFromDB().then(setStoreRaw).catch(err => {
      console.error('Pulse DB load failed', err);
      // fallback empty store so UI doesn't wedge
      setStoreRaw({
        profile: recordToProfile(PulseDB ? { heightCm: 180 } : {}),
        weights: [], bodyFat: [], activeFast: null, fasts: [], hr: [], workouts: [],
        templates: window.TEMPLATES || [], achievements: [], _loaded: true, _error: String(err),
      });
    });
  }, []);

  const reload = _useCallback(async () => {
    const s = await loadFromDB();
    setStoreRaw(s);
    return s;
  }, []);

  // setStore supports (updaterFn) or (patch object); it only updates in-memory.
  // For persistence, callers should use dbActions + reload, or the helpers below.
  const setStore = _useCallback((updater) => {
    setStoreRaw(prev => {
      if (!prev) return prev;
      return typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
    });
  }, []);

  return { store, setStore, reload, actions: dbActions };
}

Object.assign(window, {
  useDataStore, loadFromDB, dbActions,
  profileToRecord, recordToProfile,
  weightToRecord, recordToWeight,
  fastToRecord, recordToFast,
  hrToRecord, recordToHR,
  workoutToRecord, recordToWorkout,
});
