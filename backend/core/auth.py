"""
auth.py — Supabase JWT validation + user quota management

ใน production:
1. ตั้ง env SUPABASE_URL และ SUPABASE_SERVICE_KEY
2. ทุก request ส่ง Authorization: Bearer <supabase_jwt> มาด้วย

ใน dev mode (ไม่มี env):
- ใช้ MOCK_USERS เหมือนเดิม (backward compatible)
"""

import os
import duckdb
from fastapi import HTTPException, Header
from typing import Optional

# ดึงจาก environment
SUPABASE_URL         = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
DB_PATH              = "construction.duckdb"
DEV_MODE             = not SUPABASE_URL  # ถ้าไม่มี env = dev mode

# Mock users สำหรับ dev
MOCK_USERS = {
    "test-api-key-001": {
        "user_id":    "user-001",
        "email":      "dev@test.com",
        "plan":       "pro",
        "plan_limit": None,
        "usage":      0,
    }
}


def get_user_from_supabase(token: str) -> dict:
    """ดึงข้อมูล user จาก Supabase โดยใช้ JWT token"""
    import httpx
    resp = httpx.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": SUPABASE_SERVICE_KEY,
        },
        timeout=5,
    )
    if resp.status_code != 200:
        raise HTTPException(401, "Token ไม่ถูกต้องหรือหมดอายุ")
    data = resp.json()
    return {
        "user_id": data["id"],
        "email":   data["email"],
    }


def get_user_plan(user_id: str) -> dict:
    """ดึง plan และ usage จาก DB"""
    con = duckdb.connect(DB_PATH)
    row = con.execute("""
        SELECT plan, plan_limit, usage_count
        FROM users WHERE id = ?
    """, [user_id]).fetchone()
    con.close()

    if not row:
        # user ใหม่ — สร้าง record เลย
        _create_user(user_id)
        return {"plan": "starter", "plan_limit": 100, "usage_count": 0}

    return {
        "plan":        row[0],
        "plan_limit":  row[1],
        "usage_count": row[2],
    }


def _create_user(user_id: str):
    con = duckdb.connect(DB_PATH)
    con.execute("""
        INSERT OR IGNORE INTO users (id, plan, plan_limit, usage_count)
        VALUES (?, 'starter', 100, 0)
    """, [user_id])
    con.close()


def increment_usage(user_id: str):
    """เพิ่ม usage count 1 ครั้ง"""
    con = duckdb.connect(DB_PATH)
    con.execute("""
        UPDATE users SET usage_count = usage_count + 1 WHERE id = ?
    """, [user_id])
    con.close()


def check_quota(plan: str, plan_limit: Optional[int], usage_count: int):
    """ตรวจสอบว่ายังมี quota เหลืออยู่ไหม"""
    if plan == "pro":
        return  # pro ไม่จำกัด
    if plan_limit and usage_count >= plan_limit:
        raise HTTPException(
            429,
            f"ใช้ครบโควต้าแล้ว ({usage_count}/{plan_limit} คำถาม) "
            f"กรุณาอัปเกรดแพ็กเกจ"
        )


# ----- Dependency หลักที่ทุก endpoint เรียกใช้ -----
def get_current_user(
    authorization: Optional[str] = Header(None),
    x_api_key:     Optional[str] = Header(None),
) -> dict:
    """
    รองรับ 2 โหมด:
    1. Dev mode: ส่ง x-api-key header
    2. Production: ส่ง Authorization: Bearer <supabase_jwt>
    """
    # Dev mode
    if DEV_MODE or x_api_key:
        key = x_api_key or ""
        user = MOCK_USERS.get(key)
        if not user:
            raise HTTPException(401, "Invalid API key")
        plan_info = {
            "plan":        user["plan"],
            "plan_limit":  user["plan_limit"],
            "usage_count": user["usage"],
        }
        check_quota(plan_info["plan"], plan_info["plan_limit"], plan_info["usage_count"])
        user["usage"] += 1
        return {**user, **plan_info}

    # Production mode — Supabase JWT
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "กรุณา login ก่อนใช้งาน")

    token    = authorization.split(" ")[1]
    identity = get_user_from_supabase(token)
    plan     = get_user_plan(identity["user_id"])

    check_quota(plan["plan"], plan["plan_limit"], plan["usage_count"])
    increment_usage(identity["user_id"])

    return {**identity, **plan}
