# ==========================================
# 1. Imports
# ==========================================
import os
import logging
from datetime import date, timedelta, datetime, timezone
from contextlib import asynccontextmanager

import bcrypt
import jwt
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from sqlalchemy import create_engine, Column, Integer, String, Date, Text, ForeignKey, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==========================================
# 2. Configuration
# ==========================================
SECRET_KEY = os.getenv("SECRET_KEY", "change_this_in_production")
ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 24

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./clinic.db")

# Render provides PostgreSQL URLs starting with "postgres://", SQLAlchemy needs "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


# ==========================================
# 3. Database Configuration
# ==========================================
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

# Enable WAL mode for SQLite (better concurrent reads)
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA journal_mode=WAL")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ==========================================
# 4. SQLAlchemy Models
# ==========================================
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    role = Column(String, default="admin")  # admin, doctor, patient


class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    specialization = Column(String, nullable=False)
    phone = Column(String)
    email = Column(String, index=True)
    available_days = Column(String)  # e.g. "Mon,Tue,Wed"


class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer)
    gender = Column(String)
    phone = Column(String)
    email = Column(String, index=True)
    address = Column(Text)


class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    appointment_date = Column(Date, nullable=False)
    status = Column(String, default="pending")  # pending, scheduled, completed, cancelled
    notes = Column(Text)


# ==========================================
# 5. App Lifespan (replaces on_event startup)
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified.")
    yield

# ==========================================
# 6. FastAPI Initialization
# ==========================================
app = FastAPI(title="Clinic Management System", lifespan=lifespan)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def root():
        return RedirectResponse(url="/static/index.html")
else:
    @app.get("/")
    def root():
        return {"message": "Clinic Management System API", "docs": "/docs"}


# ==========================================
# 7. Database Dependency
# ==========================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# 8. Auth Helpers
# ==========================================
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


def get_or_404(query, detail: str):
    obj = query.first()
    if not obj:
        raise HTTPException(status_code=404, detail=detail)
    return obj


# ==========================================
# 9. Pydantic Schemas
# ==========================================
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


class DoctorSchema(BaseModel):
    name: str
    specialization: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    available_days: Optional[str] = None


class PatientSchema(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None


class AppointmentSchema(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: date
    status: Optional[str] = "pending"
    notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, v):
        allowed = {"pending", "scheduled", "completed", "cancelled"}
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


class AppointmentStatusUpdate(BaseModel):
    action: str  # "accept" or "reject"


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


# ==========================================
# 10. Auth Endpoints
# ==========================================
@app.post("/signup", status_code=status.HTTP_201_CREATED)
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


@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token({"user_id": user.id, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role}


@app.get("/logout")
def logout():
    return {"message": "Logged out successfully"}


# ==========================================
# 11. Dashboard
# ==========================================
@app.get("/dashboard")
def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Appointment)
    if current_user.role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.email == current_user.email).first()
        if doctor:
            q = q.filter(Appointment.doctor_id == doctor.id)
        else:
            q = q.filter(False)
    return {
        "total_doctors": db.query(Doctor).count(),
        "total_patients": db.query(Patient).count(),
        "total_appointments": q.count(),
        "scheduled": q.filter(Appointment.status == "scheduled").count(),
        "completed": q.filter(Appointment.status == "completed").count(),
        "cancelled": q.filter(Appointment.status == "cancelled").count(),
    }


# ==========================================
# 12. Doctor Endpoints
# ==========================================
@app.get("/doctors")
def get_doctors(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Doctor).all()


