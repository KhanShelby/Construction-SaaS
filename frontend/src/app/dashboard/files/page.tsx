// src/app/dashboard/files/page.tsx
"use client"
import Link from "next/link"
import { getProjects, type Project } from "@/lib/api"
import { FileSpreadsheet, MessageSquare, Plus, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { useState, useEffect, useCallback } from "react"

export default function FilesPage() {
  const [projects,   setProjects]   = useState<Project[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await getProjects()
      setProjects(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const formatMoney = (n: number) =>
    n.toLocaleString("th-TH", { minimumFractionDigits: 0 }) + " บาท"

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">ไฟล์ของฉัน</h1>
            <p className="text-zinc-500 text-sm mt-1">ข้อมูลโครงการที่ import เข้ามาแล้ว</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition"
              title="รีเฟรช"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              href="/dashboard/upload"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              อัปโหลดใหม่
            </Link>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-24">
            <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
              <FileSpreadsheet className="w-7 h-7 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium">ยังไม่มีข้อมูล</p>
            <p className="text-zinc-600 text-sm mt-1">เริ่มด้วยการอัปโหลดไฟล์ Excel</p>
            <Link
              href="/dashboard/upload"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              อัปโหลดไฟล์
            </Link>
          </div>
        )}

        {/* Project list */}
        {!loading && projects.length > 0 && (
          <div className="space-y-3">
            {projects.map((p) => {
              const profit      = p.estimated_profit ?? 0
              const isProfit    = profit >= 0
              return (
                <div
                  key={p.id}
                  className="group flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800/70 border border-zinc-800 rounded-xl transition"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{p.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {p.client_name && <span>{p.client_name} · </span>}
                      มูลค่าสัญญา {formatMoney(p.contract_value ?? 0)}
                    </p>
                    <p className={`text-xs mt-0.5 ${isProfit ? "text-emerald-500" : "text-red-400"}`}>
                      {isProfit ? "กำไรคาดการณ์" : "ขาดทุนคาดการณ์"} {formatMoney(Math.abs(profit))}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    p.status === "active"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : p.status === "completed"
                      ? "bg-zinc-700 text-zinc-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {p.status === "active" ? "กำลังดำเนิน" : p.status === "completed" ? "เสร็จแล้ว" : "รอดำเนิน"}
                  </span>

                  {/* Action */}
                  <div className="opacity-0 group-hover:opacity-100 transition">
                    <Link
                      href="/dashboard/chat"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-600/30 text-indigo-400 hover:text-white rounded-lg text-xs font-medium transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      ถาม AI
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}