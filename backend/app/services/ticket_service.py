from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException
from typing import Optional

from app.models.models import Ticket, Message, AuditLog
from app.schemas.schemas import TicketCreate, TicketStatusUpdate, TicketAssignUpdate, TicketNotesUpdate, MessageCreate


# ── Audit Log ─────────────────────────────────────────────────────────────────

def add_audit_log(db: Session, action: str, actor_name: str, ticket_id: Optional[int] = None, details: Optional[str] = None):
    log = AuditLog(action=action, actor_name=actor_name, ticket_id=ticket_id, details=details)
    db.add(log)
    db.commit()


def get_audit_logs(db: Session) -> list[AuditLog]:
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(200).all()


# ── Tickets ───────────────────────────────────────────────────────────────────

def create_ticket(db: Session, data: TicketCreate, customer_id: int, customer_name: str) -> Ticket:
    ticket = Ticket(
        customer_id=customer_id,
        service_type=data.service_type,
        title=data.title,
        description=data.description,
        location=data.location,
        priority=data.priority,
        status="open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    add_audit_log(db, "Ticket Created", customer_name, ticket.id, f"Service: {data.service_type}, Priority: {data.priority}")
    return ticket


def _apply_filters(query, status: Optional[str], priority: Optional[str], search: Optional[str]):
    if status:
        query = query.filter(Ticket.status == status)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Ticket.title.ilike(term),
                Ticket.description.ilike(term),
                Ticket.location.ilike(term),
            )
        )
    return query


def get_tickets_by_customer(db: Session, customer_id: int, status=None, priority=None, search=None) -> list[Ticket]:
    q = db.query(Ticket).filter(Ticket.customer_id == customer_id)
    return _apply_filters(q, status, priority, search).order_by(Ticket.created_at.desc()).all()


def get_all_tickets(db: Session, status=None, priority=None, search=None) -> list[Ticket]:
    q = db.query(Ticket)
    return _apply_filters(q, status, priority, search).order_by(Ticket.created_at.desc()).all()


def get_tickets_by_technician(db: Session, technician_name: str, status=None, priority=None) -> list[Ticket]:
    q = db.query(Ticket).filter(Ticket.assigned_technician == technician_name)
    return _apply_filters(q, status, priority, None).order_by(Ticket.created_at.desc()).all()


def get_ticket_by_id(db: Session, ticket_id: int) -> Ticket:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


def update_ticket_status(db: Session, ticket_id: int, data: TicketStatusUpdate, actor_name: str = "System") -> Ticket:
    ticket = get_ticket_by_id(db, ticket_id)
    old_status = ticket.status
    ticket.status = data.status
    db.commit()
    db.refresh(ticket)
    add_audit_log(db, "Status Updated", actor_name, ticket_id, f"{old_status} → {data.status}")
    return ticket


def assign_ticket(db: Session, ticket_id: int, data: TicketAssignUpdate, actor_name: str = "Admin") -> Ticket:
    ticket = get_ticket_by_id(db, ticket_id)
    old_tech = ticket.assigned_technician or "None"
    ticket.assigned_technician = data.assigned_technician
    ticket.status = "in_progress"
    db.commit()
    db.refresh(ticket)
    add_audit_log(db, "Technician Assigned", actor_name, ticket_id, f"Assigned to: {data.assigned_technician} (was: {old_tech})")
    return ticket


def update_ticket_notes(db: Session, ticket_id: int, data: TicketNotesUpdate, actor_name: str) -> Ticket:
    ticket = get_ticket_by_id(db, ticket_id)
    ticket.technician_notes = data.technician_notes
    db.commit()
    db.refresh(ticket)
    add_audit_log(db, "Notes Updated", actor_name, ticket_id, "Technician updated internal notes")
    return ticket


# ── Messages ──────────────────────────────────────────────────────────────────

def add_message(db: Session, ticket_id: int, sender_id: int, sender_name: str, sender_role: str, content: str) -> Message:
    msg = Message(
        ticket_id=ticket_id,
        sender_id=sender_id,
        sender_name=sender_name,
        sender_role=sender_role,
        content=content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    add_audit_log(db, "Message Sent", sender_name, ticket_id, f"Role: {sender_role}")
    return msg


def get_messages(db: Session, ticket_id: int) -> list[Message]:
    return db.query(Message).filter(Message.ticket_id == ticket_id).order_by(Message.created_at.asc()).all()
