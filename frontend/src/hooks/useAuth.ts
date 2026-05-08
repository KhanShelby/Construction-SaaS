// src/hooks/useAuth.ts
"use client"
import { useState, useEffect, useCallback } from "react"
import { login, logout, register, getUser, type User } from "@/lib/auth"
import { useRouter } from "next/navigation"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    setUser(getUser())
    setLoading(false)
  }, [])

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      const u = await login(email, password)
      setUser(u)
      router.push("/dashboard/chat")
    },
    [router]
  )

  const handleRegister = useCallback(
    async (email: string, password: string, name: string) => {
      const u = await register(email, password, name)
      setUser(u)
      router.push("/dashboard/upload")
    },
    [router]
  )

  const handleLogout = useCallback(() => {
    logout()
    setUser(null)
    router.push("/login")
  }, [router])

  return { user, loading, login: handleLogin, register: handleRegister, logout: handleLogout }
}
