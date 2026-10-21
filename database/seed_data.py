import sys
import os
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.institution import Institution
from app.models.user import User
from app.models.student import Student
from app.models.staff import Staff
from app.models.guard import SecurityGuard, Supervisor
from app.models.visitor_pass import VisitorPass
from app.models.access_log import AccessLog
from app.models.notification import Notification


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Institution
        inst = db.query(Institution).filter(Institution.short_code == "TSRMMCHRC").first()
        if not inst:
            inst = Institution(
                name="Trichy SRM Medical College Hospital & Research Centre",
                short_code="TSRMMCHRC",
                campus_code="SRM-TRICHY-01",
                address="SRM Nagar, Irungalur, Tiruchirappalli, Tamil Nadu 621105",
            )
            db.add(inst)
            db.commit()
            db.refresh(inst)
            print("[Seed] Created Institution: TSRMMCHRC")

        # 2. Users (all 10 roles with password '12345')
        demo_users = [
            ("security", "G. Selvam", "security", "security@srmtrichy.edu.in", "9876543210"),
            ("warden", "Dr. K. Raman", "warden", "warden@srmtrichy.edu.in", "9876543211"),
            ("staff", "Prof. S. Venkatesh", "staff", "venkatesh.s@srmtrichy.edu.in", "9876543212"),
            ("supervisor", "M. Rajesh", "supervisor", "supervisor@srmtrichy.edu.in", "9876543213"),
            ("access", "P. Anitha", "access-supervisor", "access.admin@srmtrichy.edu.in", "9876543214"),
            ("access-supervisor", "P. Anitha", "access-supervisor", "access.sup@srmtrichy.edu.in", "9876543215"),
            ("students", "Dr. V. Meenakshi", "students", "studentaffairs@srmtrichy.edu.in", "9876543216"),
            ("welfare", "Dr. R. Karthik", "welfare", "welfare@srmtrichy.edu.in", "9876543217"),
            ("admin", "A. Balaji", "admin", "admin@srmtrichy.edu.in", "9876543218"),
            ("cso", "Col. R. Sundaram", "cso", "cso@srmtrichy.edu.in", "9876543219"),
            ("manager", "Dr. M. Senthil", "manager", "manager@srmtrichy.edu.in", "9876543220"),
        ]

        hashed_demo_pw = get_password_hash("12345")
        for username, full_name, role, email, phone in demo_users:
            existing = db.query(User).filter(User.username == username).first()
            if not existing:
                u = User(
                    username=username,
                    full_name=full_name,
                    role=role,
                    email=email,
                    phone=phone,
                    hashed_password=hashed_demo_pw,
                    institution_id=inst.id,
                )
                db.add(u)
                print(f"[Seed] Created User: {username} ({role})")
        db.commit()

        # 3. Supervisors & Security Guards
        sup = db.query(Supervisor).filter(Supervisor.supervisor_code == "SUP-01").first()
        if not sup:
            sup = Supervisor(
                supervisor_code="SUP-01",
                name="M. Rajesh",
                department="Campus Security & Safety",
                assigned_zone="Zone A - North Campus & Main Gates",
                phone="9876543213",
            )
            db.add(sup)
            db.commit()
            db.refresh(sup)
            print("[Seed] Created Supervisor: SUP-01")

        guards_data = [
            ("SG-101", "G. Selvam", "9876543210", "Gate 1 Main Entrance", "Morning Shift", "08:00 AM", "04:00 PM", "On Duty"),
            ("SG-102", "P. Murugan", "9876543221", "Gate 2 Hospital Entrance", "Morning Shift", "08:00 AM", "04:00 PM", "On Duty"),
            ("SG-103", "K. Suresh", "9876543222", "Hostel Gate North", "Evening Shift", "04:00 PM", "12:00 AM", "On Duty"),
            ("SG-104", "V. Anbarasu", "9876543223", "Library & Admin Gate", "General Shift", "09:00 AM", "05:00 PM", "On Duty"),
        ]
        for g_code, name, phone, gate, shift, start_t, end_t, status in guards_data:
            existing_g = db.query(SecurityGuard).filter(SecurityGuard.guard_code == g_code).first()
            if not existing_g:
                g = SecurityGuard(
                    guard_code=g_code,
                    name=name,
                    phone=phone,
                    current_gate=gate,
                    shift_name=shift,
                    shift_start=start_t,
                    shift_end=end_t,
                    status=status,
                    assigned_supervisor_id=sup.id,
                )
                db.add(g)
                print(f"[Seed] Created Guard: {g_code} - {name}")
        db.commit()

        # 4. Students
        students_data = [
            ("22MBBS041", "Kavitha R", "KR", "14-05-2004", "MBBS", "III Year", "2022 - 2027", "Hostel", "Kaveri Hostel", "304", None, None, None),
            ("23ECE0721", "Ananya Krishnan", "AK", "22-08-2005", "Electronics & Communication", "II Year", "2023 - 2027", "Day Scholar", None, None, "Route 12", "Central Bus Stand", None),
            ("22CSE1048", "Rahul Menon", "RM", "10-11-2003", "Computer Science & Engg", "III Year", "2022 - 2026", "Day Scholar", None, None, None, None, "TN-45-AZ-9988"),
            ("21BPT019", "Mohammed Farhan", "MF", "05-02-2003", "Physiotherapy", "IV Year", "2021 - 2025", "Hostel", "Ponni Hostel", "112", None, None, None),
            ("24NUR005", "Pooja Sundaram", "PS", "18-09-2006", "B.Sc Nursing", "I Year", "2024 - 2028", "Hostel", "Kaveri Hostel", "208", None, None, None),
        ]
        for reg_no, name, init, dob, dept, yr, batch, res_type, h_name, room, b_route, b_point, veh in students_data:
            existing_s = db.query(Student).filter(Student.register_number == reg_no).first()
            if not existing_s:
                # Deterministic synthetic embedding vector
                emb_vec = [float((hash(reg_no + str(i)) % 1000) / 1000.0) for i in range(128)]
                s = Student(
                    register_number=reg_no,
                    name=name,
                    initials=init,
                    date_of_birth=dob,
                    department=dept,
                    year_roman=yr,
                    batch=batch,
                    residence_type=res_type,
                    hostel_name=h_name,
                    room_number=room,
                    bus_route=b_route,
                    bus_boarding_point=b_point,
                    vehicle_number=veh,
                    institution_id=inst.id,
                    face_embedding=json.dumps(emb_vec),
                )
                db.add(s)
                print(f"[Seed] Created Student: {reg_no} - {name}")
        db.commit()

        # 5. Staff
        staff_data = [
            ("EMP-MED-104", "Dr. Malathi N", "Cardiology", "Associate Professor"),
            ("EMP-SUR-208", "Dr. Arun Kumar", "General Surgery", "Professor & HOD"),
            ("EMP-PHARM-301", "Prof. S. Venkatesh", "Pharmacology", "Associate Professor"),
        ]
        for emp_id, name, dept, desig in staff_data:
            existing_st = db.query(Staff).filter(Staff.employee_id == emp_id).first()
            if not existing_st:
                emb_vec = [float((hash(emp_id + str(i)) % 1000) / 1000.0) for i in range(128)]
                st = Staff(
                    employee_id=emp_id,
                    name=name,
                    department=dept,
                    designation=desig,
                    institution_id=inst.id,
                    face_embedding=json.dumps(emb_vec),
                )
                db.add(st)
                print(f"[Seed] Created Staff: {emp_id} - {name}")
        db.commit()

        # 6. Visitor Passes
        vp_data = [
            (
                "VP-2026-0001",
                "R. Natarajan",
                "9840123456",
                "Guest Lecture on Clinical Ethics",
                "Annual Medical Symposium 2026",
                "Medical Student Conference",
                "21-10-2026",
                "22-10-2026",
                ["Auditorium", "Dean Office", "Medical College Block"],
                "Dr. S. Venkatesh",
                "9876543212",
                "Active",
            ),
            (
                "VP-2026-0002",
                "Priya Mohan",
                "9443219876",
                "Hostel Ward Visit",
                None,
                None,
                "21-10-2026",
                "21-10-2026",
                ["Kaveri Hostel", "Visitor Lounge"],
                "Dr. K. Raman",
                "9876543211",
                "Active",
            ),
        ]
        for p_num, v_name, phone, purp, ev_name, ev_purp, s_date, e_date, blocks, c_name, c_phone, stat in vp_data:
            existing_vp = db.query(VisitorPass).filter(VisitorPass.pass_number == p_num).first()
            if not existing_vp:
                vp = VisitorPass(
                    pass_number=p_num,
                    visitor_name=v_name,
                    visitor_phone=phone,
                    purpose=purp,
                    event_name=ev_name,
                    event_purpose=ev_purp,
                    start_date=s_date,
                    end_date=e_date,
                    accessible_blocks=blocks,
                    coordinator_name=c_name,
                    coordinator_phone=c_phone,
                    status=stat,
                    created_by="P. Anitha (Access Supervisor)",
                )
                db.add(vp)
                print(f"[Seed] Created Visitor Pass: {p_num}")
        db.commit()

        # 7. Access Logs
        logs_data = [
            ("ENT-2026-0041", "Student", "Kavitha R", "22MBBS041", "MBBS", "Gate 1 Main Entrance", "G. Selvam", "ENTRY", "Face Recognition", "Authorized", "Verified", []),
            ("ENT-2026-0042", "Staff", "Dr. Malathi N", "EMP-MED-104", "Cardiology", "Gate 1 Main Entrance", "G. Selvam", "ENTRY", "Face Recognition", "Authorized", "Verified", []),
            ("ENT-2026-0043", "Visitor", "R. Natarajan", "VP-2026-0001", "Guest", "Gate 1 Main Entrance", "G. Selvam", "ENTRY", "Visitor Pass", "Authorized", "Verified", []),
            ("SEC-2026-0012", "Unauthorized", "Unknown Person", "UNREC-FACE", "N/A", "Gate 2 Hospital Entrance", "P. Murugan", "ENTRY", "Face Recognition", "Flagged", "Pending Verification", [
                {"type": "Unauthorised", "actor": "P. Murugan", "actorNumber": "SG-102", "timestamp": "21-10-2026 10:15", "reason": "Unrecognized face scan at hospital gate"}
            ]),
        ]
        for r_id, p_type, name, ident, dept, loc, g_name, ev, meth, stat, r_stat, acts in logs_data:
            existing_log = db.query(AccessLog).filter(AccessLog.record_identifier == r_id).first()
            if not existing_log:
                al = AccessLog(
                    record_identifier=r_id,
                    person_type=p_type,
                    name=name,
                    identifier_value=ident,
                    department=dept,
                    location_block=loc,
                    guard_name=g_name,
                    event_type=ev,
                    verification_method=meth,
                    verification_status=stat,
                    review_status=r_stat,
                    review_actions=acts,
                )
                db.add(al)
                print(f"[Seed] Created Access Log: {r_id}")
        db.commit()

        print("\n[SUCCESS] Database seeding successfully completed!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Database seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
