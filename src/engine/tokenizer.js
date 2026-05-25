const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could',
  'should','may','might','shall','can','need','to','of','in',
  'on','at','by','for','with','about','from','into','and','or',
  'if','as','it','its','this','that','these','those','i','me',
  'my','we','our','you','your','he','she','they','them','his',
  'her','their','what','which','who','not','no','but','just',
  'so','than','too','very','also','only','here','there','when',
  'where','how','all','each','both','then','now','get','got',
  'let','put','set','up','out','off','over','into'
])

function stem(word) {
  if (word.length <= 3) return word
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3)
  if (word.endsWith('tion') && word.length > 6) return word.slice(0, -4)
  if (word.endsWith('ness') && word.length > 6) return word.slice(0, -4)
  if (word.endsWith('ment') && word.length > 6) return word.slice(0, -4)
  if (word.endsWith('ible') && word.length > 6) return word.slice(0, -4)
  if (word.endsWith('able') && word.length > 6) return word.slice(0, -4)
  if (word.endsWith('ed') && word.length > 5) return word.slice(0, -2)
  if (word.endsWith('er') && word.length > 5) return word.slice(0, -2)
  if (word.endsWith('ly') && word.length > 5) return word.slice(0, -2)
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2)
  if (word.endsWith('s') && word.length > 4) return word.slice(0, -1)
  return word
}

export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
    .map(stem)
}
