import { tokenize } from './tokenizer.js'
import { levenshtein } from './fuzzy.js'
import { buildIndex } from './invertedIndex.js'
import { scoreNotes } from './tfidf.js'
import { detectIntent, extractSearchTerms, extractListItems, extractDates } from './queryParser.js'

// Pulls a relevant text snippet from a note, wrapping matched words in ##markers##
function extractSnippet(text, queryWords) {
  if (!text || !text.trim()) return ''
  const lower = text.toLowerCase()
  let bestIdx = 0
  for (const w of queryWords) {
    const idx = lower.indexOf(w)
    if (idx !== -1) { bestIdx = idx; break }
  }
  const start = Math.max(0, bestIdx - 40)
  let snippet = text.slice(start, start + 180)
  if (start > 0) snippet = '…' + snippet
  if (start + 180 < text.length) snippet += '…'
  for (const w of queryWords) {
    if (w.length < 2) continue
    const safe = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    snippet = snippet.replace(new RegExp(`(${safe})`, 'gi'), '##$1##')
  }
  return snippet
}

// Main entry point — tokenize → index → TF-IDF → fuzzy expand → rank → snippets
export function search(query, notes) {
  if (!query.trim() || !notes.length) return { intent: 'FIND', results: [] }

  const intent = detectIntent(query)
  const cleanQuery = extractSearchTerms(query)

  const index = buildIndex(notes)
  const queryTokens = tokenize(cleanQuery)
  if (!queryTokens.length) return { intent, results: [] }

  // Fuzzy expansion: include vocabulary words 1 edit away from each query token
  const vocab = Object.keys(index)
  const expanded = new Set(queryTokens)
  if (vocab.length < 5000) {
    for (const token of queryTokens) {
      for (const v of vocab) {
        if (v !== token && v.length > 3 && levenshtein(token, v) === 1) {
          expanded.add(v)
        }
      }
    }
  }

  let scores = scoreNotes(notes, index, [...expanded])

  // Fallback: raw substring match if TF-IDF finds nothing
  if (!Object.keys(scores).length) {
    const raw = cleanQuery.toLowerCase()
    for (const note of notes) {
      if (`${note.title} ${note.content}`.toLowerCase().includes(raw)) {
        scores[note.id] = 0.05
      }
    }
  }

  const rawWords = cleanQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2)

  const results = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([noteId, sc]) => {
      const note = notes.find(n => n.id === noteId)
      if (!note) return null
      const listItems = extractListItems(note.content)
      const dates = extractDates(note.content)
      return {
        note,
        score: sc,
        snippet: extractSnippet(note.content || note.title, rawWords),
        listItems,   // extracted bullet/numbered items
        dates        // extracted date strings
      }
    })
    .filter(Boolean)

  return { intent, results }
}
