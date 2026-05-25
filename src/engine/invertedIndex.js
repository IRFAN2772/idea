import { tokenize } from './tokenizer.js'

const TITLE_BOOST = 3  // title match is 3x stronger signal than body match

// Builds an inverted index: { token: { noteId: count } }
// Title tokens are weighted 3x so a note named "Projects" always wins a "projects" search
export function buildIndex(notes) {
  const index = {}
  for (const note of notes) {
    const titleTokens = tokenize(note.title)
    const bodyTokens  = tokenize(note.content)

    for (const token of titleTokens) {
      if (!index[token]) index[token] = {}
      index[token][note.id] = (index[token][note.id] || 0) + TITLE_BOOST
    }
    for (const token of bodyTokens) {
      if (!index[token]) index[token] = {}
      index[token][note.id] = (index[token][note.id] || 0) + 1
    }
  }
  return index
}

// Effective term count for a note — must match index weighting
export function effectiveTermCount(note) {
  return tokenize(note.title).length * TITLE_BOOST + tokenize(note.content).length
}
