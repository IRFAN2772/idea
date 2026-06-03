import initSqlJs from "sql.js";

// ── IndexedDB persistence ───────────────────────────────────────────────────
const IDB_NAME = "idea_v2";
const IDB_STORE = "sqlite";
const IDB_KEY = "notes.db";

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function idbGet(key) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(IDB_STORE, "readonly")
      .objectStore(IDB_STORE)
      .get(key);
    req.onsuccess = (e) => resolve(e.target.result ?? null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function idbPut(key, value) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(IDB_STORE, "readwrite")
      .objectStore(IDB_STORE)
      .put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

// ── Schema ─────────────────────────────────────────────────────────────────
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS notes (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL DEFAULT '',
    content    TEXT NOT NULL DEFAULT '',
    tags       TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

// ── Singleton DB ───────────────────────────────────────────────────────────
let _db = null;

export async function initDB() {
  if (_db) return _db;
  const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
  const blob = await idbGet(IDB_KEY);
  _db = blob ? new SQL.Database(blob) : new SQL.Database();
  _db.run(SCHEMA);

  // Drop leftover FTS5 virtual table if it exists (FTS5 not available in this build)
  try { _db.run("DROP TABLE IF EXISTS notes_fts"); } catch { /* ignore */ }

  // One-time migration from localStorage (old version of the app)
  const res = _db.exec("SELECT COUNT(*) FROM notes");
  const count = res[0]?.values[0]?.[0] ?? 0;
  if (count === 0) _migrateLegacy();

  return _db;
}

function _migrateLegacy() {
  try {
    const raw = localStorage.getItem("idea_notes");
    if (!raw) return;
    const notes = JSON.parse(raw);
    for (const n of notes) upsertNote({ ...n, tags: n.tags ?? [] });
    persist();
  } catch {
    /* silently skip broken data */
  }
}

// ── Persist ────────────────────────────────────────────────────────────────
let _pt = null;

export function schedulePersist() {
  clearTimeout(_pt);
  _pt = setTimeout(persist, 800);
}

export async function persist() {
  if (!_db) return;
  await idbPut(IDB_KEY, _db.export());
}

// ── CRUD ───────────────────────────────────────────────────────────────────
export function getAllNotes() {
  if (!_db) return [];
  const res = _db.exec(
    "SELECT id, title, content, tags, created_at, updated_at FROM notes ORDER BY updated_at DESC",
  );
  if (!res.length) return [];
  return res[0].values.map(([id, title, content, tags, ca, ua]) => ({
    id,
    title,
    content,
    tags: _parseJSON(tags, []),
    createdAt: ca,
    updatedAt: ua,
  }));
}

export function upsertNote(note) {
  if (!_db) return;
  const tagsArr = Array.isArray(note.tags) ? note.tags : [];
  const tagsJSON = JSON.stringify(tagsArr);

  _db.run(
    `INSERT INTO notes (id, title, content, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title      = excluded.title,
       content    = excluded.content,
       tags       = excluded.tags,
       updated_at = excluded.updated_at`,
    [
      note.id,
      note.title ?? "",
      note.content ?? "",
      tagsJSON,
      note.createdAt,
      note.updatedAt,
    ],
  );

  schedulePersist();
}

export function deleteNote(id) {
  if (!_db) return;
  _db.run("DELETE FROM notes WHERE id = ?", [id]);
  schedulePersist();
}



// ── Internal helpers ───────────────────────────────────────────────────────
function _parseJSON(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}


