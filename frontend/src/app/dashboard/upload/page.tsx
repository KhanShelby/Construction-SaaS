// src/app/dashboard/upload/page.tsx
"use client"
import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { uploadFile, type FileRecord } from "@/lib/api"
import { DataPreview } from "@/components/upload/DataPreview"
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import * as XLSX from "xlsx"

type Stage = "idle" | "preview" | "uploading" | "done" | "error"

export default function UploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>("idle")
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: unknown[][] } | null>(null)
  const [uploadedFile, setUploadedFile] = useState<FileRecord | null>(null)
  const [error, setError] = useState("")

  const parseExcel = useCallback((f: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: "binary" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]
      const headers = (data[0] as string[]) || []
      const rows = data.slice(1, 11) // preview first 10 rows
      setPreviewData({ headers, rows })
      setStage("preview")
    }
    reader.readAsBinaryString(f)
  }, [])

  const handleFile = useCallback(
    (f: File) => {
      if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
        setError("รองรับเฉพาะไฟล์ .xlsx, .xls, .csv")
        setStage("error")
        return
      }
      setFile(f)
      setError("")
      parseExcel(f)
    },
    [parseExcel]
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleConfirm = async () => {
    if (!file) return
    setStage("uploading")
    try {
      const record = await uploadFile(file)
      setUploadedFile(record)
      setStage("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ")
      setStage("error")
    }
  }

  const reset = () => {
    setStage("idle")
    setFile(null)
    setPreviewData(null)
    setUploadedFile(null)
    setError("")
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-100">อัปโหลดไฟล์</h1>
          <p className="text-zinc-500 text-sm mt-1">อัปโหลดไฟล์ Excel หรือ CSV เพื่อเริ่มวิเคราะห์</p>
        </div>

        {/* Idle / Drop zone */}
        {(stage === "idle" || stage === "error") && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${
              dragging
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-zinc-400" />
              </div>
              <div>
                <p className="text-zinc-300 font-medium">ลากไฟล์มาวางที่นี่</p>
                <p className="text-zinc-600 text-sm mt-1">หรือคลิกเพื่อเลือกไฟล์</p>
                <p className="text-zinc-700 text-xs mt-2">รองรับ .xlsx, .xls, .csv</p>
              </div>
            </div>

            {stage === "error" && (
              <div className="mt-6 flex items-center gap-2 text-red-400 text-sm justify-center">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {stage === "preview" && previewData && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <FileSpreadsheet className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <p className="font-medium text-zinc-100 text-sm">{file?.name}</p>
                <p className="text-xs text-zinc-500">
                  {previewData.headers.length} คอลัมน์ · แสดง {previewData.rows.length} แถวแรก
                </p>
              </div>
            </div>

            <DataPreview headers={previewData.headers} rows={previewData.rows} />

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:border-zinc-600 hover:text-zinc-300 transition"
              >
                เลือกไฟล์ใหม่
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition"
              >
                ยืนยันและอัปโหลด
              </button>
            </div>
          </div>
        )}

        {/* Uploading */}
        {stage === "uploading" && (
          <div className="flex flex-col items-center gap-4 py-24">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
            <p className="text-zinc-400">กำลังอัปโหลด...</p>
          </div>
        )}

        {/* Done */}
        {stage === "done" && uploadedFile && (
          <div className="flex flex-col items-center gap-6 py-20">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-zinc-100 font-semibold">อัปโหลดสำเร็จ!</p>
              <p className="text-zinc-500 text-sm mt-1">
                {uploadedFile.filename} · {uploadedFile.rows} แถว · {uploadedFile.columns.length} คอลัมน์
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="px-6 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:text-zinc-300 transition"
              >
                อัปโหลดไฟล์อื่น
              </button>
              <button
                onClick={() => router.push(`/dashboard/chat?file=${uploadedFile.id}`)}
                className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition"
              >
                เริ่มถามคำถาม →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
