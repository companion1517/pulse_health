/* DB.jsx — IndexedDB persistence layer for Pulse Health
 *
 * Single database, versioned schema. All data local-only.
 *
 * Schema v1:
 *   profile        (keyPath: id, singleton id="me")
 *   weight_entries (keyPath: id, index: timestamp)
 *   fasts          (keyPath: id, index: startedAt)
 *   hr_readings    (keyPath: id, index: timestamp)
 *   workouts       (keyPath: id, index: startedAt)
 *   app_meta       (keyPath: id)
 *
 * Conventions:
 *   - All IDs are UUIDs (v4).
 *   - All timestamps ISO 8601 strings.
 *   - All physical quantities in SI units internally: kg, cm, seconds.
 *     Display conversions happen in UI layer based on profile.unitsWeight / unitsHeight.
 *   - Soft deletes: records get deletedAt (ISO). Queries filter by default.
 */

const DB_NAME = 'pulse_health';
const DB_VERSION = 1;
const SCHEMA_VERSION = 1;

const STORES = {
  profile:        { keyPath: 'id', indexes: [] },
  weight_entries: { keyPath: 'id', indexes: [['timestamp', 'timestamp']] },
  fasts:          { keyPath: 'id', indexes: [['startedAt', 'startedAt']] },
  hr_readings:    { keyPath: 'id', indexes: [['timestamp', 'timestamp']] },
  workouts:       { keyPath: 'id', indexes: [['startedAt', 'startedAt']] },
  app_meta:       { keyPath: 'id', indexes: [] },
};

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      for (const [name, def] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: def.keyPath });
          for (const [idxName, idxKey] of def.indexes) {
            store.createIndex(idxName, idxKey, { unique: false });
          }
        }
      }
    };
  });
  return _dbPromise;
}

function tx(storeNames, mode = 'readonly') {
  return openDB().then(db => {
    const t = db.transaction(storeNames, mode);
    const stores = Array.isArray(storeNames)
      ? Object.fromEntries(storeNames.map(n => [n, t.objectStore(n)]))
      : t.objectStore(storeNames);
    return { t, stores };
  });
}

function req2promise(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

// UUID v4 — crypto.randomUUID is available in all modern browsers
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() :
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  }));

const now = () => new Date().toISOString();

// --- CRUD primitives -------------------------------------------------------

async function getAll(storeName, { includeDeleted = false } = {}) {
  const { stores } = await tx(storeName);
  const all = await req2promise(stores.getAll());
  return includeDeleted ? all : all.filter(r => !r.deletedAt);
}

async function getById(storeName, id) {
  const { stores } = await tx(storeName);
  return req2promise(stores.get(id));
}

async function put(storeName, record) {
  const { t, stores } = await tx(storeName, 'readwrite');
  const withTs = { ...record, updatedAt: now() };
  if (!withTs.createdAt) withTs.createdAt = withTs.updatedAt;
  stores.put(withTs);
  await new Promise((res, rej) => {
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  });
  return withTs;
}

async function insert(storeName, record) {
  const r = { id: record.id || uuid(), ...record };
  return put(storeName, r);
}

async function softDelete(storeName, id) {
  const existing = await getById(storeName, id);
  if (!existing) return null;
  return put(storeName, { ...existing, deletedAt: now() });
}

async function hardDelete(storeName, id) {
  const { t, stores } = await tx(storeName, 'readwrite');
  stores.delete(id);
  await new Promise((res, rej) => {
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  });
}

async function clearAll() {
  const db = await openDB();
  const names = Array.from(db.objectStoreNames);
  const t = db.transaction(names, 'readwrite');
  for (const n of names) t.objectStore(n).clear();
  return new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
}

// --- App-level API ---------------------------------------------------------

const DEFAULT_PROFILE = () => ({
  id: 'me',
  name: '',
  sex: 'male',
  dob: null,            // ISO
  heightCm: 180,
  unitsWeight: 'lb',
  unitsHeight: 'in',
  goals: { weightKg: null, bodyFatPct: null, weeklyFasts: 3, weeklyWorkouts: 3 },
  theme: 'dark',
});

async function loadProfile() {
  let p = await getById('profile', 'me');
  if (!p) {
    p = DEFAULT_PROFILE();
    await put('profile', p);
  }
  return p;
}

async function saveProfile(patch) {
  const p = await loadProfile();
  const merged = { ...p, ...patch, goals: { ...p.goals, ...(patch.goals || {}) } };
  return put('profile', merged);
}

async function ensureAppMeta() {
  let m = await getById('app_meta', 'app');
  if (!m) {
    m = { id: 'app', schemaVersion: SCHEMA_VERSION, installId: uuid(), createdAt: now() };
    await put('app_meta', m);
  }
  return m;
}

// --- Export / Import -------------------------------------------------------

async function exportAll({ includeDeleted = false } = {}) {
  const [profile, weight_entries, fasts, hr_readings, workouts, app_meta] = await Promise.all([
    getById('profile', 'me'),
    getAll('weight_entries', { includeDeleted }),
    getAll('fasts', { includeDeleted }),
    getAll('hr_readings', { includeDeleted }),
    getAll('workouts', { includeDeleted }),
    getById('app_meta', 'app'),
  ]);
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now(),
    appName: 'pulse_health',
    installId: app_meta?.installId,
    profile: profile || DEFAULT_PROFILE(),
    weight_entries,
    fasts,
    hr_readings,
    workouts,
  };
}

async function importAll(json, { mode = 'merge' } = {}) {
  if (!json || typeof json !== 'object') throw new Error('Invalid import file');
  if (json.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion ${json.schemaVersion} (this app is v${SCHEMA_VERSION})`);
  }
  if (mode === 'replace') await clearAll();

  if (json.profile) {
    await put('profile', { ...json.profile, id: 'me' });
  }
  const upsertMany = async (storeName, arr) => {
    if (!Array.isArray(arr)) return;
    const { t, stores } = await tx(storeName, 'readwrite');
    for (const r of arr) stores.put(r);
    await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
  };
  await upsertMany('weight_entries', json.weight_entries);
  await upsertMany('fasts', json.fasts);
  await upsertMany('hr_readings', json.hr_readings);
  await upsertMany('workouts', json.workouts);
  await ensureAppMeta();
  return { imported: true, counts: {
    weights: json.weight_entries?.length || 0,
    fasts: json.fasts?.length || 0,
    hr: json.hr_readings?.length || 0,
    workouts: json.workouts?.length || 0,
  }};
}

// --- Convenience: unit conversion ------------------------------------------

const lbToKg = (lb) => lb * 0.45359237;
const kgToLb = (kg) => kg / 0.45359237;
const inToCm = (inch) => inch * 2.54;
const cmToIn = (cm) => cm / 2.54;

// Expose globally
Object.assign(window, {
  PulseDB: {
    openDB, tx, uuid, now,
    getAll, getById, put, insert, softDelete, hardDelete, clearAll,
    loadProfile, saveProfile, ensureAppMeta,
    exportAll, importAll,
    SCHEMA_VERSION, DB_NAME,
  },
  lbToKg, kgToLb, inToCm, cmToIn,
});
