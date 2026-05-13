// src/app/dashboard/chat/page.tsx
"use client"
import { Suspense } from "react"
import { ChatWindow } from "@/components/chat/ChatWindow"

function ChatContent() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3">
        <span className="text-xs text-zinc-500">ถามข้อมูลโครงการของคุณได้เลย</span>
        <span className="text-xs text-zinc-700">·</span>
        <span className="text-xs text-zinc-600">
          ข้อมูลมาจากไฟล์ที่อัปโหลดไว้ทั้งหมด
        </span>
      </div>

      {/* ไม่ต้องส่ง fileId — chatbot query จาก DuckDB ของ user โดยตรง */}
      <ChatWindow />
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