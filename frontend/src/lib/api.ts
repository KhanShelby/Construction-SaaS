// src/lib/api.ts
import { getToken } from "./auth"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function authHeaders(): HeadersInit {
  const token = getToken()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "เกิดข้อผิดพลาด")
  }
  return res.json()
}

// ─── Files ───────────────────────────────────────────────────────────────

export interface FileRecord {
  id: string
  filename: string
  size: number
  rows: number
  columns: string[]
  uploaded_at: string
}

export async function getFiles(): Promise<FileRecord[]> {
  const res = await fetch(`${API}/files`, { headers: authHeaders() })
  return handleResponse<FileRecord[]>(res)
}

export async function uploadFile(file: File): Promise<FileRecord> {
  const form = new FormData()
  form.append("file", file)

  const res = await fetch(`${API}/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  })
  return handleResponse<FileRecord>(res)
}

export async function deleteFile(fileId: string): Promise<void> {
  const res = await fetch(`${API}/files/${fileId}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error("ลบไม่สำเร็จ")
}

// ─── Chat (REST fallback) ────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export async function sendChat(message: string, fileId?: string): Promise<{ answer: string }> {
  const res = await fetch(`${API}/chat`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ message, file_id: fileId }),
  })
  return handleResponse<{ answer: string }>(res)
}
