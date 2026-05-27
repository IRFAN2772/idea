# 💡 idea — Architecture & Technical Documentation

## What is idea?

**idea** is a personal note-taking app with a built-in intelligent search engine. It solves one specific problem: you write notes across many topics, and later you can't remember which note contains what. The search bot finds the right note instantly using natural language queries.

Everything runs **100% locally in your browser** — no server, no cloud, no API keys.

---

## Tech Stack

| Layer                | Technology           | Why                                                                |
| -------------------- | -------------------- | ------------------------------------------------------------------ |
| **UI Framework**     | React 19             | Component-based UI with hooks for state management                 |
| **Build Tool**       | Vite 8               | Instant HMR, ES module dev server, fast production builds          |
| **Database**         | SQLite (via sql.js)  | Full relational DB running in-browser via WebAssembly              |
| **Full-Text Search** | SQLite FTS5          | BM25 ranking, Porter stemmer, prefix matching — all in WASM        |
| **Persistence**      | IndexedDB            | Stores the SQLite binary file (up to ~50MB), survives page reloads |
| **Fallback Search**  | Custom TF-IDF engine | Levenshtein fuzzy matching when FTS5 returns nothing               |
| **Styling**          | Plain CSS            | No CSS framework — lightweight, no dependencies                    |

---

## Project Structure

```
idea/
├── public/
│   └── sql-wasm.wasm          ← SQLite WASM binary (served as static asset)
├── src/
│   ├── main.jsx               ← React entry point (renders <App />)
│   ├── App.jsx                ← Root component: manages notes state, DB init, layout
│   ├── App.css                ← All application styles
│   ├── components/
│   │   ├── NoteList.jsx       ← Left sidebar: note cards, new/delete, about button
│   │   ├── NoteEditor.jsx     ← Center: title, tags, content editor, writing tips
│   │   ├── SearchBot.jsx      ← Right panel: chat-style search interface
│   │   └── AboutModal.jsx     ← Info modal explaining how the app works
│   ├── engine/
│   │   ├── db.js              ← SQLite init, CRUD, FTS5 search, IndexedDB persistence
│   │   ├── search.js          ← Legacy TF-IDF search (fallback)
│   │   ├── tokenizer.js       ← Text tokenization + basic stemming
│   │   ├── invertedIndex.js   ← Inverted index builder (for legacy search)
│   │   ├── tfidf.js           ← TF-IDF scoring algorithm
│   │   ├── fuzzy.js           ← Levenshtein edit distance
│   │   └── queryParser.js     ← Intent detection, term extraction, list parsing
│   └── store/
│       └── notesStore.js      ← createNote() helper (generates new note objects)
├── vite.config.js             ← Vite + React plugin config
├── package.json               ← Dependencies: react, react-dom, sql.js
└── index.html                 ← HTML shell
```

---

## How It Works — End to End

### 1. App Boot (`App.jsx` → `db.js`)

```
User opens app
    │
    ▼
App.jsx renders loading spinner
    │
    ▼
initDB() called:
    ├─ Loads sql.js WebAssembly (~660KB)
    ├─ Checks IndexedDB for existing SQLite database file
    │     ├─ Found → opens it (your notes are restored)
    │     └─ Not found → creates empty DB
    ├─ Runs schema (CREATE TABLE notes, CREATE VIRTUAL TABLE notes_fts)
    ├─ Checks if legacy localStorage data exists → migrates it
    └─ Returns ready DB instance
    │
    ▼
App.jsx fetches all notes from DB → renders UI
```

### 2. Writing a Note (`NoteEditor.jsx` → `db.js`)

```
User types in title/content/tags
    │
    ▼
500ms debounce timer starts
    │
    ▼
Timer fires → onUpdate(id, { title, content, tags })
    │
    ▼
App.jsx calls upsertNote(note):
    ├─ INSERT OR UPDATE into `notes` table
    ├─ DELETE old FTS row → INSERT new FTS row (sync manually)
    └─ schedulePersist() → 800ms later → exports DB → saves to IndexedDB
```

### 3. Searching (`SearchBot.jsx` → `db.js` → `search.js`)

