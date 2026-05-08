// src/app/layout.tsx
import type { Metadata } from "next"
import { Sarabun } from "next/font/google"
import "./globals.css"

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sarabun",
})

export const metadata: Metadata = {
  title: "DataChat — วิเคราะห์ข้อมูล Excel ด้วย AI",
  description: "อัปโหลด Excel แล้วถามคำถามเกี่ยวกับข้อมูลได้เลย",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body className="font-sans antialiased bg-zinc-950 text-zinc-100 min-h-screen">
        {children}
      </body>
    </html>
  )
}
