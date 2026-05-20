from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database.database import get_db
from app.schemas.schemas import (
    TicketCreate, TicketResponse, TicketStatusUpdate,
    TicketAssignUpdate, TicketNotesUpdate,
    MessageCreate, MessageResponse, AuditLogResponse,
)
from app.services import ticket_service
from app.services.auth_service import decode_access_token, get_user_by_id

router = APIRouter()


# ── Auth dependencies ─────────────────────────────────────────────────────────

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing")
    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    user = get_user_by_id(db, int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_admin(user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Helpers ───────────────────────────────────────────────────────────────────

def _enrich(ticket, db) -> TicketResponse:
    resp = TicketResponse.model_validate(ticket)
    resp.customer_name = ticket.customer.full_name if ticket.customer else None
    return resp


# ── Ticket Endpoints ──────────────────────────────────────────────────────────

@router.post("/tickets", response_model=TicketResponse, status_code=201)
def submit_ticket(data: TicketCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ticket = ticket_service.create_ticket(db, data, current_user.id, current_user.full_name)
    return _enrich(ticket, db)


@router.get("/tickets/assigned", response_model=list[TicketResponse])
def assigned_tickets(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
):
    if current_user.role not in ("technician", "admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    tickets = ticket_service.get_tickets_by_technician(db, current_user.full_name, status=status, priority=priority)
    return [_enrich(t, db) for t in tickets]


@router.get("/tickets/my", response_model=list[TicketResponse])
def my_tickets(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    tickets = ticket_service.get_tickets_by_customer(db, current_user.id, status=status, priority=priority, search=search)
    return [_enrich(t, db) for t in tickets]


@router.get("/tickets", response_model=list[TicketResponse])
def all_tickets(
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    tickets = ticket_service.get_all_tickets(db, status=status, priority=priority, search=search)
    return [_enrich(t, db) for t in tickets]


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
def ticket_detail(ticket_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ticket = ticket_service.get_ticket_by_id(db, ticket_id)
    if current_user.role == "admin":
        pass
    elif current_user.role == "technician":
        if ticket.assigned_technician != current_user.full_name:
            raise HTTPException(status_code=403, detail="Access denied")
    elif ticket.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return _enrich(ticket, db)


@router.put("/tickets/{ticket_id}/status", response_model=TicketResponse)
def update_status(ticket_id: int, data: TicketStatusUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    ticket = ticket_service.update_ticket_status(db, ticket_id, data, admin.full_name)
    return _enrich(ticket, db)


@router.put("/tickets/{ticket_id}/resolve", response_model=TicketResponse)
def technician_resolve(ticket_id: int, data: TicketStatusUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role not in ("technician", "admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    ticket = ticket_service.get_ticket_by_id(db, ticket_id)
    if current_user.role == "technician" and ticket.assigned_technician != current_user.full_name:
        raise HTTPException(status_code=403, detail="This ticket is not assigned to you")
    allowed = {"in_progress", "resolved", "closed"}
    if data.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(allowed)}")
    ticket = ticket_service.update_ticket_status(db, ticket_id, data, current_user.full_name)
    return _enrich(ticket, db)


@router.put("/tickets/{ticket_id}/assign", response_model=TicketResponse)
def assign_technician(ticket_id: int, data: TicketAssignUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    ticket = ticket_service.assign_ticket(db, ticket_id, data, admin.full_name)
    return _enrich(ticket, db)


@router.put("/tickets/{ticket_id}/notes", response_model=TicketResponse)
def update_notes(ticket_id: int, data: TicketNotesUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role not in ("technician", "admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    ticket = ticket_service.get_ticket_by_id(db, ticket_id)
    if current_user.role == "technician" and ticket.assigned_technician != current_user.full_name:
        raise HTTPException(status_code=403, detail="This ticket is not assigned to you")
    ticket = ticket_service.update_ticket_notes(db, ticket_id, data, current_user.full_name)
    return _enrich(ticket, db)


# ── Message Endpoints ─────────────────────────────────────────────────────────

@router.get("/tickets/{ticket_id}/messages", response_model=list[MessageResponse])
def get_messages(ticket_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ticket = ticket_service.get_ticket_by_id(db, ticket_id)
    if current_user.role == "admin":
        pass
    elif current_user.role == "technician":
        if ticket.assigned_technician != current_user.full_name:
            raise HTTPException(status_code=403, detail="Access denied")
    elif ticket.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return ticket_service.get_messages(db, ticket_id)


@router.post("/tickets/{ticket_id}/messages", response_model=MessageResponse, status_code=201)
def send_message(ticket_id: int, data: MessageCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ticket = ticket_service.get_ticket_by_id(db, ticket_id)
    if current_user.role == "admin":
        pass
    elif current_user.role == "technician":
        if ticket.assigned_technician != current_user.full_name:
            raise HTTPException(status_code=403, detail="Access denied")
    elif ticket.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return ticket_service.add_message(db, ticket_id, current_user.id, current_user.full_name, current_user.role, data.content)


# ── Audit Log Endpoint ────────────────────────────────────────────────────────

@router.get("/audit-logs", response_model=list[AuditLogResponse])
def get_audit_logs(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return ticket_service.get_audit_logs(db)
