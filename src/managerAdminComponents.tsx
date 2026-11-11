import { useState, useRef, useEffect, type ChangeEvent, type DragEvent, type FormEvent } from "react";
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
  EyeOff,
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
  editedBy: string;
  editorRole: "Institute Manager" | "Super admin" | "Campus Supervisor" | "CSO" | "Student Welfare" | "System";
  action:
    | "Student Added"
    | "Student Details Updated"
    | "Accommodation Updated"
    | "Bulk Students Imported"
    | "User Created"
    | "User Details Updated"
    | "User Status Changed"
    | "Security Assignment Updated"
    | "Settings Modified"
    | "Access Permissions Updated";
  institution: string;
  block?: string;
  actionDetails: string;
  comments: string;
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
    editedBy: "Priya Raman",
    editorRole: "Institute Manager",
    action: "Student Added",
    institution: "SRM GROUP OF INSTITUTIONS TRICHY",
    block: "Institution B Campus",
    actionDetails: "Added Karthik R (23IT1042) · Class IT-II-C",
    comments: "Manual intake enrollment verified with ID proof and live photo.",
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
    editedBy: "Priya Raman",
    editorRole: "Institute Manager",
    action: "Student Details Updated",
    institution: "SRM GROUP OF INSTITUTIONS TRICHY",
    block: "Bharathi Hostel",
    actionDetails: "Updated Room Number (B-202 → B-204) for Sur (23MED0412)",
    comments: "Student approved for Bharathi Hostel room transfer request.",
    changes: [
      { field: "Room Number", oldVal: "B-202", newVal: "B-204" },
    ],
  },
  {
    id: "AUD-INIT-003",
    timestamp: "2026-11-03 14:20:00",
    dateTime: "2026-11-03T14:20:00",
    editedBy: "Avery Williams",
    editorRole: "Super admin",
    action: "Bulk Students Imported",
    institution: "All campus institutions",
    block: "All Blocks",
    actionDetails: "Imported 12 students via CampusSecure_Batch_2026.xlsx",
    comments: "Semester batch admission sheet uploaded by central admissions team.",
  },
  {
    id: "AUD-INIT-004",
    timestamp: "2026-11-02 16:45:18",
    dateTime: "2026-11-02T16:45:18",
    editedBy: "Avery Williams",
    editorRole: "Super admin",
    action: "Access Permissions Updated",
    institution: "Institution B",
    block: "Main Gate",
    actionDetails: "Modified edit permissions for Institute Manager portal",
    comments: "Locked academic name and register edits to Super admin-only review.",
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
  editorName = "Priya Raman",
  editorRole = "Institute Manager",
}: {
  go: (screen: Screen) => void;
  onAddStudent: (student: StudentMatch, auditLog: AuditLogItem) => void;
  editorName?: string;
  editorRole?: AuditLogItem["editorRole"];
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
  const [enrollmentComment, setEnrollmentComment] = useState("");

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
      setCameraError("Camera access unavailable. You can choose a photo from your gallery.");
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
        editedBy: editorName,
        editorRole,
        action: "Student Added",
        institution: "SRM GROUP OF INSTITUTIONS TRICHY",
        block: "Institution B Campus",
        actionDetails: `Added ${newStudent.name} (${newStudent.registerNumber}) · Class ${classCode}`,
        comments: enrollmentComment.trim() || "Manual student enrollment & biometric face training.",
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
                  setEnrollmentComment("");
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
                <ImagePlus size={16} /> Choose from Gallery
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
                      Select face photo from your gallery
                    </span>
                    <label className="btn secondary" style={{ cursor: "pointer", marginTop: "4px" }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: "none" }}
                      />
                      Choose Image from Gallery
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

          <label className="field" style={{ marginTop: "8px" }}>
            <span>Comments / Reason</span>
            <textarea
              rows={2}
              value={enrollmentComment}
              onChange={e => setEnrollmentComment(e.target.value)}
              placeholder="Reason or notes for enrolling this student (e.g. New admission / Transfer)..."
            />
          </label>
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
  editorName = "Priya Raman",
  editorRole = "Institute Manager",
}: {
  go: (screen: Screen) => void;
  students: StudentMatch[];
  onUpdateStudent: (student: StudentMatch, auditLog: AuditLogItem) => void;
  permissions: ManagerEditPermissions;
  editorName?: string;
  editorRole?: AuditLogItem["editorRole"];
}) {
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [editingStudent, setEditingStudent] = useState<StudentMatch | null>(null);

  // Form draft
  const [draft, setDraft] = useState<StudentMatch | null>(null);
  const [editComment, setEditComment] = useState("");
  const [commentError, setCommentError] = useState("");

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
    setEditComment("");
    setCommentError("");
  };

  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !draft) return;

    if (!editComment.trim()) {
      setCommentError("Please enter a comment or reason for editing this student's details.");
      return;
    }

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

    const studentLabel = `${updatedStudent.name} (${updatedStudent.registerNumber})`;
    const singleLineAction =
      changes.length === 1
        ? `Updated ${changes[0].field} (${changes[0].oldVal} → ${changes[0].newVal}) for ${studentLabel}`
        : changes.length > 1
        ? `Updated ${changes.slice(0, 2).map(c => c.field).join(", ")}${changes.length > 2 ? ` +${changes.length - 2} more` : ""} for ${studentLabel}`
        : `Reviewed student details for ${studentLabel}`;

    const auditLog: AuditLogItem = {
      id: `AUD-EDIT-${Date.now()}`,
      timestamp: timeStr,
      dateTime: now.toISOString(),
      editedBy: editorName,
      editorRole,
      action: "Student Details Updated",
      institution: "SRM GROUP OF INSTITUTIONS TRICHY",
      block: "Institution B Campus",
      actionDetails: singleLineAction,
      comments: editComment.trim(),
      changes,
    };

    onUpdateStudent(updatedStudent, auditLog);
    setEditingStudent(null);
    setDraft(null);
    setEditComment("");
    setCommentError("");
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
                    {!permissions.name && <span className="lock-tag"><Lock size={12} /> Locked by Super admin</span>}
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
                    {!permissions.department && <span className="lock-tag"><Lock size={12} /> Locked by Super admin</span>}
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
                    {!permissions.accommodationType && <span className="lock-tag"><Lock size={12} /> Locked by Super admin</span>}
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
                        {!permissions.transportationType && <span className="lock-tag"><Lock size={12} /> Locked by Super admin</span>}
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
                        {!permissions.residentialLocation && <span className="lock-tag"><Lock size={12} /> Locked by Super admin</span>}
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

                <label className="field" style={{ marginTop: "8px" }}>
                  <span>Comment / Reason for Edit <b>*</b></span>
                  <textarea
                    rows={2}
                    value={editComment}
                    onChange={e => {
                      setEditComment(e.target.value);
                      if (e.target.value.trim()) setCommentError("");
                    }}
                    placeholder="Enter the reason or comment for modifying this student's details..."
                  />
                  {commentError && <small className="field-error">{commentError}</small>}
                </label>

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
  const [uploadError, setUploadError] = useState("");
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [training, setTraining] = useState(false);
  const [trainProgress, setTrainProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [importComment, setImportComment] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Template download function (Styled bold headers, larger font, spacious single-cell columns)
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

    const instructionsRows = [
      ["Column", "Requirement", "Accepted Format / Example"],
      ["Full Name", "Required", "Student legal name (min 2 letters), e.g. Arun Kumar"],
      ["Register Number", "Required", "Unique alphanumeric ID containing digits, e.g. 23IT1080"],
      ["Department", "Required", "e.g. Information Technology, General Medicine & Surgery"],
      ["Year", "Required", "I, II, III, IV (or 1, 2, 3, 4)"],
      ["Batch", "Optional", "e.g. 2023-2027"],
      ["Section", "Required", "Single or short code, e.g. A, B, C"],
      ["Institution", "Required", "e.g. SRM GROUP OF INSTITUTIONS TRICHY"],
      ["Accommodation Type", "Required", "Hosteller, Day Scholar, or PG"],
      ["Hostel Name", "Required if Hosteller", "e.g. Bharathi Hostel"],
      ["Room Number", "Required if Hosteller", "e.g. B-310"],
      ["Mode of Transport", "Required if Day Scholar", "Own Vehicle or College Bus"],
      ["Residential Location", "Required if Own Vehicle", "e.g. Thillai Nagar, Trichy"],
      ["Vehicle Number", "Required if Own Vehicle", "e.g. TN-45-AZ-1122"],
      ["Boarding Point", "Required if College Bus", "e.g. Trichy Central Junction"],
      ["Route Number", "Required if College Bus", "e.g. Route M-14"],
      ["Photo URL", "Required", "Valid image URL/path or data URI (https://..., /faces/..., data:image/...)"],
    ];

    const wsStudents = XLSX.utils.aoa_to_sheet([headers]);
    wsStudents["!cols"] = headers.map(h => ({
      wch: Math.max(Math.ceil(h.length * 1.45) + 12, 26),
    }));
    wsStudents["!rows"] = [{ hpt: 36 }];

    const wsGuide = XLSX.utils.aoa_to_sheet(instructionsRows);
    wsGuide["!cols"] = [{ wch: 30 }, { wch: 32 }, { wch: 76 }];
    wsGuide["!rows"] = instructionsRows.map((_, i) => ({ hpt: i === 0 ? 34 : 24 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsStudents, "Students");
    XLSX.utils.book_append_sheet(wb, wsGuide, "Instructions");

    try {
      const cfb = XLSX.CFB;
      const rawBuf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const pkg = cfb.read(new Uint8Array(rawBuf), { type: "array" });
      const enc = new TextEncoder();
      const dec = new TextDecoder();

      // Bold 14pt centered headings with light blue header fill & borders; spacious 11pt vertically centered body cells
      const customStyles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><color rgb="FF1E293B"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="14"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE8F0FE"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="medium"><color rgb="FF2563EB"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="0"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

      const stylesEntry = cfb.find(pkg, "/xl/styles.xml");
      if (stylesEntry) {
        stylesEntry.content = enc.encode(customStyles);
      }

      const styleWorksheet = (pathInPkg: string, freezeTopRow: boolean) => {
        const entry = cfb.find(pkg, pathInPkg);
        if (!entry) return;
        let xml = dec.decode(Uint8Array.from(entry.content));
        if (freezeTopRow) {
          xml = xml.replace(
            "<sheetView workbookViewId=\"0\"/>",
            "<sheetView workbookViewId=\"0\"><pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/></sheetView>"
          );
        }
        xml = xml.replace("</sheetViews>", "</sheetViews><sheetFormatPr defaultRowHeight=\"24\" customHeight=\"1\"/>");
        xml = xml.replace(/(<row r="1"[^>]*>)([\s\S]*?)(<\/row>)/, (_m, open, inner, close) => {
          return open + inner.replace(/<c r="([A-Z]+1)" /g, '<c r="$1" s="1" ') + close;
        });
        entry.content = enc.encode(xml);
      };

      styleWorksheet("/xl/worksheets/sheet1.xml", true);
      styleWorksheet("/xl/worksheets/sheet2.xml", true);

      const styledBuf = cfb.write(pkg, { type: "array", fileType: "zip" });
      const blob = new Blob([new Uint8Array(styledBuf)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "CampusSecure_Student_Bulk_Template.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      XLSX.writeFile(wb, "CampusSecure_Student_Bulk_Template.xlsx");
    }
  };

  const resetUploadState = () => {
    setParsedRows([]);
    setFileName("");
    setUploadError("");
    setRowErrors([]);
    setImportDone(false);
    setTraining(false);
    setTrainProgress(0);
    setImportComment("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processUploadedFile = (file: File) => {
    setParsedRows([]);
    setUploadError("");
    setRowErrors([]);
    setImportDone(false);
    setTraining(false);
    setTrainProgress(0);

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      setFileName("");
      setUploadError("Invalid file type. Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file.");
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onerror = () => {
      setParsedRows([]);
      setUploadError("Could not read the selected file. Please verify it is a valid spreadsheet.");
    };
    reader.onload = evt => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const data = new Uint8Array(buffer);

        // Reject spoofed/non-zip .xlsx files (real .xlsx is a ZIP starting with PK 0x50 0x4B)
        if (ext === "xlsx" && (data.length < 4 || data[0] !== 0x50 || data[1] !== 0x4b)) {
          setParsedRows([]);
          setUploadError("Invalid .xlsx file detected. The file is corrupted or not a genuine Excel workbook.");
          return;
        }

        const workbook = XLSX.read(data, { type: "array" });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setParsedRows([]);
          setUploadError("The uploaded workbook contains no sheets.");
          return;
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        const nonEmptyRows = rawJson.filter(row =>
          Array.isArray(row) && row.some(cell => String(cell ?? "").trim() !== "")
        );

        if (nonEmptyRows.length === 0) {
          setParsedRows([]);
          setUploadError("The uploaded spreadsheet is empty.");
          return;
        }

        // Strict Header Validation (match by normalized column names)
        const rawHeaders = nonEmptyRows[0].map(h =>
          String(h ?? "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim()
        );

        const findCol = (aliases: string[]): number =>
          rawHeaders.findIndex(h => aliases.includes(h));

        const colIdx = {
          name: findCol(["full name", "name", "student name"]),
          regNo: findCol(["register number", "register no", "reg no", "reg number"]),
          dept: findCol(["department", "dept"]),
          year: findCol(["year", "year of study", "academic year"]),
          batch: findCol(["batch"]),
          section: findCol(["section", "sec"]),
          institution: findCol(["institution", "institute"]),
          accommodation: findCol(["accommodation type", "accommodation", "residence type", "residence"]),
          hostelName: findCol(["hostel name", "hostel"]),
          roomNumber: findCol(["room number", "room no", "room"]),
          transport: findCol(["mode of transport", "transportation type", "transport mode", "transport"]),
          location: findCol(["residential location", "location", "residential address", "area"]),
          vehicleNumber: findCol(["vehicle number", "vehicle registration number", "vehicle no"]),
          boardingPoint: findCol(["boarding point", "bus boarding point"]),
          routeNumber: findCol(["route number", "bus route", "route no"]),
          photo: findCol(["photo url", "photo", "image url", "image"]),
        };

        const missingHeaders: string[] = [];
        if (colIdx.name === -1) missingHeaders.push("Full Name");
        if (colIdx.regNo === -1) missingHeaders.push("Register Number");
        if (colIdx.dept === -1) missingHeaders.push("Department");
        if (colIdx.year === -1) missingHeaders.push("Year");
        if (colIdx.section === -1) missingHeaders.push("Section");
        if (colIdx.institution === -1) missingHeaders.push("Institution");
        if (colIdx.accommodation === -1) missingHeaders.push("Accommodation Type");
        if (colIdx.photo === -1) missingHeaders.push("Photo URL");

        if (missingHeaders.length > 0) {
          setParsedRows([]);
          setUploadError(
            `Invalid spreadsheet format — missing required column header(s): ${missingHeaders.join(", ")}. Please download and fill the official template.`
          );
          return;
        }

        const dataRows = nonEmptyRows.slice(1);
        if (dataRows.length === 0) {
          setParsedRows([]);
          setUploadError("No student rows found below the header row. Please enter student details before uploading.");
          return;
        }

        const seenRegs = new Set<string>();
        const validStudents: StudentMatch[] = [];
        const errors: string[] = [];

        dataRows.forEach((r, idx) => {
          const excelRowNum = idx + 2;
          const cell = (cIdx: number) => (cIdx >= 0 ? String(r[cIdx] ?? "").trim() : "");

          const name = cell(colIdx.name);
          const registerNumber = cell(colIdx.regNo).toUpperCase();
          const department = cell(colIdx.dept);
          const rawYear = cell(colIdx.year);
          const batch = cell(colIdx.batch) || "2023–2027";
          const section = cell(colIdx.section).toUpperCase();
          const institute = cell(colIdx.institution);
          const accRaw = cell(colIdx.accommodation);
          const hostelName = cell(colIdx.hostelName);
          const roomNumber = cell(colIdx.roomNumber);
          const transportRaw = cell(colIdx.transport);
          const residentialLocation = cell(colIdx.location);
          const vehicleNumber = cell(colIdx.vehicleNumber);
          const boardingPoint = cell(colIdx.boardingPoint);
          const routeNumber = cell(colIdx.routeNumber);
          const photo = cell(colIdx.photo);

          const rowErrs: string[] = [];

          if (!name || !/[a-zA-Z]{2,}/.test(name)) {
            rowErrs.push("invalid Full Name");
          }
          if (!registerNumber || !/^[A-Z0-9\-\/]{4,20}$/.test(registerNumber) || !/\d/.test(registerNumber)) {
            rowErrs.push("invalid Register Number (must contain alphanumeric ID with digits)");
          } else if (seenRegs.has(registerNumber)) {
            rowErrs.push(`duplicate Register Number (${registerNumber})`);
          }
          if (!department || !/[a-zA-Z]{2,}/.test(department)) {
            rowErrs.push("missing/invalid Department");
          }

          const yearNorm = rawYear.replace(/year/gi, "").trim().toUpperCase();
          const yearMap: Record<string, string> = { "1": "I", "I": "I", "2": "II", "II": "II", "3": "III", "III": "III", "4": "IV", "IV": "IV" };
          const year = yearMap[yearNorm];
          if (!year) {
            rowErrs.push(`invalid Year ('${rawYear || "empty"}', expected I/II/III/IV)`);
          }

          if (!section || !/^[A-Z0-9]{1,4}$/.test(section)) {
            rowErrs.push("missing/invalid Section");
          }
          if (!institute || institute.length < 3) {
            rowErrs.push("missing Institution");
          }

          const accLower = accRaw.toLowerCase();
          let accommodationType: "Hosteller" | "Day Scholar" | "PG" | null = null;
          if (accLower === "hosteller" || accLower === "hostel") accommodationType = "Hosteller";
          else if (accLower === "day scholar" || accLower === "dayscholar") accommodationType = "Day Scholar";
          else if (accLower === "pg") accommodationType = "PG";
          else rowErrs.push(`invalid Accommodation Type ('${accRaw || "empty"}')`);

          let transportationType: "College Bus" | "Own Vehicle" | undefined = undefined;
          if (accommodationType === "Hosteller") {
            if (!hostelName) rowErrs.push("missing Hostel Name");
            if (!roomNumber) rowErrs.push("missing Room Number");
          } else if (accommodationType === "Day Scholar") {
            const trLower = transportRaw.toLowerCase();
            if (trLower.includes("bus")) {
              transportationType = "College Bus";
              if (!boardingPoint) rowErrs.push("missing Boarding Point");
              if (!routeNumber) rowErrs.push("missing Route Number");
            } else if (trLower.includes("own") || trLower.includes("vehicle")) {
              transportationType = "Own Vehicle";
              if (!residentialLocation) rowErrs.push("missing Residential Location");
              if (!vehicleNumber) rowErrs.push("missing Vehicle Number");
            } else {
              rowErrs.push(`invalid Mode of Transport ('${transportRaw || "empty"}', expected 'Own Vehicle' or 'College Bus')`);
            }
          }

          const isValidPhoto =
            Boolean(photo) &&
            (photo.startsWith("http://") ||
              photo.startsWith("https://") ||
              photo.startsWith("data:image/") ||
              photo.startsWith("/faces/") ||
              /\.(jpe?g|png|webp)$/i.test(photo));
          if (!isValidPhoto) {
            rowErrs.push("missing or invalid Photo URL (expected http(s)://, /faces/..., data:image/..., or image filename)");
          }

          if (rowErrs.length > 0) {
            errors.push(`Row ${excelRowNum}: ${rowErrs.join("; ")}`);
            return;
          }

          seenRegs.add(registerNumber);
          const initials = name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "ST";
          const classCode = computeClassCode(department, year!, section, registerNumber);

          validStudents.push({
            initials,
            name,
            registerNumber,
            department,
            year: year!,
            batch,
            section,
            classCode,
            institute,
            similarity: 97,
            accommodationType: accommodationType!,
            hostelName: accommodationType === "Hosteller" ? hostelName : undefined,
            roomNumber: accommodationType === "Hosteller" ? roomNumber : undefined,
            transportationType,
            residentialLocation: accommodationType === "Day Scholar" && transportationType === "Own Vehicle" ? residentialLocation : undefined,
            location: accommodationType === "Day Scholar" && transportationType === "Own Vehicle" ? residentialLocation : undefined,
            vehicleNumber: vehicleNumber || undefined,
            boardingPoint: boardingPoint || undefined,
            routeNumber: routeNumber || undefined,
            photo,
          });
        });

        setRowErrors(errors);
        if (validStudents.length === 0) {
          setParsedRows([]);
          setUploadError(
            `No valid student records found in '${file.name}'. ${errors.length} row(s) failed validation.`
          );
          return;
        }

        setParsedRows(validStudents);
      } catch (err) {
        console.error("Error reading spreadsheet", err);
        setParsedRows([]);
        setUploadError("Failed to parse file. Please upload a genuine .xlsx, .xls, or .csv student spreadsheet.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    processUploadedFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processUploadedFile(file);
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
        editedBy: "Avery Williams",
        editorRole: "Super admin",
        action: "Bulk Students Imported",
        institution: "All Campus Institutions",
        block: "All Blocks",
        actionDetails: `Imported ${parsedRows.length} students via '${fileName || "spreadsheet"}'`,
        comments: importComment.trim() || `Bulk spreadsheet import (${fileName || "students.xlsx"}) and biometric face enrollment.`,
        changes: parsedRows.map(s => ({
          field: s.registerNumber,
          oldVal: "(New Enrollee)",
          newVal: `${s.name} · ${s.classCode || s.department}`,
        })),
      };

      onBulkImport(parsedRows, auditLog);
      setTraining(false);
      setImportDone(true);
      setImportComment("");
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
            <p>Super admin Portal · Bulk Creation</p>
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
        <div style={{ marginBottom: "14px" }}>
          <button className="btn secondary" style={{ width: "100%", fontSize: "12px" }} onClick={downloadTemplate}>
            <Download size={15} /> Download Template (.xlsx)
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <div
          className={`bulk-dropzone ${isDragging ? "dragging" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <FileSpreadsheet size={42} color="#3b82f6" />
          <strong style={{ fontSize: "14px", color: "#1e293b" }}>
            {fileName ? fileName : "Upload Student Spreadsheet"}
          </strong>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Tap to choose an Excel (.xlsx, .xls, .csv) file from your device with student details and photo URLs
          </span>
        </div>

        {uploadError && (
          <div style={{ padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "12px", fontSize: "12px", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
              <div style={{ flex: 1 }}>
                <strong style={{ display: "block", marginBottom: rowErrors.length > 0 ? "6px" : 0 }}>{uploadError}</strong>
                {rowErrors.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", lineHeight: 1.5 }}>
                    {rowErrors.slice(0, 6).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {rowErrors.length > 6 && <li>...and {rowErrors.length - 6} more row error(s)</li>}
                  </ul>
                )}
              </div>
              <button type="button" className="text-action" style={{ color: "#b91c1c" }} onClick={resetUploadState}>
                Clear
              </button>
            </div>
          </div>
        )}

        {!uploadError && rowErrors.length > 0 && (
          <div style={{ padding: "10px 12px", background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", borderRadius: "10px", fontSize: "11.5px", marginBottom: "12px" }}>
            <strong style={{ display: "block", marginBottom: "4px" }}>
              Skipped {rowErrors.length} invalid row(s):
            </strong>
            <ul style={{ margin: 0, paddingLeft: "16px", lineHeight: 1.45 }}>
              {rowErrors.slice(0, 4).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {rowErrors.length > 4 && <li>...and {rowErrors.length - 4} more</li>}
            </ul>
          </div>
        )}

        {parsedRows.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#334155" }}>
                Found {parsedRows.length} Valid Student{parsedRows.length === 1 ? "" : "s"} Ready for Import
              </span>
              <button className="text-action" onClick={resetUploadState}>
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
              <>
                <label className="field" style={{ marginTop: "12px" }}>
                  <span>Comments / Reason for Import</span>
                  <textarea
                    rows={2}
                    value={importComment}
                    onChange={e => setImportComment(e.target.value)}
                    placeholder="Enter reason or notes for this bulk student import (e.g. Semester intake batch)..."
                  />
                </label>
                <button className="btn primary" style={{ width: "100%", marginTop: "10px" }} onClick={handleStartImport}>
                  <ShieldCheck size={18} /> Import All & Train Face Model ({parsedRows.length} students)
                </button>
              </>
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
type HideableAuditColumn = "editedBy" | "institution" | "actionDetails" | "comments";

function formatAuditDateParts(timestamp?: string, dateTime?: string): { date: string; time: string; full: string } {
  const raw = (timestamp || dateTime || "").trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const [, yyyy, mm, dd, hhmm = "00:00", ss = "00"] = isoMatch;
    const date = `${dd}/${mm}/${yyyy}`;
    return { date, time: hhmm, full: `${date} ${hhmm}:${ss}` };
  }
  const dmyMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2})(?::(\d{2}))?)?/);
  if (dmyMatch) {
    const [, dd, mm, yyyy, hhmm = "00:00", ss = "00"] = dmyMatch;
    const date = `${dd}/${mm}/${yyyy}`;
    return { date, time: hhmm, full: `${date} ${hhmm}:${ss}` };
  }
  const parsed = new Date(dateTime || timestamp || "");
  if (!Number.isNaN(parsed.getTime())) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const date = `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
    const time = `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
    const full = `${date} ${time}:${pad(parsed.getSeconds())}`;
    return { date, time, full };
  }
  return { date: raw.slice(0, 10) || "—", time: raw.slice(11, 16) || "", full: raw || "—" };
}

const DEFAULT_AUDIT_VISIBLE_COLUMNS: Record<HideableAuditColumn, boolean> = {
  editedBy: true,
  institution: true,
  actionDetails: true,
  comments: true,
};

const AUDIT_COLUMN_LABELS: { key: HideableAuditColumn; label: string }[] = [
  { key: "editedBy", label: "Edited by" },
  { key: "institution", label: "Institution" },
  { key: "actionDetails", label: "Action details" },
  { key: "comments", label: "Comments" },
];

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
  const [visibleColumns, setVisibleColumns] = useState<Record<HideableAuditColumn, boolean>>(() => {
    try {
      const saved = localStorage.getItem("campus_secure_audit_log_columns");
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_AUDIT_VISIBLE_COLUMNS, ...parsed };
      }
    } catch {}
    return DEFAULT_AUDIT_VISIBLE_COLUMNS;
  });

  const toggleColumn = (col: HideableAuditColumn) => {
    setVisibleColumns(prev => {
      const next = { ...prev, [col]: !prev[col] };
      try {
        localStorage.setItem("campus_secure_audit_log_columns", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const hiddenColumnList = AUDIT_COLUMN_LABELS.filter(c => !visibleColumns[c.key]);
  const visibleOptionalCount = AUDIT_COLUMN_LABELS.length - hiddenColumnList.length;

  const renderMovableHeader = (col: HideableAuditColumn, label: string, className: string) => {
    if (!visibleColumns[col]) return null;
    return (
      <th className={className}>
        <div className="audit-th-inner">
          <span>{label}</span>
          <button
            type="button"
            className="audit-th-eye-btn"
            onClick={() => toggleColumn(col)}
            aria-label={`Hide ${label} field`}
            title={`Hide ${label}`}
          >
            <Eye size={12} />
          </button>
        </div>
      </th>
    );
  };

  const filteredLogs = auditLogs.filter(log => {
    const dt = formatAuditDateParts(log.timestamp, log.dateTime);
    const text = `${dt.full} ${log.editedBy} ${log.editorRole} ${log.action} ${log.institution} ${log.actionDetails} ${log.comments}`.toLowerCase();
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
            placeholder="Search action, edited by, details or comments..."
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
                <option>Accommodation Updated</option>
                <option>Bulk Students Imported</option>
                <option>User Created</option>
                <option>User Details Updated</option>
                <option>User Status Changed</option>
                <option>Security Assignment Updated</option>
                <option>Settings Modified</option>
                <option>Access Permissions Updated</option>
              </select>
            </div>
          </div>
        </section>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", margin: "8px 0", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
            {filteredLogs.length} audit records
          </span>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
            {visibleOptionalCount > 0 ? "Swipe horizontally · Tap row for details" : "Tap row for details"}
          </span>
        </div>

        {hiddenColumnList.length > 0 && (
          <div className="audit-hidden-restore-bar">
            <span className="audit-hidden-label">Hidden fields:</span>
            {hiddenColumnList.map(col => (
              <button
                key={col.key}
                type="button"
                className="audit-hidden-chip"
                onClick={() => toggleColumn(col.key)}
                aria-label={`Show ${col.label} field`}
                title={`Show ${col.label}`}
              >
                <EyeOff size={12} />
                <span>{col.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="audit-table-wrap audit-logs-sticky-wrap">
          <table className="audit-table audit-logs-sticky-table">
            <thead>
              <tr>
                <th className="sticky-col-time">Date &amp; Time</th>
                <th className="sticky-col-action">Action</th>
                {renderMovableHeader("editedBy", "Edited by", "audit-col-edited-by")}
                {renderMovableHeader("institution", "Institution", "audit-col-institution")}
                {renderMovableHeader("actionDetails", "Action details", "audit-col-details")}
                {renderMovableHeader("comments", "Comments", "audit-col-comments")}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                const badgeClass =
                  log.action === "Student Added" || log.action === "User Created"
                    ? "add"
                    : log.action === "Student Details Updated" || log.action === "Accommodation Updated" || log.action === "User Details Updated" || log.action === "Security Assignment Updated"
                    ? "edit"
                    : log.action === "Bulk Students Imported"
                    ? "bulk"
                    : log.action === "User Status Changed"
                    ? "user"
                    : "settings";

                const dt = formatAuditDateParts(log.timestamp, log.dateTime);
                return (
                  <tr key={log.id} onClick={() => setSelectedLog(log)}>
                    <td className="sticky-col-time">
                      <strong style={{ display: "block", color: "#1e2d43" }}>{dt.date}</strong>
                      {dt.time && <small style={{ color: "#64748b", display: "block" }}>{dt.time}</small>}
                    </td>
                    <td className="sticky-col-action">
                      <span className={`action-badge ${badgeClass}`}>{log.action}</span>
                    </td>
                    {visibleColumns.editedBy && (
                      <td className="audit-col-edited-by">
                        <strong>{log.editedBy}</strong>
                        <small style={{ color: "#64748b", display: "block" }}>{log.editorRole}</small>
                      </td>
                    )}
                    {visibleColumns.institution && (
                      <td className="audit-col-institution">
                        {log.institution.replace("SRM GROUP OF INSTITUTIONS ", "")}
                      </td>
                    )}
                    {visibleColumns.actionDetails && (
                      <td className="audit-single-line-cell audit-col-details" title={log.actionDetails}>
                        {log.actionDetails}
                      </td>
                    )}
                    {visibleColumns.comments && (
                      <td className="audit-single-line-cell audit-col-comments" title={log.comments || "—"}>
                        {log.comments || "—"}
                      </td>
                    )}
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
                  <div><dt>Date &amp; Time</dt><dd>{formatAuditDateParts(selectedLog.timestamp, selectedLog.dateTime).full}</dd></div>
                  <div><dt>Edited By</dt><dd>{selectedLog.editedBy}</dd></div>
                  <div><dt>Role</dt><dd>{selectedLog.editorRole}</dd></div>
                  <div><dt>Institution</dt><dd>{selectedLog.institution}</dd></div>
                  {selectedLog.block && <div><dt>Location Block</dt><dd>{selectedLog.block}</dd></div>}
                  <div><dt>Action Details</dt><dd style={{ whiteSpace: "normal", textAlign: "right" }}>{selectedLog.actionDetails}</dd></div>
                  <div><dt>Comments</dt><dd style={{ whiteSpace: "normal", textAlign: "right" }}>{selectedLog.comments || "—"}</dd></div>
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
  onSaveFieldVisibility: (next: LogFieldVisibility, comment: string) => void;
  permissions: ManagerEditPermissions;
  onSavePermissions: (next: ManagerEditPermissions, comment: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"visibility" | "manager">("visibility");

  // Local drafts
  const [visDraft, setVisDraft] = useState<LogFieldVisibility>({ ...fieldVisibility });
  const [permDraft, setPermDraft] = useState<ManagerEditPermissions>({ ...permissions });
  const [visComment, setVisComment] = useState("");
  const [permComment, setPermComment] = useState("");
  const [savedNotice, setSavedNotice] = useState("");

  const toggleVis = (key: keyof LogFieldVisibility) => {
    setVisDraft(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePerm = (key: keyof ManagerEditPermissions) => {
    setPermDraft(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveVisibility = () => {
    onSaveFieldVisibility(visDraft, visComment.trim());
    setVisComment("");
    setSavedNotice("Log & identity field visibility updated successfully!");
    setTimeout(() => setSavedNotice(""), 3000);
  };

  const savePermissions = () => {
    onSavePermissions(permDraft, permComment.trim());
    setPermComment("");
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
          <p>Super admin Controls · Profile & Manager Permissions</p>
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
                Tap the boxes below to specify which fields appear when viewing student details, log records, or identity scans. Untick unnecessary fields to hide them.
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

            <label className="field" style={{ marginBottom: "10px" }}>
              <span>Comments / Reason</span>
              <textarea
                rows={2}
                value={visComment}
                onChange={e => setVisComment(e.target.value)}
                placeholder="Reason or notes for updating student field visibility..."
              />
            </label>

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
                Specify which fields the Institute Manager can modify when editing students. Unticked fields will be locked and cannot be edited by the manager.
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

            <label className="field" style={{ marginBottom: "10px" }}>
              <span>Comments / Reason</span>
              <textarea
                rows={2}
                value={permComment}
                onChange={e => setPermComment(e.target.value)}
                placeholder="Reason or notes for modifying Institute Manager edit permissions..."
              />
            </label>

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
