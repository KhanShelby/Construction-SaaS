// src/components/layout/Sidebar.tsx
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import {
  BarChart3,
  Upload,
  MessageSquare,
  FolderOpen,
  LogOut,
} from "lucide-react"

const NAV = [
  { href: "/dashboard/upload", icon: Upload, label: "อัปโหลด" },
  { href: "/dashboard/chat", icon: MessageSquare, label: "แชท" },
  { href: "/dashboard/files", icon: FolderOpen, label: "ไฟล์ของฉัน" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="w-60 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">DataChat</p>
            <p className="text-xs text-zinc-500">วิเคราะห์ด้วย AI</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 bg-indigo-600/20 rounded-full flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-indigo-400">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-300 truncate">{user?.name}</p>
            <p className="text-xs text-zinc-600 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
        >
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  )
}
