from sqlalchemy import Column, String, Numeric, Integer, Date, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

def gen_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id            = Column(String, primary_key=True, default=gen_uuid)
    email         = Column(String, unique=True, nullable=False)
    plan          = Column(String, default="basic")       # basic | pro | business
    plan_limit    = Column(Integer, default=300)          # None = unlimited
    usage_count   = Column(Integer, default=0)
    reset_date    = Column(Date)
    created_at    = Column(DateTime, server_default=func.now())
    projects      = relationship("Project", back_populates="user")


class Project(Base):
    __tablename__ = "projects"
    id             = Column(String, primary_key=True, default=gen_uuid)
    user_id        = Column(String, ForeignKey("users.id"), nullable=False)
    name           = Column(String, nullable=False)        # "บ้านคุณสมชาย"
    client_name    = Column(String)
    location       = Column(Text)
    contract_value = Column(Numeric(15, 2), default=0)
    start_date     = Column(Date)
    end_date       = Column(Date)
    status         = Column(String, default="active")      # active | completed | pending
    created_at     = Column(DateTime, server_default=func.now())
    user           = relationship("User", back_populates="projects")
    labor_costs    = relationship("LaborCost", back_populates="project")
    materials      = relationship("MaterialCost", back_populates="project")
    milestones     = relationship("PaymentMilestone", back_populates="project")


class LaborCost(Base):
    __tablename__ = "labor_costs"
    id           = Column(String, primary_key=True, default=gen_uuid)
    project_id   = Column(String, ForeignKey("projects.id"), nullable=False)
    worker_name  = Column(String)
    worker_type  = Column(String)           # ช่างปูน | ช่างไฟ | กรรมกร
    work_days    = Column(Numeric(6, 1), default=0)
    daily_rate   = Column(Numeric(10, 2), default=0)
    total_amount = Column(Numeric(12, 2), default=0)
    paid_amount  = Column(Numeric(12, 2), default=0)
    work_date    = Column(Date)
    note         = Column(Text)
    source       = Column(String, default="manual")        # manual | excel | line
    created_at   = Column(DateTime, server_default=func.now())
    project      = relationship("Project", back_populates="labor_costs")


class MaterialCost(Base):
    __tablename__ = "material_costs"
    id            = Column(String, primary_key=True, default=gen_uuid)
    project_id    = Column(String, ForeignKey("projects.id"), nullable=False)
    item_name     = Column(String)
    quantity      = Column(Numeric(10, 2), default=0)
    unit          = Column(String)                          # ถุง | เส้น | ก้อน | แผ่น
    unit_price    = Column(Numeric(10, 2), default=0)
    total_amount  = Column(Numeric(12, 2), default=0)
    supplier      = Column(String)
    purchase_date = Column(Date)
    note          = Column(Text)
    source        = Column(String, default="manual")
    created_at    = Column(DateTime, server_default=func.now())
    project       = relationship("Project", back_populates="materials")


class PaymentMilestone(Base):
    __tablename__ = "payment_milestones"
    id             = Column(String, primary_key=True, default=gen_uuid)
    project_id     = Column(String, ForeignKey("projects.id"), nullable=False)
    milestone_name = Column(String)                        # "งวด 1 - วางรากฐาน"
    amount         = Column(Numeric(12, 2), default=0)
    due_date       = Column(Date)
    received_date  = Column(Date)                          # None = ยังไม่ได้รับ
    status         = Column(String, default="pending")     # pending | received
    note           = Column(Text)
    created_at     = Column(DateTime, server_default=func.now())
    project        = relationship("Project", back_populates="milestones")