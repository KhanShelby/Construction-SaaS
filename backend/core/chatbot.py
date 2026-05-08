import duckdb
import json
import re
import os

# ── Anthropic (commented out) ──────────────────────────────────────────────
# import anthropic
# anthropic_client = anthropic.Anthropic()
# ──────────────────────────────────────────────────────────────────────────

# ── Gemini ─────────────────────────────────────────────────────────────────
import google.generativeai as genai
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini_model = genai.GenerativeModel("gemini-2.5-flash")
# ──────────────────────────────────────────────────────────────────────────

DB_PATH = "construction.duckdb"

DB_SCHEMA = """
Tables ใน DuckDB:

1. projects — โครงการก่อสร้าง
   id, user_id, name (ชื่อโครงการ), client_name (ชื่อลูกค้า),
   contract_value (มูลค่าสัญญา), start_date, end_date,
   status ('active'|'completed'|'pending'), created_at

2. labor_costs — ค่าแรงช่าง
   id, project_id, user_id, worker_name (ชื่อช่าง),
   worker_type (ประเภทช่าง), work_days (วันทำงาน),
   daily_rate (ค่าแรง/วัน), total_amount (ยอดรวม),
   paid_amount (จ่ายแล้ว), work_date, note, source, created_at

3. material_costs — ค่าวัสดุ
   id, project_id, user_id, item_name (ชื่อวัสดุ),
   quantity (จำนวน), unit (หน่วย), unit_price (ราคา/หน่วย),
   total_amount (ยอดรวม), supplier (ร้านที่ซื้อ),
   purchase_date, note, source, created_at

4. payment_milestones — งวดงาน / รายรับ
   id, project_id, user_id, milestone_name (ชื่องวด),
   amount (มูลค่างวด), due_date (กำหนดเก็บเงิน),
   received_date (วันที่รับเงินจริง),
   status ('pending'|'received'), note, source, created_at

Relations: labor_costs.project_id = projects.id
           material_costs.project_id = projects.id
           payment_milestones.project_id = projects.id
"""

SYSTEM_PROMPT = """คุณเป็นผู้ช่วยวิเคราะห์ข้อมูลธุรกิจรับเหมาก่อสร้าง
คุณมีความสามารถในการเขียน SQL query เพื่อดึงข้อมูลจาก DuckDB

{schema}

กฎสำคัญ:
1. ตอบเป็นภาษาไทยเสมอ
2. ถ้าต้องการข้อมูล ให้เขียน SQL ใน tag <sql>...</sql>
3. SQL ต้องกรอง user_id = '{user_id}' ทุกครั้ง เพื่อความปลอดภัย
4. หลังได้ผลลัพธ์ SQL แล้ว ให้อธิบายเป็นภาษาไทยที่เข้าใจง่าย
5. ถ้าคำถามไม่เกี่ยวกับข้อมูลในระบบ ให้บอกว่าไม่มีข้อมูลนั้น
6. แสดงตัวเลขเงินพร้อม format เช่น 1,200,000 บาท
7. ถ้าข้อมูลว่างเปล่า ให้บอกว่ายังไม่มีข้อมูลในระบบ
"""


def _build_system(user_id: str) -> str:
    return SYSTEM_PROMPT.format(schema=DB_SCHEMA, user_id=user_id)


def _to_gemini_history(history: list[dict]) -> list[dict]:
    """
    แปลง history format ของ Anthropic → Gemini
    Anthropic: {"role": "assistant", "content": "..."}
    Gemini:    {"role": "model",     "parts": ["..."]}
    """
    result = []
    for msg in history:
        role = "model" if msg["role"] == "assistant" else "user"
        result.append({"role": role, "parts": [msg["content"]]})
    return result


def _gemini_chat(system: str, history_gemini: list[dict], user_text: str) -> str:
    """เรียก Gemini — รวม system prompt ไว้ใน user message แรก"""
    if not history_gemini:
        messages = [{"role": "user", "parts": [f"{system}\n\n{user_text}"]}]
    else:
        first_with_sys = {
            "role": "user",
            "parts": [f"{system}\n\n{history_gemini[0]['parts'][0]}"]
        }
        messages = [first_with_sys] + history_gemini[1:] + [
            {"role": "user", "parts": [user_text]}
        ]

    response = gemini_model.generate_content(messages)
    return response.text


def extract_sql(text: str) -> str | None:
    """ดึง SQL ออกจาก tag <sql>...</sql>"""
    match = re.search(r"<sql>(.*?)</sql>", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return None


def run_sql(sql: str) -> list[dict]:
    """รัน SQL บน DuckDB คืนผลเป็น list of dict"""
    try:
        con = duckdb.connect(DB_PATH)
        result = con.execute(sql).fetchdf()
        con.close()
        return result.to_dict(orient="records")
    except Exception as e:
        return [{"error": str(e)}]


def format_results(rows: list[dict]) -> str:
    """แปลงผลลัพธ์ SQL เป็น text ส่งกลับให้ LLM"""
    if not rows:
        return "ไม่พบข้อมูล"
    if "error" in rows[0]:
        return f"เกิดข้อผิดพลาด: {rows[0]['error']}"
    return json.dumps(rows, ensure_ascii=False, default=str, indent=2)


def chat(
    question: str,
    user_id: str,
    history: list[dict] | None = None
) -> dict:
    """
    รับคำถามภาษาไทย → LLM เขียน SQL → รันบน DuckDB → LLM สรุปเป็นภาษาไทย
    คืน: { answer, sql_used, raw_data }
    """
    if history is None:
        history = []

    system         = _build_system(user_id)
    history_gemini = _to_gemini_history(history)

    # ── รอบแรก: LLM เขียน SQL ──────────────────────────────────────────────

    # Anthropic (commented out)
    # messages = history + [{"role": "user", "content": question}]
    # response1 = anthropic_client.messages.create(
    #     model="claude-haiku-4-5-20251001",
    #     max_tokens=1024,
    #     system=system,
    #     messages=messages,
    # )
    # llm_text1 = response1.content[0].text

    # Gemini
    llm_text1 = _gemini_chat(system, history_gemini, question)

    # ───────────────────────────────────────────────────────────────────────

    sql = extract_sql(llm_text1)

    # ถ้าไม่มี SQL แสดงว่า LLM ตอบตรงได้เลย
    if not sql:
        return {
            "answer":   llm_text1,
            "sql_used": None,
            "raw_data": None,
        }

    # รัน SQL แล้วส่งผลกลับให้ LLM สรุป
    rows     = run_sql(sql)
    data_str = format_results(rows)
    followup = f"ผลลัพธ์จากฐานข้อมูล:\n{data_str}\n\nกรุณาสรุปคำตอบเป็นภาษาไทยที่เข้าใจง่าย"

    history_round2 = history_gemini + [
        {"role": "model", "parts": [llm_text1]},
    ]

    # ── รอบสอง: LLM สรุปคำตอบภาษาไทย ─────────────────────────────────────

    # Anthropic (commented out)
    # messages2 = messages + [
    #     {"role": "assistant", "content": llm_text1},
    #     {"role": "user",      "content": followup},
    # ]
    # response2 = anthropic_client.messages.create(
    #     model="claude-haiku-4-5-20251001",
    #     max_tokens=1024,
    #     system=system,
    #     messages=messages2,
    # )
    # final_answer = response2.content[0].text

    # Gemini
    final_answer = _gemini_chat(system, history_round2, followup)

    # ───────────────────────────────────────────────────────────────────────

    return {
        "answer":   final_answer,
        "sql_used": sql,
        "raw_data": rows,
    }