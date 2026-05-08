// src/app/dashboard/chat/page.tsx
"use client"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ChatWindow } from "@/components/chat/ChatWindow"
import { useFiles } from "@/hooks/useFiles"
import { useState, useEffect } from "react"
import { FileSpreadsheet, ChevronDown } from "lucide-react"

function ChatContent() {
  const searchParams = useSearchParams()
  const { files, loading } = useFiles()
  const [selectedFileId, setSelectedFileId] = useState<string | undefined>()
  const [showFilePicker, setShowFilePicker] = useState(false)

  useEffect(() => {
    const fid = searchParams.get("file")
    if (fid) setSelectedFileId(fid)
    else if (files.length > 0 && !selectedFileId) setSelectedFileId(files[0].id)
  }, [searchParams, files, selectedFileId])

  const selectedFile = files.find((f) => f.id === selectedFileId)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* File selector bar */}
      <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3">
        <span className="text-xs text-zinc-500 shrink-0">กำลังวิเคราะห์:</span>

        {loading ? (
          <div className="h-6 w-40 bg-zinc-800 rounded animate-pulse" />
        ) : files.length === 0 ? (
          <span className="text-xs text-zinc-600">ยังไม่มีไฟล์ — ไปอัปโหลดก่อน</span>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowFilePicker((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-zinc-200">{selectedFile?.filename ?? "เลือกไฟล์"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {showFilePicker && (
              <div className="absolute top-full left-0 mt-1 z-20 w-64 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
                {files.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setSelectedFileId(f.id); setShowFilePicker(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-zinc-700 transition ${
                      f.id === selectedFileId ? "text-indigo-400" : "text-zinc-300"
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate">{f.filename}</p>
                      <p className="text-xs text-zinc-600">{f.rows} แถว</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ChatWindow key={selectedFileId} fileId={selectedFileId} />
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  )
}
