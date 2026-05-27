export function createNote() {
  return {
    id: crypto.randomUUID(),
    title: 'Untitled',
    content: '',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
