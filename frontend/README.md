# Sprint 3 — Frontend Web App

## Stack
- Next.js 14 (App Router)
- Tailwind CSS
- shadcn/ui
- FastAPI backend at `http://localhost:8000`

## Setup

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
npx shadcn-ui@latest init
npm install @radix-ui/react-icons lucide-react xlsx
```

## โครงสร้างไฟล์

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx               ← redirect to /login
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── upload/page.tsx
│   │   ├── chat/page.tsx
│   │   └── files/page.tsx
├── components/
│   ├── auth/
│   │   └── AuthForm.tsx
│   ├── upload/
│   │   ├── DropZone.tsx
│   │   └── DataPreview.tsx
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── ChatMessage.tsx
│   │   └── ChatInput.tsx
│   ├── files/
│   │   └── FileManager.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       └── Header.tsx
├── lib/
│   ├── auth.ts                ← mock auth (swap Supabase ทีหลัง)
│   ├── api.ts                 ← FastAPI client
│   └── websocket.ts           ← WebSocket chat
└── hooks/
    ├── useAuth.ts
    ├── useChat.ts
    └── useFiles.ts
```

## Auth (Mock → Supabase)
ตอนนี้ใช้ localStorage + mock token
ตอน swap Supabase แค่แก้ `src/lib/auth.ts` ไฟล์เดียว

## ENV
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```
