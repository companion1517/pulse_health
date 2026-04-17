/* Store.jsx — Pulse Health store with IndexedDB persistence.
 *
 * On first load, reads the full store from IDB. Starts empty on fresh installs.
 * Mutations call dbActions (see DataStore.jsx) which writes through to IDB,
 * then reload() rebuilds the in-memory shape.
 *
 * Display units stay as lb / in at the UI boundary; internally everything is SI.
 */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// Date helpers (used throughout UI) --------------------------------------
const DAY_MS = 86400000;
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS);
const fmtDate = (d, opts = { month: 'short', day: 'numeric' }) =>
  d.toLocaleDateString('en-US', opts);
const fmtTime = (d) =>
  d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

// Exponential smoother for the weight trend line
function smoothWeights(entries) {
  if (!entries.length) return [];
  const alpha = 0.18;
  let s = entries[0].weight;
  return entries.map(e => {
    s = alpha * e.weight + (1 - alpha) * s;
    return { ...e, smooth: +s.toFixed(2) };
  });
}

// Fill missing days via linear interpolation. entries: [{date, weight}] sorted asc.
function fillGaps(entries) {
  if (!entries.length) return [];
  const t0 = today();
  const start = new Date(entries[0].date);
  const days = Math.max(1, Math.ceil((t0 - start) / DAY_MS) + 1);
  const map = new Map(entries.map(e => [e.date, e.weight]));
  const filled = [];
  let lastKnown = entries[0].weight;
  let lastKnownIdx = 0;
  for (let i = 0; i < days; i++) {
    const date = iso(addDays(start, i));
    if (map.has(date)) {
      const v = map.get(date);
      if (i - lastKnownIdx > 1) {
        for (let j = lastKnownIdx + 1; j < i; j++) {
          const t = (j - lastKnownIdx) / (i - lastKnownIdx);
          filled[j] = { date: filled[j].date, weight: +(lastKnown + t * (v - lastKnown)).toFixed(2), interpolated: true };
        }
      }
      filled.push({ date, weight: v });
      lastKnown = v; lastKnownIdx = i;
    } else {
      filled.push({ date, weight: lastKnown, interpolated: true });
    }
  }
  return filled;
}

// Workout exercise catalog (used by templates + picker)
const EXERCISES = [
  { name: 'Back Squat', group: 'Legs' },
  { name: 'Bench Press', group: 'Chest' },
  { name: 'Deadlift', group: 'Back' },
  { name: 'Overhead Press', group: 'Shoulders' },
  { name: 'Pull-up', group: 'Back' },
  { name: 'Romanian Deadlift', group: 'Legs' },
  { name: 'Barbell Row', group: 'Back' },
  { name: 'Incline DB Press', group: 'Chest' },
  { name: 'Lateral Raise', group: 'Shoulders' },
  { name: 'Walking Lunge', group: 'Legs' },
];

const TEMPLATES = [
  { name: 'Push A', exercises: [
    { name: 'Bench Press', group: 'Chest', sets: [{weight:185,reps:5},{weight:185,reps:5},{weight:185,reps:5}] },
    { name: 'Overhead Press', group: 'Shoulders', sets: [{weight:115,reps:8},{weight:115,reps:8},{weight:115,reps:8}] },
    { name: 'Incline DB Press', group: 'Chest', sets: [{weight:60,reps:10},{weight:60,reps:10},{weight:60,reps:10}] },
    { name: 'Lateral Raise', group: 'Shoulders', sets: [{weight:20,reps:12},{weight:20,reps:12},{weight:20,reps:12}] },
  ]},
  { name: 'Pull A', exercises: [
    { name: 'Deadlift', group: 'Back', sets: [{weight:315,reps:5},{weight:315,reps:5},{weight:315,reps:5}] },
    { name: 'Pull-up', group: 'Back', sets: [{weight:0,reps:8},{weight:0,reps:8},{weight:0,reps:6}] },
    { name: 'Barbell Row', group: 'Back', sets: [{weight:155,reps:8},{weight:155,reps:8},{weight:155,reps:8}] },
  ]},
  { name: 'Legs A', exercises: [
    { name: 'Back Squat', group: 'Legs', sets: [{weight:245,reps:5},{weight:245,reps:5},{weight:245,reps:5}] },
    { name: 'Romanian Deadlift', group: 'Legs', sets: [{weight:185,reps:8},{weight:185,reps:8},{weight:185,reps:8}] },
    { name: 'Walking Lunge', group: 'Legs', sets: [{weight:40,reps:12},{weight:40,reps:12},{weight:40,reps:12}] },
  ]},
];

