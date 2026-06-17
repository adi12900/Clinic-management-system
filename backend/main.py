# ==========================================
# 1. Imports
# ==========================================
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from sqlalchemy import create_engine, Column, Integer, String, Date, Text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta, datetime, timezone
import bcrypt
import jwt
import os


# ==========================================
# 2. JWT Configuration
# ==========================================
SECRET_KEY = "clinic_secret_key_2024"
ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 24


# ==========================================
# 3. Database Configuration (SQLite)
# ==========================================
DATABASE_URL = "sqlite:///./clinic.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


# ==========================================
# 4. SQLAlchemy Models
# ==========================================

# User
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="admin")  # admin, doctor, receptionist


# Doctor
class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    specialization = Column(String, nullable=False)
    phone = Column(String)
    email = Column(String)
    available_days = Column(String)  # e.g. "Mon,Tue,Wed"


# Patient
class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer)
    gender = Column(String)
    phone = Column(String)
    email = Column(String)
    address = Column(Text)


# Appointment
class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    appointment_date = Column(Date, nullable=False)
    status = Column(String, default="scheduled")  # scheduled, completed, cancelled
    notes = Column(Text)


# ==========================================
# 5. Create Database Tables
# ==========================================
Base.metadata.create_all(bind=engine)


# ==========================================
# 6. FastAPI Initialization
# ==========================================
app = FastAPI(title="Clinic Management System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Serve frontend static files
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


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
# 8. Authentication Helper Functions
# ==========================================

# Password Hashing
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


# Verify Password
def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# Create JWT Token
def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# Get Current User
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = db.query(User).filter(User.id == payload.get("user_id")).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ==========================================
# 9. Authentication APIs
# ==========================================

# Pydantic schemas for auth
class SignupRequest(BaseModel):
    username: str
    email: str
    password: str
    role: Optional[str] = "admin"


class LoginRequest(BaseModel):
    email: str
    password: str


# POST /signup
@app.post("/signup")
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


# POST /login
@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token({"user_id": user.id, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role}


# GET /logout
@app.get("/logout")
def logout():
    # JWT is stateless; logout is handled on the frontend by removing the token
    return {"message": "Logged out successfully"}


# ==========================================
# 10. Dashboard API
# ==========================================

# GET /dashboard
@app.get("/dashboard")
def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "total_doctors": db.query(Doctor).count(),
        "total_patients": db.query(Patient).count(),
        "total_appointments": db.query(Appointment).count(),
        "scheduled": db.query(Appointment).filter(Appointment.status == "scheduled").count(),
        "completed": db.query(Appointment).filter(Appointment.status == "completed").count(),
        "cancelled": db.query(Appointment).filter(Appointment.status == "cancelled").count(),
    }


# ==========================================
# 11. Doctor CRUD APIs
# ==========================================

# Pydantic schema for Doctor
class DoctorSchema(BaseModel):
    name: str
    specialization: str
    phone: Optional[str] = None
    email: Optional[str] = None
    available_days: Optional[str] = None


# GET /doctors
@app.get("/doctors")
def get_doctors(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doctors = db.query(Doctor).all()
    return doctors


# GET /doctors/{id}
@app.get("/doctors/{id}")
def get_doctor(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


# POST /doctors
@app.post("/doctors", status_code=status.HTTP_201_CREATED)
def create_doctor(data: DoctorSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doctor = Doctor(**data.model_dump())
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


# PUT /doctors/{id}
@app.put("/doctors/{id}")
def update_doctor(id: int, data: DoctorSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    for key, value in data.model_dump().items():
        setattr(doctor, key, value)
    db.commit()
    db.refresh(doctor)
    return doctor


# DELETE /doctors/{id}
@app.delete("/doctors/{id}")
def delete_doctor(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    db.delete(doctor)
    db.commit()
    return {"message": "Doctor deleted successfully"}


# ==========================================
# 12. Patient CRUD APIs
# ==========================================

# Pydantic schema for Patient
class PatientSchema(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


# GET /patients
@app.get("/patients")
def get_patients(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Patient).all()


# GET /patients/{id}
@app.get("/patients/{id}")
def get_patient(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


# POST /patients
@app.post("/patients", status_code=status.HTTP_201_CREATED)
def create_patient(data: PatientSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = Patient(**data.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


# PUT /patients/{id}
@app.put("/patients/{id}")
def update_patient(id: int, data: PatientSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    for key, value in data.model_dump().items():
        setattr(patient, key, value)
    db.commit()
    db.refresh(patient)
    return patient


# DELETE /patients/{id}
@app.delete("/patients/{id}")
def delete_patient(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(patient)
    db.commit()
    return {"message": "Patient deleted successfully"}


# ==========================================
# 13. Appointment CRUD APIs
# ==========================================

# Pydantic schema for Appointment
class AppointmentSchema(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: date
    status: Optional[str] = "scheduled"
    notes: Optional[str] = None


# GET /appointments
@app.get("/appointments")
def get_appointments(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Appointment).all()


# GET /appointments/{id}
@app.get("/appointments/{id}")
def get_appointment(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


# POST /appointments
@app.post("/appointments", status_code=status.HTTP_201_CREATED)
def create_appointment(data: AppointmentSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Validate doctor and patient exist
    if not db.query(Doctor).filter(Doctor.id == data.doctor_id).first():
        raise HTTPException(status_code=404, detail="Doctor not found")
    if not db.query(Patient).filter(Patient.id == data.patient_id).first():
        raise HTTPException(status_code=404, detail="Patient not found")
    appointment = Appointment(**data.model_dump())
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


# PUT /appointments/{id}
@app.put("/appointments/{id}")
def update_appointment(id: int, data: AppointmentSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    for key, value in data.model_dump().items():
        setattr(appointment, key, value)
    db.commit()
    db.refresh(appointment)
    return appointment


# DELETE /appointments/{id}
@app.delete("/appointments/{id}")
def delete_appointment(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appointment)
    db.commit()
    return {"message": "Appointment deleted successfully"}
