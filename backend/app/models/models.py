from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database.database import Base


class UserRole(str, enum.Enum):
    customer = "customer"
    technician = "technician"
    admin = "admin"


class TicketStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class TicketPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ServiceType(str, enum.Enum):
    cctv = "CCTV"
    networking = "Networking"
    maintenance = "Maintenance"
    smart_home = "Smart Home"
    access_control = "Access Control"
    tech_support = "Tech Support"


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    full_name       = Column(String(100), nullable=False)
    email           = Column(String(150), unique=True, index=True, nullable=False)
    password_hash   = Column(String(255), nullable=False)
    role            = Column(String(20), default=UserRole.customer, nullable=False)
    is_approved     = Column(Boolean, default=True, nullable=False)

    tickets = relationship("Ticket", back_populates="customer", foreign_keys="Ticket.customer_id")


class Ticket(Base):
    __tablename__ = "tickets"

    id                  = Column(Integer, primary_key=True, index=True)
    customer_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    service_type        = Column(String(50), nullable=False)
    title               = Column(String(200), nullable=False)
    description         = Column(Text, nullable=False)
    location            = Column(String(200), nullable=False)
    priority            = Column(String(20), default=TicketPriority.medium, nullable=False)
    status              = Column(String(20), default=TicketStatus.open, nullable=False)
    assigned_technician = Column(String(100), nullable=True)
    technician_notes    = Column(Text, nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    customer = relationship("User", back_populates="tickets", foreign_keys=[customer_id])
    messages = relationship("Message", back_populates="ticket", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id          = Column(Integer, primary_key=True, index=True)
    ticket_id   = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    sender_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_name = Column(String(100), nullable=False)
    sender_role = Column(String(20), nullable=False)
    content     = Column(Text, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    ticket = relationship("Ticket", back_populates="messages")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    action      = Column(String(100), nullable=False)
    actor_name  = Column(String(100), nullable=False)
    ticket_id   = Column(Integer, nullable=True)
    details     = Column(Text, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
