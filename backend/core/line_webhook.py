"""
line_webhook.py — LINE Messaging API webhook

Flow:
1. ลูกค้าพิมพ์ใน LINE เช่น "จ่ายค่าปูน 3 ถุง 450 บาท งานบ้านสมชาย"
2. LINE ส่ง event มาที่ /webhook/line
3. LLM แยกแยะว่าเป็น "บันทึก" หรือ "ถามข้อมูล"
4. ถ้าบันทึก → parse → บันทึกลง DB → reply ยืนยัน
5. ถ้าถาม → ส่งไป chatbot → reply คำตอบ

ตั้งค่าใน .env:
LINE_CHANNEL_SECRET=xxx
LINE_CHANNEL_ACCESS_TOKEN=xxx
"""

import os
import json
import hmac
import hashlib
import base64
import re
import uuid
import duckdb
import httpx
import anthropic

from fastapi import Request, HTTPException

LINE_SECRET = os.getenv("LINE_CHANNEL_SECRET", "")
LINE_TOKEN  = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")
DB_PATH     = "construction.duckdb"

client = anthropic.Anthropic()


# ----- LINE API helpers -----
def verify_signature(body: bytes, signature: str) -> bool:
    """ตรวจสอบว่า request มาจาก LINE จริงๆ"""
    if not LINE_SECRET:
        return True  # dev mode ข้ามได้
    mac = hmac.new(LINE_SECRET.encode(), body, hashlib.sha256).digest()
    expected = base64.b64encode(mac).decode()
    return hmac.compare_digest(expected, signature)


def reply_message(reply_token: str, text: str):
    """ส่งข้อความกลับหา user ใน LINE"""
    if not LINE_TOKEN:
        print(f"[LINE REPLY - DEV MODE] {text}")
        return
    httpx.post(
        "https://api.line.me/v2/bot/message/reply",
        headers={
            "Authorization": f"Bearer {LINE_TOKEN}",
            "Content-Type":  "application/json",
        },
        json={
            "replyToken": reply_token,
            "messages":   [{"type": "text", "text": text}],
        },
        timeout=5,
    )


# ----- LLM: แยกแยะประเภทข้อความ -----
def classify_and_parse(text: str, user_id: str, projects: list[dict]) -> dict:
    """
    ส่งข้อความให้ LLM วิเคราะห์ว่าเป็น:
    - record_labor    → บันทึกค่าแรง
    - record_material → บันทึกวัสดุ
    - record_milestone → บันทึกงวดงาน
    - query           → ถามข้อมูล
    - unknown         → ไม่เข้าใจ
    """
    project_list = "\n".join([
        f"- {p['name']} (id: {p['id']})"
        for p in projects
    ]) or "ยังไม่มีโครงการ"

    prompt = f"""คุณเป็นผู้ช่วยระบบบันทึกข้อมูลรับเหมาก่อสร้าง

โครงการที่มีอยู่:
{project_list}

ข้อความจากผู้ใช้: "{text}"

วิเคราะห์และตอบเป็น JSON เท่านั้น ไม่มีคำอธิบาย:

ถ้าเป็นการบันทึกค่าแรง:
{{"type": "record_labor", "project_id": "...", "project_name": "...", "worker_name": "...", "worker_type": "...", "work_days": 0, "daily_rate": 0, "total_amount": 0, "note": "..."}}

ถ้าเป็นการบันทึกวัสดุ:
{{"type": "record_material", "project_id": "...", "project_name": "...", "item_name": "...", "quantity": 0, "unit": "...", "unit_price": 0, "total_amount": 0, "supplier": "...", "note": "..."}}

ถ้าเป็นการบันทึกรับเงินงวด:
{{"type": "record_milestone", "project_id": "...", "project_name": "...", "milestone_name": "...", "amount": 0, "status": "received"}}

ถ้าเป็นคำถาม:
{{"type": "query", "question": "..."}}

ถ้าไม่เข้าใจ:
{{"type": "unknown"}}

กฎ:
- total_amount = quantity * unit_price หรือ work_days * daily_rate (ถ้าไม่มีให้คำนวณ)
- project_id ให้จับคู่กับโครงการที่มีอยู่ ถ้าไม่ตรงให้ใส่ null
- ตอบ JSON เท่านั้น"""

    resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = resp.content[0].text.strip()
    raw = re.sub(r"```json|```", "", raw).strip()
    return json.loads(raw)


# ----- บันทึกข้อมูลลง DB -----
def save_labor(data: dict, user_id: str) -> str:
    con = duckdb.connect(DB_PATH)
    pid = str(uuid.uuid4())
    con.execute("""
        INSERT INTO labor_costs
        (id, project_id, user_id, worker_name, worker_type,
         work_days, daily_rate, total_amount, source)
        VALUES (?,?,?,?,?,?,?,?,'line')
    """, [
        pid, data.get("project_id"), user_id,
        data.get("worker_name"), data.get("worker_type"),
        data.get("work_days", 0), data.get("daily_rate", 0),
        data.get("total_amount", 0),
    ])
    con.close()
    return f"✅ บันทึกค่าแรงสำเร็จ\n" \
           f"โครงการ: {data.get('project_name', '-')}\n" \
           f"ช่าง: {data.get('worker_name', '-')}\n" \
           f"ยอด: {data.get('total_amount', 0):,.0f} บาท"


