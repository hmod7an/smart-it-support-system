from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional

from app.database.database import get_db
from app.schemas.schemas import UserRegister, UserLogin, LoginResponse, UserResponse
from app.services import auth_service
from app.services.auth_service import decode_access_token, get_user_by_id

router = APIRouter()


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


@router.post("/customers/register", response_model=UserResponse, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if auth_service.get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = auth_service.register_user(db, data)
    return user


@router.post("/auth/login", response_model=LoginResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = auth_service.get_user_by_email(db, data.email)
    if not user or not auth_service.verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.role == "technician" and not user.is_approved:
        raise HTTPException(status_code=403, detail="Your account is pending admin approval")
    token = auth_service.create_access_token(user)
    return LoginResponse(
        message="Login successful",
        token=token,
        user=UserResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=user.role,
            is_approved=user.is_approved,
        ),
    )


@router.get("/technicians", response_model=list[UserResponse])
def list_technicians(db: Session = Depends(get_db)):
    return auth_service.get_all_technicians(db)


@router.get("/technicians/pending", response_model=list[UserResponse])
def pending_technicians(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return auth_service.get_pending_technicians(db)


@router.put("/technicians/{user_id}/approve", response_model=UserResponse)
def approve_technician(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    return auth_service.approve_technician(db, user_id)
