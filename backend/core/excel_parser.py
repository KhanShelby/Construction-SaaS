import pandas as pd
import duckdb
import json
import re
import time
import os
import uuid
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# --- 1. ใช้ SDK ตัวใหม่ล่าสุด ---
from google import genai
from google.genai import types

load_dotenv()

# --- 2. สร้าง Client (มันจะดูด GEMINI_API_KEY จากไฟล์ .env เองเลย ไม่ต้องส่งเข้าไป) ---
client = genai.Client()

# ----- Standard column targets -----
LABOR_TARGETS = {
    "worker_name": ["ชื่อช่าง", "ชื่อ", "ช่าง", "แรงงาน", "name", "worker"],
    "worker_type": ["ประเภท", "type", "ตำแหน่ง", "สาขา"],
    "work_days":   ["วันทำงาน", "จำนวนวัน", "วัน", "days", "day"],
    "daily_rate":  ["ค่าแรง/วัน", "ค่าแรงต่อวัน", "rate", "daily"],
    "total_amount":["ยอดรวม", "รวม", "total", "amount", "เงิน"],
    "paid_amount": ["จ่ายแล้ว", "paid", "ชำระ"],
    "work_date":   ["วันที่", "date", "ว/ด/ป", "วันที่ทำงาน"],
    "note":        ["หมายเหตุ", "note", "remark"],
}

MATERIAL_TARGETS = {
    "item_name":    ["รายการ", "วัสดุ", "สินค้า", "item", "name", "ชื่อวัสดุ"],
    "quantity":     ["จำนวน", "qty", "quantity", "ปริมาณ"],
    "unit":         ["หน่วย", "unit"],
    "unit_price":   ["ราคา/หน่วย", "unit_price", "ราคาต่อหน่วย", "price"],
    "total_amount": ["ยอดรวม", "รวม", "total", "amount"],
    "supplier":     ["ร้าน", "supplier", "ผู้ขาย", "แหล่งซื้อ"],
    "purchase_date":["วันที่", "date", "ว/ด/ป", "วันที่ซื้อ"],
    "note":         ["หมายเหตุ", "note"],
}

MILESTONE_TARGETS = {
    "milestone_name":["งวด", "milestone", "ชื่องวด", "รายการ"],
    "amount":        ["มูลค่า", "amount", "ยอดเงิน", "เงิน"],
    "due_date":      ["กำหนด", "due", "วันครบกำหนด", "due_date"],
    "received_date": ["รับแล้ว", "received", "วันรับเงิน"],
    "status":        ["สถานะ", "status"],
    "note":          ["หมายเหตุ", "note"],
}


# ----- Step 1: Parse raw Excel -----
def parse_excel(file_path: str) -> dict[str, pd.DataFrame]:
    """อ่านทุก sheet จาก Excel — คืน dict ชื่อ sheet → DataFrame"""
    sheets = {}
    # 🟢 ใช้ with เพื่อเปิดและรับประกันว่าจะปิดไฟล์ทันทีเมื่ออ่านเสร็จ ป้องกัน WinError 32
    with pd.ExcelFile(file_path) as xl:
        for name in xl.sheet_names:
            raw = xl.parse(name, header=None)
            df = _detect_and_set_header(raw)
            if df is not None and not df.empty:
                sheets[name] = df
    return sheets


def _detect_and_set_header(df_raw: pd.DataFrame) -> Optional[pd.DataFrame]:
    """หาแถว header อัตโนมัติ — แถวที่มี non-null เยอะสุดคือ header"""
    if df_raw.empty:
        return None
    # unmerge: forward-fill NaN ที่เกิดจาก merge cell
    df_raw = df_raw.ffill(axis=1).ffill(axis=0)
    non_null = df_raw.notna().sum(axis=1)
    header_row = int(non_null.idxmax())
    df = df_raw.iloc[header_row + 1:].copy()
    df.columns = [str(c).strip() for c in df_raw.iloc[header_row]]
    df = df.dropna(how="all").reset_index(drop=True)
    return df


