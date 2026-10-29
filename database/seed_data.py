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
from app.models.biometric import BiometricTemplate


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Load enrolled real embeddings if available
    enrolled_embeddings = {}
    embeddings_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "../public/faces/enrolled_embeddings.json"))
    if os.path.exists(embeddings_file):
        try:
            with open(embeddings_file, "r") as f:
                enrolled_embeddings = json.load(f)
        except Exception as e:
            print(f"[Seed] Warning: could not load enrolled embeddings: {e}")

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
            ("23MED0412", "Sur", "SU", "18-05-2005", "General Medicine & Surgery", "II Year", "2023 - 2028", "Hostel", "Bharathi Hostel", "B-204", None, None, None, "/faces/sur_crop.jpg"),
            ("23AHS0185", "Mon", "MO", "12-09-2005", "Medical Laboratory Technology", "II Year", "2023 - 2027", "Day Scholar", None, None, "Route M-14", "Trichy Central Junction", None, "/faces/mon_crop.jpg"),
            ("22ECE0531", "Mith", "MI", "04-07-2004", "Electronics & Communication", "III Year", "2022 - 2026", "Hostel", "Cauvery Hostel", "C-312", None, None, None, "/faces/mith_crop.jpg"),
            ("22CSE0789", "Thiru", "TH", "29-01-2004", "Computer Science & Engineering", "III Year", "2022 - 2026", "Day Scholar", None, None, None, None, "TN-09-BK-4421", "/faces/thiru_crop.jpg"),
            ("22MBBS041", "Kavitha R", "KR", "14-05-2004", "MBBS", "III Year", "2022 - 2027", "Hostel", "Kaveri Hostel", "304", None, None, None, None),
            ("23ECE0721", "Ananya Krishnan", "AK", "22-08-2005", "Electronics & Communication", "II Year", "2023 - 2027", "Day Scholar", None, None, "Route 12", "Central Bus Stand", None, None),
            ("22CSE1048", "Rahul Menon", "RM", "10-11-2003", "Computer Science & Engg", "III Year", "2022 - 2026", "Day Scholar", None, None, None, None, "TN-45-AZ-9988", None),
            ("21BPT019", "Mohammed Farhan", "MF", "05-02-2003", "Physiotherapy", "IV Year", "2021 - 2025", "Hostel", "Ponni Hostel", "112", None, None, None, None),
            ("24NUR005", "Pooja Sundaram", "PS", "18-09-2006", "B.Sc Nursing", "I Year", "2024 - 2028", "Hostel", "Kaveri Hostel", "208", None, None, None, None),
        ]
        for reg_no, name, init, dob, dept, yr, batch, res_type, h_name, room, b_route, b_point, veh, photo in students_data:
            existing_s = db.query(Student).filter(Student.register_number == reg_no).first()
            # Genuine embedding if enrolled, else deterministic fallback
            if name in enrolled_embeddings:
                emb_vec = enrolled_embeddings[name]
            elif reg_no in enrolled_embeddings:
                emb_vec = enrolled_embeddings[reg_no]
            else:
                emb_vec = [float((hash(reg_no + str(i)) % 1000) / 1000.0) for i in range(128)]

            if not existing_s:
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
                    photo_url=photo,
                    institution_id=inst.id,
                    face_embedding=json.dumps(emb_vec),
                    is_active=True,
                )
                db.add(s)
                print(f"[Seed] Created Student: {reg_no} - {name}")
            else:
                # Update existing student record with verified embedding & photo
                existing_s.face_embedding = json.dumps(emb_vec)
                existing_s.is_active = True
                if photo:
                    existing_s.photo_url = photo
                print(f"[Seed] Updated Student: {reg_no} - {name} with verified embedding")
        db.commit()

        # Seed biometric templates for enrolled faces
        enrolled_faces = [
            ("student", "23MED0412", "Sur", "/faces/sur_crop.jpg"),
            ("student", "23AHS0185", "Mon", "/faces/mon_crop.jpg"),
            ("student", "22ECE0531", "Mith", "/faces/mith_crop.jpg"),
            ("student", "22CSE0789", "Thiru", "/faces/thiru_crop.jpg"),
        ]
        for p_type, reg_no, p_name, photo in enrolled_faces:
            existing_bt = db.query(BiometricTemplate).filter(BiometricTemplate.person_identifier == reg_no).first()
            emb = enrolled_embeddings.get(p_name, enrolled_embeddings.get(reg_no, [float((hash(reg_no + str(i)) % 1000) / 1000.0) for i in range(128)]))
            if not existing_bt:
                bt = BiometricTemplate(
                    person_type=p_type,
                    person_identifier=reg_no,
                    embedding_data=json.dumps(emb),
                    model_version="sface-yunet-v1",
                    is_active=True,
                )
                db.add(bt)
                print(f"[Seed] Created BiometricTemplate: {reg_no}")
            else:
                existing_bt.embedding_data = json.dumps(emb)
                existing_bt.model_version = "sface-yunet-v1"
                existing_bt.is_active = True
                print(f"[Seed] Updated BiometricTemplate: {reg_no}")
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
                    is_active=True,
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
                "Gate 1 Main Entrance",
                "Prof. S. Venkatesh",
                "Pharmacology",
                "Approved",
                "2026-10-21 09:30 AM",
                "2026-10-21 05:00 PM",
                "Single Visitor Pass",
                1,
            ),
            (
                "VP-2026-0002",
                "S. Meenakshi Sundaram",
                "9443123456",
                "Parent Visit - Ward Kaverikannan (Hostel B-204)",
                "Hostel Gate North",
                "Dr. K. Raman",
                "Hostel Administration",
                "Pending",
                "2026-10-21 02:00 PM",
                "2026-10-21 06:30 PM",
                "Single Visitor Pass",
                1,
            ),
            (
                "VP-2026-0003",
                "K. Ganesan & Team",
                "9789123456",
                "Medical Gas Pipeline Maintenance Team",
                "Gate 2 Hospital Entrance",
                "Dr. Arun Kumar",
                "Biomedical Engineering",
                "Cancelled",
                "2026-10-21 11:00 AM",
                "2026-10-21 04:00 PM",
                "Contractor Pass",
                4,
            ),
        ]
        for pass_no, v_name, phone, purp, gate, host, dept, st, valid_from, valid_to, pass_type, count in vp_data:
            existing_vp = db.query(VisitorPass).filter(VisitorPass.pass_number == pass_no).first()
            if not existing_vp:
                vp = VisitorPass(
                    pass_number=pass_no,
                    visitor_name=v_name,
                    visitor_phone=phone,
                    purpose=purp,
                    entry_gate=gate,
                    host_person_name=host,
                    host_department=dept,
                    status=st,
                    valid_from=valid_from,
                    valid_to=valid_to,
                    pass_type=pass_type,
                    visitor_count=count,
                    cancellation_reason="Work rescheduled by contractor team" if st == "Cancelled" else None,
                    institution_id=inst.id,
                )
                db.add(vp)
                print(f"[Seed] Created VisitorPass: {pass_no}")
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
        print(f"[Seed] Error during seeding: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
