export default function AboutModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close">×</button>

        <div className="modal-header">
          <span className="modal-logo">💡</span>
          <h1 className="modal-title">idea</h1>
          <p className="modal-tagline">Your personal note search engine</p>
        </div>

        <div className="modal-body">
          <section>
            <h2>What is this?</h2>
            <p>
              <strong>idea</strong> is a private note-taking app built around one problem:
              you write notes across many topics, but later you can't remember which note
              holds what. The search bot solves that — ask it anything in plain English
              and it finds the right note instantly, even if you remember only a vague keyword.
            </p>
          </section>

          <section>
            <h2>How the search works</h2>
            <ul className="about-list">
              <li>
                <strong>SQLite FTS5</strong> — Every note is indexed in a full-text search
                engine that runs entirely inside your browser. No server, no cloud.
              </li>
              <li>
                <strong>BM25 ranking</strong> — Results are ranked by Okapi BM25, the same
                algorithm used by search engines like Elasticsearch. Rare, specific keywords
                score higher than common filler words.
              </li>
              <li>
                <strong>Porter stemmer</strong> — "running" matches "run", "ideas" matches
                "idea", "projects" matches "project" — automatically, without any extra config.
              </li>
              <li>
                <strong>Prefix search</strong> — Typing <code>proj</code> matches "project",
                "projects", "projector" and anything else that starts with those letters.
              </li>
              <li>
                <strong>Fuzzy fallback</strong> — If FTS5 finds nothing, the app falls back
                to a TF-IDF engine with Levenshtein typo correction so you never hit a dead end.
              </li>
              <li>
                <strong>Intent detection</strong> — Queries like "list my ideas" or
                "what are my tasks" switch into list mode and extract bullet points
                directly from matched notes.
              </li>
            </ul>
          </section>

          <section>
            <h2>Features</h2>
            <ul className="about-list">
              <li>📝 Plain-text notes with autosave (500 ms debounce)</li>
              <li>#️⃣ Tags — organise notes and search with <code>#tagname</code></li>
              <li>🔍 Natural-language search bot with BM25 + Porter stemming</li>
              <li>💬 Chat interface with highlighted match snippets</li>
              <li>💾 Stored in <strong>IndexedDB via SQLite</strong> — up to ~50 MB, fully offline</li>
              <li>🔒 100 % local — your notes never leave your device</li>
            </ul>
          </section>

          <section>
            <h2>Tips for better results</h2>
            <ul className="about-list">
              <li>Give notes <strong>descriptive titles</strong> — they're weighted 10× in search</li>
              <li>Add tags like <code>#project</code> <code>#idea</code> <code>#todo</code> to each note</li>
              <li>Use bullet points so the bot can extract them as a clean list</li>
              <li>Write the <strong>exact keywords</strong> you'll search for later</li>
              <li>Search with quotes for exact phrases: <code>"project roadmap"</code></li>
              <li>Tag-search: type <code>#tagname</code> in the bot panel</li>
            </ul>
          </section>
        </div>

        <div className="modal-footer">
          <button className="modal-close-btn" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  )
}