def save_material(data: dict, user_id: str) -> str:
    con = duckdb.connect(DB_PATH)
    pid = str(uuid.uuid4())
    con.execute("""
        INSERT INTO material_costs
        (id, project_id, user_id, item_name, quantity,
         unit, unit_price, total_amount, supplier, source)
        VALUES (?,?,?,?,?,?,?,?,?,'line')
    """, [
        pid, data.get("project_id"), user_id,
        data.get("item_name"), data.get("quantity", 0),
        data.get("unit"), data.get("unit_price", 0),
        data.get("total_amount", 0), data.get("supplier"),
    ])
    con.close()
    return f"✅ บันทึกวัสดุสำเร็จ\n" \
           f"โครงการ: {data.get('project_name', '-')}\n" \
           f"วัสดุ: {data.get('item_name', '-')} {data.get('quantity', '')} {data.get('unit', '')}\n" \
           f"ยอด: {data.get('total_amount', 0):,.0f} บาท"


def save_milestone(data: dict, user_id: str) -> str:
    con = duckdb.connect(DB_PATH)
    pid = str(uuid.uuid4())
    con.execute("""
        INSERT INTO payment_milestones
        (id, project_id, user_id, milestone_name, amount, status, source)
        VALUES (?,?,?,?,?,'received','line')
    """, [
        pid, data.get("project_id"), user_id,
        data.get("milestone_name"), data.get("amount", 0),
    ])
    con.close()
    return f"✅ บันทึกรับเงินสำเร็จ\n" \
           f"โครงการ: {data.get('project_name', '-')}\n" \
           f"งวด: {data.get('milestone_name', '-')}\n" \
           f"ยอด: {data.get('amount', 0):,.0f} บาท"


def get_user_projects(user_id: str) -> list[dict]:
    """ดึงรายชื่อโครงการของ user"""
    con = duckdb.connect(DB_PATH)
    rows = con.execute("""
        SELECT id, name FROM projects WHERE user_id = ?
    """, [user_id]).fetchall()
    con.close()
    return [{"id": r[0], "name": r[1]} for r in rows]


# ----- Main webhook handler -----
async def handle_line_webhook(request: Request, user_id: str) -> dict:
    """
    รับ webhook จาก LINE แล้วประมวลผล
    user_id = LINE user ที่ผูกกับ account ในระบบ
    """
    body = await request.body()

    # ตรวจสอบ signature
    sig = request.headers.get("x-line-signature", "")
    if not verify_signature(body, sig):
        raise HTTPException(400, "Invalid LINE signature")

    payload = json.loads(body)
    events  = payload.get("events", [])

    for event in events:
        if event.get("type") != "message":
            continue
        if event["message"].get("type") != "text":
            continue

        text        = event["message"]["text"].strip()
        reply_token = event["replyToken"]

        try:
            projects = get_user_projects(user_id)
            parsed   = classify_and_parse(text, user_id, projects)
            msg_type = parsed.get("type", "unknown")

            if msg_type == "record_labor":
                if not parsed.get("project_id"):
                    reply_message(reply_token,
                        "❓ ระบุโครงการไม่ได้ครับ กรุณาพิมพ์ชื่อโครงการให้ชัดเจนขึ้น\n"
                        f"โครงการที่มี: {', '.join(p['name'] for p in projects)}")
                else:
                    reply_message(reply_token, save_labor(parsed, user_id))

            elif msg_type == "record_material":
                if not parsed.get("project_id"):
                    reply_message(reply_token,
                        "❓ ระบุโครงการไม่ได้ครับ กรุณาระบุชื่อโครงการด้วย")
                else:
                    reply_message(reply_token, save_material(parsed, user_id))

            elif msg_type == "record_milestone":
                if not parsed.get("project_id"):
                    reply_message(reply_token,
                        "❓ ระบุโครงการไม่ได้ครับ")
                else:
                    reply_message(reply_token, save_milestone(parsed, user_id))

            elif msg_type == "query":
                # ส่งต่อไป chatbot
                from core.chatbot import chat as chatbot_chat
                result = chatbot_chat(parsed["question"], user_id)
                reply_message(reply_token, result["answer"])

            else:
                reply_message(reply_token,
                    "ขออภัยครับ ไม่เข้าใจคำสั่งนี้\n\n"
                    "ตัวอย่างที่ใช้ได้:\n"
                    "🔨 'จ่ายค่าแรงสมชาย 5 วัน วันละ 600 งานบ้านสมชาย'\n"
                    "🧱 'ซื้อปูน 10 ถุง 1,500 บาท งานบ้านสมชาย'\n"
                    "💰 'รับเงินงวด 1 บ้านสมชาย 300,000 บาท'\n"
                    "❓ 'กำไรงานบ้านสมชายตอนนี้เท่าไหร่'")

        except Exception as e:
            reply_message(reply_token, f"⚠️ เกิดข้อผิดพลาด: {str(e)}")

    return {"status": "ok"}
