// ── API client for idea-backend ─────────────────────────────────────────────
// Change this to your deployed HF Spaces URL
const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:7860";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${options.method || "GET"} ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function fetchNotes() {
  return request("/api/notes");
}

export async function saveNote(note) {
  return request("/api/notes", {
    method: "POST",
    body: JSON.stringify(note),
  });
}

export async function removeNote(id) {
  return request(`/api/notes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
