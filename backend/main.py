# ==========================================
# 1. Imports
# ==========================================
import os
import logging
from datetime import date
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
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
    username = Column(String, nullable=False)  # not unique – email is the unique identifier
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
# 8. Shared Helpers
# ==========================================
def get_or_404(query, detail: str):
    obj = query.first()
    if not obj:
        raise HTTPException(status_code=404, detail=detail)
    return obj


# ==========================================
# 9. Auth Router and Pydantic Schemas
# ==========================================
try:
    from .auth import get_current_user, require_admin, require_doctor, require_admin_or_doctor, router as auth_router
except ImportError:
    from auth import get_current_user, require_admin, require_doctor, require_admin_or_doctor, router as auth_router

app.include_router(auth_router)


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
    action: str  # "accept", "cancel", or "reject"


def get_patient_for_user(db: Session, user: User) -> Patient:
    return get_or_404(db.query(Patient).filter(Patient.email == user.email), "Patient profile not found")


def get_doctor_for_user(db: Session, user: User) -> Doctor:
    return get_or_404(db.query(Doctor).filter(Doctor.email == user.email), "Doctor profile not found")


def doctor_can_access_patient(db: Session, doctor_id: int, patient_id: int) -> bool:
    return db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.patient_id == patient_id,
    ).first() is not None


def ensure_patient_access(db: Session, current_user: User, patient_id: int):
    if current_user.role == "admin":
        return
    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.email == current_user.email).first()
        if patient and patient.id == patient_id:
            return
        raise HTTPException(status_code=403, detail="Not allowed to access this patient")
    if current_user.role == "doctor":
        doctor = get_doctor_for_user(db, current_user)
        if doctor_can_access_patient(db, doctor.id, patient_id):
            return
    raise HTTPException(status_code=403, detail="Not allowed to access this patient")


def ensure_appointment_access(db: Session, current_user: User, appointment: Appointment):
    if current_user.role == "admin":
        return
    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.email == current_user.email).first()
        if patient and appointment.patient_id == patient.id:
            return
        raise HTTPException(status_code=403, detail="Not allowed to access this appointment")
    if current_user.role == "doctor":
        doctor = get_doctor_for_user(db, current_user)
        if appointment.doctor_id == doctor.id:
            return
    raise HTTPException(status_code=403, detail="Not allowed to access this appointment")


