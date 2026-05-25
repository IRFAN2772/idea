const STORAGE_KEY = 'idea_notes'

export function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

export function saveNotes(notes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  } catch {
    // localStorage unavailable or quota exceeded
  }
}

export function createNote() {
  return {
    id: crypto.randomUUID(),
    title: 'Untitled',
    content: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}