```
User types query → clicks "Ask" or presses Enter
    │
    ▼
detectIntent(query):
    ├─ "list my...", "what are...", "show..." → LIST intent
    └─ anything else → FIND intent
    │
    ▼
extractSearchTerms(query):
    └─ Strips filler words: "what are my project ideas" → "project ideas"
    │
    ▼
ftsSearch(cleanQuery, notes):  ← PRIMARY SEARCH (SQLite FTS5)
    ├─ _buildFTSQuery() converts to FTS5 syntax:
    │     ├─ "#tag"     → tags:tag        (column filter)
    │     ├─ "phrase"   → "phrase"         (exact match)
    │     └─ word word  → word word*       (last token gets prefix *)
    ├─ Runs: SELECT ... FROM notes_fts WHERE notes_fts MATCH ? ORDER BY bm25()
    └─ Returns: [{ note, snippet (with ##highlights##), score }]
    │
    ▼
If FTS5 returns 0 results → FALLBACK to legacy search:
    ├─ Tokenize → build inverted index → TF-IDF scoring
    ├─ Fuzzy expand: Levenshtein distance=1 on vocabulary
    └─ Raw substring match as last resort
    │
    ▼
Results rendered as chat bubbles:
    ├─ FIND intent → cards with title, snippet, confidence bar
    └─ LIST intent → extracted bullet points from note content
```

---

## Core Engine Deep Dive

### SQLite FTS5 (Full-Text Search 5)

FTS5 is SQLite's built-in full-text search extension. It creates an **inverted index** inside the database file itself.

**Schema:**

```sql
CREATE VIRTUAL TABLE notes_fts USING fts5(
    note_id  UNINDEXED,   -- carried along, not searchable
    title,                 -- indexed, searchable
    content,               -- indexed, searchable
    tags,                  -- indexed, searchable
    tokenize = 'porter unicode61'  -- Porter stemmer + Unicode support
);
```

**What this gives us:**

| Feature                | How it works                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| **BM25 Ranking**       | Okapi BM25 algorithm — same as Elasticsearch. Rare specific words score higher than common ones. |
| **Porter Stemmer**     | "running" → "run", "projects" → "project", "ideas" → "idea" — automatic word normalization       |
| **Prefix Search**      | `proj*` matches project, projects, projector — user types partial word, still finds results      |
| **Phrase Matching**    | `"exact phrase"` matches those words in that exact order                                         |
| **Column Filtering**   | `tags:project` searches only the tags column                                                     |
| **Snippet Extraction** | `snippet()` function returns surrounding text with match markers                                 |

**Why BM25 beats simple text search:**

- "project" appearing in 1 note out of 100 scores WAY higher than "the" appearing in 95/100
- Short notes aren't penalized vs long notes (length normalization)
- Multiple occurrences have diminishing returns (term saturation)

### Persistence Layer (IndexedDB)

```
Browser Memory:  SQLite DB instance (_db)
                       │
                       │  schedulePersist() — 800ms debounce
                       ▼
IndexedDB:       "idea_v2" database → "sqlite" store → "notes.db" key
                 (stores raw binary: _db.export() → Uint8Array)
```

- Every write (create/update/delete) triggers a debounced persist
- On next page load, the binary is read back and used to reconstruct the DB
- This gives you **up to ~50MB** of note storage (IndexedDB limit)
- Data survives page refreshes, browser restarts, OS reboots

### Legacy TF-IDF Search (Fallback)

If FTS5 returns nothing (e.g., very fuzzy query), the fallback pipeline runs:

```
tokenizer.js     → lowercase, remove punctuation, strip stop words, suffix stem
invertedIndex.js → { token: { noteId: count } }, title tokens weighted 3×
tfidf.js         → TF = count/totalTerms, IDF = log(N/df), score = TF × IDF
fuzzy.js         → Levenshtein distance: expand query tokens to vocab words 1 edit away
```

### Query Parser (`queryParser.js`)

**Intent Detection:**

- Triggers LIST: "list", "show", "give", "what are", "what is"
- Everything else: FIND (default)

**Term Extraction:**

- Strips question/filler words: what, which, who, where, my, the, things, stuff
- Keeps only meaningful content keywords

**List Extraction** (from note content):

- Pass 1: Formatted lists (`- item`, `1. item`, `[x] item`)
- Pass 2: Colon-separated inline lists (`Tech: React, Node, SQLite`)

---

## Tags System

### How tags work:

1. **Adding**: Type in the tag input bar below the title → press Enter or comma
2. **Storage**: Stored as JSON array in `notes.tags` column, space-separated text in FTS
3. **Searching**: Type `#tagname` in the search bot → FTS5 column filter: `tags:tagname`
4. **Display**: Tag chips on note cards in sidebar + in search results

### Why tags improve search:

Without tags, searching "project" scans all title + content text. With a `#project` tag, you get **exact categorical filtering** — only notes explicitly tagged as projects appear.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER                                   │
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ NoteList │    │  NoteEditor  │    │     SearchBot        │  │
│  │ (sidebar)│    │   (center)   │    │ (right panel)        │  │
│  └────┬─────┘    └──────┬───────┘    └──────────┬───────────┘  │
│       │                  │                       │               │
│       │     ┌────────────┴────────────┐          │               │
│       └─────┤        App.jsx          ├──────────┘               │
│             │  (state management)     │                          │
│             └────────────┬────────────┘                          │
│                          │                                       │
│             ┌────────────┴────────────┐                          │
│             │        db.js            │                          │
│             │  (SQLite + FTS5 + CRUD) │                          │
│             └────────────┬────────────┘                          │
│                          │                                       │
│    ┌─────────────────────┼─────────────────────┐                │
│    │                     │                     │                 │
│    ▼                     ▼                     ▼                 │
│ ┌──────┐          ┌───────────┐         ┌──────────┐           │
│ │sql.js│          │ IndexedDB │         │search.js │           │
│ │(WASM)│          │(persist)  │         │(fallback)│           │
│ └──────┘          └───────────┘         └──────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## UI Architecture

### Three-Panel Layout (CSS Grid)

```css
.app {
  grid-template-columns: 240px 1fr;
} /* bot closed */
.app.bot-open {
  grid-template-columns: 240px 1fr 320px;
} /* bot open */
```

### Component Responsibilities

| Component        | Responsibility                                                    |
| ---------------- | ----------------------------------------------------------------- |
| `App.jsx`        | DB initialization, notes state, CRUD callbacks, layout shell      |
| `NoteList.jsx`   | Render note cards, handle selection/deletion, about/search toggle |
| `NoteEditor.jsx` | Edit title/content/tags, debounced autosave, writing tips         |
| `SearchBot.jsx`  | Chat interface, query handling, result rendering                  |
| `AboutModal.jsx` | Static info modal explaining the app                              |

### State Management

No external state library. React `useState` + `useCallback` + a ref pattern:

```jsx
const notesRef = useRef(notes);
useEffect(() => {
  notesRef.current = notes;
}, [notes]);
```

This ensures callbacks (which are memoized with `useCallback`) never close over stale state.

---

## Key Design Decisions

| Decision                         | Reasoning                                                     |
| -------------------------------- | ------------------------------------------------------------- |
| sql.js instead of server SQLite  | Zero deployment complexity, works offline, no CORS/API issues |
| IndexedDB for persistence        | Larger storage than localStorage (50MB vs 5MB), binary-safe   |
| FTS5 as primary search           | Professional-grade ranking (BM25) with zero infrastructure    |
| TF-IDF as fallback               | Handles fuzzy typos that FTS5 strict matching would miss      |
| Debounced saves (500ms)          | Doesn't hammer the DB on every keystroke                      |
| Debounced persist (800ms)        | Doesn't write to IndexedDB on every DB change                 |
| WASM in public/                  | Avoids Vite bundling issues with WebAssembly modules          |
| Porter stemmer (built into FTS5) | Handles word variations without manual synonym lists          |
| Tags as both JSON + FTS text     | JSON for display, space-separated text for full-text indexing |

---

## How Search Ranking Works (BM25)

The formula (simplified):

```
score(query, note) = Σ  IDF(term) × (tf × (k1 + 1)) / (tf + k1 × (1 - b + b × |D|/avgDL))
                    term
```

Where:

- **IDF(term)** = how rare this word is across all notes (rare = higher score)
- **tf** = how many times the word appears in this note
- **k1** = term saturation parameter (default 1.2)
- **b** = length normalization (default 0.75)
- **|D|** = length of this note
- **avgDL** = average length of all notes

**In practice this means:**

- A note titled "Project Roadmap" with content about projects will score very high for "project roadmap"
- A long note that mentions "project" once will score lower than a short note focused on it
- Common words like "the", "is", "and" contribute almost nothing to the score

---

## Commands

```bash
npm run dev      # Start development server (http://localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

---

## Browser Compatibility

- Requires: WebAssembly, IndexedDB, ES2020+
- Works on: Chrome 69+, Firefox 62+, Safari 15+, Edge 79+
- Does NOT work: IE11, very old mobile browsers

---

## Security & Privacy

- **100% local** — no network requests, no analytics, no tracking
- **No server** — nothing to hack, no API keys to leak
- **Data stays in IndexedDB** — only accessible from this origin (same-origin policy)
- **Clearing browser data deletes notes** — this is the only risk (no cloud backup)
