// src/components/chat/ChatMessage.tsx
import type { Message } from "@/hooks/useChat"
import { BarChart3, User } from "lucide-react"

interface Props {
  message: Message
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user"

  return (
    <div className={`flex gap-3 py-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isUser ? "bg-indigo-600" : "bg-zinc-800 border border-zinc-700"
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white" />
        ) : (
          <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-indigo-600 text-white rounded-tr-sm"
              : "bg-zinc-800 text-zinc-100 rounded-tl-sm"
          } ${message.streaming ? "streaming-cursor" : ""}`}
        >
          {message.content || (
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-700 px-1">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  )
}
