from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import tempfile, os, json
from datetime import date
import duckdb, uuid

from core.excel_parser  import import_excel_pipeline
from core.chatbot       import chat as chatbot_chat
from core.auth          import get_current_user
from core.line_webhook  import handle_line_webhook

app = FastAPI(title="Construction SaaS API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "construction.duckdb"


# ══════════════════════════════════════════
# DB init
# ══════════════════════════════════════════
def init_db():
    con = duckdb.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id          VARCHAR PRIMARY KEY,
            email       VARCHAR,
            plan        VARCHAR DEFAULT 'starter',
            plan_limit  INTEGER DEFAULT 100,
            usage_count INTEGER DEFAULT 0,
            created_at  TIMESTAMP DEFAULT NOW()
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id             VARCHAR PRIMARY KEY,
            user_id        VARCHAR,
            name           VARCHAR,
            client_name    VARCHAR,
            location       VARCHAR,
            contract_value DOUBLE,
            start_date     DATE,
            end_date       DATE,
            status         VARCHAR DEFAULT 'active',
            created_at     TIMESTAMP DEFAULT NOW()
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS labor_costs (
            id           VARCHAR PRIMARY KEY,
            project_id   VARCHAR,
            user_id      VARCHAR,
            worker_name  VARCHAR,
            worker_type  VARCHAR,
            work_days    DOUBLE,
            daily_rate   DOUBLE,
            total_amount DOUBLE,
            paid_amount  DOUBLE DEFAULT 0,
            work_date    DATE,
            note         VARCHAR,
            source       VARCHAR DEFAULT 'manual',
            created_at   TIMESTAMP DEFAULT NOW()
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS material_costs (
            id            VARCHAR PRIMARY KEY,
            project_id    VARCHAR,
            user_id       VARCHAR,
            item_name     VARCHAR,
            quantity      DOUBLE,
            unit          VARCHAR,
            unit_price    DOUBLE,
            total_amount  DOUBLE,
            supplier      VARCHAR,
            purchase_date DATE,
            note          VARCHAR,
            source        VARCHAR DEFAULT 'manual',
            created_at    TIMESTAMP DEFAULT NOW()
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS payment_milestones (
            id             VARCHAR PRIMARY KEY,
            project_id     VARCHAR,
            user_id        VARCHAR,
            milestone_name VARCHAR,
            amount         DOUBLE,
            due_date       DATE,
            received_date  DATE,
            status         VARCHAR DEFAULT 'pending',
            note           VARCHAR,
            source         VARCHAR DEFAULT 'manual',
            created_at     TIMESTAMP DEFAULT NOW()
        )
    """)
    con.close()

init_db()


# ══════════════════════════════════════════
# Pydantic models
# ══════════════════════════════════════════
class ProjectCreate(BaseModel):
    name:           str
    client_name:    Optional[str]   = None
    location:       Optional[str]   = None
    contract_value: Optional[float] = 0
    start_date:     Optional[date]  = None
    end_date:       Optional[date]  = None

class LaborEntry(BaseModel):
    project_id:   str
    worker_name:  Optional[str]   = None
    worker_type:  Optional[str]   = None
    work_days:    Optional[float] = 0
    daily_rate:   Optional[float] = 0
    total_amount: Optional[float] = 0
    paid_amount:  Optional[float] = 0
    work_date:    Optional[date]  = None
    note:         Optional[str]   = None

class MaterialEntry(BaseModel):
    project_id:    str
    item_name:     Optional[str]   = None
    quantity:      Optional[float] = 0
    unit:          Optional[str]   = None
    unit_price:    Optional[float] = 0
    total_amount:  Optional[float] = 0
    supplier:      Optional[str]   = None
    purchase_date: Optional[date]  = None
    note:          Optional[str]   = None

class MilestoneEntry(BaseModel):
    project_id:     str
    milestone_name: str
    amount:         float
    due_date:       Optional[date] = None
    received_date:  Optional[date] = None
    status:         Optional[str]  = "pending"
    note:           Optional[str]  = None

class ChatRequest(BaseModel):
    question: str
    history:  Optional[list[dict]] = None


# ══════════════════════════════════════════
# Routes
# ══════════════════════════════════════════
@app.get("/health")
def health():
    return {"status": "ok", "version": "0.2.0"}


# —— Projects ——
@app.post("/api/projects")
def create_project(body: ProjectCreate, user=Depends(get_current_user)):
    pid = str(uuid.uuid4())
    con = duckdb.connect(DB_PATH)
    con.execute("""
        INSERT INTO projects
        (id, user_id, name, client_name, location, contract_value, start_date, end_date)
        VALUES (?,?,?,?,?,?,?,?)
    """, [pid, user["user_id"], body.name, body.client_name,
          body.location, body.contract_value, body.start_date, body.end_date])
    con.close()
    return {"project_id": pid, "name": body.name, "status": "created"}


@app.get("/api/projects")
def list_projects(user=Depends(get_current_user)):
    con = duckdb.connect(DB_PATH)
    rows = con.execute("""
        SELECT p.id, p.name, p.client_name, p.contract_value, p.status,
               COALESCE(SUM(l.total_amount), 0)  AS labor_total,
               COALESCE(SUM(m.total_amount), 0)  AS material_total,
               COALESCE(SUM(CASE WHEN ms.status='received' THEN ms.amount ELSE 0 END), 0) AS received,
               p.contract_value
                 - COALESCE(SUM(l.total_amount),0)
                 - COALESCE(SUM(m.total_amount),0) AS estimated_profit
        FROM projects p
        LEFT JOIN labor_costs        l  ON l.project_id = p.id
        LEFT JOIN material_costs     m  ON m.project_id = p.id
        LEFT JOIN payment_milestones ms ON ms.project_id = p.id
        WHERE p.user_id = ?
        GROUP BY p.id, p.name, p.client_name, p.contract_value, p.status
    """, [user["user_id"]]).fetchall()
    con.close()
    keys = ["id","name","client_name","contract_value","status",
            "labor_total","material_total","received","estimated_profit"]
    return [dict(zip(keys, r)) for r in rows]


@app.get("/api/projects/{project_id}/summary")
def project_summary(project_id: str, user=Depends(get_current_user)):
    con = duckdb.connect(DB_PATH)
    row = con.execute("""
        SELECT p.name, p.client_name, p.contract_value,
               COALESCE(SUM(l.total_amount),0)   AS labor_total,
               COALESCE(SUM(m.total_amount),0)   AS material_total,
               COALESCE(SUM(CASE WHEN ms.status='received' THEN ms.amount ELSE 0 END),0) AS received,
               COALESCE(SUM(CASE WHEN ms.status='pending'  THEN ms.amount ELSE 0 END),0) AS pending_rx,
               COALESCE(SUM(l.total_amount - l.paid_amount),0) AS unpaid_labor
        FROM projects p
        LEFT JOIN labor_costs        l  ON l.project_id = p.id
        LEFT JOIN material_costs     m  ON m.project_id = p.id
        LEFT JOIN payment_milestones ms ON ms.project_id = p.id
        WHERE p.id = ? AND p.user_id = ?
        GROUP BY p.name, p.client_name, p.contract_value
    """, [project_id, user["user_id"]]).fetchone()
    con.close()
    if not row:
        raise HTTPException(404, "ไม่พบโครงการนี้")
    name, client, contract, labor, material, received, pending_rx, unpaid = row
    total_cost = labor + material
    profit     = contract - total_cost
    margin     = round(profit / contract * 100, 1) if contract else 0
    return {
        "project": name, "client": client, "contract_value": contract,
        "labor_total": labor, "material_total": material,
        "total_cost": total_cost, "estimated_profit": profit,
        "profit_margin": f"{margin}%",
        "received": received, "pending_receive": pending_rx, "unpaid_labor": unpaid,
    }


# —— Labor ——
@app.post("/api/labor")
def add_labor(body: LaborEntry, user=Depends(get_current_user)):
    if not body.total_amount and body.work_days and body.daily_rate:
        body.total_amount = body.work_days * body.daily_rate
    con = duckdb.connect(DB_PATH)
    con.execute("""
        INSERT INTO labor_costs
        (id,project_id,user_id,worker_name,worker_type,
         work_days,daily_rate,total_amount,paid_amount,work_date,note,source)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,'manual')
    """, [str(uuid.uuid4()), body.project_id, user["user_id"],
          body.worker_name, body.worker_type, body.work_days, body.daily_rate,
          body.total_amount, body.paid_amount, body.work_date, body.note])
    con.close()
    return {"status": "บันทึกค่าแรงสำเร็จ", "total": body.total_amount}


# —— Materials ——
@app.post("/api/materials")
def add_material(body: MaterialEntry, user=Depends(get_current_user)):
    if not body.total_amount and body.quantity and body.unit_price:
        body.total_amount = body.quantity * body.unit_price
    con = duckdb.connect(DB_PATH)
    con.execute("""
        INSERT INTO material_costs
        (id,project_id,user_id,item_name,quantity,unit,
         unit_price,total_amount,supplier,purchase_date,source)
        VALUES (?,?,?,?,?,?,?,?,?,?,'manual')
    """, [str(uuid.uuid4()), body.project_id, user["user_id"],
          body.item_name, body.quantity, body.unit, body.unit_price,
          body.total_amount, body.supplier, body.purchase_date])
    con.close()
    return {"status": "บันทึกวัสดุสำเร็จ", "total": body.total_amount}


# —— Milestones ——
@app.post("/api/milestones")
def add_milestone(body: MilestoneEntry, user=Depends(get_current_user)):
    con = duckdb.connect(DB_PATH)
    con.execute("""
        INSERT INTO payment_milestones
        (id,project_id,user_id,milestone_name,amount,
         due_date,received_date,status,note,source)
        VALUES (?,?,?,?,?,?,?,?,?,'manual')
    """, [str(uuid.uuid4()), body.project_id, user["user_id"],
          body.milestone_name, body.amount, body.due_date,
          body.received_date, body.status, body.note])
    con.close()
    return {"status": "บันทึกงวดงานสำเร็จ"}


# —— Excel Import ——
@app.post("/api/import/excel")
async def import_excel(
    project_id: str,
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(400, "รองรับเฉพาะ .xlsx .xls .csv")
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        result = import_excel_pipeline(tmp_path, project_id, user["user_id"], DB_PATH)
    finally:
        os.unlink(tmp_path)
    return result


# —— Chat ——
@app.post("/api/chat")
def chat_endpoint(body: ChatRequest, user=Depends(get_current_user)):
    result = chatbot_chat(
        question=body.question,
        user_id=user["user_id"],
        history=body.history or [],
    )
    return result


# —— LINE Webhook ——
@app.post("/webhook/line/{user_id}")
async def line_webhook(user_id: str, request: Request):
    """
    LINE ส่ง event มาที่ endpoint นี้
    user_id ใน path = account ของ user ในระบบ
    (ตั้งค่า Webhook URL ใน LINE Developer Console เป็น
     https://yourdomain.com/webhook/line/<user_id>)
    """
    return await handle_line_webhook(request, user_id)


# —— User info ——
@app.get("/api/me")
def me(user=Depends(get_current_user)):
    return {
        "user_id":     user["user_id"],
        "plan":        user.get("plan"),
        "usage_count": user.get("usage_count"),
        "plan_limit":  user.get("plan_limit"),
    }