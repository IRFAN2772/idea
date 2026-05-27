import { useState, useEffect, useRef } from 'react'

const WRITING_TIPS = [
  {
    icon: '🏷️',
    tip: 'Title matters most — it gets 10× more weight in search. Be specific: "Project X Roadmap" beats "Notes".',
  },
  {
    icon: '#️⃣',
    tip: 'Add tags to categorise notes. Type a word and press Enter in the tags bar. Search bot accepts #tagname.',
  },
  {
    icon: '📋',
    tip: 'Use bullet points (- item) or numbered lists (1. item). The bot extracts these as a clean list when you ask "list my…".',
  },
  {
    icon: '🔑',
    tip: 'Write the exact keywords you\'ll search for later. "PostgreSQL migration plan" is easier to find than "DB stuff".',
  },
  {
    icon: '📅',
    tip: 'Mention dates in plain text — "May 2026", "Q3 deadline". The bot understands and can surface them.',
  },
  {
    icon: '"  "',
    tip: 'In the search bot, wrap multi-word phrases in quotes: "project roadmap" to match that exact phrase.',
  },
]

export default function NoteEditor({ note, onUpdate }) {
  const [title,    setTitle]    = useState(note.title)
  const [content,  setContent]  = useState(note.content)
  const [tags,     setTags]     = useState(note.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [saved,    setSaved]    = useState(true)
  const [tipsOpen, setTipsOpen] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    setTitle(note.title)
    setContent(note.content)
    setTags(note.tags ?? [])
    setSaved(true)
  }, [note.id])

  function scheduleSave(newTitle, newContent, newTags) {
    clearTimeout(timerRef.current)
    setSaved(false)
    timerRef.current = setTimeout(() => {
      onUpdate(note.id, { title: newTitle, content: newContent, tags: newTags })
      setSaved(true)
    }, 500)
  }

  function addTag(raw) {
    const tag = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (!tag || tags.includes(tag)) { setTagInput(''); return }
    const next = [...tags, tag]
    setTags(next)
    setTagInput('')
    scheduleSave(title, content, next)
  }

  function removeTag(t) {
    const next = tags.filter(x => x !== t)
    setTags(next)
    scheduleSave(title, content, next)
  }

  function handleTagKey(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
      removeTag(tags[tags.length - 1])
    }
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length

  return (
    <div className="note-editor">
      <input
        className="editor-title"
        value={title}
        onChange={e => { setTitle(e.target.value); scheduleSave(e.target.value, content, tags) }}
        placeholder="Note title…"
      />

      {/* Tags row */}
      <div className="tags-row">
        {tags.map(t => (
          <span key={t} className="tag-chip">
            #{t}
            <button
              className="tag-remove"
              onClick={() => removeTag(t)}
              title={`Remove #${t}`}
            >×</button>
          </span>
        ))}
        <input
          className="tag-input"
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={handleTagKey}
          onBlur={() => tagInput.trim() && addTag(tagInput)}
          placeholder={tags.length ? '' : '+ add tag…'}
        />
      </div>

      <textarea
        className="editor-content"
        value={content}
        onChange={e => { setContent(e.target.value); scheduleSave(title, e.target.value, tags) }}
        placeholder="Start writing your note here…"
      />

      <div className="editor-status">
        <span>{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
        <button
          className="tips-toggle"
          onClick={() => setTipsOpen(o => !o)}
          title="Writing tips for better search"
        >
          💡 {tipsOpen ? 'Hide tips' : 'Writing tips'}
        </button>
        <span className={saved ? 'status-saved' : 'status-saving'}>
          {saved ? '✓ Saved' : 'Saving…'}
        </span>
      </div>

      {tipsOpen && (
        <div className="tips-panel">
          <p className="tips-heading">How to write notes for better search results:</p>
          <ul className="tips-list">
            {WRITING_TIPS.map(({ icon, tip }) => (
              <li key={icon}>
                <span className="tip-icon">{icon}</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