@app.get("/doctors/{doctor_id}")
def get_doctor(doctor_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_or_404(db.query(Doctor).filter(Doctor.id == doctor_id), "Doctor not found")


@app.post("/doctors", status_code=status.HTTP_201_CREATED)
def create_doctor(data: DoctorSchema, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    doctor = Doctor(**data.model_dump())
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


@app.put("/doctors/{doctor_id}")
def update_doctor(doctor_id: int, data: DoctorSchema, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    doctor = get_or_404(db.query(Doctor).filter(Doctor.id == doctor_id), "Doctor not found")
    for key, value in data.model_dump().items():
        setattr(doctor, key, value)
    db.commit()
    db.refresh(doctor)
    return doctor


@app.delete("/doctors/{doctor_id}")
def delete_doctor(doctor_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    doctor = get_or_404(db.query(Doctor).filter(Doctor.id == doctor_id), "Doctor not found")
    db.delete(doctor)
    db.commit()
    return {"message": "Doctor deleted successfully"}


# ==========================================
# 13. Patient Endpoints
# ==========================================
@app.get("/patients")
def get_patients(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Patient).all()


@app.get("/patients/{patient_id}")
def get_patient(patient_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_or_404(db.query(Patient).filter(Patient.id == patient_id), "Patient not found")


@app.post("/patients", status_code=status.HTTP_201_CREATED)
def create_patient(data: PatientSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = Patient(**data.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@app.put("/patients/{patient_id}")
def update_patient(patient_id: int, data: PatientSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = get_or_404(db.query(Patient).filter(Patient.id == patient_id), "Patient not found")
    for key, value in data.model_dump().items():
        setattr(patient, key, value)
    db.commit()
    db.refresh(patient)
    return patient


@app.delete("/patients/{patient_id}")
def delete_patient(patient_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    patient = get_or_404(db.query(Patient).filter(Patient.id == patient_id), "Patient not found")
    db.delete(patient)
    db.commit()
    return {"message": "Patient deleted successfully"}


# ==========================================
# 14. Appointment Endpoints
# ==========================================
@app.get("/appointments")
def get_appointments(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.email == current_user.email).first()
        if not doctor:
            return []
        return db.query(Appointment).filter(Appointment.doctor_id == doctor.id).all()
    return db.query(Appointment).all()


@app.get("/appointments/{appointment_id}")
def get_appointment(appointment_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_or_404(db.query(Appointment).filter(Appointment.id == appointment_id), "Appointment not found")


@app.post("/appointments", status_code=status.HTTP_201_CREATED)
def create_appointment(data: AppointmentSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    get_or_404(db.query(Doctor).filter(Doctor.id == data.doctor_id), "Doctor not found")
    get_or_404(db.query(Patient).filter(Patient.id == data.patient_id), "Patient not found")
    appointment = Appointment(**data.model_dump())
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@app.put("/appointments/{appointment_id}")
def update_appointment(appointment_id: int, data: AppointmentSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    appointment = get_or_404(db.query(Appointment).filter(Appointment.id == appointment_id), "Appointment not found")
    for key, value in data.model_dump().items():
        setattr(appointment, key, value)
    db.commit()
    db.refresh(appointment)
    return appointment


@app.patch("/appointments/{appointment_id}/status")
def update_appointment_status(
    appointment_id: int,
    data: AppointmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can accept or reject appointments")
    if data.action not in ("accept", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'accept' or 'reject'")

    appointment = get_or_404(db.query(Appointment).filter(Appointment.id == appointment_id), "Appointment not found")
    doctor = db.query(Doctor).filter(Doctor.email == current_user.email).first()
    if not doctor or appointment.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="Not your appointment")

    appointment.status = "scheduled" if data.action == "accept" else "cancelled"
    db.commit()
    db.refresh(appointment)
    return appointment


@app.delete("/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    appointment = get_or_404(db.query(Appointment).filter(Appointment.id == appointment_id), "Appointment not found")
    db.delete(appointment)
    db.commit()
    return {"message": "Appointment deleted successfully"}


# ==========================================
# 15. Registration Endpoints (no auth)
# ==========================================
@app.post("/patient/register", status_code=status.HTTP_201_CREATED)
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


@app.post("/doctor/register", status_code=status.HTTP_201_CREATED)
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


# ==========================================
# 16. Health Check
# ==========================================
@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except SQLAlchemyError as e:
        logger.error(f"DB health check failed: {e}")
        raise HTTPException(status_code=503, detail="Database unavailable")
