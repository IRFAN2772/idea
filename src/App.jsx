import { useState, useEffect, useCallback } from 'react'
import { loadNotes, saveNotes, createNote } from './store/notesStore.js'
import NoteList from './components/NoteList.jsx'
import NoteEditor from './components/NoteEditor.jsx'
import SearchBot from './components/SearchBot.jsx'
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

function App() {
  const [notes, setNotes] = useState(() => loadNotes())
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [botOpen, setBotOpen] = useState(true)

  const activeNote = notes.find(n => n.id === activeNoteId) ?? null

  useEffect(() => { saveNotes(notes) }, [notes])

  const addNote = useCallback(() => {
    const n = createNote()
    setNotes(p => [n, ...p])
    setActiveNoteId(n.id)
  }, [])

  const updateNote = useCallback((id, changes) => {
    setNotes(p => p.map(n =>
      n.id === id ? { ...n, ...changes, updatedAt: new Date().toISOString() } : n
    ))
  }, [])

  const deleteNote = useCallback((id) => {
    setNotes(p => p.filter(n => n.id !== id))
    setActiveNoteId(prev => prev === id ? null : prev)
  }, [])

  return (
    <div className={`app${botOpen ? ' bot-open' : ''}`}>
      <NoteList
        notes={notes}
        activeNoteId={activeNoteId}
        onSelect={setActiveNoteId}
        onNew={addNote}
        onDelete={deleteNote}
        botOpen={botOpen}
        onToggleBot={() => setBotOpen(o => !o)}
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
    </div>
  )
}

export default App
