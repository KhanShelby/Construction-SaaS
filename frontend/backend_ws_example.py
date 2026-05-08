# backend_ws_example.py
# ── เพิ่มใน FastAPI backend ของคุณ (Sprint 1-2) ──────────────────────────────
# Frontend ส่ง: { "message": "...", "file_id": "..." }
# Backend ต้อง reply: { "type": "chunk", "content": "..." } ทีละชิ้น
#                     { "type": "done" }  ตอนจบ
#                     { "type": "error", "message": "..." }  ถ้า error

from fastapi import WebSocket, WebSocketDisconnect
import asyncio
import json

# เพิ่มใน main.py ของคุณ
"""
@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket, token: str = None, file_id: str = None):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            message = payload.get("message", "")
            fid = payload.get("file_id") or file_id

            # ── ส่ง streaming response ────────────────────────────────────────
            # แก้ตรงนี้ให้เรียก DuckDB + LLM จริงๆ
            async for chunk in your_llm_stream(message, fid):
                await websocket.send_text(json.dumps({
                    "type": "chunk",
                    "content": chunk
                }))

            await websocket.send_text(json.dumps({"type": "done"}))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": str(e)
        }))


# ── Mock ทดสอบ (ลบทิ้งตอน production) ──────────────────────────────────────
@app.websocket("/ws/chat")
async def websocket_chat_mock(websocket: WebSocket, token: str = None, file_id: str = None):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            question = payload.get("message", "")

            response = f"นี่คือคำตอบสำหรับ: '{question}' (mock response)"
            for word in response.split():
                await websocket.send_text(json.dumps({
                    "type": "chunk",
                    "content": word + " "
                }))
                await asyncio.sleep(0.05)  # simulate streaming

            await websocket.send_text(json.dumps({"type": "done"}))
    except WebSocketDisconnect:
        pass
"""

# ── REST endpoints ที่ frontend เรียก ────────────────────────────────────────
# POST /upload  → multipart form, return FileRecord
# GET  /files   → return List[FileRecord]
# DELETE /files/{id}  → 204

# FileRecord schema:
# {
#   "id": "uuid",
#   "filename": "data.xlsx",
#   "size": 12345,
#   "rows": 100,
#   "columns": ["col1", "col2"],
#   "uploaded_at": "2024-01-01T00:00:00Z"
# }
