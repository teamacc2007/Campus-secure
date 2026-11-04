import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckSquare,
  ChevronRight,
  CircleUserRound,
  Clock3,
  DoorOpen,
  Download,
  Eye,
  FileClock,
  FileSpreadsheet,
  History,
  IdCard,
  ImagePlus,
  Lock,
  MapPin,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  TicketCheck,
  Upload,
  UploadCloud,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { StudentMatch, Screen, Role } from "./App";

export type AuditLogItem = {
  id: string;
  timestamp: string;
  dateTime: string;
  actor: string;
  actorRole: "Institute Manager" | "Admin" | "Campus Supervisor" | "CSO" | "System";
  actorId?: string;
  action: "Student Added" | "Student Details Updated" | "Bulk Students Imported" | "User Created" | "User Status Changed" | "Settings Modified" | "Access Permissions Updated";
  target: string;
  institution: string;
  block?: string;
  summary: string;
  changes?: { field: string; oldVal: string; newVal: string }[];
  details?: Record<string, any>;
};

export type LogFieldVisibility = {
  name: boolean;
  registerNumber: boolean;
  class: boolean;
  department: boolean;
  year: boolean;
  batch: boolean;
  institute: boolean;
  accommodationType: boolean;
  hostelName: boolean;
  roomNumber: boolean;
  transportationType: boolean;
  location: boolean;
  vehicleNumber: boolean;
  boardingPoint: boolean;
  routeNumber: boolean;
};

export const DEFAULT_LOG_FIELD_VISIBILITY: LogFieldVisibility = {
  name: true,
  registerNumber: true,
  class: true,
  department: true,
  year: true,
  batch: true,
  institute: true,
  accommodationType: true,
  hostelName: true,
  roomNumber: true,
  transportationType: true,
  location: true,
  vehicleNumber: true,
  boardingPoint: true,
  routeNumber: true,
};

export type ManagerEditPermissions = {
  name: boolean;
  department: boolean;
  year: boolean;
  batch: boolean;
  section: boolean;
  accommodationType: boolean;
  hostelName: boolean;
  roomNumber: boolean;
  transportationType: boolean;
  residentialLocation: boolean;
  vehicleNumber: boolean;
  boardingPoint: boolean;
  routeNumber: boolean;
};

export const DEFAULT_MANAGER_EDIT_PERMISSIONS: ManagerEditPermissions = {
  name: true,
  department: true,
  year: true,
  batch: true,
  section: true,
  accommodationType: true,
  hostelName: true,
  roomNumber: true,
  transportationType: true,
  residentialLocation: true,
  vehicleNumber: true,
  boardingPoint: true,
  routeNumber: true,
};

export const DEFAULT_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "AUD-INIT-001",
    timestamp: "2026-11-04 09:15:22",
    dateTime: "2026-11-04T09:15:22",
    actor: "Priya Raman",
    actorRole: "Institute Manager",
    actorId: "MGR-B-0001",
    action: "Student Added",
    target: "Karthik R (23IT1042)",
    institution: "SRM GROUP OF INSTITUTIONS TRICHY",
    block: "Institution B Campus",
    summary: "Manually registered student and trained face recognition model. Class: IT-II-C, Own Vehicle.",
    changes: [
      { field: "Name", oldVal: "(New Record)", newVal: "Karthik R" },
      { field: "Register Number", oldVal: "(New Record)", newVal: "23IT1042" },
      { field: "Class", oldVal: "(New Record)", newVal: "IT-II-C" },
      { field: "Department", oldVal: "(New Record)", newVal: "Information Technology" },
      { field: "Mode of Transport", oldVal: "(New Record)", newVal: "Own Vehicle" },
      { field: "Location", oldVal: "(New Record)", newVal: "Thillai Nagar, Trichy" },
    ],
  },
  {
    id: "AUD-INIT-002",
    timestamp: "2026-11-04 10:30:10",
    dateTime: "2026-11-04T10:30:10",
    actor: "Priya Raman",
    actorRole: "Institute Manager",
    actorId: "MGR-B-0001",
    action: "Student Details Updated",
    target: "Sur (23MED0412)",
    institution: "SRM GROUP OF INSTITUTIONS TRICHY",
    block: "Bharathi Hostel",
    summary: "Updated hostel room assignment from B-202 to B-204.",
    changes: [
      { field: "Room Number", oldVal: "B-202", newVal: "B-204" },
    ],
  },
  {
    id: "AUD-INIT-003",
    timestamp: "2026-11-03 14:20:00",
    dateTime: "2026-11-03T14:20:00",
    actor: "Avery Williams",
    actorRole: "Admin",
    actorId: "ADM-0001",
    action: "Bulk Students Imported",
    target: "12 Students",
    institution: "All campus institutions",
    block: "All Blocks",
    summary: "Imported 12 students via spreadsheet (CampusSecure_Batch_2026.xlsx) and trained face models.",
  },
  {
    id: "AUD-INIT-004",
    timestamp: "2026-11-02 16:45:18",
    dateTime: "2026-11-02T16:45:18",
    actor: "Avery Williams",
    actorRole: "Admin",
    actorId: "ADM-0001",
    action: "Access Permissions Updated",
    target: "Institute Manager Role",
    institution: "Institution B",
    block: "Main Gate",
    summary: "Configured editable fields for Institute Manager portal.",
  },
];

// Helper: dynamic class code formatter
export function computeClassCode(dept: string, yr: string, sec: string, reg?: string): string {
  let deptCode = "GEN";
  const d = (dept || "").trim();
  const r = (reg || "").toUpperCase();

  if (/information technology|\bit\b/i.test(d)) {
    deptCode = "IT";
  } else if (/computer science|\bcse\b/i.test(d)) {
    deptCode = "CSE";
  } else if (/electronics|\bece\b/i.test(d)) {
    deptCode = "ECE";
  } else if (/medicine|surgery|\bmbbs\b/i.test(d)) {
    deptCode = "MED";
  } else if (/laboratory|technology|\bmlt\b|\bahs\b/i.test(d)) {
    deptCode = "MLT";
  } else if (/mechanical|\bmech\b/i.test(d)) {
    deptCode = "MECH";
  } else if (/nursing/i.test(d)) {
    deptCode = "NUR";
  } else if (/physiotherapy|\bbpt\b/i.test(d)) {
    deptCode = "BPT";
  } else {
    const match = r.match(/^[0-9]{2}([A-Za-z]+)/);
    if (match && match[1]) {
      deptCode = match[1].toUpperCase();
    } else if (d.length >= 2) {
      deptCode = d.slice(0, 3).toUpperCase();
    }
  }

  let y = (yr || "II").replace(/year/gi, "").trim();
  if (y === "1" || y === "First") y = "I";
  else if (y === "2" || y === "Second") y = "II";
  else if (y === "3" || y === "Third") y = "III";
  else if (y === "4" || y === "Fourth") y = "IV";

  const s = (sec || "C").trim().toUpperCase();
  return `${deptCode}-${y}-${s}`;
}

