import express from "express";
import cors from "cors";
import { createClient } from "@libsql/client";

// ── SQLite DB (persists at /data/notes.db on HF Spaces) ───────────────────
const DB_PATH = process.env.DB_PATH || (process.env.SPACE_ID ? "/data/notes.db" : "local.db");
const db = createClient({ url: `file:${DB_PATH}` });

// ── Initialize schema ──────────────────────────────────────────────────────
await db.execute(`
  CREATE TABLE IF NOT EXISTS notes (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL DEFAULT '',
    content    TEXT NOT NULL DEFAULT '',
    tags       TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

// ── Express app ────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "idea-backend" });
});

// GET /api/notes — fetch all notes
app.get("/api/notes", async (_req, res) => {
  try {
    const result = await db.execute(
      "SELECT id, title, content, tags, created_at, updated_at FROM notes ORDER BY updated_at DESC"
    );
    const notes = result.rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      tags: JSON.parse(r.tags),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json(notes);
  } catch (err) {
    console.error("GET /api/notes error:", err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// POST /api/notes — create or update a note (upsert)
app.post("/api/notes", async (req, res) => {
  try {
    const { id, title, content, tags, createdAt, updatedAt } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });

    const tagsJSON = JSON.stringify(tags || []);
    await db.execute({
      sql: `INSERT INTO notes (id, title, content, tags, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              content = excluded.content,
              tags = excluded.tags,
              updated_at = excluded.updated_at`,
      args: [
        id,
        title || "",
        content || "",
        tagsJSON,
        createdAt || new Date().toISOString(),
        updatedAt || new Date().toISOString(),
      ],
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/notes error:", err);
    res.status(500).json({ error: "Failed to save note" });
  }
});

// DELETE /api/notes/:id — delete a note
app.delete("/api/notes/:id", async (req, res) => {
  try {
    await db.execute({ sql: "DELETE FROM notes WHERE id = ?", args: [req.params.id] });
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/notes/:id error:", err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// ── Start server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 7860;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`idea-backend running on port ${PORT}`);
});
