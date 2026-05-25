import { useState, useRef, useEffect } from 'react'
import { search } from '../engine/search.js'

function formatRelativeDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 3600000)   return `${Math.floor(diff / 60000) || 1}m ago`
  if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

function renderSnippet(snippet) {
  if (!snippet) return null
  return snippet.split(/(##[^#]+##)/g).map((part, i) => {
    if (part.startsWith('##') && part.endsWith('##')) {
      return <mark key={i}>{part.slice(2, -2)}</mark>
    }
    return <span key={i}>{part}</span>
  })
}

function BotMessage({ msg, onSelectNote }) {
  if (msg.type === 'user') {
    return <div className="chat-bubble user-bubble">{msg.text}</div>
  }

  const { intent, results } = msg

  if (results.length === 0) {
    return (
      <div className="chat-bubble bot-bubble">
        <p>No notes found for <em>"{msg.query}"</em>.</p>
        <p>Try different keywords or check your spelling.</p>
      </div>
    )
  }

  if (intent === 'LIST') {
    return (
      <div className="chat-bubble bot-bubble">
        {results.map(({ note, listItems }) => (
          <div key={note.id}>
            {results.length > 1 && (
              <p className="result-source" onClick={() => onSelectNote(note.id)}>
                From: <span className="result-title-inline">{note.title || 'Untitled'}</span>
              </p>
            )}
            {listItems.length > 0 ? (
              <ul className="extracted-list">
                {listItems.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            ) : (
              // Fallback: show full note content so user can read it
              <div>
                <p className="result-source" onClick={() => onSelectNote(note.id)}>
                  From: <span className="result-title-inline">{note.title || 'Untitled'}</span>
                </p>
                <p className="prose-content">{note.content || '(empty note)'}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="chat-bubble bot-bubble">
      <p>Found <strong>{results.length}</strong> note{results.length > 1 ? 's' : ''}:</p>
      <div className="result-list">
        {results.map(({ note, snippet, score }) => (
          <div key={note.id} className="result-card" onClick={() => onSelectNote(note.id)}>
            <div className="result-card-header">
              <span className="result-title">{note.title || 'Untitled'}</span>
              <span className="result-date">{formatRelativeDate(note.updatedAt)}</span>
            </div>
            <p className="result-snippet">{renderSnippet(snippet) || <em className="no-preview">No preview available</em>}</p>
            <div className="result-confidence">
              <div className="confidence-bar" style={{ width: `${Math.min(100, Math.round(score * 300))}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SearchBot({ notes, onSelectNote }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleAsk() {
    const query = input.trim()
    if (!query) return
    const { intent, results } = search(query, notes)
    setMessages(prev => [
      ...prev,
      { type: 'user', text: query },
      { type: 'bot', query, intent, results }
    ])
    setInput('')
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  return (
    <div className="bot-panel">
      <div className="bot-header">
        <span>🔍 Ask your notes</span>
      </div>
      <div className="bot-messages">
        {messages.length === 0 && (
          <div className="bot-empty">
            <p>Ask anything about your notes.</p>
            <p className="bot-hint">
              Try: <em>"list my projects"</em>, <em>"dentist appointment"</em>, <em>"show ideas"</em>
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <BotMessage key={i} msg={msg} onSelectNote={onSelectNote} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="bot-input-area">
        <input
          className="bot-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={notes.length === 0 ? 'Add some notes first…' : 'Ask about your notes…'}
          disabled={notes.length === 0}
        />
        <button
          className="bot-send"
          onClick={handleAsk}
          disabled={!input.trim() || notes.length === 0}
        >
          Ask
        </button>
      </div>
    </div>
  )
}
