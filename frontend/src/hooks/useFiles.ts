// src/hooks/useFiles.ts
"use client"
import { useState, useEffect, useCallback } from "react"
import { getFiles, deleteFile, type FileRecord } from "@/lib/api"

export function useFiles() {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getFiles()
      setFiles(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไฟล์ไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteFile(id)
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { files, loading, error, refresh, remove }
}
