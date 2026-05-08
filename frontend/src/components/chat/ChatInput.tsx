// src/components/chat/ChatInput.tsx
"use client"
import { useState, useRef } from "react"
import { Send } from "lucide-react"

interface Props {
  onSend: (msg: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder }: Props) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const msg = value.trim()
    if (!msg || disabled) return
    onSend(msg)
    setValue("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <div className="flex items-end gap-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={disabled}
        placeholder={placeholder ?? "ถามอะไรก็ได้..."}
        rows={1}
        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ minHeight: "44px" }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="w-11 h-11 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition shrink-0"
      >
        <Send className="w-4 h-4 text-white" />
      </button>
    </div>
  )
}
