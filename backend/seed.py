"""
Run this script to seed the database with Indian dummy data.
Usage: python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import bcrypt
from datetime import date
from main import Base, User, Doctor, Patient, Appointment, engine, SessionLocal

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

PASSWORD = "1234567p"

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # ── Users ──────────────────────────────────────────────
        users = [
            User(username="admin",            email="admin@clinic.com",          password=hash_password(PASSWORD), role="admin"),
            User(username="Dr. Rajesh Sharma",email="rajesh.sharma@clinic.com",  password=hash_password(PASSWORD), role="doctor"),
            User(username="Dr. Priya Nair",   email="priya.nair@clinic.com",     password=hash_password(PASSWORD), role="doctor"),
            User(username="Dr. Arjun Mehta",  email="arjun.mehta@clinic.com",    password=hash_password(PASSWORD), role="doctor"),
            User(username="Anjali Verma",     email="anjali.verma@gmail.com",    password=hash_password(PASSWORD), role="patient"),
            User(username="Rohit Patel",      email="rohit.patel@gmail.com",     password=hash_password(PASSWORD), role="patient"),
            User(username="Sneha Iyer",       email="sneha.iyer@gmail.com",      password=hash_password(PASSWORD), role="patient"),
            User(username="Vikram Singh",     email="vikram.singh@gmail.com",    password=hash_password(PASSWORD), role="patient"),
        ]
        for u in users:
            if not db.query(User).filter(User.email == u.email).first():
                db.add(u)
        db.commit()

        # ── Doctors ────────────────────────────────────────────
        doctors = [
            Doctor(name="Dr. Rajesh Sharma", specialization="Cardiologist",   phone="9876543210", email="rajesh.sharma@clinic.com", available_days="Mon,Tue,Wed,Thu,Fri"),
            Doctor(name="Dr. Priya Nair",    specialization="Dermatologist",   phone="9823456781", email="priya.nair@clinic.com",    available_days="Mon,Wed,Fri"),
            Doctor(name="Dr. Arjun Mehta",   specialization="Orthopedic",      phone="9712345678", email="arjun.mehta@clinic.com",   available_days="Tue,Thu,Sat"),
        ]
        for d in doctors:
            if not db.query(Doctor).filter(Doctor.email == d.email).first():
                db.add(d)
        db.commit()

        # ── Patients ───────────────────────────────────────────
        patients = [
            Patient(name="Anjali Verma",  age=28, gender="Female", phone="9988776655", email="anjali.verma@gmail.com",  address="12, MG Road, Pune, Maharashtra"),
            Patient(name="Rohit Patel",   age=35, gender="Male",   phone="9977665544", email="rohit.patel@gmail.com",   address="45, Nehru Nagar, Ahmedabad, Gujarat"),
            Patient(name="Sneha Iyer",    age=22, gender="Female", phone="9966554433", email="sneha.iyer@gmail.com",    address="78, Anna Salai, Chennai, Tamil Nadu"),
            Patient(name="Vikram Singh",  age=45, gender="Male",   phone="9955443322", email="vikram.singh@gmail.com",  address="33, Rajpur Road, Dehradun, Uttarakhand"),
        ]
        for p in patients:
            if not db.query(Patient).filter(Patient.email == p.email).first():
                db.add(p)
        db.commit()

        # ── Appointments ───────────────────────────────────────
        # Fetch IDs after commit
        doc1 = db.query(Doctor).filter(Doctor.email == "rajesh.sharma@clinic.com").first()
        doc2 = db.query(Doctor).filter(Doctor.email == "priya.nair@clinic.com").first()
        doc3 = db.query(Doctor).filter(Doctor.email == "arjun.mehta@clinic.com").first()
        p1   = db.query(Patient).filter(Patient.email == "anjali.verma@gmail.com").first()
        p2   = db.query(Patient).filter(Patient.email == "rohit.patel@gmail.com").first()
        p3   = db.query(Patient).filter(Patient.email == "sneha.iyer@gmail.com").first()
        p4   = db.query(Patient).filter(Patient.email == "vikram.singh@gmail.com").first()

        appointments = [
            Appointment(patient_id=p1.id, doctor_id=doc1.id, appointment_date=date(2025, 7, 10), status="scheduled",  notes="Routine cardiac checkup"),
            Appointment(patient_id=p2.id, doctor_id=doc1.id, appointment_date=date(2025, 7, 12), status="pending",    notes="Chest pain follow-up"),
            Appointment(patient_id=p3.id, doctor_id=doc2.id, appointment_date=date(2025, 7, 11), status="completed",  notes="Acne treatment"),
            Appointment(patient_id=p4.id, doctor_id=doc3.id, appointment_date=date(2025, 7, 14), status="scheduled",  notes="Knee pain evaluation"),
            Appointment(patient_id=p1.id, doctor_id=doc2.id, appointment_date=date(2025, 7, 15), status="cancelled",  notes="Rash consultation"),
            Appointment(patient_id=p2.id, doctor_id=doc3.id, appointment_date=date(2025, 7, 16), status="pending",    notes="Lower back pain"),
        ]
        if db.query(Appointment).count() == 0:
            for a in appointments:
                db.add(a)
            db.commit()

        print("✅ Database seeded successfully!")
        print("\n── Login Credentials (password: 1234567p) ──────────────")
        print("Admin   : admin@clinic.com")
        print("Doctor  : rajesh.sharma@clinic.com | priya.nair@clinic.com | arjun.mehta@clinic.com")
        print("Patient : anjali.verma@gmail.com   | rohit.patel@gmail.com | sneha.iyer@gmail.com | vikram.singh@gmail.com")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
