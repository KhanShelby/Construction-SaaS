// src/lib/api.ts

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function authHeaders(): HeadersInit {
  return {
    "x-api-key": "test-api-key-001", // dev mode
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "เกิดข้อผิดพลาด")
  }
  return res.json()
}

// ─── Project ID ───────────────────────────────────────────────────────────
// เก็บ project_id ไว้ใน localStorage — สร้างอัตโนมัติถ้ายังไม่มี

async function getOrCreateProjectId(): Promise<string> {
  const stored = localStorage.getItem("project_id")
  if (stored) return stored

  // สร้างโครงการ default อัตโนมัติ
  const res = await fetch(`${API}/api/projects`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ name: "โครงการหลัก" }),
  })
  const data = await handleResponse<{ project_id: string }>(res)
  localStorage.setItem("project_id", data.project_id)
  return data.project_id
}

// ─── Projects ─────────────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  client_name: string
  contract_value: number
  status: string
  labor_total: number
  material_total: number
  received: number
  estimated_profit: number
}

export async function getFiles(): Promise<ImportResult[]> {
  return [] // backend ยังไม่มี endpoint นี้
}

export async function getProjects(): Promise<Project[]> {
  const res = await fetch(`${API}/api/projects`, {
    headers: authHeaders(),
  })
  return handleResponse<Project[]>(res)
}

export async function createProject(data: {
  name: string
  client_name?: string
  contract_value?: number
  start_date?: string
  end_date?: string
}): Promise<{ project_id: string }> {
  const res = await fetch(`${API}/api/projects`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function getProjectSummary(projectId: string) {
  const res = await fetch(`${API}/api/projects/${projectId}/summary`, {
    headers: authHeaders(),
  })
  return handleResponse(res)
}

// ─── Files (Excel Import) ─────────────────────────────────────────────────

export interface ImportResult {
  file: string
  sheets: {
    sheet: string
    table_type: string
    rows: number
    status: string
    confidence?: string
    reason?: string
  }[]
  errors: string[]
}

export async function uploadFile(file: File): Promise<ImportResult> {
  // 1. หา project_id (สร้างอัตโนมัติถ้ายังไม่มี)
  const projectId = await getOrCreateProjectId()

  // 2. ส่งไป /api/import/excel?project_id=xxx
  const form = new FormData()
  form.append("file", file)

  const res = await fetch(`${API}/api/import/excel?project_id=${projectId}`, {
    method: "POST",
    headers: authHeaders(), // ไม่ใส่ Content-Type — browser จัดการ multipart เอง
    body: form,
  })
  return handleResponse<ImportResult>(res)
}

// deleteFile — หลังบ้านยังไม่มี endpoint นี้ (Sprint 3)
export async function deleteFile(fileId: string): Promise<void> {
  console.warn("deleteFile ยังไม่ได้ implement ที่ backend")
}

// ─── Labor & Materials ────────────────────────────────────────────────────

export async function addLabor(data: {
  project_id: string
  worker_name?: string
  worker_type?: string
  work_days?: number
  daily_rate?: number
  total_amount?: number
  work_date?: string
  note?: string
}) {
  const res = await fetch(`${API}/api/labor`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function addMaterial(data: {
  project_id: string
  item_name?: string
  quantity?: number
  unit?: string
  unit_price?: number
  total_amount?: number
  supplier?: string
  purchase_date?: string
  note?: string
}) {
  const res = await fetch(`${API}/api/materials`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// ─── Chat ─────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export interface ChatResponse {
  answer: string
  sql_used: string | null
  raw_data: Record<string, unknown>[] | null
}

export async function sendChat(
  message: string,
  history: ChatMessage[] = []
): Promise<ChatResponse> {
  const res = await fetch(`${API}/api/chat`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      question: message,
      // แปลง history ให้ตรงกับ backend (ตัด timestamp ออก)
      history: history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  })
  return handleResponse<ChatResponse>(res)
}

// ─── User / Quota ─────────────────────────────────────────────────────────

export interface UserInfo {
  user_id: string
  plan: string
  usage_count: number
  plan_limit: number | null
}

export async function getMe(): Promise<UserInfo> {
  const res = await fetch(`${API}/api/me`, {
    headers: authHeaders(),
  })
  return handleResponse<UserInfo>(res)
}