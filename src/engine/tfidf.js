import { effectiveTermCount } from './invertedIndex.js'

// TF-IDF scoring — ranks notes by relevance to the query
// TF  = how often the term appears in a note (normalized by effective length)
// IDF = how rare the term is across all notes (rare terms = more signal)
// Title tokens are pre-weighted 3x in the index, so title matches rank higher naturally
export function scoreNotes(notes, index, queryTokens) {
  const N = notes.length
  const scores = {}

  for (const token of queryTokens) {
    if (!index[token]) continue
    const df = Object.keys(index[token]).length
    const idf = Math.log((N + 1) / (df + 1)) + 1  // smoothed IDF

    for (const [noteId, rawCount] of Object.entries(index[token])) {
      const note = notes.find(n => n.id === noteId)
      if (!note) continue
      const totalTerms = effectiveTermCount(note) || 1
      const tf = rawCount / totalTerms
      scores[noteId] = (scores[noteId] || 0) + tf * idf
    }
  }

  return scores
}