# ----- Step 2: LLM schema mapping (ส่งรวดเดียวเป็น Batch) -----
def map_all_schemas_with_llm_batch(sheets_dict: dict[str, pd.DataFrame], max_retries: int = 3) -> dict:
    """มัดรวมทุก Sheet ส่งให้ LLM วิเคราะห์ใน Request เดียว"""
    
    # 1. มัดรวมตัวอย่างข้อมูล (Sample) ของทุก Sheet
    samples_text = ""
    for sheet_name, df in sheets_dict.items():
        # ดึงแค่ 3 แถวแรกพอ จะได้ประหยัด Token
        sample = df.head(3).to_markdown(index=False)
        samples_text += f"\n--- Sheet ชื่อ: {sheet_name} ---\n{sample}\n"

    # 2. ปรับ Prompt ให้คืนค่าเป็น JSON ที่แบ่งตามชื่อ Sheet
    prompt = f"""นี่คือตัวอย่างข้อมูลจาก Excel ของผู้รับเหมาก่อสร้าง ซึ่งมีหลาย Sheet:
{samples_text}

ฉันต้องการ map แต่ละ column ในแต่ละ Sheet ไปยัง field มาตรฐาน:
- labor: {list(LABOR_TARGETS.keys())}
- material: {list(MATERIAL_TARGETS.keys())}
- milestone: {list(MILESTONE_TARGETS.keys())}

กรุณาตอบเป็น JSON เท่านั้น ไม่มีคำอธิบาย รูปแบบ:
{{
  "results": {{
    "<ชื่อ Sheet ที่ 1>": {{
      "table_type": "labor|material|milestone|unknown",
      "column_mapping": {{
        "<ชื่อ column จริงใน Excel>": "<field มาตรฐาน หรือ null ถ้าไม่ตรง>"
      }}
    }},
    "<ชื่อ Sheet ที่ 2>": {{ ... }}
  }}
}}"""

    # 3. ส่ง Request (พร้อมระบบ Retry ดัก 429)
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash-lite',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )
            raw = response.text.strip()
            raw = re.sub(r"```json|```", "", raw).strip()
            return json.loads(raw)
            
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                if attempt < max_retries - 1:
                    print(f"⚠️ ตรวจพบ Error 429 กำลังหยุดพัก 60 วิ... (ครั้งที่ {attempt + 1}/{max_retries})")
                    time.sleep(60) 
                else:
                    raise e
            else:
                raise e
    return {} # เผื่อหลุดลูป


# ----- Step 3: Standardize & clean -----
def standardize_dataframe(df: pd.DataFrame, mapping_result: dict) -> pd.DataFrame:
    """ใช้ mapping ที่ LLM ให้มา rename + clean DataFrame"""
    col_map = {k: v for k, v in mapping_result["column_mapping"].items() if v}
    df = df.rename(columns=col_map)

    # เอาเฉพาะ column ที่ map สำเร็จ
    valid_cols = [c for c in df.columns if c in col_map.values()]
    df = df[valid_cols].copy()

    # clean numeric columns
    numeric_cols = ["work_days", "daily_rate", "total_amount", "paid_amount",
                    "quantity", "unit_price", "amount"]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = (
                df[col].astype(str)
                .str.replace(r"[฿,\s,]", "", regex=True)
                .str.replace(r"[^\d.]", "", regex=True)
                .replace("", "0")
                .astype(float)
            )

    # parse date
    date_cols = ["work_date", "purchase_date", "due_date", "received_date"]
    for col in date_cols:
        if col in df.columns:
            df[col] = _parse_dates(df[col])

    # คำนวณ total_amount ถ้าไม่มีแต่มี qty * price
    if "total_amount" not in df.columns:
        if "quantity" in df.columns and "unit_price" in df.columns:
            df["total_amount"] = df["quantity"] * df["unit_price"]
        elif "work_days" in df.columns and "daily_rate" in df.columns:
            df["total_amount"] = df["work_days"] * df["daily_rate"]

    return df.dropna(how="all").reset_index(drop=True)


