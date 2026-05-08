// src/app/dashboard/layout.tsx
"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getUser } from "@/lib/auth"
import { Sidebar } from "@/components/layout/Sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    if (!getUser()) router.push("/login")
  }, [router])

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  )
}
