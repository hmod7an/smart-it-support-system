from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.models import User
from app.schemas.schemas import UserRegister
from app.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user: User) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_all_technicians(db: Session) -> list[User]:
    return db.query(User).filter(User.role == "technician", User.is_approved == True).all()


def get_pending_technicians(db: Session) -> list[User]:
    return db.query(User).filter(User.role == "technician", User.is_approved == False).all()


def approve_technician(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id, User.role == "technician").first()
    if not user:
        raise HTTPException(status_code=404, detail="Technician not found")
    user.is_approved = True
    db.commit()
    db.refresh(user)
    return user


def register_user(db: Session, data: UserRegister) -> User:
    allowed_roles = {"customer", "technician"}
    role = data.role if data.role in allowed_roles else "customer"
    is_approved = role != "technician"
    user = User(
        full_name=data.full_name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=role,
        is_approved=is_approved,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def seed_admin(db: Session) -> None:
    existing = get_user_by_email(db, "admin@wsit.com")
    if not existing:
        admin = User(
            full_name="WSIT Administrator",
            email="admin@wsit.com",
            password_hash=hash_password("admin123"),
            role="admin",
            is_approved=True,
        )
        db.add(admin)
        db.commit()