// -------------------------------------------------------------
// 1. MANUAL ADD STUDENT COMPONENT (Institute Manager)
// -------------------------------------------------------------
export function ManualAddStudent({
  go,
  onAddStudent,
}: {
  go: (screen: Screen) => void;
  onAddStudent: (student: StudentMatch, auditLog: AuditLogItem) => void;
}) {
  const [name, setName] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [department, setDepartment] = useState("Information Technology");
  const [year, setYear] = useState("II");
  const [batch, setBatch] = useState("2023–2027");
  const [section, setSection] = useState("C");
  const [accommodationType, setAccommodationType] = useState<"Day Scholar" | "Hosteller">("Day Scholar");
  const [hostelName, setHostelName] = useState("Bharathi Hostel");
  const [roomNumber, setRoomNumber] = useState("B-204");
  const [transportationType, setTransportationType] = useState<"Own Vehicle" | "College Bus">("Own Vehicle");
  const [residentialLocation, setResidentialLocation] = useState("Thillai Nagar, Trichy");
  const [vehicleNumber, setVehicleNumber] = useState("TN-45-AZ-9988");
  const [boardingPoint, setBoardingPoint] = useState("Trichy Central Junction");
  const [routeNumber, setRouteNumber] = useState("Route M-14");

  // Photo state
  const [photoSource, setPhotoSource] = useState<"file" | "camera">("file");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Training & feedback
  const [training, setTraining] = useState(false);
  const [trainingStep, setTrainingStep] = useState(0);
  const [createdStudent, setCreatedStudent] = useState<StudentMatch | null>(null);

  const classCode = computeClassCode(department, year, section, registerNumber);

  // Initialize camera when camera tab is selected
  useEffect(() => {
    if (photoSource === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [photoSource]);

  const startCamera = async () => {
    setCameraError("");
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (e: any) {
      setCameraError("Camera access unavailable. You can upload a photo from files.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 480;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setPhotoUrl(dataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      setPhotoUrl(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !registerNumber.trim()) {
      alert("Please enter Name and Register Number.");
      return;
    }

    const finalPhoto = photoUrl || "/faces/student_details/22ECE1001_crop.jpg";
    setTraining(true);
    setTrainingStep(1);

    // Simulate training progress
    setTimeout(() => setTrainingStep(2), 600);
    setTimeout(() => setTrainingStep(3), 1200);

    setTimeout(() => {
      const initials = name
        .split(" ")
        .map(part => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "ST";

      const newStudent: StudentMatch = {
        initials,
        name: name.trim(),
        registerNumber: registerNumber.trim().toUpperCase(),
        department,
        year,
        batch,
        section,
        classCode,
        institute: "SRM GROUP OF INSTITUTIONS TRICHY",
        similarity: 98,
        accommodationType,
        hostelName: accommodationType === "Hosteller" ? hostelName : undefined,
        roomNumber: accommodationType === "Hosteller" ? roomNumber : undefined,
        transportationType: accommodationType === "Day Scholar" ? transportationType : undefined,
        transport: accommodationType === "Day Scholar" ? transportationType : undefined,
        residentialLocation: accommodationType === "Day Scholar" && transportationType === "Own Vehicle" ? residentialLocation : undefined,
        location: accommodationType === "Day Scholar" && transportationType === "Own Vehicle" ? residentialLocation : undefined,
        vehicleNumber: accommodationType === "Day Scholar" && transportationType === "Own Vehicle" ? vehicleNumber : undefined,
        boardingPoint: accommodationType === "Day Scholar" && transportationType === "College Bus" ? boardingPoint : undefined,
        routeNumber: accommodationType === "Day Scholar" && transportationType === "College Bus" ? routeNumber : undefined,
        photo: finalPhoto,
      };

      const now = new Date();
      const timeStr = now.toISOString().replace("T", " ").slice(0, 19);

      const auditLog: AuditLogItem = {
        id: `AUD-ADD-${Date.now()}`,
        timestamp: timeStr,
        dateTime: now.toISOString(),
        actor: "Priya Raman",
        actorRole: "Institute Manager",
        actorId: "MGR-B-0001",
        action: "Student Added",
        target: `${newStudent.name} (${newStudent.registerNumber})`,
        institution: "SRM GROUP OF INSTITUTIONS TRICHY",
        block: "Institution B Campus",
        summary: `Enrolled new student with photo and trained biometric model. Class: ${classCode}, Transport: ${accommodationType === "Day Scholar" ? transportationType : "Hostel"}.`,
        changes: [
          { field: "Full Name", oldVal: "(New Record)", newVal: newStudent.name },
          { field: "Register Number", oldVal: "(New Record)", newVal: newStudent.registerNumber },
          { field: "Class", oldVal: "(New Record)", newVal: classCode },
          { field: "Department", oldVal: "(New Record)", newVal: department },
          { field: "Year", oldVal: "(New Record)", newVal: year },
          { field: "Section", oldVal: "(New Record)", newVal: section },
          { field: "Accommodation", oldVal: "(New Record)", newVal: accommodationType },
          ...(accommodationType === "Day Scholar" && transportationType === "Own Vehicle"
            ? [
                { field: "Mode of Transport", oldVal: "(New Record)", newVal: "Own Vehicle" },
                { field: "Location", oldVal: "(New Record)", newVal: residentialLocation },
                { field: "Vehicle Number", oldVal: "(New Record)", newVal: vehicleNumber },
              ]
            : accommodationType === "Day Scholar"
            ? [
                { field: "Mode of Transport", oldVal: "(New Record)", newVal: "College Bus" },
                { field: "Boarding Point", oldVal: "(New Record)", newVal: boardingPoint },
                { field: "Route Number", oldVal: "(New Record)", newVal: routeNumber },
              ]
            : [
                { field: "Hostel Name", oldVal: "(New Record)", newVal: hostelName },
                { field: "Room Number", oldVal: "(New Record)", newVal: roomNumber },
              ]),
        ],
      };

      onAddStudent(newStudent, auditLog);
      setTraining(false);
      setCreatedStudent(newStudent);
    }, 1800);
  };

  if (createdStudent) {
    return (
      <>
        <div className="top-bar">
          <button className="top-bar-back" onClick={() => go("manager-students")}>
            <ChevronRight style={{ transform: "rotate(180deg)" }} size={20} />
          </button>
          <div>
            <h1>Student Enrolled</h1>
            <p>Biometric Model Trained</p>
          </div>
        </div>
        <div className="page-content">
          <div className="success-page" style={{ paddingTop: "20px" }}>
            <div className="success-symbol">
              <ShieldCheck size={38} />
            </div>
            <div className="status green">FACE MODEL TRAINED</div>
            <h1 style={{ marginTop: "12px" }}>{createdStudent.name}</h1>
            <p>{createdStudent.registerNumber} · Enrolled into Campus Secure</p>

            {createdStudent.photo && (
              <div style={{ margin: "16px 0", textAlign: "center" }}>
                <img
                  src={createdStudent.photo}
                  alt={createdStudent.name}
                  style={{ width: "110px", height: "110px", borderRadius: "14px", objectFit: "cover", border: "3px solid #22c55e" }}
                />
              </div>
            )}

            <section className="success-receipt" style={{ textAlign: "left" }}>
              <div><span>Class Code</span><strong>{createdStudent.classCode}</strong></div>
              <div><span>Department</span><strong>{createdStudent.department}</strong></div>
              <div><span>Institution</span><strong>{createdStudent.institute}</strong></div>
              <div><span>Accommodation</span><strong>{createdStudent.accommodationType}</strong></div>
              {createdStudent.transportationType === "Own Vehicle" && (
                <>
                  <div><span>Transport</span><strong>Own Vehicle</strong></div>
                  <div><span>Location</span><strong>{createdStudent.location}</strong></div>
                  {createdStudent.vehicleNumber && <div><span>Vehicle</span><strong>{createdStudent.vehicleNumber}</strong></div>}
                </>
              )}
              {createdStudent.transportationType === "College Bus" && (
                <>
                  <div><span>Transport</span><strong>College Bus</strong></div>
                  <div><span>Boarding</span><strong>{createdStudent.boardingPoint}</strong></div>
                  <div><span>Route</span><strong>{createdStudent.routeNumber}</strong></div>
                </>
              )}
              {createdStudent.accommodationType === "Hosteller" && (
                <>
                  <div><span>Hostel</span><strong>{createdStudent.hostelName}</strong></div>
                  <div><span>Room</span><strong>{createdStudent.roomNumber}</strong></div>
                </>
              )}
              <div><span>Biometric Status</span><strong>Trained & Active</strong></div>
            </section>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginTop: "16px" }}>
              <button
                className="btn primary"
                onClick={() => {
                  setCreatedStudent(null);
                  setName("");
                  setRegisterNumber("");
                  setPhotoUrl(null);
                }}
              >
                <Plus size={17} /> Add another student
              </button>
              <button className="btn secondary" onClick={() => go("manager-students")}>
                View all students
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="top-bar">
        <button className="top-bar-back" onClick={() => go("manager-students")}>
          <ChevronRight style={{ transform: "rotate(180deg)" }} size={20} />
        </button>
        <div>
          <h1>Add Student</h1>
          <p>SRM GROUP OF INSTITUTIONS TRICHY · Manual Entry</p>
        </div>
      </div>

      <form className="page-content form-page" onSubmit={handleSubmit}>
        <div className="form-stack guard-form">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
              Class Preview
            </span>
            <span className="class-badge-preview">
              <Sparkles size={14} /> {classCode}
            </span>
          </div>

          <label className="field">
            <span>Full Name <b>*</b></span>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Arun Kumar"
            />
          </label>

          <label className="field">
            <span>Register Number <b>*</b></span>
            <input
              required
              value={registerNumber}
              onChange={e => setRegisterNumber(e.target.value)}
              placeholder="e.g. 23IT1042"
              autoCapitalize="characters"
            />
          </label>

          <label className="field">
            <span>Department <b>*</b></span>
            <select value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="Information Technology">Information Technology (IT)</option>
              <option value="Computer Science & Engineering">Computer Science & Engineering (CSE)</option>
              <option value="Electronics & Communication">Electronics & Communication (ECE)</option>
              <option value="General Medicine & Surgery">General Medicine & Surgery (MED)</option>
              <option value="Medical Laboratory Technology">Medical Laboratory Technology (MLT)</option>
              <option value="Mechanical Engineering">Mechanical Engineering (MECH)</option>
            </select>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            <label className="field">
              <span>Year</span>
              <select value={year} onChange={e => setYear(e.target.value)}>
                <option value="I">I Year</option>
                <option value="II">II Year</option>
                <option value="III">III Year</option>
                <option value="IV">IV Year</option>
              </select>
            </label>

            <label className="field">
              <span>Section</span>
              <select value={section} onChange={e => setSection(e.target.value)}>
                <option value="A">Sec A</option>
                <option value="B">Sec B</option>
                <option value="C">Sec C</option>
                <option value="D">Sec D</option>
              </select>
            </label>

            <label className="field">
              <span>Batch</span>
              <input value={batch} onChange={e => setBatch(e.target.value)} placeholder="2023–2027" />
            </label>
          </div>

          <label className="field">
            <span>Institution</span>
            <input readOnly value="SRM GROUP OF INSTITUTIONS TRICHY" className="locked-input" />
          </label>

          <label className="field">
            <span>Accommodation Type</span>
            <select
              value={accommodationType}
              onChange={e => setAccommodationType(e.target.value as "Day Scholar" | "Hosteller")}
            >
              <option value="Day Scholar">Day Scholar</option>
              <option value="Hosteller">Hosteller</option>
            </select>
          </label>

          {accommodationType === "Hosteller" && (
            <>
              <label className="field">
                <span>Hostel Name</span>
                <select value={hostelName} onChange={e => setHostelName(e.target.value)}>
                  <option value="Bharathi Hostel">Bharathi Hostel</option>
                  <option value="Cauvery Hostel">Cauvery Hostel</option>
                  <option value="Ganga Hostel">Ganga Hostel</option>
                </select>
              </label>

              <label className="field">
                <span>Room Number</span>
                <input value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="e.g. B-204" />
              </label>
            </>
          )}

          {accommodationType === "Day Scholar" && (
            <>
              <label className="field">
                <span>Mode of Transport</span>
                <select
                  value={transportationType}
                  onChange={e => setTransportationType(e.target.value as "Own Vehicle" | "College Bus")}
                >
                  <option value="Own Vehicle">Own Vehicle</option>
                  <option value="College Bus">College Bus</option>
                </select>
              </label>

              {transportationType === "Own Vehicle" && (
                <>
                  <label className="field">
                    <span>Location (Residential Area) <b>*</b></span>
                    <input
                      required
                      value={residentialLocation}
                      onChange={e => setResidentialLocation(e.target.value)}
                      placeholder="e.g. Thillai Nagar, Trichy"
                    />
                  </label>

                  <label className="field">
                    <span>Vehicle Registration Number</span>
                    <input
                      value={vehicleNumber}
                      onChange={e => setVehicleNumber(e.target.value)}
                      placeholder="e.g. TN-45-AZ-9988"
                      autoCapitalize="characters"
                    />
                  </label>
                </>
              )}

              {transportationType === "College Bus" && (
                <>
                  <label className="field">
                    <span>Boarding Point</span>
                    <input
                      value={boardingPoint}
                      onChange={e => setBoardingPoint(e.target.value)}
                      placeholder="e.g. Trichy Central Junction"
                    />
                  </label>

                  <label className="field">
                    <span>Route Number</span>
                    <input
                      value={routeNumber}
                      onChange={e => setRouteNumber(e.target.value)}
                      placeholder="e.g. Route M-14"
                    />
                  </label>
                </>
              )}
            </>
          )}

          {/* Student Photo Upload & Live Camera Options */}
          <div style={{ marginTop: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "6px" }}>
              Student Photo (for Face Recognition Training) <b>*</b>
            </span>

            <div className="photo-source-tabs">
              <button
                type="button"
                className={`photo-tab-btn ${photoSource === "file" ? "active" : ""}`}
                onClick={() => setPhotoSource("file")}
              >
                <ImagePlus size={16} /> Upload File / Gallery
              </button>
              <button
                type="button"
                className={`photo-tab-btn ${photoSource === "camera" ? "active" : ""}`}
                onClick={() => setPhotoSource("camera")}
              >
                <Camera size={16} /> Take Photo Now
              </button>
            </div>

            {photoSource === "file" && (
              <div className="photo-preview-wrap">
                {photoUrl ? (
                  <>
                    <img src={photoUrl} alt="Preview" className="photo-preview-img" />
                    <button type="button" className="text-action" onClick={() => setPhotoUrl(null)}>
                      Remove / Choose another photo
                    </button>
                  </>
                ) : (
                  <>
                    <UploadCloud size={32} color="#64748b" />
                    <span style={{ fontSize: "12px", color: "#475569" }}>
                      Select face photo from device files
                    </span>
                    <label className="btn secondary" style={{ cursor: "pointer", marginTop: "4px" }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: "none" }}
                      />
                      Browse Image
                    </label>
                  </>
                )}
              </div>
            )}

            {photoSource === "camera" && (
              <div style={{ marginBottom: "14px" }}>
                {photoUrl ? (
                  <div className="photo-preview-wrap">
                    <img src={photoUrl} alt="Captured" className="photo-preview-img" />
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => {
                        setPhotoUrl(null);
                        startCamera();
                      }}
                    >
                      <RefreshCw size={14} /> Retake Photo
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="camera-snap-box">
                      {cameraError ? (
                        <p style={{ color: "#ef4444", padding: "12px", textAlign: "center", fontSize: "12px" }}>
                          {cameraError}
                        </p>
                      ) : (
                        <video ref={videoRef} autoPlay playsInline muted className="camera-snap-video" />
                      )}
                    </div>
                    {cameraActive && (
                      <button
                        type="button"
                        className="btn primary"
                        style={{ width: "100%" }}
                        onClick={capturePhotoFromCamera}
                      >
                        <Camera size={16} /> Snap Photo Now
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {training && (
          <div className="training-progress-card">
            <Sparkles size={24} color="#3b82f6" />
            <h3 style={{ margin: "6px 0 2px" }}>Training AI Biometric Model...</h3>
            <p style={{ fontSize: "12px", color: "#64748b" }}>
              {trainingStep === 1 && "Extracting 128-d face embedding vector..."}
              {trainingStep === 2 && "Enrolling profile in SFace & YuNet gallery..."}
              {trainingStep === 3 && "Model optimization & database sync complete!"}
            </p>
            <div className="training-bar-wrap">
              <div
                className="training-bar-fill"
                style={{ width: trainingStep === 1 ? "35%" : trainingStep === 2 ? "75%" : "100%" }}
              />
            </div>
          </div>
        )}

        <button type="submit" className="btn primary" disabled={training} style={{ marginTop: "12px" }}>
          <ShieldCheck size={18} /> {training ? "Training Model..." : "Enroll Student & Train Model"}
        </button>
      </form>
    </>
  );
}

// -------------------------------------------------------------
// 2. MANAGE INSTITUTION STUDENTS (Institute Manager)
// -------------------------------------------------------------
export function ManagerStudentDirectory({
  go,
  students,
  onUpdateStudent,
  permissions,
}: {
  go: (screen: Screen) => void;
  students: StudentMatch[];
  onUpdateStudent: (student: StudentMatch, auditLog: AuditLogItem) => void;
  permissions: ManagerEditPermissions;
}) {
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [editingStudent, setEditingStudent] = useState<StudentMatch | null>(null);

  // Form draft
  const [draft, setDraft] = useState<StudentMatch | null>(null);

  const institutionStudents = students.filter(s =>
    (s.institute || "").toLowerCase().includes("trichy") || (s.institute || "").toLowerCase().includes("institution b")
  );

  const filtered = institutionStudents.filter(s => {
    const text = `${s.name} ${s.registerNumber} ${s.department} ${s.classCode || ""}`.toLowerCase();
    const matchQuery = !query || text.includes(query.toLowerCase());
    const matchDept = deptFilter === "All" || s.department.toLowerCase().includes(deptFilter.toLowerCase());
    return matchQuery && matchDept;
  });

  const startEdit = (s: StudentMatch) => {
    setEditingStudent(s);
    setDraft({ ...s });
  };

  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !draft) return;

    // Compute diffs for audit log
    const changes: { field: string; oldVal: string; newVal: string }[] = [];
    const checkField = (field: string, oldV?: string, newV?: string) => {
      if ((oldV || "") !== (newV || "")) {
        changes.push({ field, oldVal: oldV || "(empty)", newVal: newV || "(empty)" });
      }
    };

    checkField("Full Name", editingStudent.name, draft.name);
    checkField("Department", editingStudent.department, draft.department);
    checkField("Year", editingStudent.year, draft.year);
    checkField("Batch", editingStudent.batch, draft.batch);
    checkField("Section", editingStudent.section, draft.section);
    checkField("Accommodation Type", editingStudent.accommodationType, draft.accommodationType);
    checkField("Hostel Name", editingStudent.hostelName, draft.hostelName);
    checkField("Room Number", editingStudent.roomNumber, draft.roomNumber);
    checkField("Mode of Transport", editingStudent.transportationType, draft.transportationType);
    checkField("Location", editingStudent.residentialLocation || editingStudent.location, draft.residentialLocation || draft.location);
    checkField("Vehicle Number", editingStudent.vehicleNumber, draft.vehicleNumber);
    checkField("Boarding Point", editingStudent.boardingPoint, draft.boardingPoint);
    checkField("Route Number", editingStudent.routeNumber, draft.routeNumber);

    // Recompute class code
    const updatedClass = computeClassCode(draft.department, draft.year, draft.section || "C", draft.registerNumber);
    const updatedStudent: StudentMatch = {
      ...draft,
      classCode: updatedClass,
      location: draft.residentialLocation || draft.location,
    };

    const now = new Date();
    const timeStr = now.toISOString().replace("T", " ").slice(0, 19);

    const auditLog: AuditLogItem = {
      id: `AUD-EDIT-${Date.now()}`,
      timestamp: timeStr,
      dateTime: now.toISOString(),
      actor: "Priya Raman",
      actorRole: "Institute Manager",
      actorId: "MGR-B-0001",
      action: "Student Details Updated",
      target: `${updatedStudent.name} (${updatedStudent.registerNumber})`,
      institution: "SRM GROUP OF INSTITUTIONS TRICHY",
      block: "Institution B Campus",
      summary: changes.length > 0
        ? `Modified fields: ${changes.map(c => c.field).join(", ")}`
        : "Re-verified student record details without changes.",
      changes,
    };

    onUpdateStudent(updatedStudent, auditLog);
    setEditingStudent(null);
    setDraft(null);
  };

  return (
    <>
      <div className="top-bar">
        <button className="top-bar-back" onClick={() => go("home")}>
          <ChevronRight style={{ transform: "rotate(180deg)" }} size={20} />
        </button>
        <div>
          <h1>Institution Students</h1>
          <p>SRM GROUP OF INSTITUTIONS TRICHY</p>
        </div>
        <button className="icon-btn primary" onClick={() => go("add-student")} title="Add Student">
          <Plus size={18} />
        </button>
      </div>

      <div className="page-content">
        <div className="search-input">
          <Search size={17} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search student, register number, class..."
          />
          {query && <button onClick={() => setQuery("")}>Clear</button>}
        </div>

        <div style={{ display: "flex", gap: "8px", margin: "10px 0" }}>
          {["All", "IT", "Medicine", "Lab Tech"].map(d => (
            <button
              key={d}
              className={`filter-chip ${deptFilter === d ? "active" : ""}`}
              onClick={() => setDeptFilter(d)}
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                border: "1px solid var(--line)",
                background: deptFilter === d ? "var(--blue)" : "#fff",
                color: deptFilter === d ? "#fff" : "#475569",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {d}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 0" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
            {filtered.length} students enrolled
          </span>
          <button className="text-action" onClick={() => go("add-student")}>
            <Plus size={14} /> Add new student
          </button>
        </div>

        <div className="directory-list">
          {filtered.map(student => {
            const classDisplay = student.classCode || computeClassCode(student.department, student.year, student.section || "C", student.registerNumber);
            const isOwnVeh = student.transportationType === "Own Vehicle" || Boolean(student.vehicleNumber);
            return (
              <section key={student.registerNumber} style={{ padding: "12px 14px", marginBottom: "10px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  {student.photo ? (
                    <img
                      src={student.photo}
                      alt={student.name}
                      style={{ width: "48px", height: "48px", borderRadius: "10px", objectFit: "cover" }}
                    />
                  ) : (
                    <div className="person-avatar">{student.initials}</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "14px" }}>{student.name}</strong>
                      <span className="class-badge-preview" style={{ fontSize: "11px", padding: "2px 6px" }}>
                        {classDisplay}
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block" }}>
                      {student.registerNumber} · {student.department}
                    </span>
                    <small style={{ color: "#475569" }}>
                      {student.accommodationType === "Hosteller"
                        ? `Hostel: ${student.hostelName || "Bharathi Hostel"} (${student.roomNumber || "B-204"})`
                        : isOwnVeh
                        ? `Own Vehicle · Location: ${student.residentialLocation || student.location || "Thillai Nagar, Trichy"}`
                        : `College Bus · ${student.boardingPoint || "Trichy Junction"}`}
                    </small>
                  </div>
                  <button
                    className="btn secondary"
                    style={{ padding: "6px 10px", fontSize: "12px" }}
                    onClick={() => startEdit(student)}
                  >
                    Edit
                  </button>
                </div>
              </section>
            );
          })}
        </div>

        {/* EDIT STUDENT MODAL WITH ADMIN PERMISSION ENFORCEMENT */}
        {editingStudent && draft && (
          <div className="audit-modal-overlay" onClick={() => setEditingStudent(null)}>
            <div className="audit-modal-content" onClick={e => e.stopPropagation()}>
              <div className="audit-modal-head">
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>EDIT STUDENT</span>
                  <h2 style={{ fontSize: "16px", margin: "2px 0 0" }}>{draft.name} ({draft.registerNumber})</h2>
                </div>
                <button onClick={() => setEditingStudent(null)} className="icon-btn">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="form-stack guard-form">
                <label className="field">
                  <span>
                    Full Name
                    {!permissions.name && <span className="lock-tag"><Lock size={12} /> Locked by Admin</span>}
                  </span>
                  <input
                    disabled={!permissions.name}
                    className={!permissions.name ? "locked-input" : ""}
                    value={draft.name}
                    onChange={e => setDraft({ ...draft, name: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Register Number (Permanent)</span>
                  <input readOnly value={draft.registerNumber} className="locked-input" />
                </label>

                <label className="field">
                  <span>
                    Department
                    {!permissions.department && <span className="lock-tag"><Lock size={12} /> Locked by Admin</span>}
                  </span>
                  <input
                    disabled={!permissions.department}
                    className={!permissions.department ? "locked-input" : ""}
                    value={draft.department}
                    onChange={e => setDraft({ ...draft, department: e.target.value })}
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <label className="field">
                    <span>
                      Year
                      {!permissions.year && <span className="lock-tag"><Lock size={12} /> Locked</span>}
                    </span>
                    <select
                      disabled={!permissions.year}
                      className={!permissions.year ? "locked-input" : ""}
                      value={draft.year}
                      onChange={e => setDraft({ ...draft, year: e.target.value })}
                    >
                      <option value="I">I Year</option>
                      <option value="II">II Year</option>
                      <option value="III">III Year</option>
                      <option value="IV">IV Year</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>
                      Section
                      {!permissions.section && <span className="lock-tag"><Lock size={12} /> Locked</span>}
                    </span>
                    <input
                      disabled={!permissions.section}
                      className={!permissions.section ? "locked-input" : ""}
                      value={draft.section || "C"}
                      onChange={e => setDraft({ ...draft, section: e.target.value })}
                    />
                  </label>
                </div>

                <label className="field">
                  <span>
                    Accommodation Type
                    {!permissions.accommodationType && <span className="lock-tag"><Lock size={12} /> Locked by Admin</span>}
                  </span>
                  <select
                    disabled={!permissions.accommodationType}
                    className={!permissions.accommodationType ? "locked-input" : ""}
                    value={draft.accommodationType}
                    onChange={e => setDraft({ ...draft, accommodationType: e.target.value as "Day Scholar" | "Hosteller" })}
                  >
                    <option value="Day Scholar">Day Scholar</option>
                    <option value="Hosteller">Hosteller</option>
                  </select>
                </label>

                {draft.accommodationType === "Hosteller" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <label className="field">
                      <span>
                        Hostel Name
                        {!permissions.hostelName && <span className="lock-tag"><Lock size={12} /> Locked</span>}
                      </span>
                      <input
                        disabled={!permissions.hostelName}
                        className={!permissions.hostelName ? "locked-input" : ""}
                        value={draft.hostelName || ""}
                        onChange={e => setDraft({ ...draft, hostelName: e.target.value })}
                      />
                    </label>

                    <label className="field">
                      <span>
                        Room Number
                        {!permissions.roomNumber && <span className="lock-tag"><Lock size={12} /> Locked</span>}
                      </span>
                      <input
                        disabled={!permissions.roomNumber}
                        className={!permissions.roomNumber ? "locked-input" : ""}
                        value={draft.roomNumber || ""}
                        onChange={e => setDraft({ ...draft, roomNumber: e.target.value })}
                      />
                    </label>
                  </div>
                )}

                {draft.accommodationType === "Day Scholar" && (
                  <>
                    <label className="field">
                      <span>
                        Mode of Transport
                        {!permissions.transportationType && <span className="lock-tag"><Lock size={12} /> Locked by Admin</span>}
                      </span>
                      <select
                        disabled={!permissions.transportationType}
                        className={!permissions.transportationType ? "locked-input" : ""}
                        value={draft.transportationType || "Own Vehicle"}
                        onChange={e => setDraft({ ...draft, transportationType: e.target.value as "Own Vehicle" | "College Bus" })}
                      >
                        <option value="Own Vehicle">Own Vehicle</option>
                        <option value="College Bus">College Bus</option>
                      </select>
                    </label>

                    <label className="field">
                      <span>
                        Location (Residential Area)
                        {!permissions.residentialLocation && <span className="lock-tag"><Lock size={12} /> Locked by Admin</span>}
                      </span>
                      <input
                        disabled={!permissions.residentialLocation}
                        className={!permissions.residentialLocation ? "locked-input" : ""}
                        value={draft.residentialLocation || draft.location || ""}
                        onChange={e => setDraft({ ...draft, residentialLocation: e.target.value, location: e.target.value })}
                      />
                    </label>

                    <label className="field">
                      <span>
                        Vehicle Registration Number
                        {!permissions.vehicleNumber && <span className="lock-tag"><Lock size={12} /> Locked</span>}
                      </span>
                      <input
                        disabled={!permissions.vehicleNumber}
                        className={!permissions.vehicleNumber ? "locked-input" : ""}
                        value={draft.vehicleNumber || ""}
                        onChange={e => setDraft({ ...draft, vehicleNumber: e.target.value })}
                      />
                    </label>
                  </>
                )}

                <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                  <button type="button" className="btn secondary" onClick={() => setEditingStudent(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn primary">
                    Save Student Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// -------------------------------------------------------------
// 3. ADMIN BULK STUDENT IMPORT (Spreadsheet & Face Training)
// -------------------------------------------------------------
export function AdminBulkStudentImport({
  go,
  onBulkImport,
}: {
  go: (screen: Screen) => void;
  onBulkImport: (students: StudentMatch[], auditLog: AuditLogItem) => void;
}) {
  const [parsedRows, setParsedRows] = useState<StudentMatch[]>([]);
  const [fileName, setFileName] = useState("");
  const [training, setTraining] = useState(false);
  const [trainProgress, setTrainProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Template download function
  const downloadTemplate = () => {
    const headers = [
      "Full Name",
      "Register Number",
      "Department",
      "Year",
      "Batch",
      "Section",
      "Institution",
      "Accommodation Type",
      "Hostel Name",
      "Room Number",
      "Mode of Transport",
      "Residential Location",
      "Vehicle Number",
      "Boarding Point",
      "Route Number",
      "Photo URL",
    ];

    const sampleData = [
      [
        "Arun Kumar",
        "23IT1080",
        "Information Technology",
        "II",
        "2023–2027",
        "C",
        "SRM GROUP OF INSTITUTIONS TRICHY",
        "Day Scholar",
        "",
        "",
        "Own Vehicle",
        "Thillai Nagar, Trichy",
        "TN-45-AZ-1122",
        "",
        "",
        "/faces/student_details/22ECE1001_crop.jpg",
      ],
      [
        "Sneha R",
        "23MED0450",
        "General Medicine & Surgery",
        "II",
        "2023–2028",
        "A",
        "SRM GROUP OF INSTITUTIONS TRICHY",
        "Hosteller",
        "Bharathi Hostel",
        "B-310",
        "",
        "",
        "",
        "",
        "",
        "/faces/student_details/22ECE1002_crop.jpg",
      ],
      [
        "Kiran Varma",
        "22CSE0910",
        "Computer Science & Engineering",
        "III",
        "2022–2026",
        "B",
        "Easwari Engineering College",
        "Day Scholar",
        "",
        "",
        "College Bus",
        "",
        "",
        "Ramapuram Junction",
        "Route E-01",
        "/faces/student_details/22ECE1003_crop.jpg",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "CampusSecure_Student_Bulk_Template.xlsx");
  };

  // Load demo spreadsheet data
  const loadDemoSpreadsheet = () => {
    setFileName("CampusSecure_Batch_2026_Enrolled.xlsx");
    const demoStudents: StudentMatch[] = [
      {
        initials: "DK",
        name: "Deepak Kumar",
        registerNumber: "23IT0410",
        department: "Information Technology",
        year: "II",
        batch: "2023–2027",
        section: "C",
        classCode: "IT-II-C",
        institute: "SRM GROUP OF INSTITUTIONS TRICHY",
        similarity: 98,
        accommodationType: "Day Scholar",
        transportationType: "Own Vehicle",
        location: "Thillai Nagar, Trichy",
        residentialLocation: "Thillai Nagar, Trichy",
        vehicleNumber: "TN-45-DE-1234",
        photo: "/faces/student_details/22ECE1004_crop.jpg",
      },
      {
        initials: "SM",
        name: "Sangeetha M",
        registerNumber: "23MED0512",
        department: "General Medicine & Surgery",
        year: "II",
        batch: "2023–2028",
        section: "A",
        classCode: "MED-II-A",
        institute: "SRM GROUP OF INSTITUTIONS TRICHY",
        similarity: 97,
        accommodationType: "Hosteller",
        hostelName: "Bharathi Hostel",
        roomNumber: "B-305",
        photo: "/faces/student_details/22ECE1005_crop.jpg",
      },
      {
        initials: "VS",
        name: "Vikram Seth",
        registerNumber: "22CSE0820",
        department: "Computer Science & Engineering",
        year: "III",
        batch: "2022–2026",
        section: "B",
        classCode: "CSE-III-B",
        institute: "SRM GROUP OF INSTITUTIONS TRICHY",
        similarity: 96,
        accommodationType: "Day Scholar",
        transportationType: "College Bus",
        boardingPoint: "Trichy Central Junction",
        routeNumber: "Route M-14",
        photo: "/faces/student_details/22ECE1006_crop.jpg",
      },
    ];
    setParsedRows(demoStudents);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rawJson.length <= 1) {
          alert("The uploaded spreadsheet is empty or has only header row.");
          return;
        }

        const rows = rawJson.slice(1);
        const mapped: StudentMatch[] = rows
          .filter(r => r[0] && r[1])
          .map((r, idx) => {
            const name = String(r[0] || "").trim();
            const registerNumber = String(r[1] || "").trim().toUpperCase();
            const department = String(r[2] || "Information Technology").trim();
            const year = String(r[3] || "II").trim();
            const batch = String(r[4] || "2023–2027").trim();
            const section = String(r[5] || "C").trim();
            const institute = String(r[6] || "SRM GROUP OF INSTITUTIONS TRICHY").trim();
            const accommodationType = String(r[7] || "").toLowerCase().includes("hostel") ? "Hosteller" : "Day Scholar";
            const hostelName = r[8] ? String(r[8]).trim() : undefined;
            const roomNumber = r[9] ? String(r[9]).trim() : undefined;
            const transportationType = String(r[10] || "").toLowerCase().includes("bus") ? "College Bus" : "Own Vehicle";
            const residentialLocation = r[11] ? String(r[11]).trim() : "Thillai Nagar, Trichy";
            const vehicleNumber = r[12] ? String(r[12]).trim() : undefined;
            const boardingPoint = r[13] ? String(r[13]).trim() : undefined;
            const routeNumber = r[14] ? String(r[14]).trim() : undefined;
            const photo = r[15] ? String(r[15]).trim() : `/faces/student_details/22ECE100${(idx % 6) + 1}_crop.jpg`;

            const initials = name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "ST";
            const classCode = computeClassCode(department, year, section, registerNumber);

            return {
              initials,
              name,
              registerNumber,
              department,
              year,
              batch,
              section,
              classCode,
              institute,
              similarity: 97,
              accommodationType,
              hostelName: accommodationType === "Hosteller" ? hostelName || "Bharathi Hostel" : undefined,
              roomNumber: accommodationType === "Hosteller" ? roomNumber || "B-101" : undefined,
              transportationType: accommodationType === "Day Scholar" ? transportationType : undefined,
              residentialLocation: accommodationType === "Day Scholar" && transportationType === "Own Vehicle" ? residentialLocation : undefined,
              location: accommodationType === "Day Scholar" && transportationType === "Own Vehicle" ? residentialLocation : undefined,
              vehicleNumber,
              boardingPoint,
              routeNumber,
              photo,
            };
          });

        setParsedRows(mapped);
      } catch (err) {
        console.error("Error reading spreadsheet", err);
        alert("Failed to parse Excel file. Please use standard format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleStartImport = () => {
    if (parsedRows.length === 0) return;
    setTraining(true);
    setTrainProgress(15);

    const interval = setInterval(() => {
      setTrainProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 95;
        }
        return prev + 25;
      });
    }, 400);

    setTimeout(() => {
      clearInterval(interval);
      setTrainProgress(100);

      const now = new Date();
      const timeStr = now.toISOString().replace("T", " ").slice(0, 19);

      const auditLog: AuditLogItem = {
        id: `AUD-BULK-${Date.now()}`,
        timestamp: timeStr,
        dateTime: now.toISOString(),
        actor: "Avery Williams",
        actorRole: "Admin",
        actorId: "ADM-0001",
        action: "Bulk Students Imported",
        target: `${parsedRows.length} Students`,
        institution: "All Campus Institutions",
        block: "All Blocks",
        summary: `Imported ${parsedRows.length} students from spreadsheet '${fileName}' and enrolled biometric face recognition templates.`,
        changes: parsedRows.map(s => ({
          field: s.registerNumber,
          oldVal: "(New Enrollee)",
          newVal: `${s.name} · ${s.classCode || s.department}`,
        })),
      };

      onBulkImport(parsedRows, auditLog);
      setTraining(false);
      setImportDone(true);
    }, 2000);
  };

  if (importDone) {
    return (
      <>
        <div className="top-bar">
          <button className="top-bar-back" onClick={() => go("home")}>
            <ChevronRight style={{ transform: "rotate(180deg)" }} size={20} />
          </button>
          <div>
            <h1>Import Complete</h1>
            <p>Admin Portal · Bulk Creation</p>
          </div>
        </div>
        <div className="page-content">
          <div className="success-page" style={{ paddingTop: "20px" }}>
            <div className="success-symbol">
              <UserCheck size={38} />
            </div>
            <div className="status green">DATABASE UPDATED & MODEL TRAINED</div>
            <h1 style={{ marginTop: "12px" }}>{parsedRows.length} Students Created</h1>
            <p>All student records and biometric face embeddings are now active.</p>

            <section className="success-receipt" style={{ textAlign: "left" }}>
              <div><span>Spreadsheet</span><strong>{fileName}</strong></div>
              <div><span>Total Enrolled</span><strong>{parsedRows.length} students</strong></div>
              <div><span>AI Face Model</span><strong>YuNet / SFace Enrolled</strong></div>
              <div><span>Audit Log</span><strong>Recorded</strong></div>
            </section>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginTop: "16px" }}>
              <button className="btn primary" onClick={() => go("campus-entries")}>
                View Campus Records
              </button>
              <button
                className="btn secondary"
                onClick={() => {
                  setImportDone(false);
                  setParsedRows([]);
                  setFileName("");
                }}
              >
                Import another sheet
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="top-bar">
        <button className="top-bar-back" onClick={() => go("home")}>
          <ChevronRight style={{ transform: "rotate(180deg)" }} size={20} />
        </button>
        <div>
          <h1>Bulk Student Creation</h1>
          <p>Spreadsheet Upload & Face Model Training</p>
        </div>
      </div>

      <div className="page-content">
        <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
          <button className="btn secondary" style={{ flex: 1, fontSize: "12px" }} onClick={downloadTemplate}>
            <Download size={15} /> Download Template (.xlsx)
          </button>
          <button className="btn secondary" style={{ flex: 1, fontSize: "12px" }} onClick={loadDemoSpreadsheet}>
            <Sparkles size={15} /> Load Demo Sheet
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <div className="bulk-dropzone" onClick={() => fileInputRef.current?.click()}>
          <FileSpreadsheet size={42} color="#3b82f6" />
          <strong style={{ fontSize: "14px", color: "#1e293b" }}>
            {fileName ? fileName : "Upload Student Spreadsheet"}
          </strong>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Click or drag & drop Excel (.xlsx) file with student details and photos
          </span>
        </div>

        {parsedRows.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#334155" }}>
                Found {parsedRows.length} Students Ready for Import
              </span>
              <button className="text-action" onClick={() => setParsedRows([])}>
                Clear
              </button>
            </div>

            <div className="audit-table-wrap">
              <table className="audit-table" style={{ width: "680px" }}>
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Reg No</th>
                    <th>Class</th>
                    <th>Department</th>
                    <th>Accommodation / Transport</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((s, idx) => (
                    <tr key={`${s.registerNumber}-${idx}`}>
                      <td>
                        {s.photo ? (
                          <img
                            src={s.photo}
                            alt=""
                            style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover" }}
                          />
                        ) : (
                          <span>{s.initials}</span>
                        )}
                      </td>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.registerNumber}</td>
                      <td><span className="class-badge-preview" style={{ fontSize: "11px" }}>{s.classCode}</span></td>
                      <td>{s.department}</td>
                      <td>
                        {s.accommodationType === "Hosteller"
                          ? `Hostel (${s.roomNumber || "B-204"})`
                          : s.transportationType === "Own Vehicle"
                          ? `Own Vehicle · ${s.residentialLocation || s.location || "Trichy"}`
                          : "College Bus"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {training ? (
              <div className="training-progress-card">
                <Sparkles size={24} color="#3b82f6" />
                <h3 style={{ margin: "6px 0 2px" }}>Training Face Recognition Model...</h3>
                <p style={{ fontSize: "12px", color: "#64748b" }}>
                  Enrolling face images for {parsedRows.length} students into YuNet & SFace...
                </p>
                <div className="training-bar-wrap">
                  <div className="training-bar-fill" style={{ width: `${trainProgress}%` }} />
                </div>
              </div>
            ) : (
              <button className="btn primary" style={{ width: "100%", marginTop: "12px" }} onClick={handleStartImport}>
                <ShieldCheck size={18} /> Import All & Train Face Model ({parsedRows.length} students)
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// -------------------------------------------------------------
// 4. AUDIT LOGS TABLE & DETAIL INSPECTION (Admin & Manager)
// -------------------------------------------------------------
export function AuditLogsTable({
  go,
  auditLogs,
  scope = "admin",
}: {
  go: (screen: Screen) => void;
  auditLogs: AuditLogItem[];
  scope?: "admin" | "institution";
}) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("All Actions");
  const [institutionFilter, setInstitutionFilter] = useState(scope === "institution" ? "SRM GROUP OF INSTITUTIONS TRICHY" : "All institutions");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const filteredLogs = auditLogs.filter(log => {
    const text = `${log.actor} ${log.action} ${log.target} ${log.summary} ${log.institution}`.toLowerCase();
    const matchQuery = !query || text.includes(query.toLowerCase());
    const matchAction = actionFilter === "All Actions" || log.action === actionFilter;
    const matchInst =
      institutionFilter === "All institutions" ||
      log.institution.toLowerCase().includes(institutionFilter.toLowerCase());
    return matchQuery && matchAction && matchInst;
  });

  return (
    <>
      <div className="top-bar">
        <button className="top-bar-back" onClick={() => go("home")}>
          <ChevronRight style={{ transform: "rotate(180deg)" }} size={20} />
        </button>
        <div>
          <h1>Audit Logs</h1>
          <p>{scope === "institution" ? "SRM GROUP OF INSTITUTIONS TRICHY · Changes History" : "Campus Operations & Changes"}</p>
        </div>
      </div>

      <div className="page-content">
        <div className="search-input">
          <Search size={17} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search action, actor, target or details..."
          />
          {query && <button onClick={() => setQuery("")}>Clear</button>}
        </div>

        <section className="filter-panel admin-filters">
          <div className="filter-fields">
            {scope === "admin" && (
              <div className="field">
                <span>Institution</span>
                <select value={institutionFilter} onChange={e => setInstitutionFilter(e.target.value)}>
                  <option>All institutions</option>
                  <option>SRM GROUP OF INSTITUTIONS TRICHY</option>
                  <option>Institution A</option>
                  <option>Institution C</option>
                  <option>Institution D</option>
                  <option>Easwari Engineering College</option>
                </select>
              </div>
            )}
            <div className="field">
              <span>Action Type</span>
              <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
                <option>All Actions</option>
                <option>Student Added</option>
                <option>Student Details Updated</option>
                <option>Bulk Students Imported</option>
                <option>User Status Changed</option>
                <option>Access Permissions Updated</option>
              </select>
            </div>
          </div>
        </section>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 0" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
            {filteredLogs.length} audit records
          </span>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
            Click row for details
          </span>
        </div>

        <div className="audit-table-wrap">
          <table className="audit-table" style={{ width: "740px" }}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Institution</th>
                <th>Target</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                const badgeClass =
                  log.action === "Student Added"
                    ? "add"
                    : log.action === "Student Details Updated"
                    ? "edit"
                    : log.action === "Bulk Students Imported"
                    ? "bulk"
                    : log.action === "User Status Changed"
                    ? "user"
                    : "settings";

                return (
                  <tr key={log.id} onClick={() => setSelectedLog(log)}>
                    <td>{log.timestamp.slice(5, 16)}</td>
                    <td>
                      <span className={`action-badge ${badgeClass}`}>{log.action}</span>
                    </td>
                    <td>
                      <strong>{log.actor}</strong>
                      <small style={{ color: "#64748b" }}>{log.actorRole}</small>
                    </td>
                    <td>{log.institution.replace("SRM GROUP OF INSTITUTIONS ", "")}</td>
                    <td><strong>{log.target}</strong></td>
                    <td style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {log.summary}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* LOG DETAIL INSPECTION MODAL */}
        {selectedLog && (
          <div className="audit-modal-overlay" onClick={() => setSelectedLog(null)}>
            <div className="audit-modal-content" onClick={e => e.stopPropagation()}>
              <div className="audit-modal-head">
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
                    AUDIT RECORD · {selectedLog.id}
                  </span>
                  <h2 style={{ fontSize: "16px", margin: "2px 0 0" }}>{selectedLog.action}</h2>
                </div>
                <button onClick={() => setSelectedLog(null)} className="icon-btn">
                  <X size={18} />
                </button>
              </div>

              <section className="info-card" style={{ marginBottom: "14px" }}>
                <dl>
                  <div><dt>Timestamp</dt><dd>{selectedLog.timestamp}</dd></div>
                  <div><dt>Actor Name</dt><dd>{selectedLog.actor}</dd></div>
                  <div><dt>Actor Role</dt><dd>{selectedLog.actorRole}</dd></div>
                  {selectedLog.actorId && <div><dt>Actor ID</dt><dd>{selectedLog.actorId}</dd></div>}
                  <div><dt>Institution</dt><dd>{selectedLog.institution}</dd></div>
                  {selectedLog.block && <div><dt>Location Block</dt><dd>{selectedLog.block}</dd></div>}
                  <div><dt>Target Entity</dt><dd>{selectedLog.target}</dd></div>
                  <div><dt>Summary</dt><dd>{selectedLog.summary}</dd></div>
                </dl>
              </section>

              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#334155", margin: "10px 0 6px" }}>
                    Field Modifications / Differences
                  </h4>
                  <div className="diff-table-wrap">
                    <table className="diff-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Previous Value</th>
                          <th>New Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLog.changes.map((c, i) => (
                          <tr key={i}>
                            <td><strong>{c.field}</strong></td>
                            <td><span className="diff-old">{c.oldVal}</span></td>
                            <td><span className="diff-new">{c.newVal}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button className="btn secondary" style={{ width: "100%", marginTop: "12px" }} onClick={() => setSelectedLog(null)}>
                Close Audit Details
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// -------------------------------------------------------------
// 5. ADMIN DYNAMIC ACCESS & VISIBILITY CONTROLS
// -------------------------------------------------------------
export function AdminAccessSettings({
  go,
  fieldVisibility,
  onSaveFieldVisibility,
  permissions,
  onSavePermissions,
}: {
  go: (screen: Screen) => void;
  fieldVisibility: LogFieldVisibility;
  onSaveFieldVisibility: (next: LogFieldVisibility) => void;
  permissions: ManagerEditPermissions;
  onSavePermissions: (next: ManagerEditPermissions) => void;
}) {
  const [activeTab, setActiveTab] = useState<"visibility" | "manager">("visibility");

  // Local drafts
  const [visDraft, setVisDraft] = useState<LogFieldVisibility>({ ...fieldVisibility });
  const [permDraft, setPermDraft] = useState<ManagerEditPermissions>({ ...permissions });
  const [savedNotice, setSavedNotice] = useState("");

  const toggleVis = (key: keyof LogFieldVisibility) => {
    setVisDraft(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePerm = (key: keyof ManagerEditPermissions) => {
    setPermDraft(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveVisibility = () => {
    onSaveFieldVisibility(visDraft);
    setSavedNotice("Log & identity field visibility updated successfully!");
    setTimeout(() => setSavedNotice(""), 3000);
  };

  const savePermissions = () => {
    onSavePermissions(permDraft);
    setSavedNotice("Institute Manager edit permissions updated successfully!");
    setTimeout(() => setSavedNotice(""), 3000);
  };

  const fieldLabels: Record<keyof LogFieldVisibility, string> = {
    name: "Student Name",
    registerNumber: "Register Number",
    class: "Class Code (e.g. IT-II-C)",
    department: "Department",
    year: "Year of Study",
    batch: "Batch",
    institute: "Institute Name",
    accommodationType: "Accommodation Type",
    hostelName: "Hostel Name",
    roomNumber: "Room Number",
    transportationType: "Mode of Transport",
    location: "Location (Residential Area)",
    vehicleNumber: "Vehicle Registration Number",
    boardingPoint: "Bus Boarding Point",
    routeNumber: "Bus Route Number",
  };

  const managerFieldLabels: Record<keyof ManagerEditPermissions, string> = {
    name: "Student Name",
    department: "Department",
    year: "Year of Study",
    batch: "Batch",
    section: "Section",
    accommodationType: "Accommodation Type",
    hostelName: "Hostel Name",
    roomNumber: "Room Number",
    transportationType: "Mode of Transport",
    residentialLocation: "Residential Location / Area",
    vehicleNumber: "Vehicle Registration Number",
    boardingPoint: "Bus Boarding Point",
    routeNumber: "Bus Route Number",
  };

  return (
    <>
      <div className="top-bar">
        <button className="top-bar-back" onClick={() => go("home")}>
          <ChevronRight style={{ transform: "rotate(180deg)" }} size={20} />
        </button>
        <div>
          <h1>Access & Visibility Settings</h1>
          <p>Admin Controls · Profile & Manager Permissions</p>
        </div>
      </div>

      <div className="page-content">
        <div className="photo-source-tabs" style={{ marginBottom: "14px" }}>
          <button
            className={`photo-tab-btn ${activeTab === "visibility" ? "active" : ""}`}
            onClick={() => setActiveTab("visibility")}
          >
            <Eye size={15} /> Log Field Visibility
          </button>
          <button
            className={`photo-tab-btn ${activeTab === "manager" ? "active" : ""}`}
            onClick={() => setActiveTab("manager")}
          >
            <SlidersHorizontal size={15} /> Manager Permissions
          </button>
        </div>

        {savedNotice && (
          <div style={{ padding: "10px 14px", background: "#dcfce7", color: "#166534", borderRadius: "10px", fontSize: "12px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Check size={16} /> {savedNotice}
          </div>
        )}

        {activeTab === "visibility" && (
          <div>
            <div style={{ padding: "12px", background: "#eff6ff", borderRadius: "12px", marginBottom: "12px" }}>
              <strong style={{ fontSize: "12.5px", color: "#1e40af", display: "block" }}>
                Student Log & Scan Field Visibility
              </strong>
              <span style={{ fontSize: "11.5px", color: "#3b82f6" }}>
                Tick the boxes below to specify which fields appear when viewing student details, log records, or identity scans. Uncheck unnecessary fields to hide them.
              </span>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <button
                className="text-action"
                onClick={() => {
                  const allTrue = Object.keys(visDraft).reduce((acc, k) => ({ ...acc, [k]: true }), {} as LogFieldVisibility);
                  setVisDraft(allTrue);
                }}
              >
                Select All
              </button>
              <button
                className="text-action"
                onClick={() => setVisDraft({ ...DEFAULT_LOG_FIELD_VISIBILITY })}
              >
                Reset Default
              </button>
            </div>

            <div className="permission-grid">
              {(Object.keys(fieldLabels) as (keyof LogFieldVisibility)[]).map(key => {
                const checked = visDraft[key];
                return (
                  <div
                    key={key}
                    className={`permission-checkbox-card ${checked ? "checked" : ""}`}
                    onClick={() => toggleVis(key)}
                  >
                    <span>{fieldLabels[key]}</span>
                    {checked ? <CheckSquare size={18} color="#16a34a" /> : <Square size={18} color="#94a3b8" />}
                  </div>
                );
              })}
            </div>

            <button className="btn primary" style={{ width: "100%" }} onClick={saveVisibility}>
              <Check size={16} /> Save Field Visibility Settings
            </button>
          </div>
        )}

        {activeTab === "manager" && (
          <div>
            <div style={{ padding: "12px", background: "#fef3c7", borderRadius: "12px", marginBottom: "12px" }}>
              <strong style={{ fontSize: "12.5px", color: "#92400e", display: "block" }}>
                Institute Manager Edit Access
              </strong>
              <span style={{ fontSize: "11.5px", color: "#b45309" }}>
                Specify which fields the Institute Manager can modify when editing students. Unchecked fields will be locked and cannot be edited by the manager.
              </span>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <button
                className="text-action"
                onClick={() => {
                  const allTrue = Object.keys(permDraft).reduce((acc, k) => ({ ...acc, [k]: true }), {} as ManagerEditPermissions);
                  setPermDraft(allTrue);
                }}
              >
                Allow All Fields
              </button>
              <button
                className="text-action"
                onClick={() => setPermDraft({ ...DEFAULT_MANAGER_EDIT_PERMISSIONS })}
              >
                Reset Default
              </button>
            </div>

            <div className="permission-grid">
              {(Object.keys(managerFieldLabels) as (keyof ManagerEditPermissions)[]).map(key => {
                const checked = permDraft[key];
                return (
                  <div
                    key={key}
                    className={`permission-checkbox-card ${checked ? "checked" : ""}`}
                    onClick={() => togglePerm(key)}
                  >
                    <div>
                      <span>{managerFieldLabels[key]}</span>
                      {!checked && <small style={{ color: "#dc2626", display: "block", fontSize: "10px" }}>Locked for Manager</small>}
                    </div>
                    {checked ? <CheckSquare size={18} color="#16a34a" /> : <Square size={18} color="#94a3b8" />}
                  </div>
                );
              })}
            </div>

            <button className="btn primary" style={{ width: "100%" }} onClick={savePermissions}>
              <Check size={16} /> Save Manager Edit Permissions
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// -------------------------------------------------------------
// 6. ADMIN SECURITIES DIRECTORY (Institution & Block filtering)
// -------------------------------------------------------------
export function AdminSecuritiesDirectory({ go }: { go: (screen: Screen) => void }) {
  const [institution, setInstitution] = useState("All institutions");
  const [block, setBlock] = useState("All blocks");
  const [query, setQuery] = useState("");

  const guards = [
    { name: "Arun Kumar", id: "GRD-B-0017", institution: "Institution B", gate: "Main Gate", shift: "Morning (06:00 - 14:00)", status: "On Duty", phone: "+91 98765 43210" },
    { name: "Kavya Rao", id: "GRD-B-0031", institution: "Institution B", gate: "Block A", shift: "Morning (06:00 - 14:00)", status: "On Duty", phone: "+91 98765 43318" },
    { name: "Joseph Mathew", id: "GRD-B-0038", institution: "Institution B", gate: "Block B", shift: "Night (22:00 - 06:00)", status: "Off Duty", phone: "+91 98765 43399" },
    { name: "G. Selvam", id: "GRD-B-0001", institution: "SRM GROUP OF INSTITUTIONS TRICHY", gate: "Main Gate", shift: "General (08:00 - 17:00)", status: "On Duty", phone: "+91 98765 40011" },
    { name: "R. Murali", id: "GRD-A-0012", institution: "Institution A", gate: "North Gate", shift: "Morning (06:00 - 14:00)", status: "On Duty", phone: "+91 98765 41012" },
    { name: "S. Venkatesan", id: "GRD-C-0022", institution: "Institution C", gate: "East Gate", shift: "Morning (06:00 - 14:00)", status: "On Duty", phone: "+91 98765 42022" },
    { name: "T. Rajan", id: "GRD-D-0044", institution: "Institution D", gate: "South Gate", shift: "Afternoon (14:00 - 22:00)", status: "On Duty", phone: "+91 98765 44044" },
    { name: "P. Karthikeyan", id: "GRD-EEC-01", institution: "Easwari Engineering College", gate: "EEC Main Gate", shift: "General (08:00 - 17:00)", status: "On Duty", phone: "+91 98765 45001" },
  ];

  const blocksByInst: Record<string, string[]> = {
    "Institution B": ["Main Gate", "Block A", "Block B", "Library Block", "Bharathi Hostel"],
    "SRM GROUP OF INSTITUTIONS TRICHY": ["Main Gate", "Block A", "Block B", "Bharathi Hostel"],
    "Institution A": ["North Gate", "Academic Block", "Science Block", "Auditorium"],
    "Institution C": ["East Gate", "Engineering Block", "Admin Block", "Hostel Gate"],
    "Institution D": ["South Gate", "Commerce Block", "Research Block", "Sports Block"],
    "Easwari Engineering College": ["EEC Main Gate", "Mechanical Block", "EEC Library", "Cauvery Hostel"],
  };

  const availableBlocks = institution === "All institutions"
    ? ["All blocks", "Main Gate", "Block A", "Block B", "North Gate", "East Gate", "South Gate", "EEC Main Gate"]
    : ["All blocks", ...(blocksByInst[institution] || ["Main Gate"])];

  const filtered = guards.filter(g => {
    const matchInst = institution === "All institutions" || g.institution === institution;
    const matchBlock = block === "All blocks" || g.gate === block;
    const matchQuery = !query || `${g.name} ${g.id} ${g.gate} ${g.institution}`.toLowerCase().includes(query.toLowerCase());
    return matchInst && matchBlock && matchQuery;
  });

  return (
    <>
      <div className="top-bar">
        <button className="top-bar-back" onClick={() => go("home")}>
          <ChevronRight style={{ transform: "rotate(180deg)" }} size={20} />
        </button>
        <div>
          <h1>Campus Securities</h1>
          <p>Oversight by Institution & Block</p>
        </div>
      </div>

      <div className="page-content">
        <div className="search-input">
          <Search size={17} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search security officer, ID, gate..."
          />
          {query && <button onClick={() => setQuery("")}>Clear</button>}
        </div>

        <section className="filter-panel admin-filters">
          <div className="filter-fields">
            <div className="field">
              <span>Institution</span>
              <select
                value={institution}
                onChange={e => {
                  setInstitution(e.target.value);
                  setBlock("All blocks");
                }}
              >
                <option>All institutions</option>
                <option>SRM GROUP OF INSTITUTIONS TRICHY</option>
                <option>Institution B</option>
                <option>Institution A</option>
                <option>Institution C</option>
                <option>Institution D</option>
                <option>Easwari Engineering College</option>
              </select>
            </div>
            <div className="field">
              <span>Block / Gate</span>
              <select value={block} onChange={e => setBlock(e.target.value)}>
                {availableBlocks.map(b => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div style={{ margin: "10px 0", fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
          {filtered.length} security personnel deployed
        </div>

        <div className="directory-list">
          {filtered.map(g => (
            <section key={g.id} style={{ padding: "12px 14px", marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <strong style={{ fontSize: "13.5px" }}>{g.name}</strong>
                  <span style={{ fontSize: "12px", color: "#64748b", display: "block" }}>
                    {g.id} · {g.institution}
                  </span>
                  <small style={{ color: "#3b82f6", fontWeight: "600" }}>
                    <MapPin size={11} style={{ display: "inline", verticalAlign: "middle" }} /> {g.gate} · {g.shift}
                  </small>
                </div>
                <span className={`status ${g.status === "On Duty" ? "green" : "gray"}`}>
                  {g.status}
                </span>
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
