import { fetchNotes, saveNote, removeNote } from "./api.js";

// ── In-memory cache (enables synchronous getAllNotes for search engine) ─────
let _notes = [];

// ── Init: fetch all notes from backend ─────────────────────────────────────
export async function initDB() {
  try {
    _notes = await fetchNotes();
  } catch (err) {
    console.error("Failed to fetch notes from API, starting with empty:", err);
    _notes = [];
  }
  return _notes;
}

// ── Read (synchronous, from cache) ─────────────────────────────────────────
export function getAllNotes() {
  return _notes;
}

// ── Upsert (update cache + push to backend) ────────────────────────────────
let _saveQueue = new Map();
let _saveTimer = null;

export function upsertNote(note) {
  // Update local cache immediately
  const idx = _notes.findIndex((n) => n.id === note.id);
  if (idx >= 0) {
    _notes[idx] = note;
  } else {
    _notes.unshift(note);
  }
  // Queue the save to backend (debounced per note)
  _saveQueue.set(note.id, note);
  _scheduleSave();
}

function _scheduleSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_flushSaves, 600);
}

async function _flushSaves() {
  const pending = [..._saveQueue.values()];
  _saveQueue.clear();
  for (const note of pending) {
    try {
      await saveNote(note);
    } catch (err) {
      console.error("Failed to save note to backend:", note.id, err);
    }
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────
export function deleteNote(id) {
  _notes = _notes.filter((n) => n.id !== id);
  removeNote(id).catch((err) =>
    console.error("Failed to delete note from backend:", id, err)
  );
}

// ── Compat exports (no-ops, kept so existing imports don't break) ──────────
export function schedulePersist() {}
export async function persist() {}


