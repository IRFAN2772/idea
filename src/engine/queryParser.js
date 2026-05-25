// Intent words — these tell us WHAT to do, not WHAT to search for
const LIST_TRIGGERS = new Set([
  'list', 'show', 'give', 'tell', 'display', 'print', 'enumerate', 'all'
])

// Phrase-level LIST triggers — "what are X" means "list X"
const LIST_PHRASES = [
  /what\s+are\b/i,
  /what\s+is\b/i,
  /what\s+were\b/i,
  /what\s+should\b/i,
  /what\s+does\b/i,
  /what\s+did\b/i,
]

const QUESTION_WORDS = new Set([
  'what', 'which', 'who', 'where', 'when', 'how', 'why',
  'are', 'were', 'have', 'did', 'do', 'does', 'is', 'was',
  'wrote', 'written', 'write', 'made', 'make', 'created', 'added',
  'me', 'my', 'the', 'a', 'an', 'in', 'of', 'to',
  // filler/structural words that carry no search meaning
  'things', 'stuff', 'items', 'thing', 'something', 'everything',
  'should', 'could', 'would', 'need', 'must', 'can',
  'some', 'any', 'about', 'regarding', 'concerning'
])

// Detect what the user wants to DO
export function detectIntent(query) {
  const q = query.toLowerCase()
  // Check phrase-level patterns first
  for (const pattern of LIST_PHRASES) {
    if (pattern.test(q)) return 'LIST'
  }
  // Then single-word triggers
  const words = q.split(/\s+/)
  for (const w of words) {
    if (LIST_TRIGGERS.has(w)) return 'LIST'
  }
  return 'FIND'
}

// Strip intent/question words — keep only the meaningful content keywords
export function extractSearchTerms(query) {
  const words = query.toLowerCase().split(/\s+/)
  const meaningful = words.filter(w =>
    w.length > 1 &&               // keep short but meaningful words like "AI", "db"
    !LIST_TRIGGERS.has(w) &&
    !QUESTION_WORDS.has(w)
  )
  return meaningful.length > 0 ? meaningful.join(' ') : query
}

// Extract list items from note content — handles formatted AND plain prose
export function extractListItems(content) {
  if (!content) return []
  const lines = content.split('\n')
  const items = []

  // Pass 1: formatted lists (bullet, numbered, checkbox)
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    const bullet   = t.match(/^[-*+•]\s+(.+)/)
    const numbered = t.match(/^\d+[.)]\s+(.+)/)
    const checkbox = t.match(/^\[[ xX]\]\s+(.+)/)
    const hit = bullet || numbered || checkbox
    if (hit) items.push(hit[1].trim())
  }
  if (items.length > 0) return items

  // Pass 2: "Label: item1, item2, item3" — colon-separated inline list
  for (const line of lines) {
    const t = line.trim()
    const colonMatch = t.match(/^[^:]{1,40}:\s*(.+)/)
    if (colonMatch) {
      const parts = colonMatch[1].split(/,|;/).map(s => s.replace(/\band\b/i, '').trim()).filter(s => s.length > 0)
      if (parts.length >= 2) return parts
    }
  }

  // Pass 3: inline comma list anywhere in text — "X, Y, and Z"
  const commaPattern = /([A-Z][^,.\n]{2,40}),\s+([A-Z][^,.\n]{2,40})(?:,\s+([A-Z][^,.\n]{2,40}))?/g
  const fullText = content
  let match
  while ((match = commaPattern.exec(fullText)) !== null) {
    const found = [match[1], match[2], match[3]].filter(Boolean).map(s => s.replace(/\band\b/i, '').trim())
    if (found.length >= 2) return found
  }

  // Pass 4: consecutive short lines (implicit list — each line is an item)
  const shortLines = lines.map(l => l.trim()).filter(l => l.length > 0 && l.length < 80)
  if (shortLines.length >= 3 && shortLines.length === lines.filter(l => l.trim()).length) {
    return shortLines
  }

  // No structure found — return empty so caller can show full content
  return []
}

// Extract any dates/times mentioned in the note
export function extractDates(content) {
  if (!content) return []
  const datePattern = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}(?:,\s*\d{4})?)\b/gi
  return [...new Set(content.match(datePattern) || [])]
}
