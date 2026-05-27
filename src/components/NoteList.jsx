import { useState } from "react";

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function NoteCard({ note, isActive, onSelect, onDelete }) {
  const [hover, setHover] = useState(false);
  const preview =
    note.content.replace(/\s+/g, " ").slice(0, 60) || "No content";

  return (
    <div
      className={`note-card${isActive ? " active" : ""}`}
      onClick={() => onSelect(note.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="note-card-top">
        <span className="note-card-title">{note.title || "Untitled"}</span>
        {hover && (
          <button
            className="note-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            title="Delete note"
          >
            ✕
          </button>
        )}
      </div>
      <p className="note-card-preview">{preview}</p>
      {note.tags?.length > 0 && (
        <div className="note-card-tags">
          {note.tags.slice(0, 3).map((t) => (
            <span key={t} className="note-card-tag">
              #{t}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="note-card-tag-more">+{note.tags.length - 3}</span>
          )}
        </div>
      )}
      <span className="note-card-date">{formatDate(note.updatedAt)}</span>
    </div>
  );
}

export default function NoteList({
  notes,
  activeNoteId,
  onSelect,
  onNew,
  onDelete,
  botOpen,
  onToggleBot,
  onAbout,
}) {
  return (
    <div className="notes-sidebar">
      <div className="sidebar-header">
        <span className="app-logo">💡 idea</span>
        <div className="sidebar-header-btns">
          <button className="icon-btn" onClick={onAbout} title="About this app">
            ℹ️
          </button>
          <button
            className={`bot-toggle-btn${botOpen ? " active" : ""}`}
            onClick={onToggleBot}
            title={botOpen ? "Hide search bot" : "Show search bot"}
          >
            🔍
          </button>
        </div>
      </div>
      <button className="new-note-btn" onClick={onNew}>
        + New Note
      </button>
      <div className="note-list">
        {notes.length === 0 ? (
          <p className="note-list-empty">
            No notes yet.
            <br />
            Create your first one!
          </p>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isActive={note.id === activeNoteId}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
