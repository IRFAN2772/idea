export function createNote() {
  return {
    id: crypto.randomUUID(),
    title: "",
    content: "",
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
