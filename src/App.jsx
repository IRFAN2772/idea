import { useState, useEffect, useRef, useCallback } from 'react'
import { initDB, getAllNotes, upsertNote as dbUpsert, deleteNote as dbDelete } from './engine/db.js'
import { createNote } from './store/notesStore.js'
import NoteList from './components/NoteList.jsx'
import NoteEditor from './components/NoteEditor.jsx'
import SearchBot from './components/SearchBot.jsx'
import AboutModal from './components/AboutModal.jsx'
import './App.css'

function EmptyEditor({ onNew }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">📝</div>
      <h2>No note selected</h2>
      <p>Select a note from the sidebar or create a new one.</p>
      <button className="empty-new-btn" onClick={onNew}>+ New Note</button>
    </div>
  )
}

export default function App() {
  const [notes,        setNotes]        = useState([])
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [botOpen,      setBotOpen]      = useState(true)
  const [aboutOpen,    setAboutOpen]    = useState(false)
  const [dbReady,      setDbReady]      = useState(false)

  // Keep a ref so callbacks never close over stale notes state
  const notesRef = useRef(notes)
  useEffect(() => { notesRef.current = notes }, [notes])

  // Initialise SQLite (loads WASM, migrates localStorage data if first run)
  useEffect(() => {
    initDB().then(() => {
      setNotes(getAllNotes())
      setDbReady(true)
    })
  }, [])

  const activeNote = notes.find(n => n.id === activeNoteId) ?? null

  const addNote = useCallback(() => {
    const n = createNote()
    dbUpsert(n)
    setNotes(getAllNotes())
    setActiveNoteId(n.id)
  }, [])

  const updateNote = useCallback((id, changes) => {
    const existing = notesRef.current.find(n => n.id === id)
    if (!existing) return
    const updated = { ...existing, ...changes, updatedAt: new Date().toISOString() }
    dbUpsert(updated)
    setNotes(getAllNotes())
  }, [])

  const deleteNoteHandler = useCallback((id) => {
    dbDelete(id)
    setNotes(getAllNotes())
    setActiveNoteId(prev => prev === id ? null : prev)
  }, [])

  if (!dbReady) {
    return (
      <div className="db-loading">
        <div className="db-loading-spinner" />
        <p>Loading your notes…</p>
      </div>
    )
  }

  return (
    <div className={`app${botOpen ? ' bot-open' : ''}`}>
      <NoteList
        notes={notes}
        activeNoteId={activeNoteId}
        onSelect={setActiveNoteId}
        onNew={addNote}
        onDelete={deleteNoteHandler}
        botOpen={botOpen}
        onToggleBot={() => setBotOpen(o => !o)}
        onAbout={() => setAboutOpen(true)}
      />
      <main className="editor-area">
        {activeNote
          ? <NoteEditor key={activeNote.id} note={activeNote} onUpdate={updateNote} />
          : <EmptyEditor onNew={addNote} />
        }
      </main>
      {botOpen && (
        <SearchBot notes={notes} onSelectNote={setActiveNoteId} />
      )}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </div>
  )
}
