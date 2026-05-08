# Construction SaaS — Sprint 1

## โครงสร้างโปรเจค
```
backend/
  api/
    main.py          ← FastAPI endpoints ทั้งหมด
  core/
    excel_parser.py  ← Pipeline: Excel → parse → LLM map → DuckDB
  models/
    schema.py        ← SQLAlchemy models (ใช้กับ Supabase production)
  requirements.txt
```

## ติดตั้งและรัน
```bash
cd backend
pip install -r requirements.txt

# ใส่ API key
export ANTHROPIC_API_KEY=sk-ant-xxx

# รัน server
uvicorn api.main:app --reload --port 8000
```

## API Endpoints

### สร้างโครงการ
```bash
curl -X POST http://localhost:8000/api/projects \
  -H "x-api-key: test-api-key-001" \
  -H "Content-Type: application/json" \
  -d '{"name": "บ้านคุณสมชาย", "client_name": "สมชาย", "contract_value": 1200000}'
```

### Import Excel
```bash
curl -X POST "http://localhost:8000/api/import/excel?project_id=PROJECT_ID" \
  -H "x-api-key: test-api-key-001" \
  -F "file=@labor_data.xlsx"
```

### ดู summary โครงการ (กำไร/ขาดทุน real-time)
```bash
curl http://localhost:8000/api/projects/PROJECT_ID/summary \
  -H "x-api-key: test-api-key-001"
```

### บันทึกค่าแรง
```bash
curl -X POST http://localhost:8000/api/labor \
  -H "x-api-key: test-api-key-001" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "PROJECT_ID",
    "worker_name": "สมศักดิ์",
    "worker_type": "ช่างปูน",
    "work_days": 5,
    "daily_rate": 600,
    "work_date": "2025-01-15"
  }'
```

### บันทึกวัสดุ
```bash
curl -X POST http://localhost:8000/api/materials \
  -H "x-api-key: test-api-key-001" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "PROJECT_ID",
    "item_name": "ปูนซีเมนต์",
    "quantity": 10,
    "unit": "ถุง",
    "unit_price": 150,
    "supplier": "ร้านวัสดุก่อสร้างไทย",
    "purchase_date": "2025-01-15"
  }'
```

## Excel Pipeline Flow
```
Upload .xlsx
    ↓
parse_excel()         — อ่านทุก sheet, detect header row, unmerge cells
    ↓
map_schema_with_llm() — LLM วิเคราะห์ว่าเป็น labor/material/milestone
    ↓
standardize_dataframe() — rename columns, clean numeric, parse date
    ↓
store_to_duckdb()     — บันทึกลง DuckDB แยกต่อ project_id + user_id
```

## Sprint ถัดไป (Sprint 2)
- LINE Webhook: รับข้อความ → LLM parse → บันทึก DB อัตโนมัติ
- Auth จริงด้วย Supabase JWT
- Quota system ต่อ user
