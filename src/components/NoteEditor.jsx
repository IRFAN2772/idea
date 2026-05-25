import { useState, useEffect, useRef } from 'react'

export default function NoteEditor({ note, onUpdate }) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [saved, setSaved] = useState(true)
  const timerRef = useRef(null)

  // Reset local state when switching to a different note
  useEffect(() => {
    setTitle(note.title)
    setContent(note.content)
    setSaved(true)
  }, [note.id])

  function scheduleSave(newTitle, newContent) {
    clearTimeout(timerRef.current)
    setSaved(false)
    timerRef.current = setTimeout(() => {
      onUpdate(note.id, { title: newTitle, content: newContent })
      setSaved(true)
    }, 500)
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length

  return (
    <div className="note-editor">
      <input
        className="editor-title"
        value={title}
        onChange={e => { setTitle(e.target.value); scheduleSave(e.target.value, content) }}
        placeholder="Note title…"
      />
      <textarea
        className="editor-content"
        value={content}
        onChange={e => { setContent(e.target.value); scheduleSave(title, e.target.value) }}
        placeholder="Start writing your note here…"
      />
      <div className="editor-status">
        <span>{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
        <span className={saved ? 'status-saved' : 'status-saving'}>
          {saved ? '✓ Saved' : 'Saving…'}
        </span>
      </div>
    </div>
  )
}
