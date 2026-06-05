import { useState, useEffect, useRef, useCallback } from "react";
import {
  initDB,
  getAllNotes,
  upsertNote as dbUpsert,
  deleteNote as dbDelete,
} from "./engine/db.js";
import { createNote } from "./store/notesStore.js";
import NoteList from "./components/NoteList.jsx";
import NoteEditor from "./components/NoteEditor.jsx";
import SearchBot from "./components/SearchBot.jsx";
import AboutModal from "./components/AboutModal.jsx";
import "./App.css";

function EmptyEditor({ onNew }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">📝</div>
      <h2>No note selected</h2>
      <p>Select a note from the sidebar or create a new one.</p>
      <button className="empty-new-btn" onClick={onNew}>
        + New Note
      </button>
    </div>
  );
}

export default function App() {
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [botOpen, setBotOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [mobileView, setMobileView] = useState("list"); // "list" | "editor" | "bot"

  // Keep a ref so callbacks never close over stale notes state
  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Initialise SQLite (loads WASM, migrates localStorage data if first run)
  useEffect(() => {
    initDB().then(() => {
      setNotes(getAllNotes());
      setDbReady(true);
    });
  }, []);

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

  const addNote = useCallback(() => {
    const n = createNote();
    dbUpsert(n);
    setNotes(getAllNotes());
    setActiveNoteId(n.id);
    setMobileView("editor");
  }, []);

  const updateNote = useCallback((id, changes) => {
    const existing = notesRef.current.find((n) => n.id === id);
    if (!existing) return;
    const updated = {
      ...existing,
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    dbUpsert(updated);
    setNotes(getAllNotes());
  }, []);

  const deleteNoteHandler = useCallback((id) => {
    dbDelete(id);
    setNotes(getAllNotes());
    setActiveNoteId((prev) => (prev === id ? null : prev));
  }, []);

  const handleSelectNote = useCallback((id) => {
    setActiveNoteId(id);
    setMobileView("editor");
  }, []);

  const handleExport = useCallback(() => {
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `idea-notes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [notes]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (!Array.isArray(imported)) return;
          for (const n of imported) {
            if (!n.id || !n.createdAt) continue;
            dbUpsert({
              id: n.id,
              title: n.title ?? "",
              content: n.content ?? "",
              tags: n.tags ?? [],
              createdAt: n.createdAt,
              updatedAt: n.updatedAt ?? n.createdAt,
            });
          }
          setNotes(getAllNotes());
        } catch { /* invalid file */ }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  if (!dbReady) {
    return (
      <div className="db-loading">
        <div className="db-loading-spinner" />
        <p>Loading your notes…</p>
      </div>
    );
  }

  return (
    <div className={`app${botOpen ? " bot-open" : ""}`}>
      {/* Mobile top bar */}
      <header className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setMobileView(mobileView === "list" ? "editor" : "list")}>
          ☰
        </button>
        <span className="mobile-topbar-title">💡 idea</span>
        <button
          className={`hamburger-btn${botOpen && mobileView === "bot" ? " active" : ""}`}
          onClick={() => { setBotOpen(true); setMobileView(mobileView === "bot" ? "editor" : "bot"); }}
        >
          🔍
        </button>
      </header>

      {/* Overlay backdrop */}
      {(mobileView === "list" || mobileView === "bot") && (
        <div className="drawer-backdrop" onClick={() => setMobileView("editor")} />
      )}

      <aside className={`notes-sidebar${mobileView === "list" ? " drawer-open" : ""}`}>
        <NoteList
          notes={notes}
          activeNoteId={activeNoteId}
          onSelect={(id) => { handleSelectNote(id); setMobileView("editor"); }}
          onNew={() => { addNote(); setMobileView("editor"); }}
          onDelete={deleteNoteHandler}
          botOpen={botOpen}
          onToggleBot={() => { setBotOpen((o) => !o); setMobileView("bot"); }}
          onAbout={() => setAboutOpen(true)}
          onExport={handleExport}
          onImport={handleImport}
        />
      </aside>

      <main className="editor-area">
        {activeNote ? (
          <NoteEditor
            key={activeNote.id}
            note={activeNote}
            onUpdate={updateNote}
          />
        ) : (
          <EmptyEditor onNew={addNote} />
        )}
      </main>

      <aside className={`bot-panel-wrapper${mobileView === "bot" ? " drawer-open" : ""}${botOpen ? "" : " hidden-panel"}`}>
        <SearchBot
          notes={notes}
          onSelectNote={(id) => { handleSelectNote(id); setMobileView("editor"); }}
          onBack={() => setMobileView("editor")}
        />
      </aside>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </div>
  );
}
