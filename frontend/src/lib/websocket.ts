// src/lib/websocket.ts
import { getUser } from "./auth"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"

export type MessageHandler = (chunk: string) => void
export type SqlHandler    = (sql: string) => void
export type DoneHandler   = () => void
export type ErrorHandler  = (err: string) => void

export class ChatSocket {
  private ws: WebSocket | null = null

  connect(
    onMessage: MessageHandler,
    onDone:    DoneHandler,
    onError:   ErrorHandler,
    onSql?:    SqlHandler,       // รับ SQL ที่ใช้ (optional)
  ): Promise<void> {
    return new Promise((resolve, reject) => {

      // backend รับ user_id ใน query param
      // /ws/chat?user_id=xxx
      const user   = getUser()
      const userId = user?.id || "user-001"   // dev fallback
      const url    = `${WS_URL}/ws/chat?user_id=${userId}`

      this.ws = new WebSocket(url)

      this.ws.onopen  = () => resolve()
      this.ws.onerror = () => reject(new Error("WebSocket เชื่อมต่อไม่ได้"))

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === "chunk") {
            onMessage(data.content)
          } else if (data.type === "done") {
            onDone()
          } else if (data.type === "sql") {
            onSql?.(data.content)   // แสดง SQL ที่ใช้ใน UI
          } else if (data.type === "error") {
            onError(data.message || "เกิดข้อผิดพลาด")
          }

        } catch {
          // fallback plain text
          if (event.data === "[DONE]") onDone()
          else onMessage(event.data)
        }
      }

      this.ws.onclose = () => onDone()
    })
  }

  send(message: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // backend รับ { message } — ไม่ต้องส่ง file_id แล้ว
      this.ws.send(JSON.stringify({ message }))
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