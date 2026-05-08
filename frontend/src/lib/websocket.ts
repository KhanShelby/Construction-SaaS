// src/lib/websocket.ts
import { getToken } from "./auth"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"

export type MessageHandler = (chunk: string) => void
export type DoneHandler = () => void
export type ErrorHandler = (err: string) => void

export class ChatSocket {
  private ws: WebSocket | null = null
  private fileId: string | undefined

  constructor(fileId?: string) {
    this.fileId = fileId
  }

  connect(
    onMessage: MessageHandler,
    onDone: DoneHandler,
    onError: ErrorHandler
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = getToken()
      const url = `${WS_URL}/ws/chat${token ? `?token=${token}` : ""}${
        this.fileId ? `&file_id=${this.fileId}` : ""
      }`

      this.ws = new WebSocket(url)

      this.ws.onopen = () => resolve()
      this.ws.onerror = () => reject(new Error("WebSocket connection failed"))

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "chunk") {
            onMessage(data.content)
          } else if (data.type === "done") {
            onDone()
          } else if (data.type === "error") {
            onError(data.message || "เกิดข้อผิดพลาด")
          }
        } catch {
          // plain text chunk (fallback)
          if (event.data === "[DONE]") {
            onDone()
          } else {
            onMessage(event.data)
          }
        }
      }

      this.ws.onclose = () => onDone()
    })
  }

  send(message: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ message, file_id: this.fileId }))
    }
  }

  close() {
    this.ws?.close()
    this.ws = null
  }

  get isOpen() {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
