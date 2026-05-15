// src/hooks/useChat.ts
"use client"
import { useState, useRef, useCallback, useEffect } from "react"
import { ChatSocket } from "@/lib/websocket"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  streaming?: boolean
  sql?: string        // SQL ที่ใช้ดึงข้อมูล (optional แสดงใน UI ได้)
}

export function useChat() {   // ← ลบ fileId parameter ออก
  const [messages,    setMessages]    = useState<Message[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const socketRef       = useRef<ChatSocket | null>(null)
  const streamingIdRef  = useRef<string | null>(null)

  const connect = useCallback(async () => {
    if (socketRef.current?.isOpen) return

    const socket = new ChatSocket()   // ← ไม่ส่ง fileId แล้ว

    try {
      await socket.connect(
        // onChunk — รับ text ทีละ word
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingIdRef.current
                ? { ...m, content: m.content + chunk }
                : m
            )
          )
        },
        // onDone — streaming เสร็จ
        () => {
          setIsStreaming(false)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingIdRef.current
                ? { ...m, streaming: false }
                : m
            )
          )
          streamingIdRef.current = null
        },
        // onError
        (err) => {
          setIsStreaming(false)
          setMessages((prev) => [
            ...prev,
            {
              id:        crypto.randomUUID(),
              role:      "assistant",
              content:   `❌ ${err}`,
              timestamp: new Date(),
            },
          ])
        },
        // onSql — รับ SQL ที่ใช้ แนบเข้า message ปัจจุบัน
        (sql) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingIdRef.current
                ? { ...m, sql }
                : m
            )
          )
        }
      )

      socketRef.current = socket
      setIsConnected(true)
    } catch {
      setIsConnected(false)
    }
  }, [])    // ← ไม่มี fileId dependency แล้ว

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return

      // เพิ่ม user message
      const userMsg: Message = {
        id:        crypto.randomUUID(),
        role:      "user",
        content,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])

      // เพิ่ม assistant message ว่างรอ streaming
      const assistantId = crypto.randomUUID()
      streamingIdRef.current = assistantId
      setMessages((prev) => [
        ...prev,
        {
          id:        assistantId,
          role:      "assistant",
          content:   "",
          timestamp: new Date(),
          streaming: true,
        },
      ])
      setIsStreaming(true)

      // reconnect ถ้าหลุด
      if (!socketRef.current?.isOpen) {
        await connect()
      }
      socketRef.current?.send(content)
    },
    [isStreaming, connect]
  )

  const clearMessages = useCallback(() => setMessages([]), [])

  useEffect(() => {
    connect()
    return () => {
      socketRef.current?.close()
    }
  }, [connect])

  return { messages, isConnected, isStreaming, sendMessage, clearMessages }
}