# ==========================================
# 11. Dashboard
# ==========================================
@app.get("/dashboard")
def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Appointment)
    if current_user.role == "doctor":
        doctor = get_doctor_for_user(db, current_user)
        q = q.filter(Appointment.doctor_id == doctor.id)
    elif current_user.role == "patient":
        patient = get_patient_for_user(db, current_user)
        q = q.filter(Appointment.patient_id == patient.id)
    return {
        "total_doctors": db.query(Doctor).count(),
        "total_patients": db.query(Patient).count() if current_user.role == "admin" else 1,
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
    if current_user.role == "doctor":
        return [get_doctor_for_user(db, current_user)]
    return db.query(Doctor).all()


@app.get("/doctors/{doctor_id}")
def get_doctor(doctor_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "doctor":
        doctor = get_doctor_for_user(db, current_user)
        if doctor.id != doctor_id:
            raise HTTPException(status_code=403, detail="Not allowed to access this doctor")
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
    if current_user.role == "patient":
        return [get_patient_for_user(db, current_user)]
    if current_user.role == "doctor":
        doctor = get_doctor_for_user(db, current_user)
        patient_ids = db.query(Appointment.patient_id).filter(Appointment.doctor_id == doctor.id).distinct()
        return db.query(Patient).filter(Patient.id.in_(patient_ids)).all()
    return db.query(Patient).all()


@app.get("/patients/{patient_id}")
def get_patient(patient_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_patient_access(db, current_user, patient_id)
    return get_or_404(db.query(Patient).filter(Patient.id == patient_id), "Patient not found")


@app.post("/patients", status_code=status.HTTP_201_CREATED)
def create_patient(data: PatientSchema, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    patient = Patient(**data.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@app.put("/patients/{patient_id}")
def update_patient(patient_id: int, data: PatientSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "doctor":
        raise HTTPException(status_code=403, detail="Doctors cannot update patient profiles")
    ensure_patient_access(db, current_user, patient_id)
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
        doctor = get_doctor_for_user(db, current_user)
        return db.query(Appointment).filter(Appointment.doctor_id == doctor.id).all()
    if current_user.role == "patient":
        patient = get_patient_for_user(db, current_user)
        return db.query(Appointment).filter(Appointment.patient_id == patient.id).all()
    return db.query(Appointment).all()


@app.get("/appointments/{appointment_id}")
def get_appointment(appointment_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    appointment = get_or_404(db.query(Appointment).filter(Appointment.id == appointment_id), "Appointment not found")
    ensure_appointment_access(db, current_user, appointment)
    return appointment


@app.post("/appointments", status_code=status.HTTP_201_CREATED)
def create_appointment(data: AppointmentSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "doctor":
        raise HTTPException(status_code=403, detail="Doctors cannot book patient appointments")
    if current_user.role == "patient":
        patient = get_patient_for_user(db, current_user)
        if data.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Patients can only book their own appointments")
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
    ensure_appointment_access(db, current_user, appointment)
    if current_user.role != "admin" and (data.patient_id != appointment.patient_id or data.doctor_id != appointment.doctor_id):
        raise HTTPException(status_code=403, detail="Cannot move appointment ownership")
    if current_user.role == "patient" and data.status != "cancelled":
        raise HTTPException(status_code=403, detail="Patients can only cancel appointments")
    for key, value in data.model_dump().items():
        setattr(appointment, key, value)
    db.commit()
    db.refresh(appointment)
    return appointment


@app.patch("/appointments/{appointment_id}/status")
def update_appointment_status(
    appointment_id: int,
    data: AppointmentStatusUpdate,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    if data.action not in ("accept", "cancel", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'accept', 'cancel', or 'reject'")

    appointment = get_or_404(db.query(Appointment).filter(Appointment.id == appointment_id), "Appointment not found")
    doctor = get_doctor_for_user(db, current_user)
    if not doctor or appointment.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="Not your appointment")

    appointment.status = "scheduled" if data.action == "accept" else "cancelled"
    db.commit()
    db.refresh(appointment)
    return appointment


@app.delete("/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    appointment = get_or_404(db.query(Appointment).filter(Appointment.id == appointment_id), "Appointment not found")
    ensure_appointment_access(db, current_user, appointment)
    if current_user.role == "doctor":
        raise HTTPException(status_code=403, detail="Doctors can cancel appointments instead of deleting them")
    db.delete(appointment)
    db.commit()
    return {"message": "Appointment deleted successfully"}


# ==========================================
# 15. Seed Endpoint (populates live DB for testing)
# ==========================================
@app.post("/seed", status_code=status.HTTP_201_CREATED)
def seed_database(db: Session = Depends(get_db)):
    """Seed the database with Indian dummy data. Safe to call multiple times."""
    import bcrypt as _bcrypt
    from datetime import date as _date

    SEED_SECRET = os.getenv("SEED_SECRET", "")
    if not SEED_SECRET:
        raise HTTPException(status_code=403, detail="Set SEED_SECRET env var to enable seeding")

    def _hash(pw: str) -> str:
        return _bcrypt.hashpw(pw.encode(), _bcrypt.gensalt()).decode()

    PASSWORD = "1234567p"
    created = {"users": 0, "doctors": 0, "patients": 0, "appointments": 0}

    seed_users = [
        {"username": "admin",              "email": "admin@clinic.com",          "role": "admin"},
        {"username": "Dr. Rajesh Sharma",  "email": "rajesh.sharma@clinic.com",  "role": "doctor"},
        {"username": "Dr. Priya Nair",     "email": "priya.nair@clinic.com",     "role": "doctor"},
        {"username": "Dr. Arjun Mehta",    "email": "arjun.mehta@clinic.com",    "role": "doctor"},
        {"username": "Anjali Verma",       "email": "anjali.verma@gmail.com",    "role": "patient"},
        {"username": "Rohit Patel",        "email": "rohit.patel@gmail.com",     "role": "patient"},
        {"username": "Sneha Iyer",         "email": "sneha.iyer@gmail.com",      "role": "patient"},
        {"username": "Vikram Singh",       "email": "vikram.singh@gmail.com",    "role": "patient"},
    ]
    for u in seed_users:
        if not db.query(User).filter(User.email == u["email"]).first():
            db.add(User(username=u["username"], email=u["email"], password=_hash(PASSWORD), role=u["role"]))
            created["users"] += 1
    db.commit()

    seed_doctors = [
        {"name": "Dr. Rajesh Sharma", "specialization": "Cardiologist",  "phone": "9876543210", "email": "rajesh.sharma@clinic.com", "available_days": "Mon,Tue,Wed,Thu,Fri"},
        {"name": "Dr. Priya Nair",    "specialization": "Dermatologist",  "phone": "9823456781", "email": "priya.nair@clinic.com",    "available_days": "Mon,Wed,Fri"},
        {"name": "Dr. Arjun Mehta",   "specialization": "Orthopedic",     "phone": "9712345678", "email": "arjun.mehta@clinic.com",   "available_days": "Tue,Thu,Sat"},
    ]
    for d in seed_doctors:
        if not db.query(Doctor).filter(Doctor.email == d["email"]).first():
            db.add(Doctor(**d))
            created["doctors"] += 1
    db.commit()

    seed_patients = [
        {"name": "Anjali Verma", "age": 28, "gender": "Female", "phone": "9988776655", "email": "anjali.verma@gmail.com",  "address": "12, MG Road, Pune, Maharashtra"},
        {"name": "Rohit Patel",  "age": 35, "gender": "Male",   "phone": "9977665544", "email": "rohit.patel@gmail.com",   "address": "45, Nehru Nagar, Ahmedabad, Gujarat"},
        {"name": "Sneha Iyer",   "age": 22, "gender": "Female", "phone": "9966554433", "email": "sneha.iyer@gmail.com",    "address": "78, Anna Salai, Chennai, Tamil Nadu"},
        {"name": "Vikram Singh", "age": 45, "gender": "Male",   "phone": "9955443322", "email": "vikram.singh@gmail.com",  "address": "33, Rajpur Road, Dehradun, Uttarakhand"},
    ]
    for p in seed_patients:
        if not db.query(Patient).filter(Patient.email == p["email"]).first():
            db.add(Patient(**p))
            created["patients"] += 1
    db.commit()

    if db.query(Appointment).count() == 0:
        doc1 = db.query(Doctor).filter(Doctor.email == "rajesh.sharma@clinic.com").first()
        doc2 = db.query(Doctor).filter(Doctor.email == "priya.nair@clinic.com").first()
        doc3 = db.query(Doctor).filter(Doctor.email == "arjun.mehta@clinic.com").first()
        p1   = db.query(Patient).filter(Patient.email == "anjali.verma@gmail.com").first()
        p2   = db.query(Patient).filter(Patient.email == "rohit.patel@gmail.com").first()
        p3   = db.query(Patient).filter(Patient.email == "sneha.iyer@gmail.com").first()
        p4   = db.query(Patient).filter(Patient.email == "vikram.singh@gmail.com").first()
        from datetime import date as _d
        appts = [
            Appointment(patient_id=p1.id, doctor_id=doc1.id, appointment_date=_d(2025, 7, 10), status="scheduled", notes="Routine cardiac checkup"),
            Appointment(patient_id=p2.id, doctor_id=doc1.id, appointment_date=_d(2025, 7, 12), status="pending",   notes="Chest pain follow-up"),
            Appointment(patient_id=p3.id, doctor_id=doc2.id, appointment_date=_d(2025, 7, 11), status="completed", notes="Acne treatment"),
            Appointment(patient_id=p4.id, doctor_id=doc3.id, appointment_date=_d(2025, 7, 14), status="scheduled", notes="Knee pain evaluation"),
            Appointment(patient_id=p1.id, doctor_id=doc2.id, appointment_date=_d(2025, 7, 15), status="cancelled", notes="Rash consultation"),
            Appointment(patient_id=p2.id, doctor_id=doc3.id, appointment_date=_d(2025, 7, 16), status="pending",   notes="Lower back pain"),
        ]
        for a in appts:
            db.add(a)
        db.commit()
        created["appointments"] = 6

    return {"message": "Seeded successfully", "created": created}


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
