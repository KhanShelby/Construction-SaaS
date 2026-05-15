// src/components/chat/ChatWindow.tsx
"use client"
import { useRef, useEffect } from "react"
import { useChat } from "@/hooks/useChat"
import { ChatMessage } from "./ChatMessage"
import { ChatInput } from "./ChatInput"
import { MessageSquare, Wifi, WifiOff } from "lucide-react"

// ลบ Props fileId ออก — chatbot query จาก DuckDB ของ user โดยตรง
const SUGGESTIONS = [
  "โครงการทั้งหมดของฉันมีอะไรบ้าง",
  "กำไรคาดการณ์รวมทุกโครงการเท่าไหร่",
  "มีค่าแรงค้างจ่ายอยู่เท่าไหร่",
  "งวดงานไหนที่ยังไม่ได้รับเงินบ้าง",
  "ค่าวัสดุรวมทุกโครงการเท่าไหร่",
  "โครงการไหนกำไรมากที่สุด",
]

export function ChatWindow() {
  // ไม่ส่ง fileId เข้า useChat แล้ว
  const { messages, isConnected, isStreaming, sendMessage, clearMessages } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const isEmpty = messages.length === 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Connection status */}
      <div className="px-6 py-1.5 flex items-center justify-end gap-1.5">
        {isConnected ? (
          <>
            <Wifi className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-zinc-600">เชื่อมต่อแล้ว</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 text-zinc-600" />
            <span className="text-xs text-zinc-700">กำลังเชื่อมต่อ...</span>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center gap-6">
            <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
              <MessageSquare className="w-7 h-7 text-zinc-600" />
            </div>
            <div className="text-center">
              <p className="text-zinc-400 font-medium">ถามข้อมูลโครงการของคุณได้เลย</p>
              <p className="text-zinc-600 text-sm mt-1">
                ข้อมูลมาจากไฟล์ที่อัปโหลดไว้ทั้งหมด
              </p>
            </div>

            {/* Suggestions — แสดงเสมอ ไม่ต้องรอ fileId */}
            <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs text-zinc-400 hover:text-zinc-300 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1 py-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 bg-zinc-900/30">
        <div className="px-6 py-4">
          {!isEmpty && (
            <div className="flex justify-end mb-2">
              <button
                onClick={clearMessages}
                className="text-xs text-zinc-600 hover:text-zinc-500 transition"
              >
                ล้างประวัติ
              </button>
            </div>
          )}
          <ChatInput
            onSend={sendMessage}
            disabled={isStreaming}                          // ← ลบ || !fileId ออก
            placeholder="ถามอะไรก็ได้เกี่ยวกับโครงการ..."  // ← เปลี่ยน placeholder
          />
        </div>
      </div>
    </div>
  )
}