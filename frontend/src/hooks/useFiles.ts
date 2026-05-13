// src/hooks/useFiles.ts
// stub hook — ไม่ได้ใช้งานจริงแล้ว แต่เก็บไว้ไม่ให้ import error
// files/page.tsx และ chat/page.tsx เปลี่ยนมาใช้ getProjects() โดยตรงแล้ว

export interface FileRecord {
  id: string
  filename: string
  size: number
  rows: number
  columns: string[]
  uploaded_at: string
}

export function useFiles() {
  return {
    files:   [] as FileRecord[],
    loading: false,
    error:   "",
    refresh: () => {},
    remove:  async (_id: string) => {},
  }
}