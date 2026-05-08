// src/app/dashboard/files/page.tsx
"use client"
import Link from "next/link"
import { useFiles } from "@/hooks/useFiles"
import { FileSpreadsheet, Trash2, MessageSquare, Plus, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { useState } from "react"

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function FilesPage() {
  const { files, loading, error, refresh, remove } = useFiles()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await remove(id)
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">ไฟล์ของฉัน</h1>
            <p className="text-zinc-500 text-sm mt-1">จัดการไฟล์ Excel ที่อัปโหลดไว้</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
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
        {!loading && !error && files.length === 0 && (
          <div className="text-center py-24">
            <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
              <FileSpreadsheet className="w-7 h-7 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium">ยังไม่มีไฟล์</p>
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

        {/* File list */}
        {!loading && files.length > 0 && (
          <div className="space-y-3">
            {files.map((f) => (
              <div
                key={f.id}
                className="group flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800/70 border border-zinc-800 rounded-xl transition"
              >
                {/* Icon */}
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{f.filename}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {f.rows.toLocaleString()} แถว · {f.columns.length} คอลัมน์ · {formatBytes(f.size)}
                  </p>
                  <p className="text-xs text-zinc-700 mt-0.5">{formatDate(f.uploaded_at)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                  <Link
                    href={`/dashboard/chat?file=${f.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-600/30 text-indigo-400 hover:text-white rounded-lg text-xs font-medium transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    ถาม AI
                  </Link>

                  {confirmId === f.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(f.id)}
                        disabled={deletingId === f.id}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                      >
                        {deletingId === f.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : null}
                        ยืนยันลบ
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-3 py-1.5 border border-zinc-700 text-zinc-400 rounded-lg text-xs transition hover:text-zinc-300"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(f.id)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="ลบไฟล์"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
