// src/components/auth/AuthForm.tsx
"use client"
import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { Loader2, BarChart3 } from "lucide-react"

interface Props {
  mode: "login" | "register"
}

export function AuthForm({ mode }: Props) {
  const { login, register } = useAuth()
  const [email, setEmail] = useState(mode === "login" ? "demo@example.com" : "")
  const [password, setPassword] = useState(mode === "login" ? "demo1234" : "")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      if (mode === "login") {
        await login(email, password)
      } else {
        if (!name.trim()) throw new Error("กรุณากรอกชื่อ")
        await register(email, password, name)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">DataChat</h1>
          <p className="text-zinc-500 text-sm mt-1">วิเคราะห์ Excel ด้วย AI</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-zinc-100 mb-6">
            {mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">ชื่อ</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อของคุณ"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
            </button>
          </form>

          <p className="text-center text-sm text-zinc-500 mt-6">
            {mode === "login" ? (
              <>
                ยังไม่มีบัญชี?{" "}
                <Link href="/register" className="text-indigo-400 hover:text-indigo-300 transition">
                  สมัครสมาชิก
                </Link>
              </>
            ) : (
              <>
                มีบัญชีแล้ว?{" "}
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition">
                  เข้าสู่ระบบ
                </Link>
              </>
            )}
          </p>
        </div>

        {mode === "login" && (
          <p className="text-center text-xs text-zinc-600 mt-4">
            Demo: demo@example.com / demo1234
          </p>
        )}
      </div>
    </div>
  )
}
