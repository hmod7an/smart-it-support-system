from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth Schemas ──────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: Optional[str] = "customer"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    is_approved: bool = True

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    message: str
    token: str
    user: UserResponse


# ── Ticket Schemas ────────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    service_type: str
    title: str
    description: str
    location: str
    priority: Optional[str] = "medium"


class TicketStatusUpdate(BaseModel):
    status: str


class TicketAssignUpdate(BaseModel):
    assigned_technician: str


class TicketNotesUpdate(BaseModel):
    technician_notes: str


class TicketResponse(BaseModel):
    id: int
    customer_id: int
    service_type: str
    title: str
    description: str
    location: str
    priority: str
    status: str
    assigned_technician: Optional[str] = None
    technician_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    customer_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Message Schemas ───────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: int
    ticket_id: int
    sender_id: int
    sender_name: str
    sender_role: str
    content: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Audit Log Schemas ─────────────────────────────────────────────────────────

class AuditLogResponse(BaseModel):
    id: int
    action: str
    actor_name: str
    ticket_id: Optional[int] = None
    details: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