def _parse_dates(series: pd.Series) -> pd.Series:
    """ลอง parse หลาย format วันที่ภาษาไทย/อังกฤษ"""
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d",
        "%d/%m/%y", "%d %b %Y", "%d %B %Y",
    ]
    for fmt in formats:
        try:
            return pd.to_datetime(series, format=fmt, errors="coerce")
        except Exception:
            continue
    return pd.to_datetime(series, errors="coerce")


# ----- Step 4: Store to DuckDB (เพิ่ม id) -----
def store_to_duckdb(
    df: pd.DataFrame,
    table_type: str,
    project_id: str,
    user_id: str,
    db_path: str = "construction.duckdb"
) -> int:
    """บันทึก DataFrame ลง DuckDB — คืนจำนวนแถวที่บันทึก"""
    df = df.copy()
    
    # สร้าง UUID ให้ทุกแถว (แก้ปัญหา Database คอลัมน์ไม่ตรง)
    df["id"] = [str(uuid.uuid4()) for _ in range(len(df))]
    
    df["project_id"] = project_id
    df["user_id"]    = user_id
    df["source"]     = "excel_import"

    table_map = {
        "labor":     "labor_costs",
        "material":  "material_costs",
        "milestone": "payment_milestones",
    }
    table_name = table_map.get(table_type, table_type)

    con = duckdb.connect(db_path)
    con.execute(f"""
        CREATE TABLE IF NOT EXISTS {table_name} AS
        SELECT * FROM df WHERE 1=0
    """)
    # เปลี่ยนมาใช้ BY NAME เพื่อความปลอดภัยกรณีเรียงคอลัมน์ไม่เหมือนต้นฉบับ
    con.execute(f"INSERT INTO {table_name} BY NAME SELECT * FROM df")
    count = con.execute(f"SELECT COUNT(*) FROM {table_name} WHERE project_id='{project_id}'").fetchone()[0]
    con.close()
    return count


# ----- Main pipeline (รวมร่างสมบูรณ์) -----
def import_excel_pipeline(
    file_path: str,
    project_id: str,
    user_id: str,
    db_path: str = "construction.duckdb"
) -> dict:
    """
    Pipeline หลัก: Excel → parse → LLM map (Batch) → clean → DuckDB
    """
    results = {"file": file_path, "sheets": [], "errors": []}

    sheets = parse_excel(file_path)
    if not sheets:
        results["errors"].append("ไม่พบข้อมูลใน Excel นี้")
        return results

    try:
        # 🔥 ส่งให้ LLM วิเคราะห์ทุก Sheet รวดเดียว
        batch_mapping = map_all_schemas_with_llm_batch(sheets)
        llm_results = batch_mapping.get("results", {})
        
    except Exception as e:
        results["errors"].append(f"เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล (LLM): {str(e)}")
        return results

    for sheet_name, df in sheets.items():
        try:
            # ดึง mapping ของ Sheet นั้นๆ ออกมาจากผลลัพธ์รวม
            mapping = llm_results.get(sheet_name, {})
            table_type = mapping.get("table_type", "unknown")

            if table_type == "unknown":
                results["sheets"].append({
                    "sheet": sheet_name,
                    "status": "skipped",
                    "reason": "ไม่สามารถระบุประเภทข้อมูลได้"
                })
                continue

            # ใช้ Mapping ทำความสะอาดข้อมูล
            clean_df  = standardize_dataframe(df, mapping)
            row_count = store_to_duckdb(clean_df, table_type, project_id, user_id, db_path)

            results["sheets"].append({
                "sheet":      sheet_name,
                "table_type": table_type,
                "rows":       row_count,
                "status":     "success"
            })

        except Exception as e:
            results["errors"].append(f"Sheet '{sheet_name}': {str(e)}")

    return results