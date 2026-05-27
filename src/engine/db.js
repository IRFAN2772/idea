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
// notes_fts uses Porter stemmer: "running"/"run", "projects"/"project" match each other.
// note_id is UNINDEXED so it's carried along but not part of the BM25 ranking.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS notes (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL DEFAULT '',
    content    TEXT NOT NULL DEFAULT '',
    tags       TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    note_id  UNINDEXED,
    title,
    content,
    tags,
    tokenize = 'porter unicode61'
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
  const tagsText = tagsArr.join(" "); // space-separated for FTS indexing

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

  // Keep FTS table in sync manually (no triggers in sql.js WASM)
  _db.run("DELETE FROM notes_fts WHERE note_id = ?", [note.id]);
  _db.run(
    "INSERT INTO notes_fts (note_id, title, content, tags) VALUES (?, ?, ?, ?)",
    [note.id, note.title ?? "", note.content ?? "", tagsText],
  );
  schedulePersist();
}

export function deleteNote(id) {
  if (!_db) return;
  _db.run("DELETE FROM notes WHERE id = ?", [id]);
  _db.run("DELETE FROM notes_fts WHERE note_id = ?", [id]);
  schedulePersist();
}

// ── FTS5 Search ────────────────────────────────────────────────────────────
// bm25() returns negative values — lower means more relevant, so ORDER BY score ASC.
// snippet() col index: 0=note_id(UNINDEXED), 1=title, 2=content, 3=tags
export function ftsSearch(query, notes) {
  if (!_db || !query.trim()) return [];

  const ftsQuery = _buildFTSQuery(query);
  if (!ftsQuery) return [];

  try {
    const res = _db.exec(
      `SELECT
         f.note_id,
         snippet(notes_fts, 2, '##', '##', '…', 25) AS snip,
         bm25(notes_fts)                             AS score
       FROM notes_fts f
       WHERE notes_fts MATCH ?
       ORDER BY score
       LIMIT 10`,
      [ftsQuery],
    );
    if (!res.length) return [];
    return res[0].values
      .map(([note_id, snip, score]) => {
        const note = notes.find((n) => n.id === note_id);
        if (!note) return null;
        return { note, snippet: snip ?? "", score: Math.abs(score) };
      })
      .filter(Boolean);
  } catch {
    // Invalid FTS5 syntax from user input — return empty gracefully
    return [];
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────
function _parseJSON(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// Converts a user query string into a safe FTS5 MATCH expression.
// Handles: #tag searches, quoted phrases, normal keyword queries.
function _buildFTSQuery(raw) {
  const t = raw.trim();
  if (!t) return null;

  // #tag  →  column filter on the tags column
  const tagMatch = t.match(/^#(\w+)$/);
  if (tagMatch) return `tags:${tagMatch[1]}`;

  // User already wrote quotes — sanitize special chars and pass through
  if (t.includes('"')) {
    return t.replace(/[^\w\s"*]/g, " ").trim() || null;
  }

  // Normal query: split into tokens, apply implicit AND (FTS5 default),
  // add prefix wildcard to the last token so partial words still match.
  const words = t
    .replace(/[^\w\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (!words.length) return null;

  return words.map((w, i) => (i === words.length - 1 ? `${w}*` : w)).join(" ");
}
