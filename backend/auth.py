import os
from datetime import date, datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

try:
    from .main import Doctor, Patient, User, get_db
except ImportError:
    from main import Doctor, Patient, User, get_db


SECRET_KEY = os.getenv("SECRET_KEY", "change_this_in_production")
ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 24

router = APIRouter()
security = HTTPBearer()


class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Optional[str] = "admin"

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PatientRegistrationSchema(BaseModel):
    name: str
    dob: date
    gender: str
    phone: str
    email: EmailStr
    address: str
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class DoctorRegistrationSchema(BaseModel):
    first_name: str
    last_name: str
    dob: date
    gender: str
    license_number: str
    specialization: str
    experience: int
    qualification: str
    medical_school: str
    phone: str
    email: EmailStr
    address: str
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user = db.query(User).filter(User.id == payload.get("user_id")).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def calculate_age(dob: date) -> int:
    today = datetime.now().date()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        username=data.username,
        email=data.email,
        password=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User created successfully", "user_id": user.id}


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token({"user_id": user.id, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role}


@router.get("/logout")
def logout():
    return {"message": "Logged out successfully"}


@router.post("/patient/register", status_code=status.HTTP_201_CREATED)
def patient_register(data: PatientRegistrationSchema, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=data.name,
        email=data.email,
        password=hash_password(data.password),
        role="patient",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    patient = Patient(
        name=data.name,
        age=calculate_age(data.dob),
        gender=data.gender,
        phone=data.phone,
        email=data.email,
        address=data.address,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    return {"message": "Patient registered successfully", "user_id": user.id, "patient_id": patient.id}


@router.post("/doctor/register", status_code=status.HTTP_201_CREATED)
def doctor_register(data: DoctorRegistrationSchema, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    full_name = f"{data.first_name} {data.last_name}"
    user = User(
        username=full_name,
        email=data.email,
        password=hash_password(data.password),
        role="doctor",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    doctor = Doctor(
        name=full_name,
        specialization=data.specialization,
        phone=data.phone,
        email=data.email,
        available_days="Mon,Tue,Wed,Thu,Fri",
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    return {"message": "Doctor registration successful. Awaiting admin approval.", "user_id": user.id, "doctor_id": doctor.id}
