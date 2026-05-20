from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database.database import engine, SessionLocal
from app.models import models
from app.routes import auth, tickets
from app.services.auth_service import seed_admin
from app.core.config import ALLOWED_ORIGINS


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    models.Base.metadata.create_all(bind=engine)
    # Seed default admin account
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="WSiT Smart IT Support System",
    description="Phase 2 – Service Request & Support Ticket REST API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, tags=["Authentication"])
app.include_router(tickets.router, tags=["Tickets"])


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "system": "WSiT Smart IT Support System", "phase": 1}
