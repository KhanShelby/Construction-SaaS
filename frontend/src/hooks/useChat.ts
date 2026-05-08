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
}

export function useChat(fileId?: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const socketRef = useRef<ChatSocket | null>(null)
  const streamingIdRef = useRef<string | null>(null)

  const connect = useCallback(async () => {
    if (socketRef.current?.isOpen) return
    const socket = new ChatSocket(fileId)
    try {
      await socket.connect(
        // onChunk
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingIdRef.current
                ? { ...m, content: m.content + chunk }
                : m
            )
          )
        },
        // onDone
        () => {
          setIsStreaming(false)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingIdRef.current ? { ...m, streaming: false } : m
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
              id: crypto.randomUUID(),
              role: "assistant",
              content: `❌ ${err}`,
              timestamp: new Date(),
            },
          ])
        }
      )
      socketRef.current = socket
      setIsConnected(true)
    } catch {
      setIsConnected(false)
    }
  }, [fileId])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return

      // Add user message
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])

      // Add empty assistant message for streaming
      const assistantId = crypto.randomUUID()
      streamingIdRef.current = assistantId
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          streaming: true,
        },
      ])
      setIsStreaming(true)

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
