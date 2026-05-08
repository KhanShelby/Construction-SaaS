// src/lib/auth.ts
// Mock auth — swap เป็น Supabase ทีหลังแค่ไฟล์นี้ไฟล์เดียว

export interface User {
  id: string
  email: string
  name: string
  token: string
}

const MOCK_USERS = [
  { id: "1", email: "demo@example.com", password: "demo1234", name: "Demo User" },
]

export async function login(email: string, password: string): Promise<User> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 600))

  const user = MOCK_USERS.find((u) => u.email === email && u.password === password)
  if (!user) throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง")

  const token = btoa(`${user.id}:${Date.now()}`) // mock JWT
  const session: User = { id: user.id, email: user.email, name: user.name, token }

  localStorage.setItem("auth_user", JSON.stringify(session))
  return session
}

export async function register(email: string, password: string, name: string): Promise<User> {
  await new Promise((r) => setTimeout(r, 600))

  // Mock: always succeed
  const id = crypto.randomUUID()
  const token = btoa(`${id}:${Date.now()}`)
  const session: User = { id, email, name, token }

  localStorage.setItem("auth_user", JSON.stringify(session))
  return session
}

export function logout() {
  localStorage.removeItem("auth_user")
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem("auth_user")
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function getToken(): string | null {
  return getUser()?.token ?? null
}

/* ─── TODO: swap Supabase ─────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}
──────────────────────────────────────────────────────────────────────────── */