// Achievements — computed from data rather than stored
function computeAchievements(store) {
  const w = store.weights || [];
  const f = store.fasts || [];
  const wo = store.workouts || [];
  const hr = store.hr || [];
  const bestWeightDrop = w.length >= 2 ? w[0].weight - w[w.length - 1].weight : 0;
  const bestFast = f.reduce((m, x) => {
    if (!x.end) return m;
    const h = (new Date(x.end) - new Date(x.start)) / 3600000;
    return Math.max(m, h);
  }, 0);
  const minHR = hr.reduce((m, x) => Math.min(m, x.bpm), 200);

  return [
    { id: 'first_entry', title: 'First Weigh-in', unlocked: w.length >= 1, tier: 'bronze', cat: 'weight',
      progress: Math.min(1, w.length / 1) },
    { id: 'streak7',  title: '7-Day Weigh-in Streak', unlocked: weighInStreak(w) >= 7, tier: 'silver', cat: 'weight',
      progress: Math.min(1, weighInStreak(w) / 7) },
    { id: 'streak30', title: '30-Day Weigh-in Streak', unlocked: weighInStreak(w) >= 30, tier: 'gold', cat: 'weight',
      progress: Math.min(1, weighInStreak(w) / 30) },
    { id: 'first5', title: 'First 5 lb Down', unlocked: bestWeightDrop >= 5, tier: 'silver', cat: 'weight',
      progress: Math.min(1, bestWeightDrop / 5) },
    { id: 'fast16', title: 'First 16h Fast', unlocked: bestFast >= 16, tier: 'silver', cat: 'fast',
      progress: Math.min(1, bestFast / 16) },
    { id: 'fast24', title: 'First 24h Fast', unlocked: bestFast >= 24, tier: 'gold', cat: 'fast',
      progress: Math.min(1, bestFast / 24) },
    { id: 'fast10', title: '10 Fasts Logged', unlocked: f.length >= 10, tier: 'gold', cat: 'fast',
      progress: Math.min(1, f.length / 10) },
    { id: 'w20', title: '20 Workouts', unlocked: wo.length >= 20, tier: 'gold', cat: 'workout',
      progress: Math.min(1, wo.length / 20) },
    { id: 'hr60', title: 'Resting HR below 60', unlocked: minHR < 60, tier: 'silver', cat: 'hr',
      progress: minHR < 200 ? Math.min(1, (75 - minHR) / 15) : 0 },
  ];
}

function weighInStreak(weights) {
  if (!weights.length) return 0;
  const sorted = [...weights].sort((a,b) => b.date.localeCompare(a.date));
  const days = new Set(sorted.map(x => x.date));
  let streak = 0;
  let d = today();
  while (days.has(iso(d))) { streak++; d = addDays(d, -1); }
  return streak;
}

// Deprecated: legacy components may call createStore(). Returns empty store shell.
function createStore() {
  return {
    profile: { sex: 'male', name: '', height: 72, age: 34, goal: 180, bfGoal: 15, theme: 'dark' },
    weights: [], bodyFat: [], activeFast: null, fasts: [], hr: [], workouts: [],
    templates: TEMPLATES, achievements: [],
  };
}

// Derived metrics
const calcBMI = (wLb, hIn) => (wLb * 703) / (hIn * hIn);
const bmiBand = (b) => {
  if (b < 18.5) return { label: 'Underweight', color: 'var(--accent-teal)' };
  if (b < 25)   return { label: 'Healthy',     color: 'var(--ok)' };
  if (b < 30)   return { label: 'Overweight',  color: 'var(--accent-amber)' };
  return           { label: 'Obese',          color: 'var(--accent-rose)' };
};

const FAST_STAGES = [
  { h: 0,  name: 'Anabolic',  desc: 'Digesting recent meal', color: 'var(--accent-amber)' },
  { h: 4,  name: 'Catabolic', desc: 'Blood glucose stabilizing', color: 'var(--accent-teal)' },
  { h: 12, name: 'Fat burn',  desc: 'Insulin drops, fat mobilized', color: 'var(--accent-lime)' },
  { h: 18, name: 'Ketosis',   desc: 'Ketones rising', color: 'var(--accent-violet)' },
  { h: 24, name: 'Autophagy', desc: 'Cellular cleanup', color: 'var(--accent-rose)' },
];
const stageAt = (hours) => {
  let s = FAST_STAGES[0];
  for (const x of FAST_STAGES) if (hours >= x.h) s = x;
  return s;
};

const hrZones = (age) => {
  const max = 220 - age;
  return [
    { z: 1, name: 'Recovery',  lo: Math.round(max * 0.5),  hi: Math.round(max * 0.6),  color: '#3a7f6a' },
    { z: 2, name: 'Endurance', lo: Math.round(max * 0.6),  hi: Math.round(max * 0.7),  color: '#6dc38d' },
    { z: 3, name: 'Tempo',     lo: Math.round(max * 0.7),  hi: Math.round(max * 0.8),  color: '#d9c75b' },
    { z: 4, name: 'Threshold', lo: Math.round(max * 0.8),  hi: Math.round(max * 0.9),  color: '#e49a4b' },
    { z: 5, name: 'Max',       lo: Math.round(max * 0.9),  hi: max,                    color: '#e06565' },
  ];
};

Object.assign(window, {
  createStore, smoothWeights, fillGaps, calcBMI, bmiBand,
  FAST_STAGES, stageAt, hrZones, EXERCISES, TEMPLATES,
  today, iso, addDays, fmtDate, fmtTime, DAY_MS,
  computeAchievements, weighInStreak,
});
