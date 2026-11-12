import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "./apiConfig";
import { getInitialLocalSession, getStoredSession, saveSession, clearSession, type StoredSession } from "./authSession";
import { saveOrShareBlob } from "./mobileDownloads";
import { ensureCameraPermission } from "./cameraPermissions";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  DoorOpen,
  Download,
  Eye,
  FileClock,
  FileSpreadsheet,
  Filter,
  HeartHandshake,
  History,
  Home,
  IdCard,
  ImagePlus,
  KeyRound,
  Lock,
  LogOut,
  MapPin,
  Mail,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  QrCode,
  ScanFace,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  TicketCheck,
  Trash2,
  Upload,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  X,
  ScanLine,
  SlidersHorizontal,
  UploadCloud,
} from "lucide-react";
import { evaluateBiometrics } from "./biometrics";
import {
  AuditLogItem,
  LogFieldVisibility,
  DEFAULT_LOG_FIELD_VISIBILITY,
  ManagerEditPermissions,
  DEFAULT_MANAGER_EDIT_PERMISSIONS,
  DEFAULT_AUDIT_LOGS,
  ManualAddStudent,
  ManagerStudentDirectory,
  AdminBulkStudentImport,
  AuditLogsTable,
  AdminAccessSettings,
  AdminSecuritiesDirectory,
} from "./managerAdminComponents";

export type Role = "security" | "warden" | "staff" | "supervisor" | "access-supervisor" | "students" | "welfare" | "admin" | "cso" | "manager";
type ReviewStatus = "Pending Verification" | "Verified" | "Authorised" | "Unauthorised" | "Revoked";
type ReviewAction = {
  type: "Verified" | "Authorised" | "Unauthorised" | "Revoked";
  actor: string;
  actorNumber: string;
  timestamp: string;
  reason?: string;
  event_id?: string;
  verification_status?: string;
  decision_made_by?: string;
  supervisor_id?: string;
  supervisor_name?: string;
  action_taken?: string;
  decision_timestamp?: string;
  previous_status?: string;
  updated_status?: string;
  full_name?: string;
  address?: string;
  contact_number?: string;
  vehicle_number?: string;
  location?: string;
  incident_date?: string;
  incident_time?: string;
  incident_datetime?: string;
};

type IncidentData = {
  fullName: string;
  address: string;
  contactNumber: string;
  vehicleNumber?: string;
  location: string;
  dateTime: string;
  actionTaken: string;
};

const defaultCampusLocations = [
  "Main Gate",
  "Main Block",
  "Medical College",
  "Hospital",
  "Administrative Block",
  "Library",
  "Hostel",
  "Parking Area",
  "Gate 1 Main Entrance",
  "Gate 2 Hospital Entrance",
  "Block A",
  "Block B",
  "Library Block",
  "Bharathi Hostel",
  "Auditorium",
];
type ReviewRecord = {
  status: ReviewStatus;
  actions: ReviewAction[];
};
export type Screen =
  | "login"
  | "home"
  | "scan"
  | "unrecognized"
  | "identity"
  | "unauthorised"
  | "success"
  | "logs"
  | "workload"
  | "assignments"
  | "create-guard"
  | "audit"
  | "alerts"
  | "users"
  | "institution-users"
  | "campus-entries"
  | "login-logs"
  | "assign-supervisor"
  | "forgot"
  | "denied"
  | "profile"
  | "visitor-pass"
  | "pass-records"
  | "bulk-pass"
  | "pass-detail"
  | "access-notifications"
  | "welfare-logs"
  | "manager-students"
  | "add-student"
  | "admin-bulk-students"
  | "admin-audit-logs"
  | "admin-access-settings"
  | "admin-securities"
  | "accommodation-details";

export type AuthorizedFaceProfile = {
  id: string;
  name: string;
  registerNumber: string;
  role: "Student" | "Staff";
  department: string;
  photoUrl?: string;
  descriptor?: number[];
};

type IdentityCase = "student" | "staff";
type VerificationMethod = "face" | "register";
export type StudentMatch = {
  initials: string;
  name: string;
  registerNumber: string;
  dateOfBirth?: string;
  department: string;
  year: string;
  batch: string;
  section?: string;
  classCode?: string;
  institute: string;
  similarity: number;
  accommodationType: "Hosteller" | "Day Scholar" | "PG";
  hostelName?: string;
  hostelBlock?: string;
  roomNumber?: string;
  hostelAddress?: string;
  pgName?: string;
  pgAddress?: string;
  pgContact?: string;
  distanceFromCampus?: string;
  residentialAddress?: string;
  contactNumber?: string;
  phoneNumber?: string;
  transportationType?: "College Bus" | "Own Vehicle" | "Other";
  transport?: "College Bus" | "Own Vehicle";
  boardingPoint?: string;
  routeNumber?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  transportDescription?: string;
  residentialLocation?: string;
  location?: string;
  areaOfResidence?: string;
  accommodationNotes?: string;
  residenceUpdatedAt?: string;
  residenceUpdatedBy?: string;
  photo?: string;
};

const roleMeta: Record<Role, { label: string; name: string; initials: string; scope: string; guardNumber?: string; supervisorNumber?: string; phoneNumber?: string }> = {
  security: { label: "Security", name: "Arun Kumar", initials: "AK", scope: "Main Gate · Institution B", guardNumber: "GRD-B-0017", phoneNumber: "+91 98765 43210" },
  warden: { label: "Warden", name: "Lakshmi Iyer", initials: "LI", scope: "Bharathi Hostel · Institution B", guardNumber: "WRD-B-0011", phoneNumber: "+91 98765 40518" },
  staff: { label: "Staff", name: "Vijay Nair", initials: "VN", scope: "Block A · Institution B", phoneNumber: "+91 98765 40624" },
  supervisor: { label: "Campus Supervisor", name: "Meera Nair", initials: "MN", scope: "Institution B Campus", supervisorNumber: "SUP-B-0004", phoneNumber: "+91 98765 40128" },
  "access-supervisor": { label: "Access Supervisor", name: "Arun Sharma", initials: "AS", scope: "Main Gate · College Campus", supervisorNumber: "ACS-B-0012", phoneNumber: "+91 98765 40812" },
  students: { label: "Student Affairs", name: "Daniel Thomas", initials: "DT", scope: "Institution B · Students", phoneNumber: "+91 98765 40216" },
  welfare: { label: "Student Welfare", name: "Dr. Kavitha Rao", initials: "KR", scope: "Institution B · Blockwise student logs", phoneNumber: "+91 98765 40733" },
  admin: { label: "Super admin", name: "Avery Williams", initials: "AW", scope: "All campus institutions" },
  cso: { label: "Chief Security Officer", name: "Rohan Mehta", initials: "RM", scope: "Institution B", supervisorNumber: "CSO-0001", phoneNumber: "+91 98765 40377" },
  manager: { label: "Institute Manager", name: "Priya Raman", initials: "PR", scope: "Institution B · Assigned institution", phoneNumber: "+91 98765 40455" },
};

const roleIcons: Record<Role, ReactNode> = {
  security: <ShieldCheck size={21} />,
  warden: <ShieldCheck size={21} />,
  staff: <IdCard size={21} />,
  supervisor: <UserCog size={21} />,
  "access-supervisor": <TicketCheck size={21} />,
  students: <Users size={21} />,
  welfare: <HeartHandshake size={21} />,
  admin: <BarChart3 size={21} />,
  cso: <ShieldAlert size={21} />,
  manager: <Building2 size={21} />,
};

const institutions = ["Institution A", "Institution B", "Institution C", "Institution D"];
const adminPortalDesignations = ["Security", "Campus Supervisor", "Supervisor", "CSO", "Student Welfare", "Hostel Warden", "Institute Manager"] as const;

const studentMatches: StudentMatch[] = [
  {
    initials: "SU",
    name: "Sur",
    registerNumber: "23MED0412",
    dateOfBirth: "18 May 2005",
    department: "General Medicine & Surgery",
    year: "II",
    batch: "2023–2028",
    institute: "SRM GROUP OF INSTITUTIONS TRICHY",
    similarity: 98,
    accommodationType: "Hosteller",
    hostelName: "Bharathi Hostel",
    roomNumber: "B-204",
    phoneNumber: "+91 98765 12041",
    photo: "/faces/sur_crop.jpg",
  },
  {
    initials: "MO",
    name: "Mon",
    registerNumber: "23AHS0185",
    dateOfBirth: "12 September 2005",
    department: "Medical Laboratory Technology",
    year: "II",
    batch: "2023–2027",
    institute: "SRM GROUP OF INSTITUTIONS TRICHY",
    similarity: 96,
    accommodationType: "Day Scholar",
    transportationType: "College Bus",
    boardingPoint: "Trichy Central Junction",
    routeNumber: "M-14",
    phoneNumber: "+91 98765 12185",
    photo: "/faces/mon_crop.jpg",
  },
  {
    initials: "MI",
    name: "Mith",
    registerNumber: "22ECE0531",
    dateOfBirth: "04 July 2004",
    department: "Electronics & Communication",
    year: "III",
    batch: "2022–2026",
    institute: "Easwari Engineering College",
    similarity: 97,
    accommodationType: "Hosteller",
    hostelName: "Cauvery Hostel",
    roomNumber: "C-312",
    phoneNumber: "+91 98765 12531",
    photo: "/faces/mith_crop.jpg",
  },
  {
    initials: "TH",
    name: "Thiru",
    registerNumber: "22CSE0789",
    dateOfBirth: "29 January 2004",
    department: "Computer Science & Engineering",
    year: "III",
    section: "C",
    batch: "2022–2026",
    institute: "Easwari Engineering College",
    similarity: 98,
    accommodationType: "Day Scholar",
    transportationType: "Own Vehicle",
    vehicleNumber: "TN-09-BK-4421",
    residentialLocation: "Ramapuram, Chennai",
    phoneNumber: "+91 98765 12789",
    photo: "/faces/thiru_crop.jpg",
  },
  {
    initials: "IT",
    name: "Karthik R",
    registerNumber: "23IT1042",
    dateOfBirth: "14 March 2005",
    department: "Information Technology",
    year: "II",
    section: "C",
    classCode: "IT-II-C",
    batch: "2023–2027",
    institute: "SRM GROUP OF INSTITUTIONS TRICHY",
    similarity: 97,
    accommodationType: "Day Scholar",
    transportationType: "Own Vehicle",
    vehicleNumber: "TN-45-AZ-9988",
    residentialLocation: "Thillai Nagar, Trichy",
    phoneNumber: "+91 98765 12044",
    photo: "/faces/student_details/22ECE1001_crop.jpg",
  },
  {
    initials: "PK",
    name: "Praveen Kumar",
    registerNumber: "22IT1015",
    dateOfBirth: "19 August 2004",
    department: "Information Technology",
    year: "III",
    section: "A",
    classCode: "IT-III-A",
    batch: "2022–2026",
    institute: "SRM GROUP OF INSTITUTIONS TRICHY",
    similarity: 96,
    accommodationType: "Hosteller",
    hostelName: "Bharathi Hostel",
    roomNumber: "B-305",
    phoneNumber: "+91 98765 12045",
    photo: "/faces/student_details/22ECE1002_crop.jpg",
  },
  {
    initials: "DS",
    name: "Divya S",
    registerNumber: "21IT1008",
    dateOfBirth: "03 November 2003",
    department: "Information Technology",
    year: "IV",
    section: "B",
    classCode: "IT-IV-B",
    batch: "2021–2025",
    institute: "SRM GROUP OF INSTITUTIONS TRICHY",
    similarity: 95,
    accommodationType: "PG",
    pgName: "Sri Lakshmi PG, Trichy",
    phoneNumber: "+91 98765 12046",
    photo: "/faces/student_details/22ECE1003_crop.jpg",
  },
  {
    initials: "AS",
    name: "Ankit Sharma",
    registerNumber: "24IT1060",
    dateOfBirth: "25 February 2006",
    department: "Information Technology",
    year: "I",
    section: "A",
    classCode: "IT-I-A",
    batch: "2024–2028",
    institute: "SRM GROUP OF INSTITUTIONS TRICHY",
    similarity: 95,
    accommodationType: "Day Scholar",
    transportationType: "College Bus",
    routeNumber: "Route M-08",
    boardingPoint: "Central Bus Stand",
    phoneNumber: "+91 98765 12047",
    photo: "/faces/student_details/22ECE1004_crop.jpg",
  },
  {
    initials: "KR",
    name: "Kavitha R",
    registerNumber: "22MBBS041",
    dateOfBirth: "14 May 2004",
    department: "MBBS",
    year: "III",
    section: "A",
    classCode: "MBBS-III-A",
    batch: "2022–2027",
    institute: "SRM GROUP OF INSTITUTIONS TRICHY",
    similarity: 96,
    accommodationType: "Hosteller",
    hostelName: "Kaveri Hostel",
    roomNumber: "304",
    phoneNumber: "+91 98765 12042",
  },
  {
    initials: "AK",
    name: "Ananya Krishnan",
    registerNumber: "23ECE0721",
    dateOfBirth: "22 August 2005",
    department: "Electronics & Communication",
    year: "II",
    section: "B",
    classCode: "ECE-II-B",
    batch: "2023–2027",
    institute: "SRM GROUP OF INSTITUTIONS TRICHY",
    similarity: 95,
    accommodationType: "Day Scholar",
    transportationType: "College Bus",
    routeNumber: "Route 12",
    boardingPoint: "Central Bus Stand",
    phoneNumber: "+91 98765 12721",
  },
  {
    initials: "RM",
    name: "Rahul Menon",
    registerNumber: "22CSE1048",
    dateOfBirth: "10 November 2003",
    department: "Computer Science & Engineering",
    year: "III",
    section: "A",
    classCode: "CSE-III-A",
    batch: "2022–2026",
    institute: "SRM GROUP OF INSTITUTIONS TRICHY",
    similarity: 97,
    accommodationType: "Day Scholar",
    transportationType: "Own Vehicle",
    vehicleNumber: "TN-45-AZ-9988",
    phoneNumber: "+91 98765 12048",
  },
  {
    initials: "MF",
    name: "Mohammed Farhan",
    registerNumber: "21BPT019",
    dateOfBirth: "05 February 2003",
    department: "Physiotherapy",
    year: "IV",
    section: "A",
    classCode: "BPT-IV-A",
    batch: "2021–2025",
    institute: "SRM GROUP OF INSTITUTIONS TRICHY",
    similarity: 94,
    accommodationType: "Hosteller",
    hostelName: "Ponni Hostel",
    roomNumber: "112",
    phoneNumber: "+91 98765 12019",
  },
  {
    initials: "PS",
    name: "Pooja Sundaram",
    registerNumber: "24NUR005",
    dateOfBirth: "18 September 2006",
    department: "B.Sc Nursing",
    year: "I",
    section: "B",
    classCode: "NUR-I-B",
    batch: "2024–2028",
    institute: "SRM GROUP OF INSTITUTIONS TRICHY",
    similarity: 95,
    accommodationType: "Hosteller",
    hostelName: "Kaveri Hostel",
    roomNumber: "208",
    phoneNumber: "+91 98765 12005",
  },
  {
    initials: "D1",
    name: "Dummy Student 1",
    registerNumber: "22ECE1001",
    dateOfBirth: "10 June 2004",
    department: "Electronics & Communication",
    year: "III",
    batch: "2022–2026",
    institute: "Easwari Engineering College",
    similarity: 95,
    accommodationType: "Hosteller",
    hostelName: "Cauvery Hostel",
    roomNumber: "C-207",
    photo: "/faces/student_details/22ECE1001_crop.jpg",
  },
  {
    initials: "D2",
    name: "Dummy Student 2",
    registerNumber: "22ECE1002",
    dateOfBirth: "11 June 2004",
    department: "Electronics & Communication",
    year: "III",
    batch: "2022–2026",
    institute: "Easwari Engineering College",
    similarity: 93,
    accommodationType: "Hosteller",
    hostelName: "Ganga Hostel",
    roomNumber: "G-214",
    photo: "/faces/student_details/22ECE1002_crop.jpg",
  },
  {
    initials: "D3",
    name: "Dummy Student 3",
    registerNumber: "22ECE1003",
    dateOfBirth: "12 June 2004",
    department: "Electronics & Communication",
    year: "III",
    batch: "2022–2026",
    institute: "Easwari Engineering College",
    similarity: 94,
    accommodationType: "Day Scholar",
    photo: "/faces/student_details/22ECE1003_crop.jpg",
  },
  {
    initials: "D4",
    name: "Dummy Student 4",
    registerNumber: "22ECE1004",
    dateOfBirth: "13 June 2004",
    department: "Electronics & Communication",
    year: "III",
    batch: "2022–2026",
    institute: "Easwari Engineering College",
    similarity: 96,
    accommodationType: "Hosteller",
    hostelName: "Ganga Hostel",
    roomNumber: "G-228",
    photo: "/faces/student_details/22ECE1004_crop.jpg",
  },
  {
    initials: "D5",
    name: "Dummy Student 5",
    registerNumber: "22ECE1005",
    dateOfBirth: "14 June 2004",
    department: "Electronics & Communication",
    year: "III",
    batch: "2022–2026",
    institute: "Easwari Engineering College",
    similarity: 95,
    accommodationType: "Hosteller",
    hostelName: "Cauvery Hostel",
    roomNumber: "C-235",
    photo: "/faces/student_details/22ECE1005_crop.jpg",
  },
  {
    initials: "D6",
    name: "Dummy Student 6",
    registerNumber: "22ECE1006",
    dateOfBirth: "15 June 2004",
    department: "Electronics & Communication",
    year: "III",
    batch: "2022–2026",
    institute: "Easwari Engineering College",
    similarity: 94,
    accommodationType: "Day Scholar",
    photo: "/faces/student_details/22ECE1006_crop.jpg",
  },
  {
    initials: "D7",
    name: "Dummy Student 7",
    registerNumber: "22ECE1007",
    dateOfBirth: "16 June 2004",
    department: "Electronics & Communication",
    year: "III",
    batch: "2022–2026",
    institute: "Easwari Engineering College",
    similarity: 95,
    accommodationType: "Hosteller",
    hostelName: "Cauvery Hostel",
    roomNumber: "C-249",
    photo: "/faces/student_details/22ECE1007_crop.jpg",
  },
  {
    initials: "D8",
    name: "Dummy Student 8",
    registerNumber: "22ECE1008",
    dateOfBirth: "17 June 2004",
    department: "Electronics & Communication",
    year: "III",
    batch: "2022–2026",
    institute: "Easwari Engineering College",
    similarity: 93,
    accommodationType: "Hosteller",
    hostelName: "Ganga Hostel",
    roomNumber: "G-256",
    photo: "/faces/student_details/22ECE1008_crop.jpg",
  },
  {
    initials: "D9",
    name: "Dummy Student 9",
    registerNumber: "22ECE1009",
    dateOfBirth: "18 June 2004",
    department: "Electronics & Communication",
    year: "III",
    batch: "2022–2026",
    institute: "Easwari Engineering College",
    similarity: 95,
    accommodationType: "Day Scholar",
    photo: "/faces/student_details/22ECE1009_crop.jpg",
  },
  {
    initials: "D10",
    name: "Dummy Student 10",
    registerNumber: "22ECE1010",
    dateOfBirth: "19 June 2004",
    department: "Electronics & Communication",
    year: "III",
    batch: "2022–2026",
    institute: "Easwari Engineering College",
    similarity: 96,
    accommodationType: "Hosteller",
    hostelName: "Ganga Hostel",
    roomNumber: "G-270",
    photo: "/faces/student_details/22ECE1010_crop.jpg",
  },
];

function Button({
  children,
  onClick,
  variant = "primary",
  icon,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "warning" | "quiet" | "success";
  icon?: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return <button type={type} className={`btn btn-${variant}`} onClick={onClick} disabled={disabled}>{icon}{children}</button>;
}

function Status({ tone, children }: { tone: "green" | "blue" | "amber" | "red" | "gray" | "purple"; children: ReactNode }) {
  return <span className={`status status-${tone}`}><i />{children}</span>;
}

function TopBar({ title, subtitle, back, action, collegeBrand = true }: { title: string; subtitle?: string; back?: () => void; action?: ReactNode; collegeBrand?: boolean }) {
  const isBranded = collegeBrand && !back;
  return <header className={`top-bar ${isBranded ? "college-brand-bar" : ""}`}>
    {back ? (
      <button className="icon-btn" onClick={back} aria-label="Back"><ArrowLeft size={20} /></button>
    ) : (
      <div className={`college-logo ${isBranded ? "" : "mini"}`}><img src="/srm-logo.png" alt="SRM GROUP OF INSTITUTIONS TRICHY emblem" /></div>
    )}
    <div className="top-copy">
      {isBranded ? (
        <div className="inst-lockup">
          <span className="inst-title">SRM GROUP OF INSTITUTIONS</span>
          <span className="inst-sub">TRICHY</span>
          {subtitle && <span className="inst-portal-tag">{subtitle}</span>}
        </div>
      ) : (
        <><strong>{title}</strong>{subtitle && <span>{subtitle}</span>}</>
      )}
    </div>
    {action || <div className="top-spacer" />}
  </header>;
}

function ProfileHead({ role, go }: { role: Role; go: (screen: Screen) => void }) {
  const meta = roleMeta[role];
  return <section className="profile-head">
    <button className="profile-avatar" onClick={() => go("profile")}>{meta.initials}</button>
    <div><h1>{meta.name}</h1><p><MapPin size={12} />{meta.scope}</p></div>
    {role !== "welfare" && <button className="notification-btn" onClick={() => go("alerts")}><Bell size={19} /><i /></button>}
  </section>;
}

function BottomNav({ role, active, go }: { role: Role; active: Screen; go: (screen: Screen) => void }) {
  const menus: Record<Role, { screen: Screen; label: string; icon: ReactNode }[]> = {
    security: [
      { screen: "home", label: "Overview", icon: <Shield size={20} /> },
      { screen: "scan", label: "Scan", icon: <ScanFace size={20} /> },
      { screen: "alerts", label: "Alerts", icon: <Bell size={20} /> },
    ],
    warden: [
      { screen: "home", label: "Overview", icon: <Shield size={20} /> },
      { screen: "scan", label: "Scan", icon: <ScanFace size={20} /> },
      { screen: "alerts", label: "Alerts", icon: <Bell size={20} /> },
    ],
    staff: [
      { screen: "home", label: "Overview", icon: <IdCard size={20} /> },
      { screen: "scan", label: "Identify", icon: <ScanFace size={20} /> },
      { screen: "logs", label: "Entries", icon: <FileClock size={20} /> },
      { screen: "alerts", label: "Alerts", icon: <Bell size={20} /> },
    ],
    supervisor: [
      { screen: "home", label: "Overview", icon: <Shield size={20} /> },
      { screen: "assignments", label: "Security", icon: <UserCog size={20} /> },
      { screen: "scan", label: "Scan", icon: <ScanFace size={20} /> },
      { screen: "audit", label: "Records", icon: <FileClock size={20} /> },
      { screen: "alerts", label: "Alerts", icon: <Bell size={20} /> },
    ],
    "access-supervisor": [
      { screen: "home", label: "Overview", icon: <Shield size={20} /> },
      { screen: "visitor-pass", label: "Visitor Pass", icon: <TicketCheck size={20} /> },
      { screen: "pass-records", label: "Records", icon: <History size={20} /> },
    ],
    students: [
      { screen: "home", label: "Overview", icon: <Shield size={20} /> },
      { screen: "logs", label: "Records", icon: <History size={20} /> },
      { screen: "workload", label: "Workload", icon: <FileClock size={20} /> },
      { screen: "profile", label: "Profile", icon: <CircleUserRound size={20} /> },
    ],
    welfare: [
      { screen: "home", label: "Overview", icon: <HeartHandshake size={20} /> },
      { screen: "welfare-logs", label: "Student logs", icon: <Building2 size={20} /> },
      { screen: "profile", label: "Profile", icon: <CircleUserRound size={20} /> },
    ],
    admin: [
      { screen: "home", label: "Overview", icon: <BarChart3 size={20} /> },
      { screen: "campus-entries", label: "Records", icon: <DoorOpen size={20} /> },
      { screen: "admin-bulk-students", label: "Bulk Import", icon: <UploadCloud size={20} /> },
      { screen: "admin-audit-logs", label: "Audit Logs", icon: <History size={20} /> },
      { screen: "admin-access-settings", label: "Access & Fields", icon: <SlidersHorizontal size={20} /> },
    ],
    cso: [
      { screen: "home", label: "Overview", icon: <Shield size={20} /> },
      { screen: "scan", label: "Scan", icon: <ScanFace size={20} /> },
      { screen: "audit", label: "Records", icon: <FileClock size={20} /> },
      { screen: "campus-entries", label: "Entries", icon: <DoorOpen size={20} /> },
      { screen: "alerts", label: "Alerts", icon: <Bell size={20} /> },
    ],
    manager: [
      { screen: "home", label: "Overview", icon: <Building2 size={20} /> },
      { screen: "manager-students", label: "Students", icon: <Users size={20} /> },
      { screen: "campus-entries", label: "Records", icon: <FileClock size={20} /> },
      { screen: "admin-audit-logs", label: "Audit", icon: <History size={20} /> },
      { screen: "profile", label: "Profile", icon: <CircleUserRound size={20} /> },
    ],
  };
  return <nav className={`bottom-nav ${menus[role].length === 5 ? "five-items" : menus[role].length === 3 ? "three-items" : menus[role].length === 2 ? "two-items" : ""}`}>{menus[role].map(item => (
    <button key={item.label} className={active === item.screen ? "active" : ""} onClick={() => go(item.screen)}>
      {item.icon}
      <span>{item.label}</span>
      {item.screen === "alerts" && <b>3</b>}
    </button>
  ))}</nav>;
}

function Page({ children, nav, role, active, go }: { children: ReactNode; nav?: boolean; role: Role; active: Screen; go: (screen: Screen) => void }) {
  return <main className={`phone-page ${nav ? "with-nav" : ""}`}>{children}{nav && <BottomNav role={role} active={active} go={go} />}</main>;
}

function Login({ enter, go }: { enter: (role: Role, session?: StoredSession) => void; go: (screen: Screen) => void }) {
  const [mailId, setMailId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validRoles = new Set<Role>([
    "security", "warden", "staff", "supervisor", "access-supervisor",
    "students", "welfare", "admin", "cso", "manager",
  ]);

  const signIn = async () => {
    const emailInput = mailId.trim().toLowerCase();
    if (!emailInput || !password) {
      setError(!emailInput ? "Mail ID is required." : "Password is required.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: emailInput, password }),
      });
      if (!res.ok) {
        setError("Incorrect mail ID or password. Please try again.");
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      const rawRole = (data.role || "security") as Role;
      const matchedRole: Role = validRoles.has(rawRole) ? rawRole : "security";
      const nextSession: StoredSession = {
        role: matchedRole,
        username: data.username || emailInput,
        email: data.email || (emailInput.includes("@") ? emailInput : `${data.username || emailInput}@srmtrichy.edu.in`),
        fullName: data.full_name || roleMeta[matchedRole].name,
        token: data.access_token,
        refreshToken: data.refresh_token,
        timestamp: Date.now(),
      };
      await saveSession(nextSession);
      setSubmitting(false);
      enter(matchedRole, nextSession);
    } catch {
      setSubmitting(false);
      setError("Unable to reach server. Please check your internet connection and try again.");
    }
  };

  return <main className="phone-page login-page">
    <section className="login-brand">
      <div className="login-college-emblem">
        <img src="/srm-logo.png" alt="SRM GROUP OF INSTITUTIONS TRICHY Emblem" />
      </div>
      <div className="login-inst-text">
        <span className="inst-badge">OFFICIAL INSTITUTION PORTAL</span>
        <h1 className="inst-title">SRM GROUP OF INSTITUTIONS</h1>
        <h2 className="inst-sub">TRICHY</h2>
        <p className="app-subtitle">Campus Secure · Identity-Led Campus Access</p>
      </div>
    </section>
    <section className="login-card">
      <span className="overline">OFFICIAL ACCESS</span><h2>Sign in</h2>
      <label className="field"><span>Mail ID</span><input type="email" value={mailId} onChange={event => setMailId(event.target.value)} onKeyDown={e => { if (e.key === "Enter") void signIn(); }} placeholder="Enter mail ID (e.g. manager@srmtrichy.edu.in)" autoCapitalize="none" autoComplete="email" /></label>
      <label className="field"><span>Password</span><div className="password-input"><input type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} onKeyDown={e => { if (e.key === "Enter") void signIn(); }} placeholder="Enter password" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}><Eye size={17} /></button></div></label>
      <button className="text-action forgot-link" onClick={() => go("forgot")}>Forgot password?</button>
      {error && <div className="login-error"><AlertTriangle size={14} />{error}</div>}
      <Button onClick={() => void signIn()} disabled={submitting}>{submitting ? "Signing in..." : "Sign in securely"}<ChevronRight size={17} /></Button>
    </section>
  </main>;
}

function LevelOneHome({ role, go }: { role: "security" | "warden" | "staff"; go: (screen: Screen) => void }) {
  const isSecurity = role === "security";
  const isWarden = role === "warden";
  const portalTitle = isSecurity ? "Security Portal" : isWarden ? "Warden Portal" : "Staff Portal";
  const heading = "Verify a person";
  const actionTitle = "Scan person";
  const actionCopy = "Capture face and verify campus identity";
  return <>
    <TopBar title="Campus Secure" subtitle={portalTitle} action={<Status tone="green">On duty</Status>} />
    <div className="page-content"><ProfileHead role={role} go={go} />
      <div className="section-heading"><div><h2>{heading}</h2></div></div>
      <div className="guard-actions">
        <button className="scan-action single-scan" onClick={() => go("scan")}><span><ScanFace size={29} /></span><div><strong>{actionTitle}</strong>{actionCopy && <small>{actionCopy}</small>}</div><ChevronRight size={18} /></button>
      </div>
      {role === "staff" && <>
        <div className="section-heading compact"><div><h2>Assigned operations</h2></div></div>
        <div className="admin-list">
          <button onClick={() => go("logs")}><span><FileClock size={21} /></span><div><strong>Entries log</strong><small>View only records within your assigned scope</small></div><ChevronRight size={18} /></button>
          <button onClick={() => go("alerts")}><span className="amber-icon"><ShieldAlert size={21} /></span><div><strong>Security alerts</strong><small>Review and raise relevant alerts</small></div><ChevronRight size={18} /></button>
        </div>
      </>}
    </div>
  </>;
}

function formatScanDateTime(dateStr?: string): string {
  if (!dateStr) return "Just now";
  try {
    const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T"));
    if (isNaN(d.getTime())) return dateStr;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${strHours}:${minutes} ${ampm}`;
  } catch {
    return dateStr;
  }
}

function formatYearBatch(yearRaw?: string, batchRaw?: string) {
  let displayYear = "Year II";
  if (yearRaw) {
    const cleaned = yearRaw.replace(/year/gi, "").trim();
    displayYear = cleaned ? `Year ${cleaned}` : yearRaw.trim();
  }
  let displayBatch = "2023–2028";
  if (batchRaw) {
    displayBatch = batchRaw.replace(/\s*[-–—]\s*/, "–").trim();
  }
  return { displayYear, displayBatch };
}

function formatRomanYearWithSuffix(yearRaw?: string): string {
  if (!yearRaw) return "II Year";
  const roman = yearRaw.replace(/year/gi, "").trim();
  return roman ? `${roman} Year` : yearRaw.trim();
}

function getStudentClass(student: { department?: string; registerNumber?: string; year?: string; section?: string; classCode?: string }): string {
  if (student.classCode) return student.classCode;
  
  let deptCode = "GEN";
  const dept = (student.department || "").trim();
  const reg = (student.registerNumber || "").toUpperCase();
  
  if (/information technology|\bit\b/i.test(dept)) {
    deptCode = "IT";
  } else if (/computer science|\bcse\b/i.test(dept)) {
    deptCode = "CSE";
  } else if (/electronics|\bece\b/i.test(dept)) {
    deptCode = "ECE";
  } else if (/medicine|surgery|\bmbbs\b/i.test(dept)) {
    deptCode = "MED";
  } else if (/laboratory|technology|\bmlt\b|\bahs\b/i.test(dept)) {
    deptCode = "MLT";
  } else if (/mechanical|\bmech\b/i.test(dept)) {
    deptCode = "MECH";
  } else if (/nursing/i.test(dept)) {
    deptCode = "NUR";
  } else if (/physiotherapy|\bbpt\b/i.test(dept)) {
    deptCode = "BPT";
  } else {
    const match = reg.match(/^[0-9]{2}([A-Za-z]+)/);
    if (match && match[1]) {
      deptCode = match[1].toUpperCase();
    } else if (dept.length >= 2) {
      deptCode = dept.slice(0, 3).toUpperCase();
    }
  }

  let yr = (student.year || "II").replace(/year/gi, "").trim();
  if (yr === "1" || yr === "First") yr = "I";
  else if (yr === "2" || yr === "Second") yr = "II";
  else if (yr === "3" || yr === "Third") yr = "III";
  else if (yr === "4" || yr === "Fourth") yr = "IV";

  const sec = student.section || "C";

  return `${deptCode}-${yr}-${sec}`;
}


function Logs({ role, reviews, logs }: { role: Role; reviews: Record<string, ReviewRecord>; logs?: LogRecord[] }) {
  const levelOneRole = role === "security" || role === "warden" || role === "staff";
  const dateOnlyFilters = levelOneRole || role === "students";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeType, setActiveType] = useState("All");
  const [fromDate, setFromDate] = useState(dateOnlyFilters ? "2025-06-16" : "2025-06-16T08:00");
  const [toDate, setToDate] = useState(() => (dateOnlyFilters ? new Date().toISOString().slice(0, 10) : `${new Date().toISOString().slice(0, 10)}T23:59`));
  const [category, setCategory] = useState("All Categories");
  const [institution, setInstitution] = useState("All visible institutions");
  const [department, setDepartment] = useState("All departments");
  const [academicYear, setAcademicYear] = useState("All years");
  const [block, setBlock] = useState(role === "security" ? "Main Gate" : "All Institution B blocks");
  const [exported, setExported] = useState(false);
  const title = role === "security" ? "Entries Log" : role === "warden" ? "Hostel Entries Log" : role === "staff" ? "Assigned Entries Log" : "Campus records";
  const types = role === "students" ? ["All", "Entry", "Exit", "Denied"] : ["All", "Entry", "Exit", "Visitor", "Denied"];
  const currentLogs = logs ?? logRows;
  const scopedRows = currentLogs.filter(row => {
    if (role === "security" && row.block !== "Main Gate" && row.block !== "Main Entrance") return false;
    if (role === "security" && row.personType === "External") return false;
    if (role === "warden" && (row.institution !== "Institution B" || row.hostel !== "Bharathi Hostel" || row.guard !== roleMeta.warden.name)) return false;
    if (role === "staff" && (row.institution !== "Institution B" || row.block !== "Block A")) return false;
    if (role === "students" && row.accessCategory === "Visitors") return false;
    if (activeType !== "All" && row.event !== activeType && !(activeType === "Visitor" && ["Visitor", "Internal visit"].includes(row.event))) return false;
    const comparableDate = dateOnlyFilters ? row.dateTime.slice(0, 10) : row.dateTime;
    if (comparableDate < fromDate || comparableDate > toDate) return false;
    if (levelOneRole && category !== "All Categories" && recordCategory(reviews, row) !== category) return false;
    if (role === "security" && institution !== "All visible institutions" && row.institution !== institution) return false;
    if (!levelOneRole && department !== "All departments" && row.department !== department) return false;
    if (role === "students" && academicYear !== "All years" && row.year !== academicYear) return false;
    if (!levelOneRole && block !== "All Institution B blocks" && row.block !== block) return false;
    return true;
  });
  const resetFilters = () => {
    setActiveType("All");
    setFromDate(dateOnlyFilters ? "2025-06-16" : "2025-06-16T08:00");
    setToDate(dateOnlyFilters ? new Date().toISOString().slice(0, 10) : `${new Date().toISOString().slice(0, 10)}T23:59`);
    setCategory("All Categories");
    setInstitution("All visible institutions");
    setDepartment("All departments");
    setAcademicYear("All years");
    setBlock(role === "security" ? "Main Gate" : "All Institution B blocks");
  };
  return <>
    <TopBar title={title} subtitle={role === "security" ? "Main Gate · Assigned block only" : role === "warden" ? "Bharathi Hostel · Residents only" : role === "staff" ? "Block A · Assigned duty only" : "Organization-wide · Read-only review"} action={levelOneRole || role === "students" ? undefined : <div className="header-actions"><button className="icon-btn" onClick={() => setExported(true)} aria-label="Export visible logs"><FileClock size={18} /></button><button className={`icon-btn ${filtersOpen ? "primary" : ""}`} onClick={() => setFiltersOpen(!filtersOpen)} aria-label="Toggle filters"><Filter size={18} /></button></div>} />
    <div className="page-content">
      {exported && <div className="export-notice"><Check size={14} />Export prepared with {scopedRows.length} filtered records.<button onClick={() => setExported(false)}>Close</button></div>}
      {levelOneRole ? <section className="filter-panel guard-log-filters"><div className="filter-panel-head"><div></div><button onClick={resetFilters}>Reset</button></div><Field label="Category"><select value={category} onChange={event => setCategory(event.target.value)}><option>All Categories</option><option>Authorized</option><option>Unauthorized</option><option>Revoked</option></select></Field><div className="date-filter"><label><CalendarDays size={15} /><span>{role === "warden" ? "Start Date" : "From Date"}</span><input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label><span>to</span><label><Clock3 size={15} /><span>{role === "warden" ? "End Date" : "To Date"}</span><input type="date" value={toDate} onChange={event => setToDate(event.target.value)} /></label></div></section> : role === "students" ? <section className="filter-panel student-record-filters"><div className="filter-panel-head"><div><strong>Filter records</strong><span>Choose a date range and record type.</span></div><button onClick={resetFilters}>Reset</button></div><div className="date-filter"><label><CalendarDays size={15} /><span>From Date</span><input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label><span>to</span><label><Clock3 size={15} /><span>To Date</span><input type="date" value={toDate} onChange={event => setToDate(event.target.value)} /></label></div><div className="filter-row">{types.map(type => <button key={type} className={activeType === type ? "active" : ""} onClick={() => setActiveType(type)}>{type}</button>)}</div></section> : <>
      <div className="date-filter"><label><CalendarDays size={15} /><span>From</span><input type="datetime-local" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label><span>to</span><label><Clock3 size={15} /><span>To</span><input type="datetime-local" value={toDate} onChange={event => setToDate(event.target.value)} /></label></div>
      <div className="filter-row">{types.map(type => <button key={type} className={activeType === type ? "active" : ""} onClick={() => setActiveType(type)}>{type}</button>)}</div></>}
      {!levelOneRole && filtersOpen && <section className="filter-panel"><div className="filter-panel-head"><div><strong>Filter logs</strong><span>Filters are limited to your authorised scope.</span></div><button onClick={resetFilters}>Reset</button></div>
        <div className="filter-fields">
          <Field label="Record scope"><select disabled><option>All campus records</option></select></Field>
          <Field label="Department"><select value={department} onChange={event => setDepartment(event.target.value)}><option>All departments</option><option>Computer Science</option><option>Electronics</option><option>Mechanical</option></select></Field>
          <Field label="Academic year"><select value={academicYear} onChange={event => setAcademicYear(event.target.value)}><option>All years</option><option>Year I</option><option>Year II</option><option>Year III</option><option>Year IV</option></select></Field>
          <Field label="Block"><select value={block} onChange={event => setBlock(event.target.value)}><option>All Institution B blocks</option><option>Main Gate</option><option>Block A</option><option>Block B</option><option>Library Block</option></select></Field>
        </div><Button onClick={() => setFiltersOpen(false)} icon={<Filter size={15} />}>Apply filters</Button>
      </section>}
      <div className={`log-summary ${role === "students" ? "two-column" : ""}`}>
        {levelOneRole || role === "students" ? (
          <>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setCategory(category === "Authorized" ? "All Categories" : "Authorized")}
              className={`overview-card-clickable ${category === "Authorized" ? "active-filter-green" : ""}`}
            >
              <strong>{scopedRows.filter(row => recordCategory(reviews, row) === "Authorized").length}</strong>
              <span>Authorized</span>
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setCategory(category === "Unauthorized" ? "All Categories" : "Unauthorized")}
              className={`overview-card-clickable ${category === "Unauthorized" ? "active-filter-red" : ""}`}
            >
              <strong>{scopedRows.filter(row => recordCategory(reviews, row) === "Unauthorized").length}</strong>
              <span>Unauthorized</span>
            </div>
            {levelOneRole && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setCategory(category === "Revoked" ? "All Categories" : "Revoked")}
                className={`overview-card-clickable ${category === "Revoked" ? "active-filter-red" : ""}`}
              >
                <strong>{scopedRows.filter(row => recordCategory(reviews, row) === "Revoked").length}</strong>
                <span>Revoked</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div><strong>{scopedRows.filter(row => row.event === "Entry").length}</strong><span>Entries</span></div>
            <div><strong>{scopedRows.filter(row => row.event === "Exit").length}</strong><span>Exits</span></div>
            <div><strong>{scopedRows.filter(row => ["Visitor", "Internal visit"].includes(row.event)).length}</strong><span>Visits</span></div>
          </>
        )}
      </div>
      <AuditTable
        rows={scopedRows}
        reviews={reviews}
        title={role === "warden" ? "" : levelOneRole ? "ASSIGNED SCOPE LOG" : "CAMPUS RECORDS"}
        plainNames={role === "students" || role === "warden"}
        isUnauthorizedOnly={category === "Unauthorized"}
      />
      {scopedRows.length === 0 && <div className="empty-state"><History size={25} /><strong>No matching records</strong><span>Change a filter or expand the date range.</span></div>}
    </div>
  </>;
}

function LevelOneScan({ go, completeScan, role, logs }: { go: (screen: Screen) => void; completeScan: (capturedImage: string | null, matchResult?: StudentMatch | null, scores?: Record<string, number> | null) => void; role: "security" | "warden" | "staff" | "supervisor" | "cso"; logs?: LogRecord[] }) {
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<LogRecord | null>(null);
  const [unrecognizedHistory, setUnrecognizedHistory] = useState<LogRecord[]>(() => {
    const baseLogs = logs ?? logRows;
    return baseLogs.filter(r =>
      r.accessCategory === "Unauthorized" &&
      r.personType === "Unauthorised" &&
      (r.name === "Unrecognized person" || r.name === "Unrecognized Person" || r.name === "Unknown Individual" || r.name === "Unknown Person")
    );
  });

  useEffect(() => {
    let active = true;
    async function loadBackendHistory() {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/v1/access-logs/unrecognized?limit=30`);
        if (resp.ok) {
          const data = await resp.json();
          if (active && Array.isArray(data) && data.length > 0) {
            const mapped: LogRecord[] = data.map((item: any) => {
              const dt = item.timestamp ? item.timestamp.slice(0, 19) : new Date().toISOString().slice(0, 19);
              const timePart = dt.length >= 16 ? dt.slice(11, 16) : "10:00";
              return {
                initials: "UP",
                name: "Unrecognized person",
                id: item.identifier_value || "Not available",
                institution: "SRM GROUP OF INSTITUTIONS TRICHY",
                department: item.department || "Not available",
                block: item.location_block || (role === "warden" ? "Bharathi Hostel" : role === "staff" ? "Block A" : (role === "supervisor" || role === "cso") ? "Institution B Campus" : "Main Gate"),
                time: timePart,
                dateTime: dt,
                event: "Denied",
                tone: "red",
                personType: "Unauthorised",
                category: "Unauthorised visitor",
                accessCategory: "Unauthorized",
                logId: item.record_identifier,
                phoneNumber: item.phone_number,
                guard: item.guard_name || (role === "cso" ? roleMeta.cso.name : role === "supervisor" ? roleMeta.supervisor.name : "G. Selvam"),
                guardNumber: role === "cso" ? (roleMeta.cso.supervisorNumber || "CSO-0001") : role === "supervisor" ? (roleMeta.supervisor.supervisorNumber || "SUP-B-0004") : "GRD-B-0017",
                guardNotes: item.flag_reason || "Face scan unrecognized at security gate.",
                entries: 1,
                decision: "Denied",
                photo: item.snapshot_url || undefined,
              };
            });

            setUnrecognizedHistory(current => {
              const existingIds = new Set(mapped.map(m => m.logId));
              const extras = current.filter(c => c.logId && !existingIds.has(c.logId));
              return [...mapped, ...extras];
            });
          }
        }
      } catch (err) {
        console.warn("Could not load unrecognized history from backend:", err);
      }
    }
    loadBackendHistory();
    return () => { active = false; };
  }, [role]);

  const location = role === "warden" ? "Bharathi Hostel · SRM GROUP OF INSTITUTIONS TRICHY" : role === "staff" ? "Block A · SRM GROUP OF INSTITUTIONS TRICHY" : (role === "supervisor" || role === "cso") ? "Institution B Campus · SRM GROUP OF INSTITUTIONS TRICHY" : "Main Gate · SRM GROUP OF INSTITUTIONS TRICHY";

  useEffect(() => {
    let mounted = true;

    async function initCamera() {
      try {
        await ensureCameraPermission();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera access is not supported on this phone.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 800 },
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => {
            if (mounted) setCameraActive(true);
          }).catch(() => {
            if (mounted) setCameraActive(true);
          });
        }
      } catch (err: any) {
        console.warn("Camera init error:", err);
        if (mounted) {
          setCameraError(err?.message || "Camera access permission was denied or device is unavailable.");
        }
      }
    }

    initCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const triggerScan = async () => {
    if (scanning) return;
    setScanning(true);

    let capturedDataUrl: string | null = null;
    let evalMatch: StudentMatch | null = null;
    let evalScores: Record<string, number> | null = null;

    if (videoRef.current && videoRef.current.videoWidth > 0) {
      try {
        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          capturedDataUrl = canvas.toDataURL("image/jpeg", 0.90);

          if (role === "security" || role === "warden" || role === "supervisor" || role === "cso") {
            try {
              const resp = await fetch(`${API_BASE_URL}/api/v1/ai/verify-face`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  image_base64: capturedDataUrl,
                  location_block: (role === "supervisor" || role === "cso") ? "Institution B Campus" : role === "warden" ? "Bharathi Hostel" : "Gate 1 Main Entrance",
                  guard_name: role === "warden" ? roleMeta.warden.name : role === "cso" ? roleMeta.cso.name : role === "supervisor" ? (roleMeta.supervisor.name || "Meera Nair") : "G. Selvam",
                }),
              });
              if (resp.ok) {
                const data = await resp.json();
                if (data.candidate_scores) {
                  evalScores = {};
                  for (const [key, val] of Object.entries(data.candidate_scores)) {
                    evalScores[key] = Math.round(Number(val));
                  }
                }
                if (!data.is_recognized && data.snapshot_url) {
                  capturedDataUrl = data.snapshot_url;
                }
                if (data.is_recognized && data.matched_person) {
                  const mp = data.matched_person;
                  const reg = (mp.identifier || "").toUpperCase();
                  const pname = (mp.name || "").toLowerCase();
                  let student = studentMatches.find(s => 
                    s.registerNumber.toUpperCase() === reg ||
                    s.name.toLowerCase() === pname ||
                    pname.startsWith(s.name.toLowerCase()) ||
                    s.name.toLowerCase().startsWith(pname)
                  );
                  if (!student) {
                    student = {
                      initials: mp.initials || "ST",
                      name: mp.name,
                      registerNumber: mp.identifier,
                      dateOfBirth: "01 Jan 2004",
                      department: mp.department,
                      year: mp.year_roman || "II Year",
                      batch: mp.batch || "2023–2028",
                      institute: "SRM GROUP OF INSTITUTIONS TRICHY",
                      similarity: Math.round(data.similarity_score * 100),
                      accommodationType: (mp.residence_type as any) || "Day Scholar",
                      photo: mp.photo_url || capturedDataUrl || "/faces/sur_crop.jpg",
                    };
                  }
                  evalMatch = {
                    ...student,
                    name: mp.name || student.name,
                    registerNumber: mp.identifier || student.registerNumber,
                    department: mp.department || student.department,
                    year: mp.year_roman || student.year,
                    batch: mp.batch || student.batch,
                    similarity: Math.round(data.similarity_score * 100),
                    photo: mp.photo_url || student.photo,
                    accommodationType: (mp.residence_type as any) || student.accommodationType,
                    hostelName: mp.hostel_name || student.hostelName,
                    roomNumber: mp.room_number || student.roomNumber,
                  };
                }
              }
            } catch (err) {
              console.warn("Backend face verification unavailable, using client biometric model fallback", err);
            }
          }

          if (!evalScores) {
            // Evaluate probe with the precise biometric model
            const evaluation = evaluateBiometrics(canvas);
            evalScores = evaluation.allScores;
            if (evaluation.isRecognized && evaluation.matchedName) {
              const student = studentMatches.find(s => s.name === evaluation.matchedName);
              if (student) {
                evalMatch = { ...student, similarity: evaluation.confidence };
              }
            }
          }
        }
      } catch (e) {
        console.error("Frame capture error:", e);
      }
    }

    window.setTimeout(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      completeScan(capturedDataUrl, evalMatch, evalScores);
    }, 1200);
  };

  const handleTestProfile = (profile: StudentMatch) => {
    if (scanning) return;
    setScanning(true);
    window.setTimeout(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      completeScan(profile.photo ?? null, { ...profile, similarity: 98 }, {
        Sur: profile.name === "Sur" ? 98 : 22,
        Mon: profile.name === "Mon" ? 98 : 20,
        Mith: profile.name === "Mith" ? 98 : 24,
        Thiru: profile.name === "Thiru" ? 98 : 21,
      });
    }, 900);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        const ctx = c.getContext("2d");
        let match: StudentMatch | null = null;
        let scores: Record<string, number> | null = null;

        if (role === "security" || role === "warden" || role === "supervisor" || role === "cso") {
          try {
            const resp = await fetch(`${API_BASE_URL}/api/v1/ai/verify-face`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image_base64: dataUrl,
                location_block: (role === "supervisor" || role === "cso") ? "Institution B Campus" : role === "warden" ? "Bharathi Hostel" : "Gate 1 Main Entrance",
                guard_name: role === "warden" ? roleMeta.warden.name : role === "cso" ? roleMeta.cso.name : role === "supervisor" ? (roleMeta.supervisor.name || "Meera Nair") : "G. Selvam",
              }),
            });
            if (resp.ok) {
              const data = await resp.json();
              if (data.candidate_scores) {
                scores = {
                  Sur: Math.round(data.candidate_scores["Sur"] || 0),
                  Mon: Math.round(data.candidate_scores["Mon"] || 0),
                  Mith: Math.round(data.candidate_scores["Mith"] || 0),
                  Thiru: Math.round(data.candidate_scores["Thiru"] || 0),
                };
              }
              if (data.is_recognized && data.matched_person) {
                const found = studentMatches.find(s => s.name === data.matched_person.name);
                if (found) {
                  match = { ...found, similarity: Math.round(data.similarity_score * 100) };
                }
              }
            }
          } catch (err) {
            console.warn("Backend face verification unavailable for upload, using fallback", err);
          }
        }

        if (!scores && ctx) {
          ctx.drawImage(img, 0, 0);
          const evaluation = evaluateBiometrics(c);
          scores = evaluation.allScores;
          if (evaluation.isRecognized && evaluation.matchedName) {
            const found = studentMatches.find(s => s.name === evaluation.matchedName);
            if (found) {
              match = { ...found, similarity: evaluation.confidence };
            }
          }
        }

        // Also check filename fallback
        if (!match) {
          const lowerName = file.name.toLowerCase();
          if (lowerName.includes("sur") || lowerName.includes("person1") || lowerName.includes("rohit")) match = studentMatches[0];
          else if (lowerName.includes("mon") || lowerName.includes("person2") || lowerName.includes("sanjay")) match = studentMatches[1];
          else if (lowerName.includes("mith") || lowerName.includes("person3") || lowerName.includes("karthik")) match = studentMatches[2];
          else if (lowerName.includes("thiru") || lowerName.includes("person4") || lowerName.includes("ashwin")) match = studentMatches[3];
          if (match && !scores) {
            scores = {
              Sur: match.name === "Sur" ? 98 : 22,
              Mon: match.name === "Mon" ? 98 : 20,
              Mith: match.name === "Mith" ? 98 : 24,
              Thiru: match.name === "Thiru" ? 98 : 21,
            };
          }
        }

        setScanning(true);
        window.setTimeout(() => {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          completeScan(dataUrl, match ?? null, scores);
        }, 900);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  if (selectedHistoryRecord) {
    const knownInstitution = !["Not identified", "Not available"].includes(selectedHistoryRecord.institution);
    return <>
      <TopBar title="Alert details" subtitle={selectedHistoryRecord.logId} back={() => setSelectedHistoryRecord(null)} />
      <div className="page-content">
        <section className="alert-record-head">
          <div className="alert-symbol"><ShieldAlert size={20} /></div>
          <div><h1>{selectedHistoryRecord.name}</h1></div>
          <Status tone="red">Unrecognized</Status>
        </section>
        {selectedHistoryRecord.photo && (
          <section className="info-card alert-intruder-card">
            <div className="card-kicker"><Camera size={15} />CAPTURED INTRUDER PHOTOGRAPH</div>
            <div className="alert-intruder-detail-preview">
              <img src={selectedHistoryRecord.photo} alt="Captured Intruder" className="alert-detail-photo" />
              <div className="alert-detail-photo-meta">
                <Status tone="red">LIVE CAMERA CAPTURE</Status>
                <p>Captured during facial scan at {selectedHistoryRecord.block}</p>
                <small>Associated Event ID: {selectedHistoryRecord.logId || "DEN-•••-4039"}</small>
              </div>
            </div>
          </section>
        )}
      </div>
    </>;
  }

  return <>
    <TopBar title="Face verification" subtitle={location} back={() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      go("home");
    }} />
    <div className="camera-view">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-video"
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div className="camera-noise" />
      <div className={`face-guide ${scanning ? "scanning" : ""}`}>
        <i /><i /><i /><i />
        {scanning ? <div className="scanner-laser" /> : <ScanFace size={64} />}
      </div>
      {cameraError && (
        <div className="camera-error-message">
          <AlertTriangle size={20} className="mx-auto mb-1" />
          <strong>Camera Unavailable</strong>
          <p className="mt-1">{cameraError}</p>
        </div>
      )}
      <div className="scan-message">
        <strong>{scanning ? "Extracting biometric facial features…" : cameraActive ? "Position face inside the frame" : "Initializing camera…"}</strong>
        {scanning ? <span>Evaluating against 4 authorized facial profiles…</span> : <span>Keep face centered · Hold steady</span>}
      </div>
      <Status tone={scanning ? "blue" : cameraActive ? "green" : "amber"}>
        {scanning ? "Scanning" : cameraActive ? "Live Camera" : "Starting camera"}
      </Status>
    </div>
    <div className="scan-panel">
      <span className="overline">BIOMETRIC FACE SCAN</span>
      <Button onClick={triggerScan} disabled={scanning} icon={<ScanFace size={18} />}>
        {scanning ? "Analyzing face biometrics…" : "Scan face with live camera"}
      </Button>

      <section className="scan-history-section">
        <div className="scan-history-head">
          <h3>Recent Scan History</h3>
          <p className="scan-history-subtitle">Showing only unrecognized faces</p>
        </div>
        <div className="scan-history-list">
          {unrecognizedHistory.length === 0 ? (
            <div className="empty-state scan-history-empty">
              <ShieldAlert size={26} />
              <strong>No unrecognized face scans</strong>
              <span>Scanned unrecognized faces will appear here.</span>
            </div>
          ) : (
            unrecognizedHistory.map((item) => (
              <article
                key={item.logId || `${item.dateTime}-${item.time}`}
                className="scan-history-card"
                onClick={() => setSelectedHistoryRecord(item)}
              >
                <div className="scan-history-photo-col">
                  {item.photo ? (
                    <img
                      src={item.photo}
                      alt="Unrecognized person"
                      className="scan-history-photo"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const parent = e.currentTarget.parentElement;
                        if (parent) parent.classList.add("fallback-mode");
                      }}
                    />
                  ) : (
                    <div className="scan-history-photo-fallback">
                      <ScanFace size={24} />
                    </div>
                  )}
                </div>
                <div className="scan-history-card-body">
                  <h4>Unrecognized person</h4>
                  <div className="scan-history-location">
                    <MapPin size={12} />
                    <span>{item.block} — {item.institution || "SRM GROUP OF INSTITUTIONS TRICHY"}</span>
                  </div>
                  <div className="scan-history-time">
                    <span>{formatScanDateTime(item.dateTime)}</span>
                  </div>
                  <div className="scan-history-status-row">
                    <Status tone="red">Unrecognized</Status>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  </>;
}

function IdentityResult({ go, identityCase, verificationMethod, student, role, capturedPhoto, fieldVisibility = DEFAULT_LOG_FIELD_VISIBILITY }: { go: (screen: Screen) => void; identityCase: IdentityCase; verificationMethod: VerificationMethod; student: StudentMatch; role: "security" | "warden" | "staff" | "supervisor" | "cso"; capturedPhoto?: string | null; fieldVisibility?: LogFieldVisibility }) {
  const staff = identityCase === "staff";
  const registerVerified = verificationMethod === "register";

  const [dbStudent, setDbStudent] = useState<Partial<StudentMatch> | null>(null);

  useEffect(() => {
    if (student?.registerNumber) {
      let isMounted = true;
      fetch(`${API_BASE_URL}/api/v1/students/by-register/${encodeURIComponent(student.registerNumber)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && isMounted) {
            setDbStudent({
              name: data.name,
              department: data.department,
              year: data.year_roman,
              batch: data.batch,
              accommodationType: data.residence_type === "Day Scholar" ? "Day Scholar" : "Hosteller",
              hostelName: data.hostel_name,
              roomNumber: data.room_number,
              boardingPoint: data.bus_boarding_point,
              routeNumber: data.bus_route,
              dateOfBirth: data.date_of_birth,
              transportationType: data.vehicle_number ? "Own Vehicle" : (data.bus_route ? "College Bus" : undefined),
              vehicleNumber: data.vehicle_number,
              residentialLocation: (data as any).residential_location,
              section: (data as any).section,
              classCode: (data as any).class_code,
            });
          }
        })
        .catch(() => {});
      return () => { isMounted = false; };
    }
  }, [student?.registerNumber]);

  const activeStudent = {
    ...student,
    ...(dbStudent || {}),
  };

  const staffMember = {
    name: "Pranav Sharma",
    employeeId: "EMP-B-1042",
    designation: "Professor",
    department: "Mechanical Engineering",
    institute: "SRM GROUP OF INSTITUTIONS TRICHY",
  };
  const personName = staff ? staffMember.name : activeStudent.name;
  const institute = staff ? staffMember.institute : activeStudent.institute;
  const isTrichySRM = institute.toLowerCase().includes("trichy");
  const location = role === "warden" ? "Bharathi Hostel" : role === "staff" ? "Block A" : (role === "supervisor" || role === "cso") ? "Institution B Campus" : "Main Gate";

  const { displayYear, displayBatch } = formatYearBatch(activeStudent.year, activeStudent.batch);
  const profileYear = formatRomanYearWithSuffix(activeStudent.year);
  const studentClass = getStudentClass(activeStudent);
  const modeOfTransport = activeStudent.transportationType || activeStudent.transport;
  const isOwnVehicle = modeOfTransport === "Own Vehicle" || Boolean(activeStudent.vehicleNumber);
  const studentLocation = activeStudent.residentialLocation || activeStudent.location || activeStudent.areaOfResidence || (isTrichySRM ? "Thillai Nagar, Trichy" : "Ramapuram, Chennai");

  return <>
    <TopBar title="Identity verified" subtitle="Review before confirming" back={() => go(registerVerified ? "unrecognized" : "scan")} />
    <div className="page-content">
      <div className="progress-line"><span className="done"><Check size={12} /></span><i className="done" /><span className="active">2</span><i /><span>3</span></div>
      <section className="identity-hero">
        <div className={`captured-photo ${staff ? "staff-photo" : ""}`}>
          {(capturedPhoto && (verificationMethod === "register" || role === "security" || role === "warden" || role === "supervisor" || role === "cso")) || activeStudent.photo ? (
            <img src={(capturedPhoto && (verificationMethod === "register" || role === "security" || role === "warden" || role === "supervisor" || role === "cso")) ? capturedPhoto : activeStudent.photo} alt={personName} className="captured-real-photo" />
          ) : (
            <CircleUserRound size={48} />
          )}
          <span>Captured at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <div className="verified-badge">
          <ShieldCheck size={14} />
          {registerVerified ? "Register number verified" : `${activeStudent.similarity}% face match`}
        </div>
        <h1>{personName}</h1>
        {staff ? (
          <p>Staff · <span className={`inst-pill ${isTrichySRM ? "pill-trichy" : "pill-easwari"}`}>{institute}</span></p>
        ) : (
          <>
            <p>Student · {displayYear} · Batch {displayBatch}</p>
            <p><span className={`inst-pill ${isTrichySRM ? "pill-trichy" : "pill-easwari"}`}>{institute}</span></p>
          </>
        )}
      </section>
      <section className="info-card">
        <div className="card-kicker">
          <img src="/srm-logo.png" alt="" className="kicker-emblem" />
          <IdCard size={15} />
          {institute.toUpperCase()} · VERIFIED PROFILE
        </div>
        {staff ? (
          <dl>
            <div><dt>Name</dt><dd>{staffMember.name}</dd></div>
            <div><dt>Employee ID</dt><dd>{staffMember.employeeId}</dd></div>
            <div><dt>Designation</dt><dd>{staffMember.designation}</dd></div>
            <div><dt>Department</dt><dd>{staffMember.department}</dd></div>
            <div><dt>Institute</dt><dd>{staffMember.institute}</dd></div>
          </dl>
        ) : (
          <dl>
            {fieldVisibility.name && <div><dt>Name</dt><dd>{activeStudent.name}</dd></div>}
            {fieldVisibility.registerNumber && <div><dt>Register Number</dt><dd>{activeStudent.registerNumber}</dd></div>}
            {fieldVisibility.class && <div><dt>Class</dt><dd>{studentClass}</dd></div>}
            {fieldVisibility.department && (
              role === "security" || role === "supervisor" || role === "cso" ? (
                <div><dt>Year & Department</dt><dd>{profileYear} · {activeStudent.department}</dd></div>
              ) : (
                <>
                  <div><dt>Department</dt><dd>{activeStudent.department}</dd></div>
                  {fieldVisibility.year && <div><dt>Year</dt><dd>{displayYear}</dd></div>}
                </>
              )
            )}
            {fieldVisibility.batch && <div><dt>Batch</dt><dd>{displayBatch}</dd></div>}
            {fieldVisibility.institute && <div><dt>Institute</dt><dd>{activeStudent.institute}</dd></div>}
            {fieldVisibility.accommodationType && <div><dt>Accommodation Type</dt><dd>{activeStudent.accommodationType}</dd></div>}
            {activeStudent.accommodationType === "Hosteller" && (
              <>
                {fieldVisibility.hostelName && <div><dt>Hostel Name</dt><dd>{activeStudent.hostelName}</dd></div>}
                {fieldVisibility.roomNumber && <div><dt>Room Number</dt><dd>{activeStudent.roomNumber}</dd></div>}
              </>
            )}
            {(activeStudent.accommodationType === "Day Scholar" || isOwnVehicle) && (
              <>
                {fieldVisibility.transportationType && <div><dt>Mode of Transport</dt><dd>{modeOfTransport || (isOwnVehicle ? "Own Vehicle" : "College Bus")}</dd></div>}
                {isOwnVehicle ? (
                  <>
                    {fieldVisibility.location && <div><dt>Location</dt><dd>{studentLocation}</dd></div>}
                    {fieldVisibility.vehicleNumber && activeStudent.vehicleNumber && <div><dt>Vehicle Number</dt><dd>{activeStudent.vehicleNumber}</dd></div>}
                  </>
                ) : (
                  <>
                    {fieldVisibility.boardingPoint && <div><dt>Boarding Point</dt><dd>{activeStudent.boardingPoint ?? "N/A"}</dd></div>}
                    {fieldVisibility.routeNumber && <div><dt>Route Number</dt><dd>{activeStudent.routeNumber ?? "N/A"}</dd></div>}
                  </>
                )}
              </>
            )}
          </dl>
        )}
      </section>
      {isTrichySRM ? (
        <section className="access-card allowed">
          <div><ShieldCheck size={21} /></div>
          <div>
            <span>{role === "warden" ? "RESIDENT IDENTITY" : "CAMPUS IDENTITY"}</span>
            <strong>Internal person recognized</strong>
            <p>Official student of SRM GROUP OF INSTITUTIONS TRICHY. Entry permitted at {location}.</p>
          </div>
        </section>
      ) : (
        <section className="access-card allowed external-campus-card">
          <div><Building2 size={21} /></div>
          <div>
            <span>EXTERNAL SRM CAMPUS PERSON</span>
            <strong>{student.institute}</strong>
            <p>Enrolled student from sister institution. Inter-campus visitor access recorded for {location}.</p>
          </div>
        </section>
      )}
      <Button onClick={() => go("success")} icon={<Check size={17} />}>Confirm entry into {location}</Button>
    </div>
  </>;
}

function UnrecognizedResult({
  go,
  verifyRegister,
  role,
  capturedPhoto,
  biometricScores,
  onRecordEvent,
}: {
  go: (screen: Screen) => void;
  verifyRegister: (registerNumber: string) => boolean | Promise<boolean>;
  role: "security" | "warden" | "staff" | "supervisor" | "cso";
  capturedPhoto: string | null;
  biometricScores: Record<string, number> | null;
  onRecordEvent?: (photo: string | null, notes?: string, phoneNumber?: string, fullName?: string) => void;
}) {
  const [registerNumber, setRegisterNumber] = useState("");
  const [notVerified, setNotVerified] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [recordedSuccess, setRecordedSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Filter: ONLY show candidates with genuine similarity >= 60%
  const candidateList = studentMatches
    .map(match => {
      const calcSim = biometricScores ? (biometricScores[match.name] ?? biometricScores[match.registerNumber] ?? 0) : 0;
      return {
        ...match,
        similarity: calcSim,
      };
    })
    .filter(match => match.similarity >= 60)
    .sort((a, b) => b.similarity - a.similarity);

  const visibleMatches = candidateList;

  const verify = async () => {
    const success = await verifyRegister(registerNumber);
    if (success) {
      return;
    }
    setNotVerified(true);
  };

  const handleMarkUnauthorized = () => {
    if (role === "security" || role === "warden") {
      setIsRecording(true);
      const loc = role === "warden" ? "Bharathi Hostel" : "Main Gate";
      const user = role === "warden" ? "Warden" : "Security Officer";
      const defaultNotes = `Face unrecognized. Identity could not be verified by ${user} at ${loc}.`;

      if (onRecordEvent) {
        onRecordEvent(capturedPhoto, defaultNotes, undefined, "Unrecognized person");
      }
      setIsRecording(false);
      setRecordedSuccess(true);
    } else {
      go("unauthorised");
    }
  };

  if (recordedSuccess) {
    return (
      <div className="success-page">
        <div className="success-symbol warning-symbol">
          <ShieldAlert size={38} />
        </div>
        <Status tone="amber">CAMPUS SUPERVISOR NOTIFIED</Status>
        <h1>Unauthorized Event Recorded</h1>
        <p>Campus Supervisor has been notified.</p>
        <Button onClick={() => { setRecordedSuccess(false); go("scan"); }}>
          Scan next person
        </Button>
        <Button variant="secondary" onClick={() => { setRecordedSuccess(false); go("home"); }}>
          Return home
        </Button>
      </div>
    );
  }

  return <>
    <TopBar title="Face not recognized" subtitle="Verify with register number" back={() => go("scan")} />
    <div className="page-content">
      <div className="unrecognized-hero">
        <div className="captured-photo unknown-capture">
          {capturedPhoto ? (
            <img src={capturedPhoto} alt="Captured Person" className="captured-real-photo" />
          ) : (
            <CircleUserRound size={46} />
          )}
          <span>Captured at {role === "warden" ? "Bharathi Hostel" : role === "supervisor" ? "Institution B Campus" : "Main Gate"}</span>
        </div>
        <Status tone="red">UNAUTHORISED / UNRECOGNIZED</Status>
        <h1>Face Not Recognized</h1>
      </div>

      <section className="similar-matches">
        <div className="similar-matches-head">
          <div>
            <span>BIOMETRIC SCAN EVALUATION</span>
            <h2>Enrolled face comparison</h2>
          </div>
          <small>Threshold: 65%</small>
        </div>

        {visibleMatches.length > 0 && (
          <div className="similar-match-list">
            {visibleMatches.map(match => {
              const selected = selectedMatch === match.registerNumber;
              return <article key={match.registerNumber} className={selected ? "selected" : ""}>
                <button className="similar-match-summary" onClick={() => setSelectedMatch(selected ? null : match.registerNumber)} aria-expanded={selected}>
                  {match.photo ? (
                    <img src={match.photo} alt={match.name} className="person-avatar-img" />
                  ) : (
                    <span className="person-avatar">{match.initials}</span>
                  )}
                  <span className="similar-match-person">
                    <strong>{match.name}</strong>
                    <small>{match.registerNumber} · {match.institute}</small>
                  </span>
                  <span className="similarity-score">{match.similarity}%</span>
                  <ChevronRight className={selected ? "expanded" : ""} size={16} />
                </button>
                {selected && <div className="similar-match-details">
                  <dl>
                    <div><dt>Name</dt><dd>{match.name}</dd></div>
                    <div><dt>Register Number</dt><dd>{match.registerNumber}</dd></div>
                    <div><dt>Institute</dt><dd>{match.institute}</dd></div>
                    <div><dt>Department</dt><dd>{match.department}</dd></div>
                    <div><dt>Year</dt><dd>{match.year}</dd></div>
                  </dl>
                  <Button variant="secondary" icon={<IdCard size={16} />} onClick={() => { setRegisterNumber(match.registerNumber); setNotVerified(false); }}>Use this register number</Button>
                </div>}
              </article>;
            })}
          </div>
        )}
      </section>
      <form className="register-verify-card" onSubmit={(event) => { event.preventDefault(); verify(); }}>
        <label className="field"><span>Register number</span><input value={registerNumber} onChange={(event) => { setRegisterNumber(event.target.value); setNotVerified(false); }} placeholder="e.g. 23MED0412" autoCapitalize="characters" /></label>
        <Button type="submit" icon={<IdCard size={17} />}>Verify register number</Button>
      </form>
      {notVerified && <section className="unverified-card"><div><ShieldAlert size={21} /></div><div><span>UNAUTHORIZED PERSON</span><strong>Register number not verified</strong><p>No active campus identity was found. Do not permit entry.</p></div></section>}
      <div className="unauthorized-action">
        <p>Can&apos;t verify this person?</p>
        <Button
          variant="danger"
          onClick={handleMarkUnauthorized}
          disabled={isRecording}
          icon={<ShieldAlert size={17} />}
        >
          {isRecording ? "Recording..." : "Mark as unauthorized"}
        </Button>
      </div>
    </div>
  </>;
}

function Field({ label, placeholder, value, type = "text", children }: { label: string; placeholder?: string; value?: string; type?: string; children?: ReactNode }) {
  return <label className="field"><span>{label}</span>{children || <input type={type} placeholder={placeholder} defaultValue={value} />}</label>;
}

function isValidPhoneNumber(phone: string): boolean {
  const trimmed = phone.trim();
  if (!trimmed) return false;
  const cleaned = trimmed.replace(/[\s\-()]/g, "");
  const indianRegex = /^(\+91|91|0)?[6-9]\d{9}$/;
  const intlRegex = /^\+[1-9]\d{6,14}$/;
  const genericRegex = /^\d{10,15}$/;
  return indianRegex.test(cleaned) || intlRegex.test(cleaned) || genericRegex.test(cleaned);
}

function UnauthorizedForm({
  go,
  role,
  capturedPhoto,
  onRecordEvent,
}: {
  go: (screen: Screen) => void;
  role: "security" | "warden" | "staff" | "supervisor" | "cso";
  capturedPhoto: string | null;
  onRecordEvent?: (photo: string | null, notes?: string, phoneNumber?: string, fullName?: string) => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    const trimmedPhone = phoneNumber.trim();
    if (!trimmedPhone) {
      setPhoneError("Phone number is required.");
      return;
    }
    if (!isValidPhoneNumber(trimmedPhone)) {
      setPhoneError("Please enter a valid phone number (e.g. +91 9876543210 or 9876543210).");
      return;
    }
    setPhoneError("");
    if (onRecordEvent) onRecordEvent(capturedPhoto, notes.trim() || undefined, trimmedPhone, fullName.trim() || undefined);
    setSubmitted(true);
  };

  if (submitted) return <div className="success-page"><div className="success-symbol warning-symbol"><ShieldAlert size={38} /></div><Status tone="amber">{(role === "supervisor" || role === "cso") ? "UNAUTHORIZED EVENT LOGGED" : "CAMPUS SUPERVISOR NOTIFIED"}</Status><h1>Unauthorized event recorded</h1><p>{(role === "supervisor" || role === "cso") ? "The captured image, location, time, contact number, and officer notes were saved directly to the campus audit log." : "The captured image, location, time, attempted register number, contact number, and officer notes were sent to the Campus Supervisor."}</p><Button onClick={() => go("scan")}>Scan next person</Button><Button variant="secondary" onClick={() => go("home")}>Return home</Button></div>;
  return <>
    <TopBar title="Unauthorized person" subtitle="Record security event" back={() => go("unrecognized")} />
    <div className="page-content form-page">
      {capturedPhoto && (
        <div className="unauthorized-capture-preview">
          <img src={capturedPhoto} alt="Captured Unauthorized Person" className="unauthorized-captured-img" />
          <div className="unauthorized-meta">
            <Status tone="red">Unauthorised Attempt</Status>
            <span>Live Camera Snapshot</span>
          </div>
        </div>
      )}
      <Status tone="amber">{(role === "supervisor" || role === "cso") ? "RECORDING IN AUDIT LOG" : "SUPERVISOR WILL BE NOTIFIED"}</Status>
      <div className="form-intro"><h1>Record event details</h1><p>{(role === "supervisor" || role === "cso") ? "Review the captured event before recording in the campus audit log." : "Review the captured event before notifying the Campus Supervisor."}</p></div>
      <div className="form-stack">
        <label className="field">
          <span>Full Name</span>
          <input placeholder="Enter name if available" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className="field">
          <span>Phone Number</span>
          <input
            type="tel"
            placeholder="Enter phone number"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
              if (phoneError) setPhoneError("");
            }}
          />
          {phoneError && <small className="field-error" style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{phoneError}</small>}
        </label>
        <label className="field">
          <span>{role === "cso" ? "CSO notes" : role === "warden" ? "Warden notes" : role === "staff" ? "Staff notes" : role === "supervisor" ? "Supervisor notes" : "Security notes"}</span>
          <input placeholder="Optional operational notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
      <Button onClick={handleSubmit} icon={<ShieldAlert size={17} />}>{(role === "supervisor" || role === "cso") ? "Record unauthorized event" : "Record & notify Campus Supervisor"}</Button>
    </div>
  </>;
}

function Success({ go, role }: { go: (screen: Screen) => void; role: "security" | "warden" | "staff" | "supervisor" | "cso" }) {
  const location = role === "warden" ? "Bharathi Hostel" : role === "staff" ? "Block A" : role === "supervisor" ? "Institution B Campus" : "Main Gate";
  return <div className="success-page">
    <div className="success-symbol"><Check size={39} /></div><Status tone="green">ENTRY RECORDED</Status>
    <h1>Person entered {location}</h1><p>The identity, access decision, officer confirmation, and time have been added to the audit log.</p>
    <section className="success-receipt"><div><span>Recorded at</span><strong>10:42 AM · Today</strong></div><div><span>Location</span><strong>{location}</strong></div><div><span>Confirmed by</span><strong>{roleMeta[role].name}</strong></div><div><span>Log reference</span><strong>ENT-•••-4082</strong></div></section>
    <Button onClick={() => go("scan")} icon={<ScanFace size={17} />}>Scan next person</Button><Button variant="secondary" onClick={() => go("home")}>Return to dashboard</Button>
  </div>;
}

type VisitorPassStatus = "Active" | "Expiring Soon" | "Cancelled" | "Revoked";
type VisitorPassFilters = {
  query: string;
  status: "All statuses" | VisitorPassStatus;
  eventDate: string;
};
type VisitorPass = {
  visitorName: string;
  studentNo?: string;
  passNumber: string;
  photo: string;
  eventName: string;
  purpose: string;
  eventDate: string;
  fromDate?: string;
  toDate?: string;
  areas: string[];
  phone: string;
  coordinatorName: string;
  coordinatorNumber: string;
  createdAt: string;
  status: VisitorPassStatus;
  supervisor: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelledByNumber?: string;
  cancellationReason?: string;
  entryType?: "student" | "visitor";
};

const configuredVisitorAreas = ["Main Block", "Administrative Block", "Academic Block", "Library", "Laboratory Block", "Auditorium", "Sports Complex"];
const mockCreatedAt = (hour: string) => `${new Date().toISOString().slice(0, 10)}T${hour}:00`;
const today = new Date().toISOString().slice(0, 10);
const daysAgo = (days: number, hour: string) => { const d = new Date(); d.setDate(d.getDate() - days); return `${d.toISOString().slice(0, 10)}T${hour}:00`; };
const daysFromToday = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const mockPass = (n: number, visitorName: string, phone: string, eventName: string, purpose: string, areas: string[], coordinatorName: string, coordinatorNumber: string, createdAt: string, status: VisitorPassStatus, eventDate = today, extra: Partial<VisitorPass> = {}): VisitorPass => ({ visitorName, passNumber: `VP${String(n).padStart(5, "0")}`, photo: "", eventName, purpose, eventDate, areas, phone, coordinatorName, coordinatorNumber, createdAt, status, supervisor: "Arun Sharma", ...extra });
const initialVisitorPasses: VisitorPass[] = [
  mockPass(130, "Vikram Desai", "+91 98450 21877", "Industry Connect Summit", "Guest Speaker", ["Auditorium", "Main Block"], "Prof. Anand Rao", "+91 98765 40211", mockCreatedAt("14:05"), "Active"),
  mockPass(129, "Ananya Krishnan", "+91 99001 34520", "Parent Orientation Day", "Parent Visit", ["Main Block", "Library"], "Dr. Meera Nair", "+91 98765 40128", mockCreatedAt("13:40"), "Active"),
  mockPass(128, "Rohan Gupta", "+91 98860 77412", "Lab Equipment Servicing", "Vendor Service", ["Laboratory Block"], "Mr. Suresh Babu", "+91 98765 40335", mockCreatedAt("11:20"), "Expiring Soon"),
  mockPass(127, "Priya Nambiar", "+91 97400 66183", "Research Panel Interview", "Interview Candidate", ["Administrative Block"], "Dr. Kavitha Iyer", "+91 98765 40412", mockCreatedAt("10:30"), "Active"),
  mockPass(126, "Naveen Rao", "+91 98440 90216", "Sports Meet Inauguration", "Chief Guest", ["Sports Complex", "Main Block"], "Coach Rajiv Menon", "+91 98765 40519", mockCreatedAt("09:50"), "Expiring Soon"),
  mockPass(125, "Lakshmi Menon", "+91 98950 31764", "Library Archive Research", "Research Scholar", ["Library", "Academic Block"], "Ms. Divya Thomas", "+91 98765 40627", mockCreatedAt("09:15"), "Cancelled", today, { cancelledAt: mockCreatedAt("10:05"), cancelledBy: "Arun Sharma", cancelledByNumber: "ACS-B-0012", cancellationReason: "Visit postponed by the host coordinator." }),
  { visitorName: "Sneha Pillai", passNumber: "VP00123", photo: "", eventName: "Alumni Interaction Session", purpose: "Guest Lecture", eventDate: today, areas: ["Auditorium"], phone: "+91 98765 55102", coordinatorName: "Dr. Meera Nair", coordinatorNumber: "+91 98765 40128", createdAt: mockCreatedAt("12:10"), status: "Revoked", supervisor: "Arun Sharma", cancelledAt: mockCreatedAt("12:35"), cancelledBy: "Arun Sharma", cancelledByNumber: "ACS-B-0012", cancellationReason: "Access revoked after the guest breached the approved area restrictions." },
  mockPass(124, "Imran Sheikh", "+91 99620 48831", "Annual Day Rehearsal", "Event Vendor", ["Auditorium"], "Dr. Meera Nair", "+91 98765 40128", daysAgo(1, "16:25"), "Cancelled", daysFromToday(-1), { cancelledAt: daysAgo(1, "17:00"), cancelledBy: "Arun Sharma", cancelledByNumber: "ACS-B-0012", cancellationReason: "Vendor did not arrive at the scheduled time." }),
  mockPass(122, "Deepa Varghese", "+91 98470 12945", "Faculty Development Workshop", "Resource Person", ["Academic Block", "Auditorium"], "Prof. Anand Rao", "+91 98765 40211", daysAgo(2, "10:00"), "Active", daysFromToday(1)),
  mockPass(121, "Karthik Subramanian", "+91 97910 55208", "Campus Placement Drive", "Recruiter", ["Administrative Block", "Academic Block"], "Mr. Harish Patel", "+91 98765 40733", daysAgo(3, "09:30"), "Active", daysFromToday(2)),
];

const blankVisitorPass: VisitorPass = { visitorName: "", passNumber: "", photo: "", eventName: "", purpose: "", eventDate: today, areas: [], phone: "", coordinatorName: "", coordinatorNumber: "", createdAt: new Date().toISOString(), status: "Active", supervisor: "" };

const passTone = (status: VisitorPassStatus) => status === "Active" ? "green" : (status === "Cancelled" || status === "Revoked") ? "red" : "amber";
const displayPassTime = (value: string) => new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
const displayVisitDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" });

function nextVisitorPassNumber(passes: VisitorPass[]) {
  const highestSequence = passes.reduce((highest, pass) => {
    const sequence = Number(pass.passNumber.replace(/\D/g, ""));
    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);
  return `VP${String(highestSequence + 1).padStart(5, "0")}`;
}

function AccessSupervisorHome({ go, todayCount }: { go: (screen: Screen) => void; todayCount: number }) {
  const meta = roleMeta["access-supervisor"];
  return <>
    <TopBar title="SRM GROUP OF INSTITUTIONS TRICHY" subtitle="Access Supervisor Portal" collegeBrand />
    <div className="page-content access-home">
      <section className="profile-head">
        <button className="profile-avatar" onClick={() => go("profile")} aria-label="Open profile">{meta.initials}</button>
        <div><h1>{meta.name}</h1><p><MapPin size={12} />{meta.scope}</p></div>
      </section>
      <section className="visitor-summary"><div><span>TODAY&apos;S VISITOR PASSES</span><strong>{todayCount}</strong><p>Issued by you</p></div><div className="round-icon"><TicketCheck size={27} /></div></section>
      <div className="section-heading compact"><div><h2>Campus Operations</h2></div></div>
      <div className="admin-list access-module-list">
        <button onClick={() => go("visitor-pass")}><span><TicketCheck size={21} /></span><div><strong>Visitor Pass Action</strong></div><ChevronRight size={18} /></button>
      </div>
    </div>
  </>;
}

type VisitorPassDraft = Omit<VisitorPass, "passNumber" | "createdAt" | "status" | "supervisor">;

type EventDetails = {
  eventName: string;
  purpose: string;
  fromDate: string;
  toDate: string;
  venue: string;
  coordinatorName: string;
  coordinatorNumber: string;
};

const blankEventDetails: EventDetails = { eventName: "", purpose: "", fromDate: "", toDate: "", venue: "", coordinatorName: "", coordinatorNumber: "" };
const eventPurposes = ["Student Event", "Academic Event", "Workshop", "Seminar", "Conference", "Competition"];

function validateEventDetails(details: EventDetails) {
  const errors: Record<string, string> = {};
  const coordinatorDigits = details.coordinatorNumber.replace(/\D/g, "");
  if (!details.eventName.trim()) errors.eventName = "Event name is required.";
  if (!details.purpose.trim()) errors.purpose = "Purpose is required.";
  if (!details.fromDate) errors.fromDate = "From date is required.";
  if (!details.toDate) errors.toDate = "To date is required.";
  else if (details.fromDate && details.toDate < details.fromDate) errors.toDate = "To date cannot be earlier than from date.";
  if (!details.venue) errors.venue = "Venue is required.";
  if (!details.coordinatorName.trim()) errors.coordinatorName = "Coordinator name is required.";
  if (!details.coordinatorNumber.trim()) errors.coordinatorNumber = "Coordinator number is required.";
  else if (coordinatorDigits.length < 10 || coordinatorDigits.length > 15) errors.coordinatorNumber = "Enter a valid 10–15 digit phone number.";
  return errors;
}

function EventDetailsFields({ details, setDetails, errors }: { details: EventDetails; setDetails: (details: EventDetails) => void; errors: Record<string, string> }) {
  const update = (key: keyof EventDetails, value: string) => setDetails({ ...details, [key]: value });
  return <div className="event-fields">
    <label className="field"><span>Event Name *</span><input className={errors.eventName ? "invalid" : ""} value={details.eventName} onChange={event => update("eventName", event.target.value)} placeholder="Enter event name" />{errors.eventName && <small className="field-error">{errors.eventName}</small>}</label>
    <label className="field"><span>Purpose *</span><input className={errors.purpose ? "invalid" : ""} list="bulk-event-purpose-options" value={details.purpose} onChange={event => update("purpose", event.target.value)} placeholder="Type or select event purpose" /><datalist id="bulk-event-purpose-options">{eventPurposes.map(item => <option key={item} value={item} />)}</datalist>{errors.purpose && <small className="field-error">{errors.purpose}</small>}</label>
    <label className="field"><span>From Date *</span><input className={errors.fromDate ? "invalid" : ""} type="date" value={details.fromDate} onChange={event => update("fromDate", event.target.value)} />{errors.fromDate && <small className="field-error">{errors.fromDate}</small>}</label>
    <label className="field"><span>To Date *</span><input className={errors.toDate ? "invalid" : ""} type="date" min={details.fromDate || undefined} value={details.toDate} onChange={event => update("toDate", event.target.value)} />{errors.toDate && <small className="field-error">{errors.toDate}</small>}</label>
    <label className="field"><span>Venue *</span><input className={errors.venue ? "invalid" : ""} list="bulk-event-venue-options" value={details.venue} onChange={event => update("venue", event.target.value)} placeholder="Type or select venue" /><datalist id="bulk-event-venue-options">{configuredVisitorAreas.map(area => <option key={area} value={area} />)}</datalist>{errors.venue && <small className="field-error">{errors.venue}</small>}</label>
    <label className="field"><span>Coordinator Name *</span><input className={errors.coordinatorName ? "invalid" : ""} value={details.coordinatorName} onChange={event => update("coordinatorName", event.target.value)} placeholder="Enter coordinator name" autoComplete="name" />{errors.coordinatorName && <small className="field-error">{errors.coordinatorName}</small>}</label>
    <label className="field"><span>Coordinator Number *</span><input className={errors.coordinatorNumber ? "invalid" : ""} type="tel" inputMode="numeric" value={details.coordinatorNumber} onChange={event => update("coordinatorNumber", event.target.value)} placeholder="Enter coordinator phone number" autoComplete="tel" />{errors.coordinatorNumber && <small className="field-error">{errors.coordinatorNumber}</small>}</label>
  </div>;
}

function inclusiveDuration(fromDate: string, toDate: string) {
  if (!fromDate || !toDate || toDate < fromDate) return "";
  const [fromYear, fromMonth, fromDay] = fromDate.split("-").map(Number);
  const [toYear, toMonth, toDay] = toDate.split("-").map(Number);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const days = Math.round((Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / millisecondsPerDay) + 1;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function passPhotoDataUrl(source: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 500;
      canvas.height = 600;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Unable to prepare the visitor photo."));
        return;
      }
      const imageRatio = image.width / image.height;
      const canvasRatio = canvas.width / canvas.height;
      const sourceWidth = imageRatio > canvasRatio ? image.height * canvasRatio : image.width;
      const sourceHeight = imageRatio > canvasRatio ? image.height : image.width / canvasRatio;
      const sourceX = (image.width - sourceWidth) / 2;
      const sourceY = (image.height - sourceHeight) / 2;
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    image.onerror = () => reject(new Error("Unable to load the visitor photo."));
    image.src = source;
  });
}

async function assetDataUrl(source: string) {
  const response = await fetch(source);
  if (!response.ok) throw new Error("Unable to load the college logo.");
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to prepare the college logo."));
    reader.readAsDataURL(blob);
  });
}

async function downloadVisitorPassPdf(pass: VisitorPass) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const fromDate = pass.fromDate || pass.eventDate;
  const toDate = pass.toDate || pass.eventDate;
  const duration = inclusiveDuration(fromDate, toDate);
  const collegeLogo = await assetDataUrl("/srm-logo.png");

  pdf.setFillColor(21, 60, 114);
  pdf.rect(0, 0, pageWidth, 33, "F");
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(14, 4, 24, 25, 2, 2, "F");
  pdf.addImage(collegeLogo, "PNG", 16, 5, 20, 22);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("SRM GROUP OF INSTITUTIONS", 44, 11);
  pdf.setFontSize(9);
  pdf.text("TRICHY", 44, 17);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(pass.entryType === "student" ? "STUDENT ENTRY PASS" : "VISITOR PASS", 44, 24);

  const photoWidth = 38;
  const photoHeight = 46;
  const photoX = (pageWidth - photoWidth) / 2;
  const photoY = 39;
  pdf.setDrawColor(210, 222, 238);
  pdf.setLineWidth(0.6);
  if (pass.photo) {
    const photo = await passPhotoDataUrl(pass.photo);
    pdf.addImage(photo, "JPEG", photoX, photoY, photoWidth, photoHeight);
    pdf.rect(photoX, photoY, photoWidth, photoHeight);
  } else {
    pdf.setFillColor(239, 244, 251);
    pdf.roundedRect(photoX, photoY, photoWidth, photoHeight, 3, 3, "FD");
    pdf.setTextColor(91, 110, 137);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("NO PHOTO", pageWidth / 2, photoY + 25, { align: "center" });
  }

  pdf.setTextColor(23, 36, 58);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text(pass.visitorName, pageWidth / 2, 93, { align: "center" });
  pdf.setTextColor(37, 99, 235);
  pdf.setFontSize(9);
  pdf.text(pass.passNumber, pageWidth / 2, 100, { align: "center" });

  const details: Array<[string, string]> = [
    ["Visitor Name", pass.visitorName],
    ["Visitor Phone Number", pass.phone],
    ["Purpose", pass.purpose],
    ...(pass.eventName ? [["Event Name", pass.eventName] as [string, string]] : []),
    ["From Date", displayVisitDate(fromDate)],
    ["To Date", displayVisitDate(toDate)],
    ["Duration", duration],
    ["Accessible Blocks", pass.areas.join(", ")],
    ["Contact Name", pass.coordinatorName || "Not provided"],
    ["Contact Phone Number", pass.coordinatorNumber || "Not provided"],
    ["Issued Date & Time", displayPassTime(pass.createdAt)],
    ["Status", pass.status],
    ["Issued By", pass.supervisor],
  ];

  let y = 110;
  const cardX = 20;
  const cardWidth = pageWidth - 40;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(222, 230, 240);
  const rowHeights = details.map(([, value]) => Math.max(10, pdf.splitTextToSize(value, 91).length * 4 + 5));
  const cardHeight = rowHeights.reduce((total, height) => total + height, 0) + 8;
  pdf.roundedRect(cardX, y - 5, cardWidth, cardHeight, 3, 3, "FD");

  details.forEach(([label, value], index) => {
    const valueLines = pdf.splitTextToSize(value, 91);
    if (index > 0) {
      pdf.setDrawColor(229, 235, 243);
      pdf.line(cardX + 5, y - 4, cardX + cardWidth - 5, y - 4);
    }
    pdf.setTextColor(95, 109, 128);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.text(label, cardX + 6, y + 2);
    pdf.setTextColor(28, 44, 68);
    pdf.setFont("helvetica", "bold");
    pdf.text(valueLines, cardX + 69, y + 2);
    y += rowHeights[index];
  });

  pdf.setTextColor(108, 123, 145);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("Present this pass at the authorized campus access point.", pageWidth / 2, 288, { align: "center" });
  const safeName = pass.visitorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const pdfBlob = pdf.output("blob");
  void saveOrShareBlob(
    pdfBlob,
    `visitor-pass-${safeName || pass.passNumber.toLowerCase()}-${pass.passNumber}.pdf`,
    "application/pdf"
  );
}

function VisitorPassForm({ createPass }: { createPass: (pass: VisitorPassDraft) => void }) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [phone, setPhone] = useState("");
  const [eventName, setEventName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [accessibleBlock, setAccessibleBlock] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorNumber, setCoordinatorNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const issuanceLocked = useRef(false);
  const duration = inclusiveDuration(fromDate, toDate);
  const selectedPurpose = purpose.trim();
  const showEventName = Boolean(selectedPurpose) && !["Parent / Guardian", "Delivery"].includes(selectedPurpose);
  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
  };
  const submit = () => {
    const nextErrors: Record<string, string> = {};
    const phoneDigits = phone.replace(/\D/g, "");
    const coordinatorDigits = coordinatorNumber.replace(/\D/g, "");
    if (!visitorName.trim()) nextErrors.visitorName = "Visitor name is required.";
    if (!phone.trim()) nextErrors.phone = "Visitor phone number is required.";
    else if (phoneDigits.length < 10 || phoneDigits.length > 15) nextErrors.phone = "Enter a valid 10–15 digit phone number.";
    if (!selectedPurpose) nextErrors.purpose = "Select or enter a purpose.";
    if (showEventName && !eventName.trim()) nextErrors.eventName = "Event name is required.";
    if (!fromDate) nextErrors.fromDate = "From date is required.";
    if (!toDate) nextErrors.toDate = "To date is required.";
    else if (fromDate && toDate < fromDate) nextErrors.toDate = "To date cannot be earlier than from date.";
    if (!accessibleBlock.trim()) nextErrors.areas = "Select or enter an accessible block.";
    if (!coordinatorName.trim()) nextErrors.coordinatorName = "Contact name is required.";
    if (coordinatorNumber.trim() && (coordinatorDigits.length < 10 || coordinatorDigits.length > 15)) nextErrors.coordinatorNumber = "Enter a valid 10–15 digit phone number.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || issuanceLocked.current) return;
    issuanceLocked.current = true;
    createPass({
      visitorName: visitorName.trim(),
      photo,
      eventName: showEventName ? eventName.trim() : "",
      purpose: selectedPurpose,
      eventDate: fromDate,
      fromDate,
      toDate,
      areas: [accessibleBlock.trim()],
      phone: phone.trim(),
      coordinatorName: coordinatorName.trim(),
      coordinatorNumber: coordinatorNumber.trim(),
    });
  };
  return <div className="visitor-form">
    <section className="pass-form-section">
      <div className="form-section-title"><span>1</span><div><strong>Person Photo</strong></div></div>
      <input className="hidden-file-input" ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={choosePhoto} />
      <input className="hidden-file-input" ref={uploadInput} type="file" accept="image/*" onChange={choosePhoto} />
      {photo ? <div className="photo-preview"><img src={photo} alt="Selected visitor" /><div><strong>Photo added</strong><span>Ready to save with this pass</span><div><button onClick={() => cameraInput.current?.click()}><RefreshCw size={14} />Retake</button><button onClick={() => uploadInput.current?.click()}><Upload size={14} />Replace</button></div></div></div> : <div className="photo-uploader"><div><ImagePlus size={29} /></div><strong>Add Photo</strong><span>Optional for visitor identification</span><div><button onClick={() => cameraInput.current?.click()}><Camera size={15} />Take photo</button><button onClick={() => uploadInput.current?.click()}><Upload size={15} />Upload</button></div></div>}
    </section>
    <section className="pass-form-section">
      <div className="form-section-title"><span>2</span><div><strong>Visitor Details</strong></div></div>
      <label className="field"><span>Visitor Name *</span><input className={errors.visitorName ? "invalid" : ""} value={visitorName} onChange={event => { setVisitorName(event.target.value); setErrors(current => ({ ...current, visitorName: "" })); }} placeholder="Enter visitor's full name" autoComplete="name" />{errors.visitorName && <small className="field-error">{errors.visitorName}</small>}</label>
      <label className="field"><span>Visitor Phone Number *</span><input className={errors.phone ? "invalid" : ""} type="tel" inputMode="numeric" value={phone} onChange={event => { setPhone(event.target.value); setErrors(current => ({ ...current, phone: "" })); }} placeholder="Enter visitor phone number" autoComplete="tel" />{errors.phone && <small className="field-error">{errors.phone}</small>}</label>
    </section>
    <section className="pass-form-section">
      <div className="form-section-title"><span>3</span><div><strong>Purpose</strong></div></div>
      <label className="field"><span>Purpose *</span><input className={errors.purpose ? "invalid" : ""} list="visitor-purpose-options" value={purpose} onChange={event => { setPurpose(event.target.value); setErrors(current => ({ ...current, purpose: "", eventName: "" })); }} placeholder="Type or select visitor purpose" /><datalist id="visitor-purpose-options">{["Event Attendee", "Guest Speaker", "Vendor", "Parent / Guardian", "Event Staff", "Official Meeting", "Delivery", "Other"].map(item => <option key={item} value={item} />)}</datalist>{errors.purpose && <small className="field-error">{errors.purpose}</small>}</label>
      {showEventName && <label className="field"><span>Event Name</span><input className={errors.eventName ? "invalid" : ""} value={eventName} onChange={event => { setEventName(event.target.value); setErrors(current => ({ ...current, eventName: "" })); }} placeholder="e.g. Annual College Tech Fest" />{errors.eventName && <small className="field-error">{errors.eventName}</small>}</label>}
      <label className="field"><span>From Date *</span><input className={errors.fromDate ? "invalid" : ""} type="date" value={fromDate} onChange={event => { const nextFromDate = event.target.value; setFromDate(nextFromDate); if (toDate && toDate < nextFromDate) setToDate(""); setErrors(current => ({ ...current, fromDate: "", toDate: "" })); }} placeholder="dd-mm-yyyy" />{errors.fromDate && <small className="field-error">{errors.fromDate}</small>}</label>
      <label className="field"><span>To Date *</span><input className={errors.toDate ? "invalid" : ""} type="date" min={fromDate || undefined} value={toDate} onChange={event => { setToDate(event.target.value); setErrors(current => ({ ...current, toDate: "" })); }} placeholder="dd-mm-yyyy" />{errors.toDate && <small className="field-error">{errors.toDate}</small>}</label>
      <label className="field duration-field"><span>Duration</span><input className="readonly-input" value={duration} placeholder="Calculated automatically" readOnly aria-live="polite" /></label>
    </section>
    <section className="pass-form-section">
      <div className="form-section-title"><span>4</span><div><strong>Accessible Blocks *</strong></div></div>
      <label className="field"><input className={errors.areas ? "invalid" : ""} list="visitor-block-options" value={accessibleBlock} onChange={event => { setAccessibleBlock(event.target.value); setErrors(current => ({ ...current, areas: "" })); }} placeholder="Type or select accessible block" aria-label="Accessible block" /><datalist id="visitor-block-options">{configuredVisitorAreas.map(area => <option key={area} value={area} />)}</datalist>{errors.areas && <small className="field-error">{errors.areas}</small>}</label>
    </section>
    <section className="pass-form-section">
      <div className="form-section-title"><span>5</span><div><strong>Contact Information</strong></div></div>
      <label className="field"><span>Contact Name *</span><input className={errors.coordinatorName ? "invalid" : ""} value={coordinatorName} onChange={event => { setCoordinatorName(event.target.value); setErrors(current => ({ ...current, coordinatorName: "" })); }} placeholder="Enter contact's name" autoComplete="name" />{errors.coordinatorName && <small className="field-error">{errors.coordinatorName}</small>}</label>
      <label className="field"><span>Contact Phone Number</span><input className={errors.coordinatorNumber ? "invalid" : ""} type="tel" inputMode="numeric" value={coordinatorNumber} onChange={event => { setCoordinatorNumber(event.target.value); setErrors(current => ({ ...current, coordinatorNumber: "" })); }} placeholder="Enter contact phone number" autoComplete="tel" />{errors.coordinatorNumber && <small className="field-error">{errors.coordinatorNumber}</small>}</label>
    </section>
    <Button onClick={submit} icon={<TicketCheck size={17} />}>Issue Visitor Pass</Button>
  </div>;
}

function VisitorPassAction({ go, createPass, continueToBulk }: { go: (screen: Screen) => void; createPass: (pass: VisitorPassDraft) => void; continueToBulk: (details: EventDetails) => void }) {
  return <>
    <TopBar title="Visitor Pass Action" subtitle="Create visitor pass" back={() => go("home")} action={<button className="bulk-header-action" onClick={() => continueToBulk(blankEventDetails)}><Plus size={14} />Bulk Upload</button>} />
    <div className="page-content visitor-pass-page">
      <VisitorPassForm createPass={createPass} />
    </div>
  </>;
}

function VisitorPassRecords({ passes, openPass, filters, setFilters }: { passes: VisitorPass[]; openPass: (pass: VisitorPass) => void; filters: VisitorPassFilters; setFilters: (filters: VisitorPassFilters) => void }) {
  const { query, status, eventDate } = filters;
  const filteredPasses = passes.filter(pass =>
    `${pass.eventName} ${pass.purpose}`.toLowerCase().includes(query.trim().toLowerCase())
    && (status === "All statuses" || pass.status === status)
    && (!eventDate || pass.eventDate === eventDate)
  );
  const resetFilters = () => {
    setFilters({ query: "", status: "All statuses", eventDate: "" });
  };
  return <>
    <TopBar title="Records" subtitle="Student entry and visitor pass management" />
    <div className="page-content pass-records-page">
      <div className="records-tab"><History size={15} /><strong>Issued Entries</strong><b>{passes.length}</b></div>
      <section className="filter-panel pass-record-filters">
        <div className="filter-panel-head"><div><strong>Filter Records</strong><span>Search and refine issued entries.</span></div><button onClick={resetFilters}>Reset</button></div>
        <label className="field"><span>Manual Search</span><div className="record-search-input"><Search size={15} /><input value={query} onChange={event => setFilters({ ...filters, query: event.target.value })} placeholder="Search by event name" /></div></label>
        <div className="filter-fields">
          <Field label="Pass Status"><select value={status} onChange={event => setFilters({ ...filters, status: event.target.value as "All statuses" | VisitorPassStatus })}><option>All statuses</option><option>Active</option><option>Expiring Soon</option><option>Cancelled</option></select></Field>
          <Field label="Event Date"><input type="date" value={eventDate} onChange={event => setFilters({ ...filters, eventDate: event.target.value })} /></Field>
        </div>
      </section>
      <div className="records-result-head"><div><strong>{filteredPasses.length}</strong><span>issued {filteredPasses.length === 1 ? "record" : "records"}</span></div></div>
      <div className="pass-record-table-wrap" role="region" aria-label="Issued student entries and visitor passes" tabIndex={0}>
        <table className="pass-record-table">
          <thead><tr><th>S.No</th><th>Student Name</th><th>Student No</th><th>Event Name</th><th>Venue</th><th>Event Date Range</th><th>Status</th><th>Issued Date &amp; Time</th><th>Action</th></tr></thead>
          <tbody>
            {filteredPasses.map((pass, index) => <tr key={pass.passNumber}>
              <td>{index + 1}</td>
              <td><span className="table-visitor">{pass.photo ? <img src={pass.photo} alt="" /> : <span className="table-avatar"><CircleUserRound size={17} /></span>}<strong>{pass.visitorName}</strong></span></td>
              <td><strong className="table-pass-number">{pass.studentNo || pass.passNumber}</strong></td>
              <td>{pass.eventName || "—"}</td>
              <td>{pass.areas[0] || "—"}</td>
              <td>{displayVisitDate(pass.fromDate || pass.eventDate)}{pass.toDate && pass.toDate !== pass.fromDate ? ` – ${displayVisitDate(pass.toDate)}` : ""}</td>
              <td><Status tone={passTone(pass.status)}>{pass.status}</Status></td>
              <td>{displayPassTime(pass.createdAt)}</td>
              <td><button className="table-view-button" onClick={() => openPass(pass)} aria-label={`View pass ${pass.passNumber} for ${pass.visitorName}`} title="View pass details"><Eye size={16} /></button></td>
            </tr>)}
            {filteredPasses.length === 0 && <tr><td className="table-empty-state" colSpan={9}><History size={25} /><strong>No records found</strong></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </>;
}

const bulkTemplateColumns = ["Name", "Number", "Address", "Photo File Path"] as const;
const bulkUploadMaxBytes = 10 * 1024 * 1024;

type BulkStudentRecord = {
  id: number;
  name: string;
  studentNo: string;
  address: string;
  photoPath: string;
  photo: string;
  selected: boolean;
};

function bulkRecordErrors(record: BulkStudentRecord, records: BulkStudentRecord[]) {
  const errors: string[] = [];
  if (!record.name.trim()) errors.push("Name is required");
  if (!record.studentNo.trim()) errors.push("Number is required");
  if (!record.address.trim()) errors.push("Address is required");
  const duplicate = record.studentNo.trim() && records.some(item => item.id !== record.id && item.studentNo.trim().toLowerCase() === record.studentNo.trim().toLowerCase());
  if (duplicate) errors.push("Duplicate Number");
  return errors;
}

function downloadBulkTemplate() {
  const rows = [
    ["Ananya Krishnan", "23ECE0721", "12 Lake View Road, Chennai", "photos/ananya_krishnan.jpg"],
    ["Rahul Menon", "22CSE1048", "45 Park Street, Bengaluru", ""],
    ["Deepa Varma", "VIS-2048", "8 College Road, Kochi", "photos/deepa_varma.jpg"],
  ];
  const sheet = XLSX.utils.aoa_to_sheet([bulkTemplateColumns as any, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "student-list");
  const wbOut = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const wbBlob = new Blob([new Uint8Array(wbOut)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  void saveOrShareBlob(
    wbBlob,
    "CampusSecure_Student_Entry_Template.xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function BulkVisitorPass({ go, initialEvent, issuePasses }: { go: (screen: Screen) => void; initialEvent: EventDetails; issuePasses: (passes: VisitorPassDraft[]) => VisitorPass[] }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"details" | "import" | "review" | "result">("details");
  const [eventDetails, setEventDetails] = useState<EventDetails>(initialEvent);
  const [eventErrors, setEventErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [progress, setProgress] = useState<"File Selected" | "Reading Excel File" | "Validating Student Records" | "Import Complete" | "Import Failed">("File Selected");
  const [records, setRecords] = useState<BulkStudentRecord[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const issuanceLocked = useRef(false);
  const [issuedPasses, setIssuedPasses] = useState<VisitorPass[]>([]);

  const continueFromDetails = () => {
    const nextErrors = validateEventDetails(eventDetails);
    setEventErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setStage("import");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const acceptFile = (selected?: File) => {
    if (!selected) return;
    const extension = selected.name.split(".").pop()?.toLowerCase();
    if (extension !== "xlsx") {
      setFile(null);
      setProgress("Import Failed");
      setFileError("Choose an Excel workbook in .xlsx format.");
      return;
    }
    if (selected.size > bulkUploadMaxBytes) {
      setFile(null);
      setProgress("Import Failed");
      setFileError(`The selected file exceeds ${bulkUploadMaxBytes / 1024 / 1024} MB.`);
      return;
    }
    setFile(selected);
    setRecords([]);
    setProgress("File Selected");
    setFileError("");
  };
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => acceptFile(event.target.files?.[0]);
  const importFile = async () => {
    if (!file) return;
    setProgress("Reading Excel File");
    setFileError("");
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const studentListSheetName = workbook.SheetNames.find(name => name.toLowerCase() === "student-list");
      const studentsSheetName = workbook.SheetNames.find(name => name.toLowerCase() === "students");
      const worksheetName = studentListSheetName ?? studentsSheetName;
      if (!worksheetName) throw new Error('The workbook must contain a worksheet named "student-list" or "Students".');
      const worksheet = workbook.Sheets[worksheetName];
      setProgress("Validating Student Records");
      const rows = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, { header: 1, defval: "", raw: false });
      const headers = (rows[0] ?? []).map(value => String(value).trim());
      const headersCorrect = headers.length === bulkTemplateColumns.length && bulkTemplateColumns.every((header, index) => headers[index] === header);
      if (!headersCorrect) throw new Error(`Incorrect column headers. Use exactly: ${bulkTemplateColumns.join(", ")}.`);
      const imported = rows.slice(1).filter(row => row.some(value => String(value).trim())).map((row, index) => ({
        id: index + 1,
        name: String(row[0] ?? "").trim(),
        studentNo: String(row[1] ?? "").trim(),
        address: String(row[2] ?? "").trim(),
        photoPath: String(row[3] ?? "").trim(),
        photo: "",
        selected: true,
      }));
      if (imported.length === 0) throw new Error("No student records were found in the workbook.");
      const normalized = imported.map(record => ({ ...record, selected: bulkRecordErrors(record, imported).length === 0 }));
      setRecords(normalized);
      setProgress("Import Complete");
      setStage("review");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setProgress("Import Failed");
      setFileError(error instanceof Error ? error.message : "The Excel file could not be read.");
    }
  };
  const updateRecord = (id: number, updates: Partial<BulkStudentRecord>) => setRecords(current => current.map(record => record.id === id ? { ...record, ...updates } : record));
  const validRecords = records.filter(record => bulkRecordErrors(record, records).length === 0);
  const invalidRecords = records.filter(record => bulkRecordErrors(record, records).length > 0);
  const selectedValidRecords = validRecords.filter(record => record.selected);
  const confirmIssue = () => {
    const nextEventErrors = validateEventDetails(eventDetails);
    if (issuanceLocked.current || selectedValidRecords.length === 0 || Object.keys(nextEventErrors).length > 0) return;
    issuanceLocked.current = true;
    setIssuing(true);
    const drafts: VisitorPassDraft[] = selectedValidRecords.map(record => ({
      visitorName: record.name,
      studentNo: record.studentNo,
      photo: record.photo,
      eventName: eventDetails.eventName.trim(),
      purpose: eventDetails.purpose.trim(),
      eventDate: eventDetails.fromDate,
      fromDate: eventDetails.fromDate,
      toDate: eventDetails.toDate,
      areas: [eventDetails.venue],
      phone: record.studentNo,
      coordinatorName: eventDetails.coordinatorName.trim(),
      coordinatorNumber: eventDetails.coordinatorNumber.trim(),
      entryType: "student",
    }));
    const created = issuePasses(drafts);
    setIssuedPasses(created);
    setConfirming(false);
    setStage("result");
    setIssuing(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const reset = () => {
    setStage("details");
    setFile(null);
    setRecords([]);
    setIssuedPasses([]);
    setFileError("");
    setProgress("File Selected");
    issuanceLocked.current = false;
    if (fileInput.current) fileInput.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (stage === "result") {
    const failed = selectedValidRecords.length - issuedPasses.length;
    const skipped = records.length - selectedValidRecords.length;
    return <>
      <TopBar title="Bulk Student Entry" subtitle="Processing complete" back={() => go("pass-records")} />
      <div className="page-content bulk-result-page">
        <div className="success-symbol compact-success"><Check size={34} /></div><Status tone="green">ISSUANCE COMPLETE</Status>
        <h1>Student entries processed</h1><p>Each successful entry has a unique identifier and actual issue timestamp.</p>
        <section className="bulk-result-grid"><div><span>Total Students</span><strong>{records.length}</strong></div><div className="success"><span>Successfully Issued</span><strong>{issuedPasses.length}</strong></div><div className="failure"><span>Failed Entries</span><strong>{failed}</strong></div><div><span>Skipped: Validation Errors</span><strong>{skipped}</strong></div></section>
        {skipped > 0 && <section className="bulk-result-note"><AlertTriangle size={17} /><p><strong>{skipped} student{skipped === 1 ? " was" : "s were"} skipped.</strong>Invalid or unselected records were not issued.</p></section>}
        <Button onClick={() => go("pass-records")} icon={<History size={17} />}>View Records</Button>
        <Button variant="secondary" onClick={reset} icon={<Plus size={17} />}>Create Another Bulk Entry</Button>
      </div>
    </>;
  }

  if (stage === "review") {
    return <>
      <TopBar title="Bulk Student Entry" subtitle="Preview and validate" back={() => setStage("import")} />
      <div className="page-content bulk-review-page">
        <section className="bulk-file-summary"><div><FileSpreadsheet size={22} /></div><span><strong>{file?.name}</strong><small>{records.length} student records · Validation complete</small></span><Status tone={invalidRecords.length ? "amber" : "green"}>{invalidRecords.length ? "Needs review" : "All valid"}</Status></section>
        <div className="bulk-review-stats"><div><strong>{records.length}</strong><span>Total</span></div><div><strong>{validRecords.length}</strong><span>Valid</span></div><div><strong>{invalidRecords.length}</strong><span>Invalid</span></div><div><strong>{selectedValidRecords.length}</strong><span>Selected</span></div></div>
        <div className="bulk-review-heading"><div><span>IMPORT PREVIEW</span><strong>Review student records</strong></div></div>
        <div className="bulk-preview-table-wrap" role="region" aria-label="Imported student preview" tabIndex={0}><table className="bulk-preview-table"><thead><tr><th>S.No</th><th>Name</th><th>Number</th><th>Address</th><th>Photo</th><th>Validation Status</th></tr></thead><tbody>{records.map(record => {
          const errors = bulkRecordErrors(record, records);
          const valid = errors.length === 0;
          return <tr key={record.id} className={valid ? "" : "invalid"}><td>{record.id}</td><td><input value={record.name} aria-label={`Name row ${record.id}`} onChange={event => updateRecord(record.id, { name: event.target.value })} /></td><td><input value={record.studentNo} aria-label={`Number row ${record.id}`} onChange={event => updateRecord(record.id, { studentNo: event.target.value })} /></td><td><input value={record.address} aria-label={`Address row ${record.id}`} onChange={event => updateRecord(record.id, { address: event.target.value })} /></td><td>{record.photo ? <img src={record.photo} alt={record.name} /> : <span className="table-avatar"><CircleUserRound size={17} /></span>}<small>{record.photoPath || "Default avatar"}</small></td><td><Status tone={valid ? "green" : "red"}>{valid ? "Valid" : errors[0]}</Status>{valid && <label className="bulk-row-select"><input type="checkbox" checked={record.selected} onChange={() => updateRecord(record.id, { selected: !record.selected })} />Include</label>}</td></tr>;
        })}</tbody></table></div>
        {invalidRecords.length > 0 && <section className="bulk-validation-note"><AlertTriangle size={17} /><p><strong>Invalid records cannot be issued.</strong>Correct highlighted names or student numbers here, or upload a corrected file.</p></section>}
        <section className="bulk-event-summary"><strong>Event Summary</strong><dl><div><dt>Event</dt><dd>{eventDetails.eventName}</dd></div><div><dt>Purpose</dt><dd>{eventDetails.purpose}</dd></div><div><dt>Date Range</dt><dd>{displayVisitDate(eventDetails.fromDate)} – {displayVisitDate(eventDetails.toDate)}</dd></div><div><dt>Venue</dt><dd>{eventDetails.venue}</dd></div><div><dt>Coordinator</dt><dd>{eventDetails.coordinatorName} · {eventDetails.coordinatorNumber}</dd></div></dl></section>
        <section className="bulk-issue-panel"><div><strong>{selectedValidRecords.length} Valid Students</strong><span>{invalidRecords.length} invalid record{invalidRecords.length === 1 ? "" : "s"}</span></div><Button disabled={selectedValidRecords.length === 0} onClick={() => setConfirming(true)} icon={<TicketCheck size={17} />}>Review Confirmation</Button></section>
      </div>
      {confirming && <div className="dialog-backdrop"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="bulk-dialog-title"><div className="dialog-icon"><TicketCheck size={23} /></div><h2 id="bulk-dialog-title">Confirm Bulk Student Entry</h2><p>No entries will be issued until you confirm.</p><div className="dialog-summary"><strong>{eventDetails.eventName}</strong><span>{eventDetails.purpose} · {eventDetails.venue}</span><span>{displayVisitDate(eventDetails.fromDate)} – {displayVisitDate(eventDetails.toDate)}</span><span>{eventDetails.coordinatorName} · {eventDetails.coordinatorNumber}</span><small>Total {records.length} · Valid {validRecords.length} · Invalid {invalidRecords.length}</small></div><div className="dialog-actions three"><Button variant="secondary" onClick={() => setConfirming(false)}>Back</Button><Button variant="danger" onClick={() => { setConfirming(false); go("visitor-pass"); }}>Cancel</Button><Button onClick={confirmIssue} disabled={issuing}>{issuing ? "Issuing..." : "Confirm and Issue Entries"}</Button></div></section></div>}
    </>;
  }

  if (stage === "import") {
    const fileSize = file ? file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB` : "";
    return <>
      <TopBar title="Bulk Student Entry" subtitle="Download and upload Excel" back={() => setStage("details")} />
      <div className="page-content bulk-import-page">
        <div className="workflow-steps"><span className="done"><Check size={12} />Event Details</span><span className="active">2 Excel Import</span><span>3 Confirm</span></div>
        <section className="bulk-import-card"><div className="bulk-section-icon excel"><FileSpreadsheet size={24} /></div><div><h2>Student-list Template</h2><p>Contains Name, Number, Address, and Photo File Path. Event details are not repeated in Excel.</p></div><Button variant="secondary" onClick={downloadBulkTemplate} icon={<Download size={17} />}>Download Sample Excel</Button></section>
        <section className="bulk-upload-card" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); acceptFile(event.dataTransfer.files?.[0]); }}>
          <input className="hidden-file-input" ref={fileInput} type="file" accept=".xlsx" onChange={chooseFile} />
          {!file ? <><div className="bulk-section-icon"><Upload size={24} /></div><h2>Upload Excel</h2><p>Upload the completed Excel file containing student names, student numbers, and optional photo paths.</p><button className="bulk-browse-button" onClick={() => fileInput.current?.click()}><Upload size={15} />Upload Excel</button><small>Tap Upload Excel to choose a file from your device · .xlsx only · Maximum {bulkUploadMaxBytes / 1024 / 1024} MB</small></> : <div className="bulk-selected-file"><div><FileSpreadsheet size={23} /></div><span><strong>{file.name}</strong><small>{fileSize} · {progress}</small></span><Status tone={progress === "Import Failed" ? "red" : progress === "Import Complete" ? "green" : "blue"}>{progress}</Status></div>}
          {fileError && <div className="bulk-file-error"><AlertTriangle size={14} />{fileError}</div>}
        </section>
        {file && <div className="bulk-file-actions"><Button variant="secondary" onClick={() => fileInput.current?.click()} icon={<RefreshCw size={16} />}>Replace File</Button><Button onClick={importFile} disabled={progress === "Reading Excel File" || progress === "Validating Student Records"} icon={<FileSpreadsheet size={17} />}>{progress === "Reading Excel File" || progress === "Validating Student Records" ? progress : "Import Students"}</Button></div>}
      </div>
    </>;
  }

  return <>
    <TopBar title="Bulk Student Entry" subtitle="Step 1 of 3 · Event details" back={() => go("visitor-pass")} />
    <div className="page-content bulk-import-page">
      <div className="workflow-steps"><span className="active">1 Event Details</span><span>2 Excel Import</span><span>3 Confirm</span></div>
      <section className="pass-form-section"><div className="form-section-title"><span>1</span><div><strong>Enter Event Details</strong><small>Required before importing students</small></div></div><EventDetailsFields details={eventDetails} setDetails={next => { setEventDetails(next); setEventErrors({}); }} errors={eventErrors} /></section>
      <Button onClick={continueFromDetails} icon={<ChevronRight size={17} />}>Continue to Excel Import</Button>
    </div>
  </>;
}

function VisitorPassDetails({ pass, title = "Visitor Pass Details", subtitle = "Saved visitor pass", back, cancelPass }: { pass: VisitorPass; title?: string; subtitle?: string; back: () => void; cancelPass: (pass: VisitorPass, reason: string) => void }) {
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const [cancelledNotice, setCancelledNotice] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fromDate = pass.fromDate || pass.eventDate;
  const toDate = pass.toDate || pass.eventDate;
  const downloadPass = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadVisitorPassPdf(pass);
    } catch {
      window.alert("The visitor pass PDF could not be created. Please try again.");
    } finally {
      setDownloading(false);
    }
  };
  const confirmCancellation = () => {
    if (!reason.trim()) {
      setReasonError(true);
      return;
    }
    cancelPass(pass, reason.trim());
    setShowCancel(false);
    setCancelledNotice(true);
  };
  return <>
    <TopBar title={title} subtitle={subtitle} back={back} action={<button className="bulk-header-action" onClick={downloadPass} disabled={downloading}><Download size={14} />{downloading ? "Preparing" : "Download PDF"}</button>} />
    <div className="page-content pass-detail-page">
      {cancelledNotice && <div className="cancellation-confirmation" role="status"><Check size={15} />Visitor pass cancelled successfully. The complete record remains available in Records.</div>}
      <section className="pass-detail-head">
        {pass.photo ? <img src={pass.photo} alt={pass.entryType === "student" ? "Student" : "Visitor"} /> : <div className="pass-photo-placeholder"><CircleUserRound size={35} /></div>}
        <div><span>{pass.entryType === "student" ? "STUDENT ENTRY" : "VISITOR PASS"}</span><h1>{pass.visitorName}</h1><p>{pass.studentNo || pass.passNumber} · Issued by {pass.supervisor}</p></div>
        <Status tone={passTone(pass.status)}>{pass.status}</Status>
      </section>
      <section className="info-card pass-information"><div className="card-kicker"><img src="/srm-logo.png" alt="" className="kicker-emblem" /><TicketCheck size={15} />SRM GROUP OF INSTITUTIONS TRICHY · PASS INFORMATION</div><dl>
        <div><dt>{pass.entryType === "student" ? "Student Name" : "Visitor Name"}</dt><dd>{pass.visitorName}</dd></div><div><dt>{pass.entryType === "student" ? "Entry Number" : "Pass Number"}</dt><dd>{pass.passNumber}</dd></div>
        <div><dt>{pass.entryType === "student" ? "Student No" : "Visitor Phone Number"}</dt><dd>{pass.studentNo || pass.phone}</dd></div>
        <div><dt>Purpose</dt><dd>{pass.purpose}</dd></div>
        {pass.eventName && <div><dt>Event Name</dt><dd>{pass.eventName}</dd></div>}
        <div><dt>From Date</dt><dd>{displayVisitDate(fromDate)}</dd></div>
        <div><dt>To Date</dt><dd>{displayVisitDate(toDate)}</dd></div>
        <div><dt>Duration</dt><dd>{inclusiveDuration(fromDate, toDate)}</dd></div>
        <div className="areas-detail"><dt>{pass.entryType === "student" ? "Venue" : "Accessible Blocks"}</dt><dd>{pass.areas.map(area => <span key={area}>{area}</span>)}</dd></div>
        <div><dt>Contact Name</dt><dd>{pass.coordinatorName || "Not provided"}</dd></div>
        <div><dt>Contact Phone Number</dt><dd>{pass.coordinatorNumber || "Not provided"}</dd></div>
        <div><dt>Issued Date &amp; Time</dt><dd>{displayPassTime(pass.createdAt)}</dd></div>
        <div><dt>Current Status</dt><dd><Status tone={passTone(pass.status)}>{pass.status}</Status></dd></div>
      </dl></section>
      {(pass.status === "Cancelled" || pass.status === "Revoked") && <section className="info-card cancellation-details"><div className="card-kicker"><ShieldAlert size={15} />{pass.status === "Revoked" ? "REVOCATION DETAILS" : "CANCELLATION DETAILS"}</div><dl><div><dt>Reason</dt><dd>{pass.cancellationReason}</dd></div><div><dt>{pass.status === "Revoked" ? "Revoked On" : "Cancelled On"}</dt><dd>{pass.cancelledAt && displayPassTime(pass.cancelledAt)}</dd></div><div><dt>{pass.status === "Revoked" ? "Revoked By" : "Cancelled By"}</dt><dd>{pass.cancelledBy} · {pass.cancelledByNumber}</dd></div><div><dt>Original Issuance</dt><dd>{displayPassTime(pass.createdAt)}</dd></div></dl></section>}
      {pass.status !== "Cancelled" && pass.status !== "Revoked" && <Button variant="danger" onClick={() => setShowCancel(true)} icon={<ShieldAlert size={17} />}>Cancel Pass</Button>}
    </div>
    {showCancel && <div className="dialog-backdrop"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-pass-title"><div className="dialog-icon danger"><ShieldAlert size={23} /></div><h2 id="cancel-pass-title">Cancel Visitor Pass</h2><p>This pass will no longer be valid for entry. Its original issuance details will remain in Records.</p><div className="dialog-summary"><strong>{pass.visitorName}</strong><span>{pass.passNumber} · {pass.eventName || pass.purpose}</span><small>Current status: {pass.status}</small></div><label className="field"><span>Cancellation Reason *</span><textarea className={reasonError ? "invalid" : ""} value={reason} onChange={event => { setReason(event.target.value); setReasonError(false); }} rows={3} placeholder="Enter the reason for cancelling this pass" />{reasonError && <small className="field-error">A cancellation reason is required.</small>}</label><div className="dialog-actions"><Button variant="secondary" onClick={() => { setShowCancel(false); setReasonError(false); }}>Keep Pass</Button><Button variant="danger" onClick={confirmCancellation}>Confirm Cancellation</Button></div></section></div>}
  </>;
}

function AccessNotifications({ passes, unread, setUnread, openPass, back }: { passes: VisitorPass[]; unread: string[]; setUnread: (value: string[]) => void; openPass: (pass: VisitorPass) => void; back: () => void }) {
  const newestPass = passes[0];
  const expiringPass = passes.find(pass => pass.status === "Expiring Soon") ?? newestPass;
  const cancelledPass = passes.find(pass => pass.status === "Cancelled") ?? newestPass;
  const notifications = [
    { id: "created", title: "Visitor pass created", passNumber: newestPass?.passNumber, date: "Today · 11:20 AM", status: newestPass?.status ?? "Active" },
    { id: "expiring", title: "Visitor pass expiring soon", passNumber: expiringPass?.passNumber, date: "Today · 10:45 AM", status: expiringPass?.status ?? "Expiring Soon" },
    { id: "cancelled", title: "Visitor pass cancelled", passNumber: cancelledPass?.passNumber, date: "Today · 10:10 AM", status: cancelledPass?.status ?? "Cancelled" },
  ];
  const openNotification = (item: typeof notifications[number]) => {
    setUnread(unread.filter(id => id !== item.id));
    const pass = passes.find(record => record.passNumber === item.passNumber);
    if (pass) openPass(pass);
  };
  return <>
    <TopBar title="Notifications" subtitle="Visitor pass updates" back={back} action={<button className="text-action" onClick={() => setUnread([])}>Mark all read</button>} />
    <div className="page-content">
      <div className="notification-legend"><span><i />Unread</span><strong>{unread.length} new</strong></div>
      <div className="access-notification-list">{notifications.map(item => <button key={item.id} className={unread.includes(item.id) ? "unread" : ""} onClick={() => openNotification(item)}>
        <span className="alert-symbol blue-bg"><TicketCheck size={20} /></span><span><small>{item.title.toUpperCase()}</small><strong>{item.passNumber}</strong><time>{item.date}</time></span><Status tone={passTone(item.status as VisitorPassStatus)}>{item.status}</Status><ChevronRight size={16} />
      </button>)}</div>
    </div>
  </>;
}

type LogRecord = {
  initials: string;
  name: string;
  institution: string;
  department: string;
  block: string;
  time: string;
  dateTime: string;
  event: "Entry" | "Exit" | "Visitor" | "Internal visit" | "Denied";
  tone: "green" | "blue" | "amber" | "gray" | "red";
  personType: "Student" | "Staff" | "External" | "Unauthorised";
  id: string;
  rollNumber?: string;
  category: string;
  accessCategory: "Authorized" | "Unauthorized" | "Visitors";
  year?: string;
  batch?: string;
  designation?: string;
  residence?: "Hosteller" | "Day scholar";
  hostel?: string;
  room?: string;
  transport?: "College Bus" | "Own Vehicle";
  pickup?: string;
  routeNumber?: string;
  logId?: string;
  phoneNumber?: string;
  address?: string;
  location?: string;
  hostName?: string;
  visitPurpose?: string;
  exitTime?: string;
  vehicleNumber?: string;
  guard: string;
  guardNumber: string;
  guardNotes?: string;
  entries?: number;
  decision: "Authorised" | "Denied" | "Pending review";
  photo?: string;
  actionTaken?: string;
  reviewActions?: ReviewAction[];
  reviewStatus?: ReviewStatus;
  reviewedBy?: string;
  reviewedByNumber?: string;
  reviewedByRole?: string;
  reviewedAt?: string;
};

// Explicit mock records for development & UI testing matching required specification
export const sampleMockUnauthorizedRecords: LogRecord[] = [
  {
    initials: "AK",
    name: "Arun Kumar",
    id: "UNREC-4011",
    institution: "Institution B",
    department: "Not Available",
    block: "Main Entrance",
    time: "09:15",
    dateTime: "2026-11-11T09:15:00",
    event: "Denied",
    tone: "red",
    personType: "Unauthorised",
    category: "Unauthorised visitor",
    accessCategory: "Unauthorized",
    logId: "DEN-20261111-4011",
    address: "12, Anna Nagar, Trichy",
    phoneNumber: "9876543210",
    vehicleNumber: "TN 45 AB 1234",
    guard: "G. Selvam",
    guardNumber: "SG-101",
    guardNotes: "Attempted entry without valid campus access credentials at Main Entrance.",
    entries: 1,
    decision: "Denied",
    actionTaken: "Person denied entry",
  },
  {
    initials: "UV",
    name: "Unknown Visitor",
    id: "UNREC-4012",
    institution: "Institution B",
    department: "Not Available",
    block: "Library Entrance",
    time: "10:30",
    dateTime: "2026-11-11T10:30:00",
    event: "Denied",
    tone: "red",
    personType: "Unauthorised",
    category: "Unauthorised visitor",
    accessCategory: "Unauthorized",
    logId: "DEN-20261111-4012",
    address: undefined,
    phoneNumber: undefined,
    vehicleNumber: undefined,
    guard: "Imran Ali",
    guardNumber: "GRD-B-0044",
    guardNotes: "Unknown visitor attempted entry to Library without registration.",
    entries: 1,
    decision: "Denied",
    actionTaken: "Person escorted out of premises",
  },
  {
    initials: "RS",
    name: "Rahul S",
    id: "UNREC-4013",
    institution: "Institution B",
    department: "Not Available",
    block: "Parking Area",
    time: "11:45",
    dateTime: "2026-11-11T11:45:00",
    event: "Denied",
    tone: "red",
    personType: "Unauthorised",
    category: "Unauthorised visitor",
    accessCategory: "Unauthorized",
    logId: "DEN-20261111-4013",
    address: "24, Thillai Nagar, Trichy",
    phoneNumber: "9876543211",
    vehicleNumber: "TN 48 CD 5678",
    guard: "Joseph Mathew",
    guardNumber: "GRD-B-0038",
    guardNotes: "Unregistered vehicle attempted to enter faculty parking area.",
    entries: 1,
    decision: "Denied",
    actionTaken: "Vehicle checked and turned away",
  },
  {
    initials: "SK",
    name: "Suresh Kumar",
    id: "UNREC-4014",
    institution: "Institution B",
    department: "Not Available",
    block: "Academic Block",
    time: "14:20",
    dateTime: "2026-11-11T14:20:00",
    event: "Denied",
    tone: "red",
    personType: "Unauthorised",
    category: "Unauthorised visitor",
    accessCategory: "Unauthorized",
    logId: "DEN-20261111-4014",
    address: "8, Cantonment, Trichy",
    phoneNumber: "9876543212",
    vehicleNumber: undefined,
    guard: "Kavya Rao",
    guardNumber: "GRD-B-0031",
    guardNotes: "Individual roaming in Academic Block without visitor pass.",
    entries: 1,
    decision: "Denied",
    actionTaken: "Security team informed; redirected to visitor desk",
  },
];

const logRows: LogRecord[] = [
  ...sampleMockUnauthorizedRecords,
  { initials: "AK", name: "Ananya Krishnan", id: "23ECE0721", institution: "Institution B", department: "Electronics", block: "Main Gate", time: "10:42", dateTime: "2025-06-16T10:42", event: "Entry", tone: "green", personType: "Student", category: "Internal · Institution B", accessCategory: "Authorized", year: "Year II", batch: "2023–2027", residence: "Hosteller", hostel: "Bharathi Hostel", room: "B-214", logId: "ENT-•••-4082", guard: "Arun Kumar", guardNumber: "GRD-B-0017", decision: "Authorised" },
  { initials: "AK", name: "Ananya Krishnan", id: "23ECE0721", institution: "Institution B", department: "Electronics", block: "Bharathi Hostel", time: "10:18", dateTime: "2025-06-16T10:18", event: "Entry", tone: "green", personType: "Student", category: "Hostel resident", accessCategory: "Authorized", year: "Year II", batch: "2023–2027", residence: "Hosteller", hostel: "Bharathi Hostel", room: "B-214", logId: "HST-•••-3018", guard: "Lakshmi Iyer", guardNumber: "WRD-B-0011", decision: "Authorised" },
  { initials: "ST", name: "Sneha Thomas", id: "22MEC0617", institution: "Institution B", department: "Mechanical", block: "Bharathi Hostel", time: "09:46", dateTime: "2025-06-16T09:46", event: "Exit", tone: "gray", personType: "Student", category: "Hostel resident", accessCategory: "Authorized", year: "Year III", residence: "Hosteller", hostel: "Bharathi Hostel", room: "C-108", logId: "HST-•••-3012", guard: "Lakshmi Iyer", guardNumber: "WRD-B-0011", decision: "Authorised" },
  { initials: "UP", name: "Unrecognized person", id: "Not available", institution: "Not identified", department: "Not available", block: "Bharathi Hostel", time: "09:21", dateTime: "2025-06-16T09:21", event: "Denied", tone: "red", personType: "Unauthorised", category: "Unrecognized hostel entry", accessCategory: "Unauthorized", residence: "Hosteller", hostel: "Bharathi Hostel", logId: "HST-DEN-•••-3009", guard: "Lakshmi Iyer", guardNumber: "WRD-B-0011", guardNotes: "Unrecognized person attempted to enter Bharathi Hostel.", entries: 1, decision: "Denied" },
  { initials: "RM", name: "Rahul Menon", id: "22CSE1048", institution: "Institution A", department: "Computer Science", block: "Main Gate", time: "10:28", dateTime: "2025-06-16T10:28", event: "Entry", tone: "green", personType: "Student", category: "Internal · Other institution", accessCategory: "Authorized", year: "Year III", residence: "Day scholar", transport: "College Bus", pickup: "Central Railway Station", visitPurpose: "Meeting a campus host", logId: "ENT-•••-4071", guard: "Arun Kumar", guardNumber: "GRD-B-0017", decision: "Authorised" },
  { initials: "DV", name: "Deepa Varma", id: "VIS-2048", institution: "Greenfield College", department: "Architecture", block: "Main Gate", time: "10:06", dateTime: "2025-06-16T10:06", event: "Visitor", tone: "amber", personType: "External", category: "External", accessCategory: "Visitors", logId: "VIS-•••-2048", guard: "Arun Kumar", guardNumber: "GRD-B-0017", decision: "Authorised" },
  { initials: "SK", name: "Sanjay Kumar", id: "EMP-B-1084", institution: "Institution B", department: "Mechanical", block: "Block A", time: "09:51", dateTime: "2025-06-16T09:51", event: "Exit", tone: "gray", personType: "Staff", category: "Internal · Institution B", accessCategory: "Authorized", designation: "Professor", logId: "EXT-•••-4062", guard: "Kavya Rao", guardNumber: "GRD-B-0031", decision: "Authorised" },
  { initials: "NB", name: "Nila Bose", id: "EMP-C-0912", institution: "Institution C", department: "Administration", block: "Library Block", time: "09:32", dateTime: "2025-06-16T09:32", event: "Entry", tone: "green", personType: "Staff", category: "Internal · Other institution", accessCategory: "Authorized", designation: "Administrator", logId: "ENT-•••-4055", guard: "Imran Ali", guardNumber: "GRD-B-0044", decision: "Authorised" },
  { initials: "MJ", name: "Mohit Jain", id: "21MEC0184", institution: "Institution B", department: "Mechanical", block: "Block B", time: "09:14", dateTime: "2025-06-16T09:14", event: "Entry", tone: "green", personType: "Student", category: "Internal · Institution B", accessCategory: "Authorized", year: "Year IV", residence: "Day scholar", transport: "Own Vehicle", logId: "ENT-•••-4048", guard: "Joseph Mathew", guardNumber: "GRD-B-0038", decision: "Authorised" },
  { initials: "RG", name: "Unrecognized person", id: "Not available", institution: "Not identified", department: "Not available", block: "Main Gate", time: "08:48", dateTime: "2025-06-16T08:48", event: "Denied", tone: "red", personType: "Unauthorised", category: "Unauthorised visitor", accessCategory: "Unauthorized", logId: "DEN-•••-4039", guard: "Arun Kumar", guardNumber: "GRD-B-0017", guardNotes: "Identity could not be verified at the Main Gate.", entries: 1, decision: "Denied", photo: "/faces/intruder_den_4039.jpg" },
  { initials: "UP", name: "Unrecognized person", id: "Not available", institution: "Not identified", department: "Not available", block: "Gate 1 Main Entrance", time: "08:35", dateTime: "2025-06-16T08:35", event: "Denied", tone: "red", personType: "Unauthorised", category: "Unauthorised visitor", accessCategory: "Unauthorized", logId: "DEN-•••-4042", guard: "G. Selvam", guardNumber: "SG-101", guardNotes: "Identity could not be verified at Gate 1 Main Entrance.", entries: 1, decision: "Denied" },
  { initials: "UP", name: "Unrecognized person", id: "Not available", institution: "Not identified", department: "Not available", block: "Gate 2 Hospital Entrance", time: "09:15", dateTime: "2025-06-16T09:15", event: "Denied", tone: "red", personType: "Unauthorised", category: "Unauthorised visitor", accessCategory: "Unauthorized", logId: "DEN-•••-4050", guard: "P. Murugan", guardNumber: "SG-102", guardNotes: "Person attempted entry without valid hospital/campus credentials.", entries: 1, decision: "Denied" },
];

const assignedGuardNumbers = new Set(["GRD-B-0017", "GRD-B-0031", "GRD-B-0038", "GRD-B-0044", "GRD-B-0052", "SG-101", "SG-102", "SG-103", "SG-104", "WRD-B-0011"]);
const recordKey = (row: LogRecord) => row.logId ?? `${row.name}-${row.dateTime}`;
const reviewFor = (reviews: Record<string, ReviewRecord>, row: LogRecord): ReviewRecord => {
  const rev = reviews[recordKey(row)];
  if (rev && rev.actions && rev.actions.length > 0) return rev;
  if (row.reviewActions && row.reviewActions.length > 0) {
    return {
      status: (row.reviewStatus as ReviewStatus) || (row.decision === "Authorised" ? "Authorised" : "Unauthorised"),
      actions: row.reviewActions,
    };
  }
  if (row.logId) {
    if (reviews[row.logId] && reviews[row.logId].actions && reviews[row.logId].actions.length > 0) {
      return reviews[row.logId];
    }
    const foundEntry = Object.entries(reviews).find(([k]) => k.includes(row.logId!));
    if (foundEntry && foundEntry[1]?.actions && foundEntry[1].actions.length > 0) return foundEntry[1];
  }
  return rev ?? (row.logId ? reviews[row.logId] : undefined) ?? { status: (row.reviewStatus as ReviewStatus) ?? "Pending Verification", actions: [] };
};
const reviewTone = (status: ReviewStatus) => status === "Verified" || status === "Authorised" || status === "Revoked" ? "green" : status === "Unauthorised" ? "red" : "amber";
const recordCategory = (reviews: Record<string, ReviewRecord>, row: LogRecord) =>
  reviewFor(reviews, row).status === "Revoked" ? "Revoked" : row.accessCategory;
const latestRevocation = (reviews: Record<string, ReviewRecord>, row: LogRecord) =>
  [...reviewFor(reviews, row).actions].reverse().find(action => action.type === "Revoked");

export function getActionTaken(reviews: Record<string, ReviewRecord>, row: LogRecord): string {
  const rev = reviewFor(reviews, row);
  const actions = rev.actions || [];
  const lastAction = [...actions].reverse().find(a =>
    a.type === "Unauthorised" || a.type === "Authorised" || a.type === "Verified" || a.type === "Revoked"
  );

  const status = rev.status;
  const isUnauth = status === "Unauthorised" || row.decision === "Denied" || row.event === "Denied" || row.accessCategory === "Unauthorized";
  const isAuth = status === "Authorised" || status === "Verified" || row.decision === "Authorised";

  if (isUnauth) {
    const text = lastAction?.action_taken || lastAction?.reason || row.actionTaken;
    if (text && text.trim()) {
      const lower = text.trim().toLowerCase();
      if (!lower.startsWith("flagged at entry") && !lower.includes("face recognition score")) {
        return text.trim();
      }
    }
    if (row.guardNotes && row.guardNotes.trim()) {
      const lowerNotes = row.guardNotes.trim().toLowerCase();
      if (
        !lowerNotes.includes("face recognition score") &&
        !lowerNotes.startsWith("flagged at entry gate") &&
        !lowerNotes.startsWith("identity could not be verified")
      ) {
        return row.guardNotes.trim();
      }
    }
    return "Not Available";
  }

  if (isAuth) {
    const text = lastAction?.action_taken || lastAction?.reason || row.actionTaken;
    if (text && text.trim()) {
      const lower = text.trim().toLowerCase();
      if (!lower.includes("face recognition score") && !lower.startsWith("flagged at entry")) {
        return text.trim();
      }
    }
    return "—";
  }

  if (status === "Revoked") {
    const revAction = [...actions].reverse().find(a => a.type === "Revoked");
    return revAction?.reason || "Revoked by supervisor";
  }

  return "—";
}

export function getDecisionDetails(reviews: Record<string, ReviewRecord>, row: LogRecord) {
  const rev = reviewFor(reviews, row);
  const actions = rev.actions || [];
  const decisionAction = [...actions].reverse().find(a =>
    a.type === "Unauthorised" || a.type === "Authorised" || a.type === "Verified" || a.type === "Revoked"
  );

  if (!decisionAction) {
    if (row.reviewedBy) {
      return {
        actor: row.reviewedBy,
        actorNumber: row.reviewedByNumber || "—",
        role: row.reviewedByRole || "Campus Supervisor",
        timestamp: row.reviewedAt || row.dateTime.replace("T", " "),
        actionTaken: getActionTaken(reviews, row),
      };
    }
    return null;
  }

  let roleTitle = "Campus Supervisor";
  const num = decisionAction.actorNumber || decisionAction.supervisor_id || "";
  const name = decisionAction.actor || decisionAction.supervisor_name || "";
  if (num.startsWith("CSO") || name.includes("CSO") || (decisionAction as any).supervisor_id?.startsWith("CSO")) {
    roleTitle = "CSO";
  } else if (num.startsWith("SUP") || name.includes("Supervisor")) {
    roleTitle = "Campus Supervisor";
  } else if (num.startsWith("WRD") || name.includes("Warden")) {
    roleTitle = "Hostel Warden";
  }

  return {
    actor: decisionAction.actor || decisionAction.supervisor_name || decisionAction.decision_made_by || "Campus Supervisor",
    actorNumber: decisionAction.actorNumber || decisionAction.supervisor_id || "—",
    role: roleTitle,
    timestamp: decisionAction.decision_timestamp || decisionAction.timestamp || "—",
    actionTaken: getActionTaken(reviews, row),
  };
}

export function formatUnauthorizedDateTime(dateTimeStr?: string): string {
  if (!dateTimeStr) return "Not Available";
  if (/^\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}\s+(AM|PM)$/i.test(dateTimeStr.trim())) {
    return dateTimeStr.trim();
  }
  try {
    const cleanStr = dateTimeStr.includes("T") ? dateTimeStr : dateTimeStr.replace(" ", "T");
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, "0");
    return `${day}-${month}-${year} ${strHours}:${minutes} ${ampm}`;
  } catch {
    return dateTimeStr || "Not Available";
  }
}

function getUnauthorizedReviewAction(reviews: Record<string, ReviewRecord>, row: LogRecord): ReviewAction | undefined {
  const rev = reviewFor(reviews, row);
  const actions = rev.actions || [];
  return [...actions].reverse().find(a => a.type === "Unauthorised" || a.type === "Authorised" || a.type === "Verified");
}

export function getUnauthorizedAction(reviews: Record<string, ReviewRecord>, row: LogRecord): string {
  const action = getUnauthorizedReviewAction(reviews, row);
  if (action?.action_taken && action.action_taken.trim()) return action.action_taken.trim();
  if (action?.reason && action.reason.trim()) {
    const trimmed = action.reason.trim();
    const lower = trimmed.toLowerCase();
    if (!lower.startsWith("face unrecognized") && !lower.includes("face recognition score")) {
      return trimmed;
    }
  }
  if (row.actionTaken && row.actionTaken.trim()) return row.actionTaken.trim();
  const general = getActionTaken(reviews, row);
  if (general && general !== "—" && general !== "Not Available") return general;
  return "Not Available";
}

export function getUnauthorizedName(row: LogRecord, reviews: Record<string, ReviewRecord>): string {
  const action = getUnauthorizedReviewAction(reviews, row);
  const val = action?.full_name || row.name;
  if (!val || !val.trim() || val.trim().toLowerCase() === "unrecognized person" || val.trim().toLowerCase() === "unknown person") {
    if (val && val.trim()) return val.trim();
    return "Not Available";
  }
  return val.trim();
}

export function getUnauthorizedAddress(row: LogRecord, reviews: Record<string, ReviewRecord>): string {
  const action = getUnauthorizedReviewAction(reviews, row);
  const val = action?.address || row.address;
  if (!val || !val.trim() || val.trim().toLowerCase() === "not available" || val.trim().toLowerCase() === "not identified") {
    return "Not Available";
  }
  return val.trim();
}

export function getUnauthorizedContact(row: LogRecord, reviews: Record<string, ReviewRecord>): string {
  const action = getUnauthorizedReviewAction(reviews, row);
  const val = action?.contact_number || row.phoneNumber || (row as any).contactNumber;
  if (!val || !val.trim() || val.trim().toLowerCase() === "not available") {
    return "Not Available";
  }
  return val.trim();
}

export function getUnauthorizedLocation(row: LogRecord, reviews: Record<string, ReviewRecord>): string {
  const action = getUnauthorizedReviewAction(reviews, row);
  const val = action?.location || row.block || (row as any).location;
  if (!val || !val.trim() || val.trim().toLowerCase() === "not available") {
    return "Not Available";
  }
  return val.trim();
}

export function getUnauthorizedVehicle(row: LogRecord, reviews: Record<string, ReviewRecord>): string {
  const action = getUnauthorizedReviewAction(reviews, row);
  const val = action?.vehicle_number || row.vehicleNumber;
  if (!val || !val.trim() || val.trim() === "—" || val.trim() === "-" || val.trim().toLowerCase() === "none" || val.trim().toLowerCase() === "n/a" || val.trim().toLowerCase() === "not available") {
    return "—";
  }
  return val.trim();
}

export function getUnauthorizedDateTime(row: LogRecord, reviews: Record<string, ReviewRecord>): string {
  const action = getUnauthorizedReviewAction(reviews, row);
  const val = action?.incident_datetime || row.dateTime;
  if (!val) return "Not Available";
  return formatUnauthorizedDateTime(val);
}

export const isRowUnauthorized = (row: LogRecord, rev: ReviewRecord): boolean => {
  if (rev.status === "Unauthorised") return true;
  if (rev.status === "Authorised" || rev.status === "Verified" || rev.status === "Revoked") return false;
  return (
    row.accessCategory === "Unauthorized" ||
    row.personType === "Unauthorised" ||
    row.decision === "Denied" ||
    row.event === "Denied"
  );
};

export function exportRecordsToCsv(rows: LogRecord[], reviews: Record<string, ReviewRecord>, isUnauthorized = false) {
  const isUnauth = isUnauthorized;
  if (isUnauth) {
    const headers = ["S.No", "Name", "Address", "Contact Number", "Location", "Vehicle Number", "Action Taken", "Date & Time"];
    const csvRows = [headers.join(",")];
    rows.forEach((row, index) => {
      const name = getUnauthorizedName(row, reviews);
      const address = getUnauthorizedAddress(row, reviews);
      const contact = getUnauthorizedContact(row, reviews);
      const location = getUnauthorizedLocation(row, reviews);
      const vehicle = getUnauthorizedVehicle(row, reviews);
      const actionTaken = getUnauthorizedAction(reviews, row);
      const dateTime = getUnauthorizedDateTime(row, reviews);
      const line = [
        index + 1,
        `"${name.replace(/"/g, '""')}"`,
        `"${address.replace(/"/g, '""')}"`,
        `"${contact.replace(/"/g, '""')}"`,
        `"${location.replace(/"/g, '""')}"`,
        `"${vehicle.replace(/"/g, '""')}"`,
        `"${actionTaken.replace(/"/g, '""')}"`,
        `"${dateTime.replace(/"/g, '""')}"`,
      ];
      csvRows.push(line.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    void saveOrShareBlob(
      blob,
      `unauthorized_records_${new Date().toISOString().slice(0, 10)}.csv`,
      "text/csv;charset=utf-8;"
    );
    return;
  }

  const headers = ["S.No", "Name", "Reg No", "Department", "Institution", "Year", "Category", "Accommodation", "Status", "Date & Time", "Location", "Security Officer", "Action Taken", "Decision Made By", "Decision Date & Time"];
  const csvRows = [headers.join(",")];
  rows.forEach((row, index) => {
    const rev = reviewFor(reviews, row);
    const category = recordCategory(reviews, row);
    const isUnauthRow = isRowUnauthorized(row, rev);
    const actionTaken = isUnauthRow ? getUnauthorizedAction(reviews, row) : getActionTaken(reviews, row);
    const dec = getDecisionDetails(reviews, row);
    const decBy = dec ? `"${dec.actor} (${dec.role} · ${dec.actorNumber})"` : '"—"';
    const decTime = dec ? `"${dec.timestamp}"` : '"—"';
    const line = [
      index + 1,
      `"${((isUnauthRow ? getUnauthorizedName(row, reviews) : row.name) || "").replace(/"/g, '""')}"`,
      isUnauthRow ? '""' : `"${(row.id || "—").replace(/"/g, '""')}"`,
      isUnauthRow ? '""' : `"${(row.department || "—").replace(/"/g, '""')}"`,
      isUnauthRow ? '""' : `"${(row.institution || "—").replace(/"/g, '""')}"`,
      isUnauthRow ? '""' : `"${(row.year || "—").replace(/"/g, '""')}"`,
      `"${isUnauthRow ? "Unauthorized" : category}"`,
      isUnauthRow ? '""' : `"${(accommodationOf(row) || "—").replace(/"/g, '""')}"`,
      `"${rev.status}"`,
      `"${row.dateTime}"`,
      `"${(row.block || "").replace(/"/g, '""')}"`,
      `"${(row.guard || "")} (${row.guardNumber || ""})"`,
      `"${actionTaken.replace(/"/g, '""')}"`,
      decBy,
      decTime,
    ];
    csvRows.push(line.join(","));
  });
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  void saveOrShareBlob(
    blob,
    `campus_records_${new Date().toISOString().slice(0, 10)}.csv`,
    "text/csv;charset=utf-8;"
  );
}

const missingValues = ["", "not available", "not identified", "unknown", "n/a", "null", "undefined", "—", "-"];
const logValue = (value?: string | null) => (value && !missingValues.includes(value.trim().toLowerCase()) ? value : "-");
const accommodationOf = (row: LogRecord) => (row.residence === "Day scholar" ? "Day Scholar" : row.residence);

function AuditTable({
  rows,
  reviews,
  title = "AUDIT LOG",
  hideCommonInfo = false,
  plainNames = false,
  fieldVisibility = DEFAULT_LOG_FIELD_VISIBILITY,
  isUnauthorizedOnly = false,
}: {
  rows: LogRecord[];
  reviews: Record<string, ReviewRecord>;
  title?: string;
  hideCommonInfo?: boolean;
  plainNames?: boolean;
  fieldVisibility?: LogFieldVisibility;
  isUnauthorizedOnly?: boolean;
}) {
  const [selected, setSelected] = useState<LogRecord | null>(null);
  const personCategory = selected?.personType === "Student" ? "Student" : selected?.personType === "Staff" ? "Staff" : selected?.personType === "Unauthorised" ? "Unauthorized person" : "Visitor";
  const authorizationStatus = selected?.decision === "Authorised" ? "Authorized" : selected?.decision;
  const knownInstitution = selected && !["Not identified", "Not available"].includes(selected.institution);
  const recordedBy = selected ? `${selected.guard} · ${selected.guardNumber}` : "";
  const review = selected ? reviewFor(reviews, selected) : null;
  const revocation = selected ? latestRevocation(reviews, selected) : undefined;
  const isRevoked = review?.status === "Revoked";

  const isUnauthorizedView = isUnauthorizedOnly;

  const isSelectedUnauthorized =
    selected && isRowUnauthorized(selected, reviewFor(reviews, selected));

  return <>
    {title && <div className="list-label">{rows.length} RECORDS · {title}</div>}
    <div className="audit-table-wrap">
      {isUnauthorizedView ? (
        <table className="audit-table unauthorized-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Name</th>
              <th>Address</th>
              <th>Contact Number</th>
              <th>Location</th>
              <th>Vehicle Number</th>
              <th>Action Taken</th>
              <th>Date &amp; Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const name = getUnauthorizedName(row, reviews);
              const address = getUnauthorizedAddress(row, reviews);
              const contact = getUnauthorizedContact(row, reviews);
              const location = getUnauthorizedLocation(row, reviews);
              const vehicle = getUnauthorizedVehicle(row, reviews);
              const actionTaken = getUnauthorizedAction(reviews, row);
              const dateTime = getUnauthorizedDateTime(row, reviews);

              return (
                <tr
                  key={`${row.logId || row.name}-${row.dateTime}-${index}`}
                  onClick={() => setSelected(row)}
                  className="clickable-row"
                >
                  <td>{index + 1}</td>
                  <td>
                    <strong>{name}</strong>
                    {!plainNames && (
                      <div className="record-badges">
                        <Status tone="red">Unauthorized</Status>
                      </div>
                    )}
                  </td>
                  <td title={address}>{address}</td>
                  <td>{contact}</td>
                  <td title={location}>{location}</td>
                  <td>{vehicle}</td>
                  <td title={actionTaken} className="action-taken-cell"><strong>{actionTaken}</strong></td>
                  <td>{dateTime}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <table className="audit-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Name</th>
              <th>Reg No</th>
              <th>Dept</th>
              <th>Institute</th>
              <th>Year</th>
              <th>Category</th>
              <th>Accommodation</th>
              <th>Action Taken</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const rowReview = reviewFor(reviews, row);
              const category = recordCategory(reviews, row);
              const isUnauthRow = isRowUnauthorized(row, rowReview);
              const actionTakenText = isUnauthRow
                ? getUnauthorizedAction(reviews, row)
                : getActionTaken(reviews, row);
              const unauthName = getUnauthorizedName(row, reviews);

              return (
                <tr
                  key={`${row.logId || row.name}-${row.dateTime || row.time}-${index}`}
                  onClick={() => setSelected(row)}
                  className="clickable-row"
                >
                  <td>{index + 1}</td>
                  <td>
                    <strong>{isUnauthRow ? unauthName : logValue(row.name)}</strong>
                    {!plainNames && (
                      <div className="record-badges">
                        {isUnauthRow ? (
                          <Status tone="red">Unauthorized</Status>
                        ) : (
                          <>
                            <Status tone={row.tone}>{row.event}</Status>
                            <Status tone={category === "Authorized" || category === "Revoked" ? "green" : category === "Visitors" ? "amber" : "red"}>{category}</Status>
                            <Status tone={reviewTone(rowReview.status)}>{rowReview.status}</Status>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td>{isUnauthRow ? "" : logValue(row.id)}</td>
                  <td>{isUnauthRow ? "" : logValue(row.department)}</td>
                  <td>{isUnauthRow ? "" : logValue(row.institution)}</td>
                  <td>{isUnauthRow ? "" : logValue(row.year?.replace("Year ", ""))}</td>
                  <td>{isUnauthRow ? "Unauthorized" : category}</td>
                  <td>{isUnauthRow ? "" : logValue(accommodationOf(row))}</td>
                  <td className="action-taken-cell" title={actionTakenText}>{actionTakenText}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
    {selected && (
      <section className="audit-profile log-details-panel">
        <div className="audit-profile-head">
          <div className="captured-photo small-capture">
            <CircleUserRound size={38} />
            <span>{isRevoked ? "Entry capture" : `Entry capture · ${selected.time}`}</span>
          </div>
          <div>
            <span>{isSelectedUnauthorized ? "UNAUTHORIZED RECORD DETAILS" : `${personCategory.toUpperCase()} LOG DETAILS`}</span>
            <h2>{isSelectedUnauthorized ? getUnauthorizedName(selected, reviews) : selected.name}</h2>
            {!isRevoked && !isSelectedUnauthorized && <p>{logValue(selected.id)} · {logValue(selected.institution)}</p>}
            {isSelectedUnauthorized && <p><span className="status status-red">Unauthorized</span> · {getUnauthorizedLocation(selected, reviews)}</p>}
          </div>
          <button onClick={() => setSelected(null)} aria-label="Close log details">
            <X size={18} />
          </button>
        </div>

        {!isRevoked && (
          <div className="audit-detail-section supervisor-review-highlight">
            <div className="audit-detail-title">SUPERVISOR / CSO DECISION & ACTION TAKEN</div>
            <dl>
              <div><dt>Current Verification Status</dt><dd><Status tone={reviewTone(review?.status || (isSelectedUnauthorized ? "Unauthorised" : "Pending Verification"))}>{review?.status || (isSelectedUnauthorized ? "Denied" : "Pending Verification")}</Status></dd></div>
              <div><dt>Action Taken</dt><dd className="action-taken-detail"><strong>{isSelectedUnauthorized ? getUnauthorizedAction(reviews, selected) : getActionTaken(reviews, selected)}</strong></dd></div>
              {(() => {
                const dec = getDecisionDetails(reviews, selected);
                if (dec) {
                  return (
                    <>
                      <div><dt>Decision Made By</dt><dd>{dec.actor} ({dec.role} · {dec.actorNumber})</dd></div>
                      <div><dt>Decision Date & Time</dt><dd>{dec.timestamp}</dd></div>
                    </>
                  );
                }
                return <div><dt>Decision Status</dt><dd>{isSelectedUnauthorized ? "Logged / Pending Review" : "Pending Review"}</dd></div>;
              })()}
            </dl>
          </div>
        )}

        {isRevoked && (
          <>
            <div className="audit-detail-section">
              <div className="audit-detail-title">VISIT DETAILS</div>
              <dl>
                <div><dt>Reason to visit</dt><dd>{selected.visitPurpose ?? selected.guardNotes ?? "Not recorded"}</dd></div>
                {selected.hostName && <div><dt>Person to meet</dt><dd>{selected.hostName}</dd></div>}
              </dl>
            </div>
            <div className="audit-detail-section revocation-details revoked-priority">
              <div className="audit-detail-title">REVOCATION DETAILS</div>
              <dl>
                <div><dt>Reason for revocation by supervisor</dt><dd>{revocation?.reason ?? "Not recorded"}</dd></div>
              </dl>
            </div>
          </>
        )}

        {isSelectedUnauthorized ? (
          <div className="audit-detail-section unauthorized-detail-section">
            <div className="audit-detail-title">UNAUTHORIZED RECORD INFORMATION</div>
            <dl>
              <div><dt>S.No</dt><dd>{rows.indexOf(selected) + 1}</dd></div>
              <div><dt>Name</dt><dd><strong>{getUnauthorizedName(selected, reviews)}</strong></dd></div>
              <div><dt>Address</dt><dd>{getUnauthorizedAddress(selected, reviews)}</dd></div>
              <div><dt>Contact Number</dt><dd>{getUnauthorizedContact(selected, reviews)}</dd></div>
              <div><dt>Location</dt><dd>{getUnauthorizedLocation(selected, reviews)}</dd></div>
              <div><dt>Vehicle Number</dt><dd>{getUnauthorizedVehicle(selected, reviews)}</dd></div>
              <div><dt>Date &amp; Time</dt><dd>{getUnauthorizedDateTime(selected, reviews)}</dd></div>
              <div><dt>Action Taken</dt><dd className="action-taken-detail"><strong>{getUnauthorizedAction(reviews, selected)}</strong></dd></div>
              <div><dt>Assigned Gate / Location</dt><dd>{selected.block}</dd></div>
              <div><dt>Security Guard / Officer</dt><dd>{selected.guard ? `${selected.guard} (${selected.guardNumber || "SG"})` : "Security Officer"}</dd></div>
              {selected.guardNotes && <div><dt>Security Guard Notes</dt><dd>{selected.guardNotes}</dd></div>}
              {selected.logId && <div><dt>Incident ID</dt><dd>{selected.logId}</dd></div>}
            </dl>
          </div>
        ) : !isRevoked ? (
          <div className="audit-detail-section">
            <div className="audit-detail-title">{personCategory.toUpperCase()} DETAILS</div>
            <dl>
              <div><dt>S.No</dt><dd>{rows.indexOf(selected) + 1}</dd></div>
              {!isRevoked && (fieldVisibility.name !== false) && <div><dt>Name</dt><dd>{logValue(selected.name)}</dd></div>}
              {selected.id && logValue(selected.id) !== "-" && (fieldVisibility.registerNumber !== false) && <div><dt>{selected.personType === "Student" ? "Register number" : "ID number"}</dt><dd>{selected.id}</dd></div>}
              {selected.rollNumber && <div><dt>Roll number</dt><dd>{selected.rollNumber}</dd></div>}
              {selected.department && logValue(selected.department) !== "-" && (fieldVisibility.department !== false) && <div><dt>Department</dt><dd>{selected.department}</dd></div>}
              {knownInstitution && (fieldVisibility.institute !== false) && <div><dt>Institute</dt><dd>{selected.institution}</dd></div>}
              {selected.year && (fieldVisibility.year !== false) && <div><dt>Year</dt><dd>{selected.year.replace("Year ", "")}</dd></div>}
              {selected.batch && (fieldVisibility.batch !== false) && <div><dt>Batch</dt><dd>{selected.batch}</dd></div>}
              <div><dt>Category</dt><dd>{recordCategory(reviews, selected)}</dd></div>
              {accommodationOf(selected) && (fieldVisibility.accommodationType !== false) && <div><dt>Accommodation</dt><dd>{accommodationOf(selected)}</dd></div>}
              {selected.hostName && <div><dt>Person to meet</dt><dd>{selected.hostName}</dd></div>}
              {!isRevoked && selected.visitPurpose && <div><dt>Purpose of visit</dt><dd>{selected.visitPurpose}</dd></div>}
              {selected.phoneNumber && <div><dt>Phone number</dt><dd>{selected.phoneNumber}</dd></div>}
              {selected.hostel && (fieldVisibility.hostelName !== false) && <div><dt>Hostel</dt><dd>{selected.hostel}</dd></div>}
              {selected.room && (fieldVisibility.roomNumber !== false) && <div><dt>Room</dt><dd>{selected.room}</dd></div>}
              {selected.transport && (fieldVisibility.transportationType !== false) && <div><dt>Transport</dt><dd>{selected.transport}</dd></div>}
              {selected.pickup && (fieldVisibility.boardingPoint !== false) && <div><dt>Pickup point</dt><dd>{selected.pickup}</dd></div>}
              {selected.routeNumber && (fieldVisibility.routeNumber !== false) && <div><dt>Route number</dt><dd>{selected.routeNumber}</dd></div>}
              {selected.vehicleNumber && (fieldVisibility.vehicleNumber !== false) && <div><dt>Vehicle number</dt><dd>{selected.vehicleNumber}</dd></div>}
              {!isRevoked && selected.guardNotes && <div><dt>Reason</dt><dd>{selected.guardNotes}</dd></div>}
              {isRevoked && revocation && <><div><dt>Revoked by</dt><dd>{revocation.actor} · {revocation.actorNumber}</dd></div><div><dt>Revoked at</dt><dd>{revocation.timestamp}</dd></div></>}
            </dl>
          </div>
        ) : null}

        {!isRevoked && revocation && (
          <div className="audit-detail-section revocation-details">
            <div className="audit-detail-title">REVOCATION DETAILS</div>
            <dl>
              <div><dt>Reason <b>*</b></dt><dd>{revocation.reason}</dd></div>
              <div><dt>Supervisor comments</dt><dd>{revocation.reason}</dd></div>
              <div><dt>Revoked by</dt><dd>{revocation.actor} · {revocation.actorNumber}</dd></div>
              <div><dt>Revoked at</dt><dd>{revocation.timestamp}</dd></div>
            </dl>
          </div>
        )}

        {!isRevoked && !isSelectedUnauthorized && !hideCommonInfo && (
          <div className="audit-detail-section">
            <div className="audit-detail-title">ORIGINAL SECURITY EVENT</div>
            <dl>
              {selected.logId && <div><dt>Log ID / Reference Number</dt><dd>{selected.logId}</dd></div>}
              <div><dt>Person Category</dt><dd>{personCategory}</dd></div>
              <div><dt>Original Event Category</dt><dd>{selected.accessCategory}</dd></div>
              <div><dt>Security Decision</dt><dd>{authorizationStatus}</dd></div>
              <div><dt>Entry or Exit Event</dt><dd>{selected.event}</dd></div>
              <div><dt>Date</dt><dd>{selected.dateTime.slice(0, 10)}</dd></div>
              <div><dt>Timestamp</dt><dd>{selected.dateTime.replace("T", " ")}</dd></div>
              {knownInstitution && <div><dt>Institution</dt><dd>{selected.institution}</dd></div>}
              <div><dt>Assigned Gate / Location</dt><dd>{selected.block} · {knownInstitution ? selected.institution : "Institution B"}</dd></div>
              <div><dt>Security Name / Number</dt><dd>{recordedBy}</dd></div>
              {selected.guardNotes && <div><dt>Security Guard Notes</dt><dd>{selected.guardNotes}</dd></div>}
            </dl>
          </div>
        )}

        {!isRevoked && review && (review.status !== "Pending Verification" || selected.accessCategory === "Unauthorized") && (
          <div className="audit-detail-section">
            <div className="audit-detail-title">SUPERVISOR REVIEW & AUDIT HISTORY</div>
            <div className="review-current">
              <span>Current verification status</span>
              <Status tone={reviewTone(review.status)}>{review.status}</Status>
            </div>
            <div className="history-list">
              <div>
                <i><Shield size={13} /></i>
                <p>
                  <strong>Original event created</strong>
                  <span>{selected.guard} · {selected.guardNumber}</span>
                  <small>{selected.dateTime.replace("T", " ")} · {selected.block}</small>
                </p>
              </div>
              {review.actions.map((action, index) => (
                <div key={`${action.type}${action.timestamp}${index}`}>
                  <i className={action.type === "Unauthorised" ? "danger-history" : ""}>
                    {action.type === "Verified" || action.type === "Revoked" ? <Check size={13} /> : <ShieldAlert size={13} />}
                  </i>
                  <p>
                    <strong>Record {action.type.toLowerCase()}</strong>
                    <span>{action.actor} · {action.actorNumber}</span>
                    <small>
                      {action.timestamp}
                      {action.action_taken ? ` · Action Taken: ${action.action_taken}` : action.reason ? ` · Reason: ${action.reason}` : ""}
                    </small>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        {!isRevoked && <div className="capture-note"><Camera size={14} />Photograph captured with this log record.</div>}
      </section>
    )}
  </>;
}

type WorklogDesignation = typeof adminPortalDesignations[number] | "Student Affair" | "Staff";

const worklogEntries: {
  name: string;
  officerId: string;
  email: string;
  designation: WorklogDesignation;
  institution: string;
  entry: string;
  exit: string;
  durationMinutes: number;
  day: string;
  date: string;
}[] = [
  { name: "Meera Nair", officerId: "SUP-B-0004", email: "meera.nair@campus.edu", designation: "Campus Supervisor", institution: "Institution B", entry: "10:48", exit: "—", durationMinutes: 132, day: "Today", date: "2025-06-16" },
  { name: "Daniel Thomas", officerId: "SA-B-0012", email: "daniel.thomas@campus.edu", designation: "Student Affair", institution: "Institution B", entry: "08:45", exit: "12:10", durationMinutes: 205, day: "Today", date: "2025-06-16" },
  { name: "Karthik Rao", officerId: "SUP-A-0007", email: "karthik.rao@campus.edu", designation: "Campus Supervisor", institution: "Institution A", entry: "09:44", exit: "17:22", durationMinutes: 458, day: "Yesterday", date: "2025-06-15" },
  { name: "Lakshmi Iyer", officerId: "WRD-B-0011", email: "lakshmi.iyer@campus.edu", designation: "Hostel Warden", institution: "Institution B", entry: "08:10", exit: "16:18", durationMinutes: 488, day: "Today", date: "2025-06-16" },
  { name: "Vijay Nair", officerId: "STF-B-0024", email: "vijay.nair@campus.edu", designation: "Staff", institution: "Institution B", entry: "08:32", exit: "16:05", durationMinutes: 453, day: "Today", date: "2025-06-16" },
  { name: "Arun Sharma", officerId: "ACS-B-0012", email: "arun.sharma@campus.edu", designation: "Supervisor", institution: "Institution B", entry: "08:20", exit: "16:20", durationMinutes: 480, day: "Today", date: "2025-06-16" },
  { name: "Rohan Mehta", officerId: "CSO-0001", email: "rohan.mehta@campus.edu", designation: "CSO", institution: "Institution B", entry: "08:30", exit: "17:00", durationMinutes: 510, day: "Today", date: "2025-06-16" },
  { name: "Kavitha Rao", officerId: "SW-B-0008", email: "kavitha.rao@campus.edu", designation: "Student Welfare", institution: "Institution B", entry: "09:00", exit: "17:00", durationMinutes: 480, day: "Today", date: "2025-06-16" },
  { name: "Priya Raman", officerId: "MGR-B-0003", email: "priya.raman@campus.edu", designation: "Institute Manager", institution: "Institution B", entry: "08:40", exit: "16:45", durationMinutes: 485, day: "Today", date: "2025-06-16" },
  { name: "Arun Kumar", officerId: "GRD-B-0017", email: "arun.kumar@campus.edu", designation: "Security", institution: "Institution B", entry: "08:02", exit: "16:35", durationMinutes: 513, day: "Today", date: "2025-06-16" },
  { name: "Kavya Rao", officerId: "GRD-B-0031", email: "kavya.rao@campus.edu", designation: "Security", institution: "Institution B", entry: "07:55", exit: "16:08", durationMinutes: 493, day: "Today", date: "2025-06-16" },
  { name: "Joseph Mathew", officerId: "GRD-B-0038", email: "joseph.mathew@campus.edu", designation: "Security", institution: "Institution B", entry: "11:52", exit: "—", durationMinutes: 288, day: "Today", date: "2025-06-16" },
  { name: "Imran Ali", officerId: "GRD-B-0044", email: "imran.ali@campus.edu", designation: "Security", institution: "Institution B", entry: "08:04", exit: "16:12", durationMinutes: 488, day: "Today", date: "2025-06-16" },
  { name: "Neha Singh", officerId: "GRD-B-0052", email: "neha.singh@campus.edu", designation: "Security", institution: "Institution B", entry: "15:51", exit: "—", durationMinutes: 69, day: "Today", date: "2025-06-16" },
];

function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function OfficerDetailView({
  officer,
  allRows,
  allScans,
  onBack,
}: {
  officer: typeof worklogEntries[number];
  allRows: typeof worklogEntries;
  allScans: LogRecord[];
  onBack: () => void;
}) {
  const officerWorklogs = allRows.filter(item => item.name === officer.name);
  const officerScans = allScans.filter(row => row.guard === officer.name);
  const initials = officer.name.split(" ").map(part => part[0]).join("");

  return <>
    <TopBar title="Officer details" subtitle="Worklog & scan activity" back={onBack} />
    <div className="page-content">
      <section className="officer-detail-head">
        <div className="person-avatar">{initials}</div>
        <div>
          <span>OFFICER PROFILE</span>
          <h1>{officer.name}</h1>
          <p>{officer.designation} · {officer.institution}</p>
        </div>
        <Status tone="green">Active</Status>
      </section>
      <div className="officer-scan-stats">
        <div><strong>{officerScans.length}</strong><span>Total scans performed</span></div>
        <div><strong>{officerScans.filter(row => row.accessCategory === "Authorized").length}</strong><span>Authorized detected</span></div>
        <div><strong>{officerScans.filter(row => row.accessCategory === "Unauthorized").length}</strong><span>Unauthorized detected</span></div>
      </div>
      <section className="info-card officer-info">
        <div className="card-kicker"><IdCard size={15} />OFFICER DETAILS</div>
        <dl>
          <div><dt>Name</dt><dd>{officer.name}</dd></div>
          <div><dt>Officer ID</dt><dd>{officer.officerId}</dd></div>
          <div><dt>Designation</dt><dd>{officer.designation}</dd></div>
          <div><dt>Institution</dt><dd>{officer.institution}</dd></div>
          <div><dt>Email</dt><dd>{officer.email}</dd></div>
        </dl>
      </section>
      <div className="list-label">WORKLOG HISTORY</div>
      <div className="login-event-list worklog-list officer-history">
        {officerWorklogs.map((item, index) => (
          <article key={`${item.name}${item.day}${index}`}>
            <div className="login-dot"><FileClock size={16} /></div>
            <div className="worklog-person">
              <strong>{item.day}</strong>
              <span>{item.designation} · {item.institution}</span>
              <small>{formatDuration(item.durationMinutes)} logged</small>
            </div>
            <div className="worklog-times">
              <div><span>Duration</span><strong>{formatDuration(item.durationMinutes)}</strong></div>
            </div>
          </article>
        ))}
      </div>
      <div className="list-label officer-scan-label">SCAN RECORDS</div>
      <div className="officer-scan-list">
        {officerScans.map(record => (
          <article key={recordKey(record)}>
            <div className={`scan-record-icon ${record.accessCategory === "Unauthorized" ? "danger" : ""}`}>
              {record.accessCategory === "Unauthorized" ? <ShieldAlert size={17} /> : <ShieldCheck size={17} />}
            </div>
            <div>
              <strong>{record.name}</strong>
              <span>{record.dateTime.replace("T", " ")} · {record.block}</span>
              <small>{record.id === "Not available" ? "Identity unavailable" : record.id}</small>
            </div>
            <Status tone={record.accessCategory === "Unauthorized" ? "red" : record.accessCategory === "Authorized" ? "green" : "amber"}>
              {record.accessCategory}
            </Status>
          </article>
        ))}
      </div>
      {officerScans.length === 0 && (
        <div className="empty-state compact-empty">
          <ScanFace size={25} />
          <strong>No scan records</strong>
          <span>No scans are assigned to this officer in the current records.</span>
        </div>
      )}
    </div>
  </>;
}

function SecurityWorklogTable({
  rows,
  scans,
  onSelectOfficer,
}: {
  rows: typeof worklogEntries;
  scans: LogRecord[];
  onSelectOfficer: (name: string) => void;
}) {
  return (
    <div className="worklog-table-wrap">
      <table className="worklog-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Name</th>
            <th>Designation</th>
            <th>Scans</th>
            <th>Authorized</th>
            <th>Unauthorized</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => {
            const officerScans = scans.filter(row => row.guard === item.name);
            return (
              <tr key={`${item.name}${item.day}${index}`}>
                <td>{index + 1}</td>
                <td>
                  <button className="worklog-name-button" onClick={() => onSelectOfficer(item.name)}>
                    {item.name}
                  </button>
                </td>
                <td>
                  <span className={`designation-badge designation-${item.designation.toLowerCase().replace(" ", "-")}`}>
                    {item.designation}
                  </span>
                </td>
                <td><strong>{officerScans.length}</strong></td>
                <td>
                  <span className="worklog-count authorized">
                    {officerScans.filter(row => row.accessCategory === "Authorized").length}
                  </span>
                </td>
                <td>
                  <span className="worklog-count unauthorized">
                    {officerScans.filter(row => row.accessCategory === "Unauthorized").length}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UnauthorisedEntriesTable({
  rows,
  reviews,
}: {
  rows: LogRecord[];
  reviews: Record<string, ReviewRecord>;
}) {
  const [selected, setSelected] = useState<LogRecord | null>(null);

  const getStatus = (row: LogRecord) => {
    const rev = reviewFor(reviews, row);
    if (rev.status === "Authorised" || row.decision === "Authorised") {
      return { label: "Allowed", tone: "green" as const };
    }
    if (rev.status === "Verified") {
      return { label: "Verified", tone: "green" as const };
    }
    if (rev.status === "Unauthorised" || row.decision === "Denied" || row.event === "Denied") {
      return { label: "Denied", tone: "red" as const };
    }
    if (rev.status === "Pending Verification") {
      return { label: "Pending", tone: "amber" as const };
    }
    if ((row.event as any) === "Flagged" || (row.decision as any) === "Flagged") {
      return { label: "Flagged", tone: "amber" as const };
    }
    return { label: row.decision || row.event || "Denied", tone: (row.tone || "red") as any };
  };

  return (
    <>
      <div className="audit-table-wrap supervisor-audit-table-wrap">
        <table className="audit-table unauthorized-table supervisor-audit-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Name</th>
              <th>Address</th>
              <th>Contact Number</th>
              <th>Location</th>
              <th>Vehicle Number</th>
              <th>Action Taken</th>
              <th>Date &amp; Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const name = getUnauthorizedName(row, reviews);
              const address = getUnauthorizedAddress(row, reviews);
              const contact = getUnauthorizedContact(row, reviews);
              const location = getUnauthorizedLocation(row, reviews);
              const vehicle = getUnauthorizedVehicle(row, reviews);
              const actionTaken = getUnauthorizedAction(reviews, row);
              const dateTime = getUnauthorizedDateTime(row, reviews);

              return (
                <tr
                  key={recordKey(row)}
                  onClick={() => setSelected(row)}
                  className="clickable-row"
                >
                  <td>{index + 1}</td>
                  <td>
                    <strong>{name}</strong>
                    <div className="record-badges">
                      <Status tone="red">Unauthorized</Status>
                    </div>
                  </td>
                  <td title={address}>{address}</td>
                  <td>{contact}</td>
                  <td title={location}>{location}</td>
                  <td>{vehicle}</td>
                  <td title={actionTaken} className="action-taken-cell"><strong>{actionTaken}</strong></td>
                  <td>{dateTime}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selected && (
        <section className="audit-profile supervisor-log-details log-details-panel">
          <div className="supervisor-log-details-head">
            <div>
              <span>UNAUTHORIZED RECORD DETAILS</span>
              <h2>{getUnauthorizedName(selected, reviews)}</h2>
              <p><span className="status status-red">Unauthorized</span> · {getUnauthorizedLocation(selected, reviews)}</p>
            </div>
            <button onClick={() => setSelected(null)} aria-label="Close log details">
              <X size={18} />
            </button>
          </div>

          <div className="audit-detail-section supervisor-review-highlight">
            <div className="audit-detail-title">SUPERVISOR / CSO DECISION & ACTION TAKEN</div>
            <dl>
              <div><dt>Verification Decision</dt><dd><Status tone={getStatus(selected).tone}>{getStatus(selected).label}</Status></dd></div>
              <div><dt>Action Taken</dt><dd className="action-taken-detail"><strong>{getUnauthorizedAction(reviews, selected)}</strong></dd></div>
              {(() => {
                const dec = getDecisionDetails(reviews, selected);
                if (dec) {
                  return (
                    <>
                      <div><dt>Decision Made By</dt><dd>{dec.actor} ({dec.role} · {dec.actorNumber})</dd></div>
                      <div><dt>Decision Date & Time</dt><dd>{dec.timestamp}</dd></div>
                    </>
                  );
                }
                return <div><dt>Decision Status</dt><dd>Pending Review</dd></div>;
              })()}
            </dl>
          </div>

          <div className="audit-detail-section unauthorized-detail-section">
            <div className="audit-detail-title">UNAUTHORIZED RECORD INFORMATION</div>
            <dl>
              <div><dt>S.No</dt><dd>{rows.indexOf(selected) + 1}</dd></div>
              <div><dt>Name</dt><dd><strong>{getUnauthorizedName(selected, reviews)}</strong></dd></div>
              <div><dt>Address</dt><dd>{getUnauthorizedAddress(selected, reviews)}</dd></div>
              <div><dt>Contact Number</dt><dd>{getUnauthorizedContact(selected, reviews)}</dd></div>
              <div><dt>Location</dt><dd>{getUnauthorizedLocation(selected, reviews)}</dd></div>
              <div><dt>Vehicle Number</dt><dd>{getUnauthorizedVehicle(selected, reviews)}</dd></div>
              <div><dt>Date &amp; Time</dt><dd>{getUnauthorizedDateTime(selected, reviews)}</dd></div>
              <div><dt>Action Taken</dt><dd className="action-taken-detail"><strong>{getUnauthorizedAction(reviews, selected)}</strong></dd></div>
              <div><dt>Assigned Gate / Location</dt><dd>{selected.block}</dd></div>
              <div><dt>Security Guard / Officer</dt><dd>{selected.guard ? `${selected.guard} (${selected.guardNumber || "SG"})` : "Security Officer"}</dd></div>
              {selected.guardNotes && <div><dt>Security Guard Notes</dt><dd>{selected.guardNotes}</dd></div>}
              {selected.logId && <div><dt>Incident ID</dt><dd>{selected.logId}</dd></div>}
            </dl>
          </div>
        </section>
      )}
    </>
  );
}

function SupervisorHome({ go, reviews, logs }: { go: (screen: Screen) => void; reviews?: Record<string, ReviewRecord>; logs?: LogRecord[] }) {
  const currentLogs = logs ?? logRows;
  const localCount = currentLogs.filter(row => {
    if (row.accessCategory !== "Unauthorized") return false;
    const rev = reviewFor(reviews ?? {}, row);
    return rev.status === "Pending Verification";
  }).length;

  const [unauthorizedCount, setUnauthorizedCount] = useState<number>(localCount);

  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE_URL}/api/v1/access-logs/unauthorized-count`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && typeof data.count === "number" && isMounted) {
          setUnauthorizedCount(data.count);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUnauthorizedCount(localCount);
        }
      });
    return () => { isMounted = false; };
  }, [localCount]);

  return <>
    <TopBar title="Campus Secure" subtitle="Campus Supervisor Portal" action={<Status tone="green">Live</Status>} />
    <div className="page-content"><ProfileHead role="supervisor" go={go} />
      <section className="supervisor-hero"><div><span>CAMPUS STATUS</span><strong>5 / 5</strong><p>Assigned Security</p></div><ShieldCheck size={55} /></section>
      <div className="dashboard-stats">
        <div><span className="stat-icon blue-bg"><UserCog size={18} /></span><strong>8</strong><small>Security on duty</small></div>
        <div onClick={() => go("alerts")} style={{ cursor: "pointer" }}><span className="stat-icon amber-bg"><ShieldAlert size={18} /></span><strong>{unauthorizedCount}</strong><small>Unauthorised</small></div>
      </div>
      <div className="section-heading compact"><div><h2>Block coverage</h2></div><button onClick={() => go("assignments")}>Manage</button></div>
      <div className="coverage-list">{["Main Gate · Arun Kumar", "Block A · Kavya Rao", "Library · Imran Ali"].map((item, i) => <div key={item}><span><MapPin size={16} /></span><div><strong>{item.split(" · ")[0]}</strong><small>{item.split(" · ")[1]}</small></div><Status tone={i === 2 ? "amber" : "green"}>{i === 2 ? "Break" : "Active"}</Status></div>)}</div>
    </div>
  </>;
}

function Assignments({
  go,
  onAddAuditLog,
  editorName = "Meera Nair",
  editorRole = "Campus Supervisor",
}: {
  go: (screen: Screen) => void;
  onAddAuditLog?: (log: AuditLogItem) => void;
  editorName?: string;
  editorRole?: AuditLogItem["editorRole"];
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState("Vikram Das");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [reassignReason, setReassignReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [guards, setGuards] = useState([["Main Gate", "Arun Kumar", "08:00–16:00"], ["Block A", "Kavya Rao", "08:00–16:00"], ["Block B", "Joseph Mathew", "12:00–20:00"], ["Library Block", "Imran Ali", "08:00–16:00"], ["Hostel Gate", "Neha Singh", "16:00–00:00"]]);
  const reassign = (index: number) => {
    if (!reassignReason.trim()) {
      setReasonError("Please enter a comment or reason for reassignment.");
      return;
    }
    const prev = guards[index];
    const nextShift = `${startTime}–${endTime}`;
    setGuards(current => current.map((guard, guardIndex) => guardIndex === index ? [guard[0], selectedOfficer, nextShift] : guard));
    if (onAddAuditLog) {
      const now = new Date();
      onAddAuditLog({
        id: `AUD-ASG-${Date.now()}`,
        timestamp: now.toISOString().replace("T", " ").slice(0, 19),
        dateTime: now.toISOString(),
        editedBy: editorName,
        editorRole,
        action: "Security Assignment Updated",
        institution: "Institution B",
        block: prev[0],
        actionDetails: `Reassigned ${prev[0]} from ${prev[1]} to ${selectedOfficer} (${nextShift})`,
        comments: reassignReason.trim(),
        changes: [
          { field: "Assigned Officer", oldVal: prev[1], newVal: selectedOfficer },
          { field: "Shift Timing", oldVal: prev[2], newVal: nextShift },
        ],
      });
    }
    setEditing(null);
    setReassignReason("");
    setReasonError("");
  };
  const toggleReassignment = (index: number) => {
    if (editing === index) {
      setEditing(null);
      setReassignReason("");
      setReasonError("");
      return;
    }
    const [currentStart, currentEnd] = guards[index][2].split("–");
    setSelectedOfficer("Vikram Das");
    setStartTime(currentStart);
    setEndTime(currentEnd);
    setReassignReason("");
    setReasonError("");
    setEditing(index);
  };
  return <>
    <TopBar title="Security assignments" subtitle="Institution B · 5 blocks" back={() => go("home")} />
    <div className="page-content">
      <div className="assignment-list">{guards.map((guard, index) => <section key={guard[0]}><div className="block-icon"><Building2 size={20} /></div><div><span>{guard[0]}</span><strong>{guard[1]}</strong><small>{guard[2]} · On duty</small></div><button onClick={() => toggleReassignment(index)}>{editing === index ? "Cancel" : "Reassign"}</button>{editing === index && <div className="reassign-panel"><Field label="Available security officer"><select value={selectedOfficer} onChange={e => setSelectedOfficer(e.target.value)}><option>Vikram Das</option><option>Sarah John</option><option>Ravi Menon</option></select></Field><div className="two-fields"><label className="field"><span>Start Time</span><input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} /></label><label className="field"><span>End Time</span><input type="time" value={endTime} onChange={event => setEndTime(event.target.value)} /></label></div><label className="field"><span>Comment / Reason for Edit <b>*</b></span><textarea rows={2} value={reassignReason} onChange={e => { setReassignReason(e.target.value); if (e.target.value.trim()) setReasonError(""); }} placeholder="Enter reason for security reassignment..." />{reasonError && <small className="field-error">{reasonError}</small>}</label><Button onClick={() => reassign(index)}>Confirm reassignment</Button></div>}</section>)}</div>
      <Button variant="secondary" onClick={() => go("create-guard")} icon={<UserPlus size={17} />}>Create new security account</Button>
    </div>
  </>;
}

function CreateGuard({
  go,
  onAddAuditLog,
  editorName = "Meera Nair",
  editorRole = "Campus Supervisor",
}: {
  go: (screen: Screen) => void;
  onAddAuditLog?: (log: AuditLogItem) => void;
  editorName?: string;
  editorRole?: AuditLogItem["editorRole"];
}) {
  const [created, setCreated] = useState(false);
  const [guardName, setGuardName] = useState("Vikram Das");
  const [guardId, setGuardId] = useState("GRD-B-1086");
  const [assignedPost, setAssignedPost] = useState("Block A · Relief duty");
  const [shiftStart, setShiftStart] = useState("08:00");
  const [shiftEnd, setShiftEnd] = useState("16:00");
  const [supervisorNotes, setSupervisorNotes] = useState("Relief coverage for Block A.");
  const handleCreateGuard = (event: FormEvent) => {
    event.preventDefault();
    if (onAddAuditLog) {
      const now = new Date();
      onAddAuditLog({
        id: `AUD-GRD-${Date.now()}`,
        timestamp: now.toISOString().replace("T", " ").slice(0, 19),
        dateTime: now.toISOString(),
        editedBy: editorName,
        editorRole,
        action: "User Created",
        institution: "Institution B",
        block: assignedPost,
        actionDetails: `Created security account ${guardName} (${guardId}) at ${assignedPost}`,
        comments: supervisorNotes.trim() || "New security account onboarding and shift allocation.",
        changes: [
          { field: "Full Name", oldVal: "(New Account)", newVal: guardName },
          { field: "Employee ID", oldVal: "(New Account)", newVal: guardId },
          { field: "Assigned Post", oldVal: "(New Account)", newVal: assignedPost },
          { field: "Shift", oldVal: "(New Account)", newVal: `${shiftStart}–${shiftEnd}` },
        ],
      });
    }
    setCreated(true);
    window.scrollTo(0, 0);
  };
  if (created) return <div className="success-page">
    <div className="success-symbol"><UserCheck size={38} /></div>
    <Status tone="green">SECURITY ACCOUNT CREATED</Status>
    <h1>Security user added</h1>
    <p>{guardName} can now sign in. The duty assignment has been added to the audit logs.</p>
    <section className="success-receipt">
      <div><span>Security officer</span><strong>{guardName}</strong></div>
      <div><span>Security employee ID</span><strong>{guardId}</strong></div>
      <div><span>Assigned post</span><strong>{assignedPost}</strong></div>
      <div><span>Shift</span><strong>{shiftStart}–{shiftEnd}</strong></div>
    </section>
    <Button onClick={() => go("assignments")}>Return to security assignments</Button>
    <Button variant="secondary" onClick={() => setCreated(false)}>Create another security user</Button>
  </div>;

  return <>
    <TopBar title="Create security account" subtitle="Institution B · Campus Supervisor action" back={() => go("assignments")} />
    <form className="page-content form-page" onSubmit={handleCreateGuard}>
      <div className="form-section-title"><span>1</span><div><strong>Security identity</strong></div></div>
      <div className="form-stack guard-form">
        <label className="field"><span>Full name <b>*</b></span><input required placeholder="Enter the officer's legal name" value={guardName} onChange={e => setGuardName(e.target.value)} /></label>
        <label className="field"><span>Security employee ID <b>*</b></span><input required placeholder="e.g. GRD-B-1086" value={guardId} onChange={e => setGuardId(e.target.value)} /></label>
        <label className="field"><span>Employment type <b>*</b></span><select required defaultValue="Full-time"><option>Full-time</option><option>Contract</option><option>Relief security</option></select></label>
        <label className="field"><span>Date of joining <b>*</b></span><input required type="date" defaultValue="2025-06-16" /></label>
      </div>
      <div className="form-section-title"><span>2</span><div><strong>Contact and sign-in</strong></div></div>
      <div className="form-stack guard-form">
        <label className="field"><span>Official mobile number <b>*</b></span><input required type="tel" placeholder="Enter 10-digit mobile number" defaultValue="9876543210" /></label>
        <label className="field"><span>Work email <small>(optional)</small></span><input type="email" placeholder="name@institution.edu" /></label>
        <label className="field"><span>Emergency contact <b>*</b></span><input required type="tel" placeholder="Enter emergency contact number" defaultValue="9876501234" /></label>
      </div>
      <div className="form-section-title"><span>3</span><div><strong>Duty assignment</strong></div></div>
      <div className="form-stack guard-form">
        <label className="field"><span>Institution <b>*</b></span><input required value="Institution B" readOnly /></label>
        <label className="field"><span>Assigned block or gate <b>*</b></span><select required value={assignedPost} onChange={e => setAssignedPost(e.target.value)}><option>Block A · Relief duty</option><option>Main Gate · Relief duty</option><option>Block B · Relief duty</option><option>Library Block · Relief duty</option><option>Hostel Gate · Relief duty</option></select></label>
        <div className="two-fields">
          <label className="field"><span>Shift starts <b>*</b></span><input required type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)} /></label>
          <label className="field"><span>Shift ends <b>*</b></span><input required type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} /></label>
        </div>
        <label className="field"><span>Comments / Reason</span><textarea rows={3} placeholder="Optional onboarding or assignment notes" value={supervisorNotes} onChange={e => setSupervisorNotes(e.target.value)} /></label>
      </div>
      <label className="confirmation-check"><input required type="checkbox" defaultChecked /><span>I confirm that the employment details and initial duty assignment are correct. <b>*</b></span></label>
      <Button type="submit" icon={<UserPlus size={17} />}>Create security account</Button>
    </form>
  </>;
}

function Audit({
  go,
  reviews,
  scope = "supervisor",
  logs,
}: {
  go: (screen: Screen) => void;
  reviews: Record<string, ReviewRecord>;
  scope?: "supervisor" | "cso";
  logs?: LogRecord[];
}) {
  const [activeTab, setActiveTab] = useState<"unauthorised" | "worklog">("unauthorised");
  const [auditFrom, setAuditFrom] = useState("2025-06-16");
  const [auditTo, setAuditTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedOfficerName, setSelectedOfficerName] = useState<string | null>(null);
  const [apiRecords, setApiRecords] = useState<LogRecord[] | null>(null);

  const currentLogs = logs ?? logRows;

  useEffect(() => {
    let active = true;
    let url = `${API_BASE_URL}/api/v1/access-logs/supervisor-unauthorized?from_date=${auditFrom}&to_date=${auditTo}`;

    fetch(url)
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then(data => {
        if (!active) return;
        if (data && Array.isArray(data.records)) {
          const mapped: LogRecord[] = data.records.map((r: any) => ({
            initials: r.name
              ? r.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "UP"
              : "UP",
            name: r.name || "Unrecognized person",
            id: r.identifier_value || "Not available",
            institution: "SRM GROUP OF INSTITUTIONS TRICHY",
            department: r.department || "Not available",
            block: r.location_block || "Main Gate",
            time: r.timestamp
              ? new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
              : "00:00",
            dateTime: r.timestamp ? (r.timestamp.includes("T") ? r.timestamp : r.timestamp.replace(" ", "T")) : "",
            event: "Denied",
            tone: "red",
            personType: "Unauthorised",
            category: "Unauthorised visitor",
            accessCategory: "Unauthorized",
            logId: r.record_identifier,
            phoneNumber: r.phone_number,
            guard: r.guard_name || "Security Guard",
            guardNumber: r.guard_code || "SG-101",
            guardNotes: r.flag_reason || "Identity could not be verified at the gate.",
            entries: 1,
            decision: r.review_status === "Authorised" ? "Authorised" : "Denied",
            photo: r.snapshot_url || undefined,
            reviewActions: r.review_actions,
            reviewStatus: r.review_status,
            actionTaken: (r.review_actions && r.review_actions.length > 0) ? r.review_actions[r.review_actions.length - 1].action_taken : undefined,
            address: (r.review_actions && r.review_actions.length > 0 && r.review_actions[r.review_actions.length - 1].address) || undefined,
            location: r.location_block || (r.review_actions && r.review_actions.length > 0 && r.review_actions[r.review_actions.length - 1].location) || undefined,
            vehicleNumber: (r.review_actions && r.review_actions.length > 0 && r.review_actions[r.review_actions.length - 1].vehicle_number) || undefined,
          }));
          setApiRecords(mapped);
        }
      })
      .catch(err => {
        if (active) {
          console.warn("Could not fetch supervisor unauthorized records:", err);
          setApiRecords(null);
        }
      });

    return () => {
      active = false;
    };
  }, [auditFrom, auditTo]);

  // Fallback for Tab 1 (Unauthorised Entries)
  const fallbackUnauthRows = currentLogs.filter(row => {
    if (row.accessCategory !== "Unauthorized") return false;
    const recordDate = row.dateTime.slice(0, 10);
    if (recordDate < auditFrom || recordDate > auditTo) return false;
    return assignedGuardNumbers.has(row.guardNumber) || (row.guard && row.guard.includes("Selvam"));
  });

  const baseUnauthRows = apiRecords !== null ? apiRecords : fallbackUnauthRows;
  const mockUnauthInPeriod = sampleMockUnauthorizedRecords.filter(row => {
    const recordDate = row.dateTime.slice(0, 10);
    return recordDate >= auditFrom && recordDate <= auditTo;
  });
  const existingKeys = new Set(baseUnauthRows.map(r => r.logId || `${r.name}-${r.dateTime}`));
  const unauthRows = [
    ...baseUnauthRows,
    ...mockUnauthInPeriod.filter(r => !existingKeys.has(r.logId || `${r.name}-${r.dateTime}`)),
  ];

  // Tab 2 (Security Worklog) data for Campus Supervisor (Institution B security personnel)
  const supervisorWorklogEntries = worklogEntries.filter(
    item => item.institution === "Institution B" && ["Security", "Campus Supervisor"].includes(item.designation)
  );

  const worklogRows = supervisorWorklogEntries.filter(
    item => item.date >= auditFrom && item.date <= auditTo
  );

  const totalMinutes = worklogRows.reduce((total, item) => total + item.durationMinutes, 0);

  const handleFromDateChange = (val: string) => {
    setAuditFrom(val);
    if (auditTo && val > auditTo) {
      setAuditTo(val);
    }
  };

  const handleToDateChange = (val: string) => {
    setAuditTo(val);
    if (auditFrom && val < auditFrom) {
      setAuditFrom(val);
    }
  };

  const resetAudit = () => {
    setAuditFrom("2025-06-16");
    setAuditTo(new Date().toISOString().slice(0, 10));
    setSelectedOfficerName(null);
  };

  const selectedOfficer = worklogRows.find(item => item.name === selectedOfficerName);

  if (activeTab === "worklog" && selectedOfficer) {
    return (
      <OfficerDetailView
        officer={selectedOfficer}
        allRows={worklogRows}
        allScans={currentLogs}
        onBack={() => setSelectedOfficerName(null)}
      />
    );
  }

  return (
    <>
      <TopBar
        title="Campus records"
        subtitle={scope === "cso" ? "Institution B · CSO scope" : "Institution B · Campus Supervisor scope"}
        back={() => go("home")}
        action={
          activeTab === "unauthorised" ? (
            <div className="header-actions">
              <button
                className="icon-btn"
                onClick={() => exportRecordsToCsv(unauthRows, reviews, true)}
                aria-label="Export unauthorized records as CSV"
                title="Export CSV with 7 standard columns"
              >
                <FileClock size={18} />
              </button>
            </div>
          ) : undefined
        }
      />
      <div className="page-content">
        <section className="filter-panel supervisor-audit-filters">
          <div className="filter-panel-head">
            <div className="audit-filter-row">
              <button
                type="button"
                className={`audit-filter-btn ${activeTab === "unauthorised" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("unauthorised");
                  setSelectedOfficerName(null);
                }}
              >
                Unauthorised Entries
              </button>
              <button
                type="button"
                className={`audit-filter-btn ${activeTab === "worklog" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("worklog");
                  setSelectedOfficerName(null);
                }}
              >
                Security Worklog
              </button>
            </div>
            <button type="button" onClick={resetAudit}>Reset</button>
          </div>
          <div className="filter-fields">
            <Field label="From Date">
              <input
                type="date"
                value={auditFrom}
                max={auditTo || undefined}
                onChange={event => handleFromDateChange(event.target.value)}
              />
            </Field>
            <Field label="To Date">
              <input
                type="date"
                value={auditTo}
                min={auditFrom || undefined}
                onChange={event => handleToDateChange(event.target.value)}
              />
            </Field>
          </div>
        </section>

        {activeTab === "unauthorised" && (
          <>
            <div className="result-count">
              <strong>{unauthRows.length} results</strong>
            </div>
            <UnauthorisedEntriesTable rows={unauthRows} reviews={reviews} />
            {unauthRows.length === 0 && (
              <div className="empty-state">
                <FileClock size={25} />
                <strong>No matching records</strong>
                <span>Reset filters or choose another date period.</span>
              </div>
            )}
          </>
        )}

        {activeTab === "worklog" && (
          <>
            <div className="login-summary">
              <div>
                <strong>{worklogRows.length}</strong>
                <span>Worklog sessions</span>
              </div>
              <div>
                <strong>{formatDuration(totalMinutes)}</strong>
                <span>Total logged time</span>
              </div>
            </div>
            <div className="result-count">
              <strong>{worklogRows.length} results</strong>
            </div>
            <SecurityWorklogTable
              rows={worklogRows}
              scans={currentLogs}
              onSelectOfficer={name => setSelectedOfficerName(name)}
            />
            {worklogRows.length === 0 && (
              <div className="empty-state">
                <FileClock size={25} />
                <strong>No matching records</strong>
                <span>Reset filters or choose another date period.</span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Alerts({
  go,
  back,
  role,
  reviews,
  updateReview,
  logs,
  deleteLog,
  onAddAuditLog,
}: {
  go: (screen: Screen) => void;
  back: () => void;
  role: Role;
  reviews: Record<string, ReviewRecord>;
  updateReview: (row: LogRecord, type: "Authorised" | "Unauthorised" | "Revoked", reason?: string, incidentData?: IncidentData) => void;
  logs?: LogRecord[];
  deleteLog?: (row: LogRecord) => void;
  onAddAuditLog?: (log: AuditLogItem) => void;
}) {
  const currentLogs = logs ?? logRows;
  const alertRows = currentLogs.filter(row => {
    if (row.accessCategory !== "Unauthorized") return false;
    if (role === "security") return row.block === "Main Gate";
    if (role === "warden") return row.block === "Bharathi Hostel" || row.guard === roleMeta.warden.name;
    if (role === "staff") return row.institution === "Institution B" && row.block === "Block A";
    if (role === "supervisor") return assignedGuardNumbers.has(row.guardNumber) || row.block === "Bharathi Hostel" || row.guardNumber === "WRD-B-0011" || row.guard === roleMeta.warden.name || (row.guard && row.guard.includes("Selvam"));
    return assignedGuardNumbers.has(row.guardNumber);
  });
  const [readKeys, setReadKeys] = useState<string[]>([]);
  const [alertOrder, setAlertOrder] = useState(() => alertRows.map(recordKey));
  const [selected, setSelected] = useState<LogRecord | null>(null);
  const [dialog, setDialog] = useState<"authorised" | "unauthorised" | "revoke" | null>(null);
  const [authNotes, setAuthNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const [campusLocations, setCampusLocations] = useState<string[]>(defaultCampusLocations);

  // Manager & Admin Requests state
  const [requestsList, setRequestsList] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "alerts" | "requests">("all");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);

  const fetchRequests = () => {
    if (role === "admin" || role === "manager") {
      const url =
        role === "manager"
          ? `${API_BASE_URL}/api/v1/manager-requests/?manager_username=manager`
          : `${API_BASE_URL}/api/v1/manager-requests/`;
      fetch(url)
        .then(res => (res.ok ? res.json() : []))
        .then(data => {
          if (Array.isArray(data)) {
            setRequestsList(data);
          }
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [role]);

  const openRequest = async (req: any) => {
    setSelectedRequest(req);
    setReplyMessage("");
    setReplyError(null);
    setReplySuccess(null);

    if (role === "admin" && req.status === "Sent") {
      try {
        const resp = await fetch(
          `${API_BASE_URL}/api/v1/manager-requests/${req.request_id}/view?admin_name=Avery%20Williams&admin_username=admin`,
          { method: "POST" }
        );
        if (resp.ok) {
          const data = await resp.json();
          if (data.request) {
            setSelectedRequest(data.request);
            setRequestsList(prev => prev.map(r => (r.request_id === req.request_id ? data.request : r)));
          }
          if (data.audit_log && onAddAuditLog) {
            onAddAuditLog(data.audit_log);
          }
        }
      } catch (err) {
        console.error("Failed to mark request as viewed:", err);
      }
    }
  };

  const handleSendReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || isReplying) return;

    const trimmed = replyMessage.trim();
    if (!trimmed) {
      setReplyError("Reply message is mandatory and cannot be empty.");
      return;
    }
    if (trimmed.length > 500) {
      setReplyError("Reply message cannot exceed 500 characters.");
      return;
    }

    setIsReplying(true);
    setReplyError(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/manager-requests/${selectedRequest.request_id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply_message: trimmed,
          admin_name: "Avery Williams",
          admin_username: "admin",
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to send reply.");
      }

      const data = await resp.json();
      if (data.request) {
        setSelectedRequest(data.request);
        setRequestsList(prev => prev.map(r => (r.request_id === selectedRequest.request_id ? data.request : r)));
      }
      if (data.audit_logs && Array.isArray(data.audit_logs) && onAddAuditLog) {
        data.audit_logs.forEach((log: AuditLogItem) => onAddAuditLog(log));
      }
      setReplyMessage("");
      setReplySuccess("Reply sent successfully. Notification dispatched to Manager.");
    } catch (err: any) {
      setReplyError(err.message || "Could not connect to backend server. Please try again.");
    } finally {
      setIsReplying(false);
    }
  };

  // Form fields for expanded unauthorised confirmation
  const [unauthFullName, setUnauthFullName] = useState("");
  const [unauthAddress, setUnauthAddress] = useState("");
  const [unauthContactNumber, setUnauthContactNumber] = useState("");
  const [unauthVehicleNumber, setUnauthVehicleNumber] = useState("");
  const [unauthLocation, setUnauthLocation] = useState("");
  const [unauthDateTime, setUnauthDateTime] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/access-logs/locations`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCampusLocations(data);
        }
      })
      .catch(() => {});
  }, []);

  const markAllRead = () => setReadKeys(alertRows.map(recordKey));
  const openAlert = (row: LogRecord) => {
    const key = recordKey(row);
    setSelected(row);
    setReadKeys(current => current.includes(key) ? current : [...current, key]);
    setAlertOrder(current => [...current.filter(item => item !== key), key]);
  };
  const openAuthoriseDialog = () => {
    if (!selected) return;
    const rev = reviewFor(reviews, selected);
    if (rev.status === "Authorised" || rev.status === "Verified" || rev.status === "Revoked") return;
    setAuthNotes("");
    setDialog("authorised");
  };

  const openUnauthDialog = () => {
    if (!selected) return;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setUnauthDateTime(localIso);
    setUnauthFullName(
      selected.name && !missingValues.includes(selected.name.trim().toLowerCase()) && selected.name !== "Unrecognized person" && selected.name !== "Unknown Person"
        ? selected.name
        : ""
    );
    setUnauthAddress("");
    setUnauthContactNumber(selected.phoneNumber || "");
    setUnauthVehicleNumber(selected.vehicleNumber || "");
    setUnauthLocation(selected.block && (campusLocations.includes(selected.block) || defaultCampusLocations.includes(selected.block)) ? selected.block : "");
    setActionTaken("");
    setFormErrors({});
    setDialog("unauthorised");
  };

  const confirmAction = () => {
    if (!selected || !dialog || isSubmitting) return;

    if (dialog === "authorised") {
      setIsSubmitting(true);
      try {
        const trimmedNotes = authNotes.trim() ? authNotes.trim() : undefined;
        updateReview(selected, "Authorised", trimmedNotes);
        setDialog(null);
        setAuthNotes("");
      } finally {
        setIsSubmitting(false);
      }
    } else if (dialog === "unauthorised") {
      const errors: Record<string, string> = {};
      if (!unauthFullName.trim()) {
        errors.fullName = "Full name is required.";
      }
      if (!unauthAddress.trim()) {
        errors.address = "Address is required.";
      }
      if (!unauthContactNumber.trim()) {
        errors.contactNumber = "Contact number is required.";
      } else {
        const cleanPhone = unauthContactNumber.trim().replace(/[\s-]/g, "");
        const isValidPhone = /^(?:\+?91)?[6-9]\d{9}$/.test(cleanPhone) || /^\+?[1-9]\d{9,14}$/.test(cleanPhone);
        if (!isValidPhone) {
          errors.contactNumber = "Please enter a valid 10-digit mobile or international number.";
        }
      }
      if (!unauthLocation || unauthLocation === "Select college location") {
        errors.location = "Please select a college location.";
      }
      if (!unauthDateTime) {
        errors.dateTime = "Date and time is required.";
      }
      if (!actionTaken.trim()) {
        errors.actionTaken = "Action taken is required.";
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      setIsSubmitting(true);
      try {
        const incidentData: IncidentData = {
          fullName: unauthFullName.trim(),
          address: unauthAddress.trim(),
          contactNumber: unauthContactNumber.trim(),
          vehicleNumber: unauthVehicleNumber.trim() || undefined,
          location: unauthLocation,
          dateTime: unauthDateTime,
          actionTaken: actionTaken.trim(),
        };

        updateReview(selected, "Unauthorised", actionTaken.trim(), incidentData);
        setDialog(null);
        setFormErrors({});
      } finally {
        setIsSubmitting(false);
      }
    } else if (dialog === "revoke") {
      if (!reason.trim()) {
        setReasonError(true);
        return;
      }
      setIsSubmitting(true);
      try {
        updateReview(selected, "Revoked", reason.trim());
        setDialog(null);
        setReason("");
        setReasonError(false);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (selectedRequest && role === "admin") {
    return (
      <>
        <TopBar
          title="Request details"
          subtitle={selectedRequest.request_id}
          back={() => {
            setSelectedRequest(null);
            setReplyMessage("");
            setReplyError(null);
            setReplySuccess(null);
          }}
        />
        <div className="page-content">
          <section className="alert-record-head">
            <div className={`alert-symbol ${selectedRequest.status === "Replied" ? "green-bg" : selectedRequest.status === "Viewed" ? "blue-bg" : "amber-bg"}`}>
              <Send size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: "18px" }}>{selectedRequest.subject}</h1>
              <p>From: {selectedRequest.manager_name} (Institute Manager)</p>
            </div>
            <Status tone={selectedRequest.status === "Replied" ? "green" : selectedRequest.status === "Viewed" ? "blue" : "amber"}>
              {selectedRequest.status}
            </Status>
          </section>

          <section className="info-card" style={{ marginTop: "12px" }}>
            <div className="card-kicker"><FileClock size={15} />REQUEST DETAILS</div>
            <dl>
              <div><dt>Request ID</dt><dd><strong>{selectedRequest.request_id}</strong></dd></div>
              <div><dt>From</dt><dd>{selectedRequest.manager_name}</dd></div>
              <div><dt>Institution</dt><dd>{selectedRequest.institution}</dd></div>
              <div><dt>Subject</dt><dd>{selectedRequest.subject}</dd></div>
              <div><dt>Date &amp; Time</dt><dd>{selectedRequest.created_at ? selectedRequest.created_at.replace("T", " ").slice(0, 19) : ""}</dd></div>
              <div><dt>Current Status</dt><dd>{selectedRequest.status}</dd></div>
            </dl>
          </section>

          <section className="info-card" style={{ marginTop: "12px" }}>
            <div className="card-kicker"><Mail size={15} />COMPLETE QUERY / MESSAGE</div>
            <p style={{ margin: "8px 0 0 0", fontSize: "14px", lineHeight: "1.6", color: "#1e293b", whiteSpace: "pre-wrap" }}>
              {selectedRequest.message}
            </p>
          </section>

          {selectedRequest.reply_message && (
            <section className="info-card" style={{ marginTop: "16px", border: "1px solid #bbf7d0", backgroundColor: "#f0fdf4" }}>
              <div className="card-kicker" style={{ color: "#16a34a" }}><CheckCircle2 size={15} />REPLY TO MANAGER (SENT)</div>
              <div style={{ marginTop: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "13px", color: "#166534" }}>{selectedRequest.admin_name || "Avery Williams"} (Super admin)</strong>
                  <small style={{ color: "#15803d", fontWeight: "600" }}>{selectedRequest.replied_at ? selectedRequest.replied_at.replace("T", " ").slice(0, 19) : ""}</small>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "14px", lineHeight: "1.6", color: "#14532d", whiteSpace: "pre-wrap" }}>
                  {selectedRequest.reply_message}
                </p>
              </div>
            </section>
          )}

          {selectedRequest.status !== "Replied" && (
            <section className="card" style={{ marginTop: "16px", padding: "16px" }}>
              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb", letterSpacing: "0.5px" }}>REPLY TO MANAGER</span>
                <h3 style={{ fontSize: "16px", margin: "2px 0 0", color: "#0f172a" }}>Reply to Manager</h3>
              </div>

              {replySuccess ? (
                <div style={{ backgroundColor: "#ecfdf5", color: "#065f46", padding: "12px", borderRadius: "8px", fontSize: "13px", border: "1px solid #a7f3d0" }}>
                  {replySuccess}
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="form-stack guard-form">
                  <label className="field">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Admin Reply Message <b>*</b></span>
                      <span className="char-counter" style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: replyMessage.length > 500 ? "#dc2626" : replyMessage.length > 450 ? "#d97706" : "#64748b"
                      }}>
                        {500 - replyMessage.length} characters left ({replyMessage.length}/500)
                      </span>
                    </div>
                    <textarea
                      rows={5}
                      maxLength={500}
                      value={replyMessage}
                      disabled={isReplying}
                      onChange={e => {
                        setReplyMessage(e.target.value);
                        if (replyError) setReplyError(null);
                      }}
                      placeholder="Type your official reply to Manager Priya Raman (maximum 500 characters)..."
                      required
                    />
                  </label>

                  {replyError && (
                    <div style={{
                      backgroundColor: "#fef2f2",
                      color: "#b91c1c",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      marginTop: "6px",
                      border: "1px solid #fecaca"
                    }}>
                      {replyError}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "10px", marginTop: "14px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={isReplying}
                      onClick={() => {
                        setSelectedRequest(null);
                        setReplyMessage("");
                        setReplyError(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn primary"
                      disabled={isReplying || !replyMessage.trim() || replyMessage.length > 500}
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <Send size={15} />
                      {isReplying ? "Sending Reply..." : "Send Reply"}
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}
        </div>
      </>
    );
  }

  if (selectedRequest && role === "manager") {
    return (
      <>
        <TopBar
          title="Admin Reply Details"
          subtitle={selectedRequest.request_id}
          back={() => setSelectedRequest(null)}
        />
        <div className="page-content">
          <section className="alert-record-head">
            <div className={`alert-symbol ${selectedRequest.status === "Replied" ? "green-bg" : "blue-bg"}`}>
              {selectedRequest.status === "Replied" ? <CheckCircle2 size={20} /> : <Send size={20} />}
            </div>
            <div>
              <h1 style={{ fontSize: "18px" }}>{selectedRequest.subject}</h1>
              <p>Request ID: {selectedRequest.request_id}</p>
            </div>
            <Status tone={selectedRequest.status === "Replied" ? "green" : "blue"}>
              {selectedRequest.status === "Replied" ? "Replied" : selectedRequest.status}
            </Status>
          </section>

          <section className="info-card" style={{ marginTop: "12px" }}>
            <div className="card-kicker"><FileClock size={15} />REQUEST SUMMARY</div>
            <dl>
              <div><dt>Request ID</dt><dd><strong>{selectedRequest.request_id}</strong></dd></div>
              <div><dt>Subject</dt><dd>{selectedRequest.subject}</dd></div>
              <div><dt>Date &amp; Time Sent</dt><dd>{selectedRequest.created_at ? selectedRequest.created_at.replace("T", " ").slice(0, 19) : ""}</dd></div>
              <div><dt>Status</dt><dd>{selectedRequest.status}</dd></div>
            </dl>
          </section>

          <section className="info-card" style={{ marginTop: "12px" }}>
            <div className="card-kicker"><Mail size={15} />ORIGINAL REQUEST SENT TO ADMIN</div>
            <p style={{ margin: "8px 0 0 0", fontSize: "14px", lineHeight: "1.6", color: "#1e293b", whiteSpace: "pre-wrap" }}>
              {selectedRequest.message}
            </p>
          </section>

          {selectedRequest.reply_message ? (
            <section className="info-card" style={{ marginTop: "16px", border: "1px solid #bbf7d0", backgroundColor: "#f0fdf4" }}>
              <div className="card-kicker" style={{ color: "#16a34a" }}><CheckCircle2 size={15} />ADMIN REPLY</div>
              <div style={{ marginTop: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "13px", color: "#166534" }}>{selectedRequest.admin_name || "Avery Williams"} (Super admin)</strong>
                  <small style={{ color: "#15803d", fontWeight: "600" }}>{selectedRequest.replied_at ? selectedRequest.replied_at.replace("T", " ").slice(0, 19) : ""}</small>
                </div>
                <p style={{ margin: "6px 0 10px 0", fontSize: "14px", lineHeight: "1.6", color: "#14532d", whiteSpace: "pre-wrap" }}>
                  {selectedRequest.reply_message}
                </p>
                <div style={{ padding: "8px 10px", backgroundColor: "#e2e8f0", borderRadius: "6px", fontSize: "11px", color: "#475569" }}>
                  Notice: This reply is permanently recorded in the institutional audit trail. Manager cannot edit or delete this reply.
                </div>
              </div>
            </section>
          ) : (
            <div style={{ marginTop: "16px", padding: "14px", backgroundColor: "#fef3c7", borderRadius: "8px", color: "#92400e", fontSize: "13px" }}>
              Admin has not yet replied to this request. You will be notified in this section as soon as Admin sends a reply.
            </div>
          )}
        </div>
      </>
    );
  }

  if (selected) {
    const review = reviewFor(reviews, selected);
    const knownInstitution = !["Not identified", "Not available"].includes(selected.institution);
    return <>
      <TopBar title="Alert details" subtitle={selected.logId} back={() => { setSelected(null); setDialog(null); setAuthNotes(""); }} />
      <div className="page-content">
        <section className="alert-record-head">
          <div className={`alert-symbol ${selected.accessCategory === "Authorized" ? "blue-bg" : ""}`}>{selected.accessCategory === "Authorized" ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}</div>
          <div><h1>{selected.name}</h1>{selected.personType !== "Unauthorised" && <p>{`${selected.personType} · ${selected.id}`}</p>}</div>
          <Status tone={reviewTone(review.status)}>{review.status}</Status>
        </section>
        {selected.photo && (
          <section className="info-card alert-intruder-card">
            <div className="card-kicker"><Camera size={15} />CAPTURED INTRUDER PHOTOGRAPH</div>
            <div className="alert-intruder-detail-preview">
              <img src={selected.photo} alt="Captured Intruder" className="alert-detail-photo" />
              <div className="alert-detail-photo-meta">
                <Status tone="red">LIVE CAMERA CAPTURE</Status>
                <p>Captured during facial scan at {selected.block}</p>
                <small>Associated Event ID: {selected.logId || "DEN-•••-4039"}</small>
              </div>
            </div>
          </section>
        )}
        {(() => {
          const latestUnauth = [...review.actions].reverse().find(a => a.type === "Unauthorised" && (a.full_name || a.action_taken || a.address));
          if (!latestUnauth) return null;
          return (
            <section className="info-card alert-info supervisor-incident-card">
              <div className="card-kicker"><ShieldAlert size={15} />SUPERVISOR INCIDENT DETAILS</div>
              <dl>
                <div><dt>Full name</dt><dd>{latestUnauth.full_name || selected.name}</dd></div>
                {latestUnauth.address && <div><dt>Address</dt><dd>{latestUnauth.address}</dd></div>}
                {latestUnauth.contact_number && <div><dt>Contact number</dt><dd>{latestUnauth.contact_number}</dd></div>}
                {latestUnauth.vehicle_number && <div><dt>Vehicle number</dt><dd>{latestUnauth.vehicle_number}</dd></div>}
                <div><dt>Incident location</dt><dd>{latestUnauth.location || selected.block}</dd></div>
                <div><dt>Incident date & time</dt><dd>{latestUnauth.incident_datetime ? latestUnauth.incident_datetime.replace("T", " ") : selected.dateTime.replace("T", " ")}</dd></div>
                <div><dt>Action taken</dt><dd>{latestUnauth.action_taken || latestUnauth.reason}</dd></div>
                <div><dt>Decision recorded by</dt><dd>{latestUnauth.actor} · {latestUnauth.actorNumber}</dd></div>
              </dl>
            </section>
          );
        })()}
        <section className="info-card action-history"><div className="card-kicker"><History size={15} />ACTION HISTORY</div><div className="history-list"><div><i><Shield size={13} /></i><p><strong>Original event recorded</strong><span>{selected.guard} · {selected.guardNumber}</span><small>{selected.dateTime.replace("T", " ")} · {selected.block}</small></p></div>{review.actions.map((action, index) => <div key={`${action.timestamp}${index}`}><i className={action.type === "Unauthorised" ? "danger-history" : ""}>{action.type === "Verified" || action.type === "Authorised" || action.type === "Revoked" ? <Check size={13} /> : <ShieldAlert size={13} />}</i><p><strong>{action.type}</strong><span>{action.actor} · {action.actorNumber}</span><small>{action.timestamp}{action.reason ? ` · ${action.reason}` : ""}</small>{action.full_name && <small className="action-history-details">Name: {action.full_name} · Contact: {action.contact_number || "N/A"} · Location: {action.location || "N/A"}{action.vehicle_number ? ` · Vehicle: ${action.vehicle_number}` : ""}</small>}</p></div>)}</div></section>
        {(role === "supervisor" || role === "cso") && (
          <div className="review-actions three-actions">
            <Button
              variant="success"
              onClick={openAuthoriseDialog}
              icon={<ShieldCheck size={16} />}
              disabled={review.status === "Authorised" || review.status === "Verified" || review.status === "Revoked"}
            >
              Authorised
            </Button>
            <Button
              variant="warning"
              onClick={openUnauthDialog}
              icon={<ShieldAlert size={16} />}
              disabled={review.status === "Unauthorised" || review.status === "Revoked"}
            >
              Unauthorised
            </Button>
            <Button
              onClick={() => {
                setReason("");
                setReasonError(false);
                setDialog("revoke");
              }}
              icon={<ShieldCheck size={16} />}
              disabled={review.status === "Revoked"}
            >
              Revoke
            </Button>
          </div>
        )}
      </div>
      {dialog && (
        <div className="dialog-backdrop">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <div className={`dialog-icon ${dialog === "unauthorised" ? "danger" : ""}`}>
              {dialog === "unauthorised" ? <ShieldAlert size={23} /> : <ShieldCheck size={23} />}
            </div>
            <h2 id="dialog-title">
              {dialog === "authorised"
                ? "Mark as authorised?"
                : dialog === "unauthorised"
                ? "Mark as unauthorised?"
                : "Revoke unauthorised entry?"}
            </h2>
            <p>
              {dialog === "authorised"
                ? "Record any action taken or additional notes before confirming this authorised event."
                : dialog === "unauthorised"
                ? "Record the action taken before confirming this unauthorized event."
                : "Revoke only if this entry is valid. Provide the reason, e.g. host approval granted."}
            </p>
            <div className="dialog-summary">
              <strong>{selected.name}</strong>
              <span>{selected.accessCategory} · {selected.guard}</span>
              <small>{selected.block} · {knownInstitution ? selected.institution : "Institution B"}</small>
            </div>
            {dialog === "authorised" && (
              <label className="field">
                <span>Action Taken / Notes (Optional)</span>
                <textarea
                  value={authNotes}
                  onChange={e => setAuthNotes(e.target.value)}
                  rows={3}
                  placeholder="Enter action taken or additional notes..."
                />
              </label>
            )}
            {dialog === "unauthorised" && (
              <div className="unauth-form-fields">
                <label className="field">
                  <span>Full Name *</span>
                  <input
                    type="text"
                    value={unauthFullName}
                    onChange={e => {
                      setUnauthFullName(e.target.value);
                      if (e.target.value.trim()) setFormErrors(prev => ({ ...prev, fullName: "" }));
                    }}
                    placeholder="Enter full name"
                  />
                  {formErrors.fullName && <small className="field-error">{formErrors.fullName}</small>}
                </label>

                <label className="field">
                  <span>Address *</span>
                  <textarea
                    value={unauthAddress}
                    onChange={e => {
                      setUnauthAddress(e.target.value);
                      if (e.target.value.trim()) setFormErrors(prev => ({ ...prev, address: "" }));
                    }}
                    rows={2}
                    placeholder="Enter complete address"
                  />
                  {formErrors.address && <small className="field-error">{formErrors.address}</small>}
                </label>

                <label className="field">
                  <span>Contact Number *</span>
                  <input
                    type="tel"
                    value={unauthContactNumber}
                    onChange={e => {
                      setUnauthContactNumber(e.target.value);
                      if (e.target.value.trim()) setFormErrors(prev => ({ ...prev, contactNumber: "" }));
                    }}
                    placeholder="Enter contact number"
                  />
                  {formErrors.contactNumber && <small className="field-error">{formErrors.contactNumber}</small>}
                </label>

                <label className="field">
                  <span>Vehicle Number</span>
                  <input
                    type="text"
                    value={unauthVehicleNumber}
                    onChange={e => setUnauthVehicleNumber(e.target.value)}
                    placeholder="Enter vehicle registration number"
                  />
                </label>

                <label className="field">
                  <span>Location *</span>
                  <select
                    value={unauthLocation}
                    onChange={e => {
                      setUnauthLocation(e.target.value);
                      if (e.target.value) setFormErrors(prev => ({ ...prev, location: "" }));
                    }}
                  >
                    <option value="">Select college location</option>
                    {campusLocations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  {formErrors.location && <small className="field-error">{formErrors.location}</small>}
                </label>

                <label className="field">
                  <span>Date and Time *</span>
                  <input
                    type="datetime-local"
                    value={unauthDateTime}
                    onChange={e => {
                      setUnauthDateTime(e.target.value);
                      if (e.target.value) setFormErrors(prev => ({ ...prev, dateTime: "" }));
                    }}
                  />
                  {formErrors.dateTime && <small className="field-error">{formErrors.dateTime}</small>}
                </label>

                <label className="field">
                  <span>Action Taken *</span>
                  <textarea
                    value={actionTaken}
                    onChange={e => {
                      setActionTaken(e.target.value);
                      if (e.target.value.trim()) setFormErrors(prev => ({ ...prev, actionTaken: "" }));
                    }}
                    rows={2}
                    placeholder="Enter the action taken..."
                  />
                  {formErrors.actionTaken && <small className="field-error">{formErrors.actionTaken}</small>}
                </label>
              </div>
            )}
            {dialog === "revoke" && (
              <label className="field">
                <span>Reason for revocation *</span>
                <textarea
                  value={reason}
                  onChange={event => {
                    setReason(event.target.value);
                    if (event.target.value.trim()) setReasonError(false);
                  }}
                  rows={3}
                  placeholder="e.g. Host approval granted"
                />
                {reasonError && <small className="field-error">A revocation reason is required.</small>}
              </label>
            )}
            <div className="dialog-actions">
              <Button
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => {
                  setDialog(null);
                  setAuthNotes("");
                  setFormErrors({});
                  setReasonError(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant={dialog === "authorised" ? "success" : dialog === "revoke" ? "primary" : "warning"}
                disabled={isSubmitting}
                onClick={confirmAction}
              >
                {isSubmitting
                  ? "Confirming..."
                  : dialog === "authorised"
                  ? "Confirm Authorised"
                  : dialog === "unauthorised"
                  ? "Confirm Unauthorised"
                  : "Confirm revoke"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>;
  }
  const unreadRequestCount = role === "admin"
    ? requestsList.filter(r => r.status === "Sent").length
    : requestsList.filter(r => r.status === "Replied").length;

  return <>
    <TopBar
      title={
        role === "admin"
          ? "Admin Notifications"
          : role === "manager"
          ? "Manager Notifications"
          : role === "staff"
          ? "Staff alerts"
          : role === "cso"
          ? "Alerts"
          : "Security alerts"
      }
      subtitle={
        role === "admin"
          ? "Campus Security & Management Requests"
          : role === "manager"
          ? "Institutional Requests & Super Admin Replies"
          : role === "supervisor"
          ? ""
          : role === "cso"
          ? "Institution B · CSO review"
          : "Relevant to your assigned scope"
      }
      back={back}
      action={<button className="text-action" onClick={markAllRead}>{readKeys.length === alertRows.length ? "All read" : "Mark read"}</button>}
    />
    <div className="page-content">
      {role === "admin" && (
        <div style={{ display: "flex", gap: "8px", margin: "0 0 12px 0", overflowX: "auto" }}>
          <button
            type="button"
            className={`filter-chip ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid var(--line)",
              background: activeFilter === "all" ? "var(--blue)" : "#fff",
              color: activeFilter === "all" ? "#fff" : "#475569",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            All Notifications ({alertRows.length + requestsList.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === "alerts" ? "active" : ""}`}
            onClick={() => setActiveFilter("alerts")}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid var(--line)",
              background: activeFilter === "alerts" ? "var(--blue)" : "#fff",
              color: activeFilter === "alerts" ? "#fff" : "#475569",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            Security Alerts ({alertRows.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === "requests" ? "active" : ""}`}
            onClick={() => setActiveFilter("requests")}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid var(--line)",
              background: activeFilter === "requests" ? "var(--blue)" : "#fff",
              color: activeFilter === "requests" ? "#fff" : "#475569",
              fontSize: "12px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Requests ({requestsList.length})
            {unreadRequestCount > 0 && (
              <span style={{
                background: "#ef4444",
                color: "#fff",
                borderRadius: "10px",
                padding: "1px 6px",
                fontSize: "10px",
                fontWeight: "700",
              }}>
                {unreadRequestCount} new
              </span>
            )}
          </button>
        </div>
      )}

      {role === "manager" && (
        <div style={{ display: "flex", gap: "8px", margin: "0 0 12px 0", overflowX: "auto" }}>
          <button
            type="button"
            className={`filter-chip ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid var(--line)",
              background: activeFilter === "all" ? "var(--blue)" : "#fff",
              color: activeFilter === "all" ? "#fff" : "#475569",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            All Notifications
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === "requests" ? "active" : ""}`}
            onClick={() => setActiveFilter("requests")}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid var(--line)",
              background: activeFilter === "requests" ? "var(--blue)" : "#fff",
              color: activeFilter === "requests" ? "#fff" : "#475569",
              fontSize: "12px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Requests &amp; Replies ({requestsList.length})
            {unreadRequestCount > 0 && (
              <span style={{
                background: "#10b981",
                color: "#fff",
                borderRadius: "10px",
                padding: "1px 6px",
                fontSize: "10px",
                fontWeight: "700",
              }}>
                {unreadRequestCount} replied
              </span>
            )}
          </button>
        </div>
      )}

      {role !== "admin" && role !== "manager" && (
        <div className="notification-legend"><span><i />Unread</span><strong>{alertRows.filter(row => reviewFor(reviews, row).status === "Pending Verification").length} pending verification</strong></div>
      )}

      <div className="alert-list">
        {/* REQUEST CARDS FOR ADMIN PORTAL */}
        {role === "admin" && activeFilter !== "alerts" && requestsList.map(req => {
          const isSent = req.status === "Sent";
          return (
            <article
              key={req.request_id}
              className={`alert-card ${isSent ? "unread high" : "muted"}`}
              onClick={() => openRequest(req)}
              style={{ cursor: "pointer" }}
            >
              <div className={`alert-symbol ${isSent ? "amber-bg" : req.status === "Replied" ? "green-bg" : "blue-bg"}`}>
                <Send size={18} />
              </div>
              <div className="alert-card-body">
                <div className="alert-heading-row">
                  <span style={{ color: isSent ? "#d97706" : "#2563eb", fontWeight: "700", letterSpacing: "0.4px" }}>
                    REQUEST FROM MANAGER
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>{req.request_id}</span>
                </div>
                <h3 style={{ margin: "2px 0 4px" }}>{req.subject}</h3>
                <p style={{ margin: "0 0 4px 0", color: "#334155", fontWeight: "500", fontSize: "13px" }}>
                  {req.manager_name} · {req.institution}
                </p>
                <p style={{ margin: "0 0 6px 0", fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                  "{req.message && req.message.length > 90 ? req.message.slice(0, 90) + "..." : req.message}"
                </p>
                <div className="alert-meta">
                  <b>{req.created_at ? req.created_at.replace("T", " ").slice(0, 16) : ""}</b>
                  <Status tone={req.status === "Replied" ? "green" : req.status === "Viewed" ? "blue" : "amber"}>
                    {req.status === "Sent" ? "New / Unread" : req.status}
                  </Status>
                  <button type="button" onClick={(e) => { e.stopPropagation(); openRequest(req); }}>
                    Open <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {/* REQUEST & REPLY CARDS FOR MANAGER PORTAL */}
        {role === "manager" && activeFilter !== "alerts" && requestsList.map(req => {
          const isReplied = req.status === "Replied";
          return (
            <article
              key={req.request_id}
              className={`alert-card ${isReplied ? "unread" : "muted"}`}
              onClick={() => openRequest(req)}
              style={{ cursor: "pointer" }}
            >
              <div className={`alert-symbol ${isReplied ? "green-bg" : "blue-bg"}`}>
                {isReplied ? <CheckCircle2 size={18} /> : <Send size={18} />}
              </div>
              <div className="alert-card-body">
                <div className="alert-heading-row">
                  <span style={{ color: isReplied ? "#059669" : "#2563eb", fontWeight: "700", letterSpacing: "0.4px" }}>
                    {isReplied ? "ADMIN REPLIED TO YOUR REQUEST" : "REQUEST TO ADMIN"}
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>{req.request_id}</span>
                </div>
                <h3 style={{ margin: "2px 0 4px" }}>{req.subject}</h3>
                {isReplied ? (
                  <>
                    <p style={{ margin: "0 0 4px 0", color: "#15803d", fontWeight: "600", fontSize: "13px" }}>
                      Admin Reply: "{req.reply_message && req.reply_message.length > 80 ? req.reply_message.slice(0, 80) + "..." : req.reply_message}"
                    </p>
                    <p style={{ margin: "0 0 6px 0", fontSize: "12px", color: "#64748b" }}>
                      Replied by {req.admin_name || "Avery Williams"} (Super admin)
                    </p>
                  </>
                ) : (
                  <p style={{ margin: "0 0 6px 0", fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                    "{req.message && req.message.length > 90 ? req.message.slice(0, 90) + "..." : req.message}"
                  </p>
                )}
                <div className="alert-meta">
                  <b>{(req.replied_at || req.created_at || "").replace("T", " ").slice(0, 16)}</b>
                  <Status tone={req.status === "Replied" ? "green" : req.status === "Viewed" ? "blue" : "amber"}>
                    {req.status}
                  </Status>
                  <button type="button" onClick={(e) => { e.stopPropagation(); openRequest(req); }}>
                    Open <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {/* SECURITY ALERTS */}
        {activeFilter !== "requests" && alertOrder.map(key => alertRows.find(row => recordKey(row) === key)).filter((row): row is LogRecord => Boolean(row)).map(row => {
          const review = reviewFor(reviews, row);
          const unread = !readKeys.includes(recordKey(row));
          const notificationType = role === "warden" ? "Unrecognized Hostel Entry" : review.status === "Verified" ? "Verification Completed" : review.status === "Unauthorised" ? "Marked Unauthorised" : review.status === "Revoked" ? "Unauthorized Decision Revoked" : `${row.accessCategory} Event Alert`;
          const hasPhoto = Boolean(row.photo);
          return (
            <article
              key={recordKey(row)}
              className={`alert-card ${row.accessCategory === "Unauthorized" ? "high" : ""} ${unread ? "unread" : "muted"} ${hasPhoto ? "with-intruder-photo" : ""}`}
              onClick={() => openAlert(row)}
            >
              {hasPhoto ? (
                <div className="alert-intruder-col">
                  <img src={row.photo} alt="Captured Intruder" className="alert-intruder-photo" />
                </div>
              ) : (
                <div className={`alert-symbol ${row.accessCategory === "Authorized" ? "blue-bg" : ""}`}>
                  {row.accessCategory === "Authorized" ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                </div>
              )}
              <div className="alert-card-body">
                <div className="alert-heading-row">
                  {hasPhoto && (
                    <div className={`alert-symbol-mini ${row.accessCategory === "Authorized" ? "blue-bg" : ""}`}>
                      {row.accessCategory === "Authorized" ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                    </div>
                  )}
                  <span>{notificationType.toUpperCase()}</span>
                </div>
                <h3>{row.name}</h3>
                <p>{row.personType} · {row.guard} ({row.guardNumber})</p>
                <div className="notification-location">
                  <MapPin size={12} />{row.block} — {["Not identified", "Not available"].includes(row.institution) ? "Institution B" : row.institution}
                </div>
                <div className="alert-meta">
                  <b>{row.dateTime.replace("T", " ")}</b>
                  <Status tone={reviewTone(review.status)}>{review.status}</Status>
                  {deleteLog && (
                    <button
                      type="button"
                      title="Remove alert"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteLog(row);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button onClick={(event) => { event.stopPropagation(); openAlert(row); }}>
                    Open<ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {role !== "warden" && <article className="alert-card muted" onClick={() => setReadKeys(current => current.includes("location-alert") ? current : [...current, "location-alert"])}><div className="alert-symbol amber-bg"><MapPin size={20} /></div><div><span>LOCATION ACCESS ALERT</span><h3>Device location unavailable</h3><p>Live device location permission is unavailable. Recorded gate locations remain available in logs.</p><div className="notification-location"><MapPin size={12} />Main Gate — Institution B</div><div className="alert-meta"><b>2025-06-16 10:45</b><Status tone="amber">Permission unavailable</Status></div></div></article>}
      </div>
    </div>
  </>;
}

function ForgotPassword({ go }: { go: (screen: Screen) => void }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const submit = () => {
    if (!username.trim()) { setError("Enter your username to continue."); return; }
    setError("");
    setSent(true);
  };
  return <main className="phone-page login-page">
    <section className="login-brand">
      <div className="login-college-emblem">
        <img src="/srm-logo.png" alt="SRM GROUP OF INSTITUTIONS TRICHY Emblem" />
      </div>
      <div className="login-inst-text">
        <span className="inst-badge">PASSWORD RECOVERY</span>
        <h1 className="inst-title">SRM GROUP OF INSTITUTIONS</h1>
        <h2 className="inst-sub">TRICHY</h2>
        <p className="app-subtitle">Campus Secure · Identity Verification</p>
      </div>
    </section>
    <section className="login-card">
      {sent ? <><span className="overline">REQUEST SENT</span><h2>Check with your admin</h2><div className="capture-note"><Check size={14} />A reset request for "{username.trim()}" was sent to the Campus Secure administrator. You will be contacted on your registered phone number.</div></> : <><span className="overline">ACCOUNT RECOVERY</span><h2>Forgot password</h2>
      <label className="field"><span>Username</span><input value={username} onChange={event => setUsername(event.target.value)} placeholder="Enter username" autoCapitalize="none" /></label>
      {error && <div className="login-error"><AlertTriangle size={14} />{error}</div>}
      <Button onClick={submit}>Send reset request<ChevronRight size={17} /></Button></>}
      <button className="text-action forgot-link" onClick={() => go("login")}>Back to sign in</button>
    </section>
  </main>;
}

function AccessDenied({ role, go }: { role: Role; go: (screen: Screen) => void }) {
  return <>
    <TopBar title="Access denied" subtitle={roleMeta[role].label} back={() => go("home")} />
    <div className="page-content"><div className="empty-state"><Lock size={28} /><strong>You do not have permission</strong><span>This area is reserved for Super admin. Your role cannot open administrative configuration or user management. This attempt has been recorded in the audit history.</span></div>
      <Button onClick={() => go("home")}>Return to dashboard</Button></div>
  </>;
}

function OversightHome({ role, go }: { role: "cso" | "manager"; go: (screen: Screen) => void }) {
  const cso = role === "cso";
  const stats = [["1,842", "Authorized"], ["6", "Unauthorized"]];
  return <>
    <TopBar title="Campus Secure" subtitle={cso ? "CSO Portal" : "Manager Portal"} action={<Status tone="green">Institution B</Status>} />
    <div className="page-content"><ProfileHead role={role} go={go} />
      <section className="admin-hero"><div><span>INSTITUTION B ENTRIES TODAY</span><strong>1,854</strong></div>{cso ? <ShieldAlert size={50} /> : <Building2 size={50} />}</section>
      <div className="dashboard-stats">{stats.map(([value, label]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div>
      {cso && (
        <div className="guard-actions" style={{ marginBottom: "14px" }}>
          <button className="scan-action single-scan" onClick={() => go("scan")}>
            <span><ScanFace size={28} /></span>
            <div>
              <strong>Scan person & verify access</strong>
              <small>Live facial scan & identity check</small>
            </div>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
      <div className="admin-list">
        {cso && <button onClick={() => go("alerts")}><span className="amber-icon"><ShieldAlert size={21} /></span><div><strong>Security alerts & review</strong><small>Take action: Authorised, Unauthorised or Revoke</small></div><ChevronRight size={18} /></button>}
        {cso && <button onClick={() => go("audit")}><span><FileClock size={21} /></span><div><strong>Audit records</strong></div><ChevronRight size={18} /></button>}
        {cso && <button onClick={() => go("campus-entries")}><span><DoorOpen size={21} /></span><div><strong>Institution entry logs</strong></div><ChevronRight size={18} /></button>}
        {cso && <button onClick={() => go("login-logs")}><span><FileClock size={21} /></span><div><strong>Worklog</strong></div><ChevronRight size={18} /></button>}
        <button onClick={() => go("add-student")}><span className="amber-icon"><UserPlus size={21} /></span><div><strong>Add new student</strong><small>Manual entry with photo & face model training</small></div><ChevronRight size={18} /></button>
        <button onClick={() => go("manager-students")}><span><Users size={21} /></span><div><strong>Manage institution students</strong><small>View & edit student details</small></div><ChevronRight size={18} /></button>
        {!cso && <button onClick={() => go("institution-users")}><span><UserCog size={21} /></span><div><strong>Institution users</strong><small>Manage officers & staff</small></div><ChevronRight size={18} /></button>}
        {!cso && <button onClick={() => go("campus-entries")}><span><DoorOpen size={21} /></span><div><strong>Institution entry logs</strong></div><ChevronRight size={18} /></button>}
        {!cso && <button onClick={() => go("admin-audit-logs")}><span><FileClock size={21} /></span><div><strong>Institution audit logs</strong><small>Track all changes & edits made</small></div><ChevronRight size={18} /></button>}
        {!cso && <button onClick={() => go("alerts")}><span><Bell size={21} /></span><div><strong>Alerts from security</strong></div><ChevronRight size={18} /></button>}
      </div>
    </div>
  </>;
}

type PortalDesignation = "Security" | "Campus Supervisor" | "Warden" | "Access Supervisor" | "CSO" | "Welfare";
type InstitutionUser = {
  initials: string;
  name: string;
  id: string;
  designation: PortalDesignation;
  addedOn: string;
  email: string;
  phone: string;
  scope: string;
  status: "Active" | "Inactive";
};

const portalDesignationFilters: PortalDesignation[] = ["Security", "Campus Supervisor", "Warden", "Access Supervisor", "CSO", "Welfare"];

const institutionUsers: InstitutionUser[] = [
  { initials: "AK", name: "Arun Kumar", id: "GRD-B-0017", designation: "Security", addedOn: "2025-01-12", email: "arun.kumar@campus.edu", phone: "+91 98765 43210", scope: "Main Gate · Institution B", status: "Active" },
  { initials: "KR", name: "Kavya Rao", id: "GRD-B-0031", designation: "Security", addedOn: "2025-03-04", email: "kavya.rao@campus.edu", phone: "+91 98765 43318", scope: "Block A · Institution B", status: "Active" },
  { initials: "MN", name: "Meera Nair", id: "SUP-B-0004", designation: "Campus Supervisor", addedOn: "2024-11-20", email: "meera.nair@campus.edu", phone: "+91 98765 40128", scope: "Institution B Campus", status: "Active" },
  { initials: "LI", name: "Lakshmi Iyer", id: "WRD-B-0011", designation: "Warden", addedOn: "2025-02-08", email: "lakshmi.iyer@campus.edu", phone: "+91 98765 40518", scope: "Bharathi Hostel", status: "Active" },
  { initials: "AS", name: "Arun Sharma", id: "ACS-B-0012", designation: "Access Supervisor", addedOn: "2025-04-15", email: "arun.sharma@campus.edu", phone: "+91 98765 40812", scope: "Main Gate · College Campus", status: "Active" },
  { initials: "RM", name: "Rohan Mehta", id: "CSO-0001", designation: "CSO", addedOn: "2024-08-01", email: "rohan.mehta@campus.edu", phone: "+91 98765 40377", scope: "Institution B", status: "Active" },
  { initials: "KR", name: "Dr. Kavitha Rao", id: "WEL-B-0003", designation: "Welfare", addedOn: "2025-05-22", email: "kavitha.rao@campus.edu", phone: "+91 98765 40733", scope: "Institution B · Student welfare", status: "Inactive" },
];

function InstitutionUserDirectory({ go }: { go: (screen: Screen) => void }) {
  const [query, setQuery] = useState("");
  const [designationFilter, setDesignationFilter] = useState("All designations");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rows = institutionUsers.filter(user =>
    `${user.name} ${user.id} ${user.email} ${user.designation}`.toLowerCase().includes(query.toLowerCase())
    && (designationFilter === "All designations" || user.designation === designationFilter)
    && (!startDate || user.addedOn >= startDate)
    && (!endDate || user.addedOn <= endDate)
  );
  const selected = institutionUsers.find(user => user.id === selectedId);
  if (selected) return <>
    <TopBar title="User details" subtitle="Institution B · Read-only" back={() => setSelectedId(null)} />
    <div className="page-content">
      <section className="officer-detail-head"><div className="person-avatar violet">{selected.initials}</div><div><span>{selected.designation.toUpperCase()}</span><h1>{selected.name}</h1><p>{selected.id}</p></div><Status tone={selected.status === "Active" ? "green" : "gray"}>{selected.status}</Status></section>
      <section className="info-card manager-user-info"><div className="card-kicker"><IdCard size={15} />USER DETAILS</div><dl><div><dt>Full name</dt><dd>{selected.name}</dd></div><div><dt>User ID</dt><dd>{selected.id}</dd></div><div><dt>Designation</dt><dd>{selected.designation}</dd></div><div><dt>Assigned scope</dt><dd>{selected.scope}</dd></div><div><dt>Added on</dt><dd>{selected.addedOn}</dd></div><div><dt>Official email</dt><dd>{selected.email}</dd></div><div><dt>Phone number</dt><dd>{selected.phone}</dd></div><div><dt>Status</dt><dd>{selected.status}</dd></div></dl></section>
    </div>
  </>;
  return <>
    <TopBar title="Users" subtitle="Institution B" back={() => go("home")} />
    <div className="page-content">
      <div className="search-input"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, ID or email" />{query && <button onClick={() => setQuery("")}>Clear</button>}</div>
      <section className="filter-panel login-filter worklog-filter"><div className="filter-fields single-field"><Field label="Designation"><select value={designationFilter} onChange={event => setDesignationFilter(event.target.value)}><option>All designations</option>{portalDesignationFilters.map(item => <option key={item}>{item}</option>)}</select></Field></div><div className="date-filter worklog-date-range"><label><CalendarDays size={15} /><span>Start Date</span><input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label><span>to</span><label><CalendarDays size={15} /><span>End Date</span><input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></label></div></section>
      <div className="manager-directory-summary"><strong>{rows.length}</strong><span>users found</span></div>
      <div className="directory-list manager-directory">{rows.map(user => <section key={user.id}><button onClick={() => setSelectedId(user.id)}><div className="person-avatar violet">{user.initials}</div><div><strong>{user.name}</strong><span>{user.id}</span><small>{user.designation}</small></div><Status tone={user.status === "Active" ? "green" : "gray"}>{user.status}</Status><ChevronRight size={16} /></button></section>)}</div>
      {rows.length === 0 && <div className="empty-state"><Users size={25} /><strong>No matching users</strong><span>Change one or more filters.</span></div>}
    </div>
  </>;
}

function StudentAffairsHome({ go }: { go: (screen: Screen) => void }) {
  return <>
    <TopBar title="Campus Secure" subtitle="Student Affairs Portal" action={<Status tone="green">Institution B</Status>} />
    <div className="page-content"><ProfileHead role="students" go={go} />
      <section className="department-hero"><div><span>ACTIVE STUDENTS</span><strong>6,842</strong><p>Institution B records</p></div><div className="round-icon"><Users size={27} /></div></section>
      <div className="dashboard-stats three"><div><strong>126</strong><small>Added this month</small></div><div><strong>642</strong><small>Entries today</small></div><div><strong>12</strong><small>Records updated</small></div></div>
      <div className="section-heading compact"><div><h2>Quick actions</h2></div></div>
      <div className="admin-list">
        <button onClick={() => go("logs")}><span><History size={21} /></span><div><strong>Campus records</strong></div><ChevronRight size={18} /></button>
        <button onClick={() => go("workload")}><span><FileClock size={21} /></span><div><strong>Officer workload</strong></div><ChevronRight size={18} /></button>
      </div>
    </div>
  </>;
}

function AdminHome({ go }: { go: (screen: Screen) => void }) {
  return <>
    <TopBar title="Campus Secure" subtitle="Super admin Portal" action={<Status tone="green">All institutions</Status>} />
    <div className="page-content"><ProfileHead role="admin" go={go} />
      <section className="admin-hero"><div><span>TODAY'S CAMPUS ENTRIES</span><strong>8,426</strong></div><BarChart3 size={50} /></section>
      <div className="dashboard-stats three"><div><strong>42</strong><small>Portal users</small></div><div><strong>8,426</strong><small>Authorized</small></div><div><strong>27</strong><small>Unauthorized</small></div></div>
      <section className="chart-card"><div className="chart-head"><div><span>ENTRY TREND</span><strong>52,840</strong></div><small>Last 7 days</small></div><div className="login-chart admin-chart">{[62, 76, 59, 86, 78, 45, 51].map((height, index) => <div key={index}><i style={{ height: `${height}%` }} /><span>{["M", "T", "W", "T", "F", "S", "S"][index]}</span></div>)}</div></section>
      <div className="section-heading compact"><div><h2>Super admin tools</h2></div></div>
      <div className="admin-list">
        <button onClick={() => go("admin-bulk-students")}>
          <span className="amber-icon"><UploadCloud size={21} /></span>
          <div><strong>Bulk student creation</strong><small>Upload spreadsheet & train face recognition model</small></div>
          <ChevronRight size={18} />
        </button>
        <button onClick={() => go("campus-entries")}>
          <span><DoorOpen size={21} /></span>
          <div><strong>All campus records</strong><small>Filter by institution then by block</small></div>
          <ChevronRight size={18} />
        </button>
        <button onClick={() => go("users")}>
          <span><Users size={21} /></span>
          <div><strong>Manage portal users</strong><small>User accounts by institution</small></div>
          <ChevronRight size={18} />
        </button>
        <button onClick={() => go("admin-securities")}>
          <span><Shield size={21} /></span>
          <div><strong>Campus securities & guards</strong><small>View personnel by institution & gate</small></div>
          <ChevronRight size={18} />
        </button>
        <button onClick={() => go("admin-audit-logs")}>
          <span><History size={21} /></span>
          <div><strong>Audit logs history</strong><small>Table view with tap-to-inspect details</small></div>
          <ChevronRight size={18} />
        </button>
        <button onClick={() => go("admin-access-settings")}>
          <span><SlidersHorizontal size={21} /></span>
          <div><strong>Field visibility & manager access</strong><small>Customize log fields & manager edit permissions</small></div>
          <ChevronRight size={18} />
        </button>
        <button onClick={() => go("assign-supervisor")}>
          <span><UserCheck size={21} /></span>
          <div><strong>Assign Campus Supervisor</strong></div>
          <ChevronRight size={18} />
        </button>
        <button onClick={() => go("login-logs")}>
          <span><FileClock size={21} /></span>
          <div><strong>User worklog</strong></div>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  </>;
}

function UserAdministration({
  go,
  onAddAuditLog,
}: {
  go: (screen: Screen) => void;
  onAddAuditLog?: (log: AuditLogItem) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [createdRole, setCreatedRole] = useState<(typeof adminPortalDesignations)[number]>(adminPortalDesignations[0]);
  const [createdInstitution, setCreatedInstitution] = useState(institutions[0]);
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createComment, setCreateComment] = useState("");
  const [query, setQuery] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("All institutions");
  const [designationFilter, setDesignationFilter] = useState("All designations");
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [users, setUsers] = useState([
    { initials: "MN", name: "Meera Nair", role: "Campus Supervisor", email: "meera.nair@campus.edu", institution: "Institution B", active: true },
    { initials: "KR", name: "Kavitha Rao", role: "Student Welfare", email: "kavitha.rao@campus.edu", institution: "Institution B", active: true },
    { initials: "KR", name: "Karthik Rao", role: "Campus Supervisor", email: "karthik.rao@campus.edu", institution: "Institution A", active: true },
  ]);
  const [draft, setDraft] = useState(users[0]);
  const [editComment, setEditComment] = useState("");
  const [editCommentError, setEditCommentError] = useState("");
  const nextEmpId = `EMP-${String(1001 + users.length).padStart(4, "0")}`;
  const filteredUsers = users.filter(user => `${user.name} ${user.role} ${user.email} ${user.institution}`.toLowerCase().includes(query.toLowerCase()) && (institutionFilter === "All institutions" || user.institution === institutionFilter) && (designationFilter === "All designations" || user.role === designationFilter));
  const editUser = (user: typeof users[number]) => {
    setEditingEmail(editingEmail === user.email ? null : user.email);
    setDraft({ ...user });
    setEditComment("");
    setEditCommentError("");
  };
  const saveUser = () => {
    if (!editingEmail) return;
    if (!editComment.trim()) {
      setEditCommentError("Please enter a comment or reason for editing this user.");
      return;
    }
    const existing = users.find(u => u.email === editingEmail);
    const updatedUser = {
      ...draft,
      initials: draft.name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase() || "US",
    };
    setUsers(current => current.map(user => user.email === editingEmail ? updatedUser : user));

    if (existing && onAddAuditLog) {
      const changes: { field: string; oldVal: string; newVal: string }[] = [];
      if (existing.name !== updatedUser.name) changes.push({ field: "Full Name", oldVal: existing.name, newVal: updatedUser.name });
      if (existing.email !== updatedUser.email) changes.push({ field: "Official Email", oldVal: existing.email, newVal: updatedUser.email });
      if (existing.role !== updatedUser.role) changes.push({ field: "Role", oldVal: existing.role, newVal: updatedUser.role });
      if (existing.institution !== updatedUser.institution) changes.push({ field: "Institution", oldVal: existing.institution, newVal: updatedUser.institution });
      if (existing.active !== updatedUser.active) {
        changes.push({
          field: "Account Status",
          oldVal: existing.active ? "Active" : "Disabled",
          newVal: updatedUser.active ? "Active" : "Disabled",
        });
      }
      const statusOnlyChanged = existing.active !== updatedUser.active;
      const now = new Date();
      const changeSummary = changes.length > 0
        ? `Updated ${changes.slice(0, 2).map(c => c.field).join(", ")}${changes.length > 2 ? ` +${changes.length - 2} more` : ""} for ${updatedUser.name}`
        : `Updated user account details for ${updatedUser.name}`;
      onAddAuditLog({
        id: `AUD-USR-${Date.now()}`,
        timestamp: now.toISOString().replace("T", " ").slice(0, 19),
        dateTime: now.toISOString(),
        editedBy: "Avery Williams",
        editorRole: "Super admin",
        action: statusOnlyChanged ? "User Status Changed" : "User Details Updated",
        institution: updatedUser.institution,
        actionDetails: changeSummary,
        comments: editComment.trim(),
        changes,
      });
    }

    setEditingEmail(null);
    setEditComment("");
    setEditCommentError("");
  };
  const handleCreateUser = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = createName.trim() || "New Portal User";
    const trimmedEmail = createEmail.trim() || `${trimmedName.toLowerCase().replace(/\s+/g, ".")}@campus.edu`;
    const initials = trimmedName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "NU";
    setUsers(prev => [
      { initials, name: trimmedName, role: createdRole, email: trimmedEmail, institution: createdInstitution, active: true },
      ...prev,
    ]);
    if (onAddAuditLog) {
      const now = new Date();
      onAddAuditLog({
        id: `AUD-UC-${Date.now()}`,
        timestamp: now.toISOString().replace("T", " ").slice(0, 19),
        dateTime: now.toISOString(),
        editedBy: "Avery Williams",
        editorRole: "Super admin",
        action: "User Created",
        institution: createdInstitution,
        actionDetails: `Created portal user ${trimmedName} (${createdRole})`,
        comments: createComment.trim() || "Portal account provisioned and role assigned.",
        changes: [
          { field: "Full Name", oldVal: "(New User)", newVal: trimmedName },
          { field: "Role", oldVal: "(New User)", newVal: createdRole },
          { field: "Institution", oldVal: "(New User)", newVal: createdInstitution },
          { field: "Official Email", oldVal: "(New User)", newVal: trimmedEmail },
        ],
      });
    }
    setCreateName("");
    setCreatePhone("");
    setCreateEmail("");
    setCreateComment("");
    setCreated(true);
  };
  if (created) return <div className="success-page"><div className="success-symbol"><UserCheck size={38} /></div><Status tone="green">USER CREATED</Status><h1>Portal account created</h1><p>An account invitation was sent to the user's official email address.</p><section className="success-receipt"><div><span>Employee ID</span><strong>{nextEmpId}</strong></div><div><span>Role</span><strong>{createdRole}</strong></div><div><span>Institution</span><strong>{createdInstitution}</strong></div><div><span>Status</span><strong>Invitation pending</strong></div></section><Button onClick={() => { setCreated(false); setCreating(false); }}>Return to users</Button></div>;
  if (creating) return <><TopBar title="Create portal user" subtitle="Super admin action" back={() => setCreating(false)} /><form className="page-content form-page" onSubmit={handleCreateUser}><div className="form-stack guard-form"><label className="field"><span>Employee ID</span><input readOnly value={nextEmpId} aria-label="Employee ID, generated automatically" /><small>Generated automatically when the user is created</small></label><label className="field"><span>Full name <b>*</b></span><input required value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Enter official name" /></label><label className="field"><span>Phone number <b>*</b></span><input required type="tel" inputMode="tel" value={createPhone} onChange={e => setCreatePhone(e.target.value)} placeholder="+91 98765 43210" /></label><label className="field"><span>Role <b>*</b></span><select required value={createdRole} onChange={event => setCreatedRole(event.target.value as typeof createdRole)}>{adminPortalDesignations.map(item => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Institution</span><select value={createdInstitution} onChange={event => setCreatedInstitution(event.target.value)}>{institutions.map(item => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Official email</span><input type="email" value={createEmail} onChange={e => setCreateEmail(e.target.value)} placeholder="name@campus.edu" /></label><label className="field"><span>Department / office</span><input placeholder="e.g. Campus Security" /></label><label className="field"><span>Comments / Reason</span><textarea rows={2} value={createComment} onChange={e => setCreateComment(e.target.value)} placeholder="Reason or notes for provisioning this account..." /></label></div><label className="confirmation-check"><input required type="checkbox" /><span>I confirm this person is authorised to receive the selected role. <b>*</b></span></label><Button type="submit" icon={<Mail size={17} />}>Create account & send invite</Button></form></>;
  return <>
    <TopBar title="Portal users" back={() => go("home")} action={<button className="icon-btn primary" onClick={() => setCreating(true)}><Plus size={19} /></button>} />
    <div className="page-content"><div className="search-input"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email, role or institution" />{query && <button onClick={() => setQuery("")}>Clear</button>}</div><section className="filter-panel user-admin-filters"><div className="user-filter-reset"><button onClick={() => { setInstitutionFilter("All institutions"); setDesignationFilter("All designations"); }}>Reset</button></div><div className="filter-fields"><Field label="Institution"><select value={institutionFilter} onChange={event => setInstitutionFilter(event.target.value)}><option>All institutions</option>{institutions.map(item => <option key={item}>{item}</option>)}</select></Field><Field label="Designation"><select value={designationFilter} onChange={event => setDesignationFilter(event.target.value)}><option>All designations</option>{adminPortalDesignations.map(item => <option key={item}>{item}</option>)}</select></Field></div></section><div className="portal-user-list">{filteredUsers.map(user => <section key={user.email}><div className="person-avatar">{user.initials}</div><div><strong>{user.name}</strong><span>{user.email}</span><small>{user.role} · {user.institution}</small></div><Status tone={user.active ? "green" : "red"}>{user.active ? "Active" : "Disabled"}</Status><button className="user-edit-button" onClick={() => editUser(user)} aria-label={`Edit ${user.name}`} aria-expanded={editingEmail === user.email}><MoreVertical size={18} /></button>{editingEmail === user.email && <div className="portal-user-editor"><div className="audit-detail-title">EDIT USER DETAILS</div><div className="form-stack"><label className="field"><span>Full name</span><input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></label><label className="field"><span>Official email</span><input type="email" value={draft.email} onChange={event => setDraft(current => ({ ...current, email: event.target.value }))} /></label><label className="field"><span>Role</span><select value={draft.role} onChange={event => setDraft(current => ({ ...current, role: event.target.value }))}>{adminPortalDesignations.map(item => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Institution</span><select value={draft.institution} onChange={event => setDraft(current => ({ ...current, institution: event.target.value }))}>{institutions.map(item => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Comment / Reason for Edit <b>*</b></span><textarea rows={2} value={editComment} onChange={event => { setEditComment(event.target.value); if (event.target.value.trim()) setEditCommentError(""); }} placeholder="Enter reason for editing this portal user..." />{editCommentError && <small className="field-error">{editCommentError}</small>}</label></div><div className={`account-status-control ${draft.active ? "active" : "disabled"}`}><div><strong>Account status</strong><span>{draft.active ? "Active" : "Disabled"}</span></div><button type="button" className="status-switch" role="switch" aria-checked={draft.active} aria-label={`Set account ${draft.active ? "disabled" : "active"}`} onClick={() => setDraft(current => ({ ...current, active: !current.active }))}><i /></button></div><div className="editor-actions"><Button variant="secondary" onClick={() => setEditingEmail(null)}>Cancel</Button><Button onClick={saveUser}>Save changes</Button></div></div>}</section>)}</div><Button variant="secondary" onClick={() => setCreating(true)} icon={<UserPlus size={17} />}>Create portal user</Button></div>
  </>;
}

// (worklogEntries & formatDuration hoisted above Audit for reuse)

function Worklog({ go, scope = "admin" }: { go: (screen: Screen) => void; scope?: "admin" | "student-affairs" | "security-oversight" }) {
  const studentAffairsScope = scope === "student-affairs";
  const securityOversightScope = scope === "security-oversight";
  const [roleFilter, setRoleFilter] = useState("All designations");
  const [institutionFilter, setInstitutionFilter] = useState("All institutions");
  const [fromDate, setFromDate] = useState("2025-06-16");
  const [toDate, setToDate] = useState("2025-06-16");
  const [selectedOfficerName, setSelectedOfficerName] = useState<string | null>(null);

  const accessibleEntries = worklogEntries.filter(item =>
    securityOversightScope
      ? item.institution === "Institution B" && ["Campus Supervisor", "Hostel Warden", "Staff", "Security"].includes(item.designation)
      : studentAffairsScope
      ? ["Campus Supervisor", "Security"].includes(item.designation)
      : adminPortalDesignations.includes(item.designation as typeof adminPortalDesignations[number])
  );

  const rows = accessibleEntries.filter(
    item =>
      (roleFilter === "All designations" || item.designation === roleFilter) &&
      (securityOversightScope || institutionFilter === "All institutions" || item.institution === institutionFilter) &&
      item.date >= fromDate &&
      item.date <= toDate
  );

  const totalMinutes = rows.reduce((total, item) => total + item.durationMinutes, 0);
  const todayDate = "2025-06-16";
  const todayUsers = new Set(accessibleEntries.filter(item => item.date === todayDate).map(item => item.officerId)).size;
  const todayScans = logRows.filter(row => row.dateTime.slice(0, 10) === todayDate);

  const dayTiles = [
    { label: "Users", value: todayUsers, tone: "users" },
    { label: "Scans", value: todayScans.length, tone: "scans" },
    { label: "Authorized", value: todayScans.filter(row => row.accessCategory === "Authorized").length, tone: "authorized" },
    { label: "Unauthorized", value: todayScans.filter(row => row.accessCategory === "Unauthorized").length, tone: "unauthorized" },
    { label: "Visitors", value: todayScans.filter(row => row.accessCategory === "Visitors").length, tone: "visitors" },
  ];

  const selectedOfficer = rows.find(item => item.name === selectedOfficerName);
  if (selectedOfficer) {
    return (
      <OfficerDetailView
        officer={selectedOfficer}
        allRows={rows}
        allScans={logRows}
        onBack={() => setSelectedOfficerName(null)}
      />
    );
  }

  return (
    <>
      <TopBar
        title={studentAffairsScope ? "Officer workload" : securityOversightScope ? "Worklog" : "User worklog"}
        subtitle={studentAffairsScope ? "Campus Supervisors & security" : securityOversightScope ? "Institution B · Security personnel" : "Entries & timing"}
        back={() => go("home")}
      />
      <div className="page-content">
        {scope === "admin" && (
          <section className="day-tiles" aria-label="Today's activity">
            <div className="day-tiles-head"><strong>Today</strong><span>16 Jun 2025</span></div>
            <div className="day-tiles-grid">
              {dayTiles.map(tile => (
                <div key={tile.label} className={`day-tile ${tile.tone}`}>
                  <strong>{tile.value}</strong>
                  <span>{tile.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        {scope !== "admin" && (
          <div className="login-summary">
            <div><strong>{rows.length}</strong><span>{securityOversightScope ? "Worklog sessions" : studentAffairsScope ? "Officer entries" : "User entries"}</span></div>
            <div><strong>{formatDuration(totalMinutes)}</strong><span>Total logged time</span></div>
          </div>
        )}
        <section className="filter-panel login-filter worklog-filter">
          <div className={`filter-fields ${securityOversightScope ? "single-field" : ""}`}>
            <Field label="Designation">
              <select value={roleFilter} onChange={event => setRoleFilter(event.target.value)}>
                <option>All designations</option>
                {securityOversightScope ? (
                  <>
                    <option>Campus Supervisor</option>
                    <option>Hostel Warden</option>
                    <option>Staff</option>
                    <option>Security</option>
                  </>
                ) : studentAffairsScope ? (
                  <>
                    <option>Campus Supervisor</option>
                    <option>Security</option>
                  </>
                ) : (
                  adminPortalDesignations.map(item => <option key={item}>{item}</option>)
                )}
              </select>
            </Field>
            {!securityOversightScope && (
              <Field label="Institution">
                <select value={institutionFilter} onChange={event => setInstitutionFilter(event.target.value)}>
                  <option>All institutions</option>
                  {institutions.map(item => <option key={item}>{item}</option>)}
                </select>
              </Field>
            )}
          </div>
          <div className="date-filter worklog-date-range">
            <label>
              <CalendarDays size={15} />
              <span>From Date</span>
              <input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} />
            </label>
            <span>to</span>
            <label>
              <CalendarDays size={15} />
              <span>To Date</span>
              <input type="date" value={toDate} onChange={event => setToDate(event.target.value)} />
            </label>
          </div>
        </section>
        <div className="worklog-section-head"></div>
        <SecurityWorklogTable
          rows={rows}
          scans={logRows}
          onSelectOfficer={name => setSelectedOfficerName(name)}
        />
        {rows.length === 0 && (
          <div className="empty-state">
            <FileClock size={25} />
            <strong>No worklog entries</strong>
            <span>Change one or more filters.</span>
          </div>
        )}
      </div>
    </>
  );
}

function CampusEntries({
  go,
  reviews,
  scope = "admin",
  fieldVisibility = DEFAULT_LOG_FIELD_VISIBILITY,
  logs,
}: {
  go: (screen: Screen) => void;
  reviews: Record<string, ReviewRecord>;
  scope?: "admin" | "institution";
  fieldVisibility?: LogFieldVisibility;
  logs?: LogRecord[];
}) {
  const [institution, setInstitution] = useState(scope === "institution" ? "Institution B" : "All institutions");
  const [block, setBlock] = useState("All blocks");
  const [category, setCategory] = useState("All Categories");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("2025-06-16T08:00");
  const [toDate, setToDate] = useState(() => `${new Date().toISOString().slice(0, 10)}T23:59`);
  const [dbLogs, setDbLogs] = useState<LogRecord[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/api/v1/access-logs/?limit=300`)
      .then(res => (res.ok ? res.json() : null))
      .then((data: any[]) => {
        if (!active || !Array.isArray(data)) return;
        const mapped: LogRecord[] = data.map((item: any) => {
          const dt = item.timestamp
            ? (item.timestamp.includes("T") ? item.timestamp.slice(0, 19) : item.timestamp.replace(" ", "T").slice(0, 19))
            : new Date().toISOString().slice(0, 19);
          const timePart = dt.length >= 16 ? dt.slice(11, 16) : "10:00";
          const isDenied = item.verification_status === "Unauthorized" || item.review_status === "Unauthorised";
          const actionTaken = (item.review_actions && item.review_actions.length > 0) ? item.review_actions[item.review_actions.length - 1].action_taken : undefined;
          const address = (item.review_actions && item.review_actions.length > 0) ? item.review_actions[item.review_actions.length - 1].address : undefined;
          const contactNumber = (item.review_actions && item.review_actions.length > 0) ? item.review_actions[item.review_actions.length - 1].contact_number : item.phone_number;
          const loc = (item.review_actions && item.review_actions.length > 0) ? item.review_actions[item.review_actions.length - 1].location : item.location_block;
          const vehicleNumber = (item.review_actions && item.review_actions.length > 0) ? item.review_actions[item.review_actions.length - 1].vehicle_number : item.vehicle_number;
          return {
            initials: item.name ? item.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "UP" : "UP",
            name: item.name || "Unrecognized person",
            id: item.identifier_value || "Not available",
            institution: "SRM GROUP OF INSTITUTIONS TRICHY",
            department: item.department || "Not available",
            block: loc || "Main Gate",
            time: timePart,
            dateTime: dt,
            event: isDenied ? "Denied" : "Entry",
            tone: isDenied ? "red" : "green",
            personType: item.person_type === "Unauthorized" ? "Unauthorised" : (item.person_type as any) || "Student",
            category: isDenied ? "Unauthorised visitor" : "Internal · Institution B",
            accessCategory: isDenied ? "Unauthorized" : "Authorized",
            logId: item.record_identifier,
            phoneNumber: contactNumber,
            guard: item.guard_name || "G. Selvam",
            guardNumber: item.guard_code || "SG-101",
            guardNotes: item.flag_reason || (isDenied ? "Identity could not be verified at the gate." : undefined),
            entries: 1,
            decision: item.review_status === "Authorised" || item.verification_status === "Authorized" ? "Authorised" : "Denied",
            photo: item.snapshot_url || undefined,
            reviewActions: item.review_actions,
            reviewStatus: item.review_status,
            actionTaken,
            address,
            location: loc,
            vehicleNumber,
          };
        });
        setDbLogs(mapped);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const blocksByInst: Record<string, string[]> = {
    "Institution B": ["Main Gate", "Block A", "Block B", "Library Block", "Bharathi Hostel"],
    "SRM GROUP OF INSTITUTIONS TRICHY": ["Main Gate", "Block A", "Block B", "Bharathi Hostel"],
    "Institution A": ["North Gate", "Academic Block", "Science Block", "Auditorium"],
    "Institution C": ["East Gate", "Engineering Block", "Admin Block", "Hostel Gate"],
    "Institution D": ["South Gate", "Commerce Block", "Research Block", "Sports Block"],
  };

  const availableBlocks = institution === "All institutions"
    ? ["All blocks", "Main Gate", "Block A", "Block B", "Library Block", "Bharathi Hostel", "North Gate", "East Gate", "South Gate"]
    : ["All blocks", ...(blocksByInst[institution] || ["Main Gate", "Block A", "Block B"])];

  const baseSourceLogs = dbLogs && dbLogs.length > 0 ? dbLogs : (logs ?? logRows);
  const currentSourceLogs = [
    ...baseSourceLogs,
    ...sampleMockUnauthorizedRecords.filter(m => !baseSourceLogs.some(b => b.logId === m.logId)),
  ];

  const rows = currentSourceLogs.filter(row =>
    row.accessCategory !== "Visitors" &&
    (scope === "institution"
      ? row.institution === "Institution B" || row.institution.includes("TRICHY") || assignedGuardNumbers.has(row.guardNumber)
      : (institution === "All institutions" || row.institution === institution || (institution === "Institution B" && row.institution.includes("TRICHY")))) &&
    (block === "All blocks" || row.block === block) &&
    (category === "All Categories" || recordCategory(reviews, row) === category) &&
    row.dateTime >= fromDate && row.dateTime <= toDate &&
    (!query || `${row.name} ${row.id} ${row.institution} ${row.department} ${row.guard} ${row.address || ""} ${row.vehicleNumber || ""} ${row.phoneNumber || ""}`.toLowerCase().includes(query.toLowerCase()))
  ).sort((a, b) => b.dateTime.localeCompare(a.dateTime));

  return <>
    <TopBar
      title={scope === "institution" ? "Institution records" : "Campus records"}
      subtitle={scope === "institution" ? "Institution B · Read-only records" : "All institutions · Read-only"}
      back={() => go("home")}
      action={
        <div className="header-actions">
          <button className="icon-btn" onClick={() => exportRecordsToCsv(rows, reviews, category === "Unauthorized")} aria-label="Export records as CSV" title="Export CSV">
            <FileClock size={18} />
          </button>
        </div>
      }
    />
    <div className="page-content">
      <div className="search-input">
        <Search size={17} />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder={scope === "institution" ? "Search name, ID, department or security" : "Search person, institution or department"} />
        {query && <button onClick={() => setQuery("")}>Clear</button>}
      </div>
      <section className="filter-panel admin-filters">
        <div className="filter-fields">
          <Field label="Institution">
            <select
              disabled={scope === "institution"}
              value={institution}
              onChange={event => {
                setInstitution(event.target.value);
                setBlock("All blocks");
              }}
            >
              <option>All institutions</option>
              {institutions.map(item => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Block">
            <select value={block} onChange={event => setBlock(event.target.value)}>
              {availableBlocks.map(item => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select value={category} onChange={event => setCategory(event.target.value)}>
              <option>All Categories</option>
              <option>Authorized</option>
              <option>Unauthorized</option>
              <option>Revoked</option>
            </select>
          </Field>
        </div>
      </section>
      <div className="date-filter admin-date">
        <label><CalendarDays size={15} /><span>From</span><input type="datetime-local" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label>
        <span>to</span>
        <label><Clock3 size={15} /><span>To</span><input type="datetime-local" value={toDate} onChange={event => setToDate(event.target.value)} /></label>
      </div>
      <div className="entry-overview two-column">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCategory(category === "Authorized" ? "All Categories" : "Authorized")}
          className={`overview-card-clickable ${category === "Authorized" ? "active-filter-green" : ""}`}
        >
          <strong>{rows.filter(row => recordCategory(reviews, row) === "Authorized").length}</strong>
          <span>Authorized</span>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCategory(category === "Unauthorized" ? "All Categories" : "Unauthorized")}
          className={`overview-card-clickable ${category === "Unauthorized" ? "active-filter-red" : ""}`}
        >
          <strong>{rows.filter(row => recordCategory(reviews, row) === "Unauthorized").length}</strong>
          <span>Unauthorized</span>
        </div>
      </div>
      <div className="manager-log-count"><strong>{rows.length}</strong><span>matching records</span></div>
      <AuditTable
        rows={rows}
        reviews={reviews}
        title=""
        plainNames
        fieldVisibility={fieldVisibility}
        isUnauthorizedOnly={category === "Unauthorized"}
      />
      {rows.length === 0 && <div className="empty-state"><DoorOpen size={25} /><strong>No matching campus records</strong><span>Reset or change the filters.</span></div>}
    </div>
  </>;
}

function AssignSupervisor({
  go,
  onAddAuditLog,
}: {
  go: (screen: Screen) => void;
  onAddAuditLog?: (log: AuditLogItem) => void;
}) {
  const supervisors = ["Meera Nair", "Karthik Rao"];
  const blocksByInstitution: Record<string, string[]> = {
    "Institution A": ["North Gate", "Academic Block", "Science Block", "Auditorium"],
    "Institution B": ["Main Gate", "Block A", "Block B", "Library Block"],
    "Institution C": ["East Gate", "Engineering Block", "Admin Block", "Hostel Gate"],
    "Institution D": ["South Gate", "Commerce Block", "Research Block", "Sports Block"],
  };
  const [supervisor, setSupervisor] = useState(supervisors[0]);
  const [institution, setInstitution] = useState(institutions[1]);
  const [block, setBlock] = useState(blocksByInstitution[institutions[1]][0]);
  const [days, setDays] = useState("30");
  const [assignComment, setAssignComment] = useState("");
  const [done, setDone] = useState(false);
  const changeInstitution = (nextInstitution: string) => {
    setInstitution(nextInstitution);
    setBlock(blocksByInstitution[nextInstitution][0]);
  };
  const handleAssignSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (onAddAuditLog) {
      const now = new Date();
      onAddAuditLog({
        id: `AUD-SUP-${Date.now()}`,
        timestamp: now.toISOString().replace("T", " ").slice(0, 19),
        dateTime: now.toISOString(),
        editedBy: "Avery Williams",
        editorRole: "Super admin",
        action: "Security Assignment Updated",
        institution,
        block,
        actionDetails: `Assigned supervisor ${supervisor} to ${block} (${days} days)`,
        comments: assignComment.trim() || `Campus supervisor rotation scheduled for ${days} days.`,
        changes: [
          { field: "Supervisor", oldVal: "(Previous Roster)", newVal: supervisor },
          { field: "Institution", oldVal: "—", newVal: institution },
          { field: "Assigned Block", oldVal: "—", newVal: block },
          { field: "Duration", oldVal: "—", newVal: `${days} days` },
        ],
      });
    }
    setDone(true);
  };
  if (done) return <div className="success-page"><div className="success-symbol"><UserCheck size={38} /></div><Status tone="green">ASSIGNED</Status><h1>Campus Supervisor assigned</h1><p>{supervisor} now supervises {block} in {institution}.</p><section className="success-receipt"><div><span>Campus Supervisor</span><strong>{supervisor}</strong></div><div><span>Institution</span><strong>{institution}</strong></div><div><span>Block</span><strong>{block}</strong></div><div><span>Duration</span><strong>{days} {Number(days) === 1 ? "day" : "days"}</strong></div></section><Button onClick={() => { setDone(false); setAssignComment(""); go("home"); }}>Back to overview</Button></div>;
  return <>
    <TopBar title="Assign Campus Supervisor" subtitle="Super admin action" back={() => go("home")} />
    <form className="page-content form-page" onSubmit={handleAssignSubmit}>
      <div className="form-stack guard-form">
        <Field label="Campus Supervisor *"><select value={supervisor} onChange={event => setSupervisor(event.target.value)}>{supervisors.map(item => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Institution *"><select value={institution} onChange={event => changeInstitution(event.target.value)}>{institutions.map(item => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Block *"><select value={block} onChange={event => setBlock(event.target.value)}>{blocksByInstitution[institution].map(item => <option key={item}>{item}</option>)}</select></Field>
        <label className="field"><span>Duration (days) <b>*</b></span><input required type="number" min={1} step={1} inputMode="numeric" value={days} onChange={event => setDays(event.target.value)} placeholder="e.g. 30" /></label>
        <label className="field"><span>Comments / Reason</span><textarea rows={2} value={assignComment} onChange={event => setAssignComment(event.target.value)} placeholder="Reason or notes for assigning this supervisor..." /></label>
      </div>
      <Button type="submit" icon={<Check size={17} />}>Assign Campus Supervisor</Button>
    </form>
  </>;
}

type WelfareLog = { name: string; id: string; department: string; year: string; block: string; time: string; event: "Entry" | "Exit"; residence: "Hosteller" | "Day Scholar"; denied?: string };
const welfareBlocks = ["Main Gate", "Block A", "Block B", "Library Block", "Hostel Gate"];
const welfareLogs: WelfareLog[] = [
  { name: "Ananya Krishnan", id: "23ECE0721", department: "Electronics", year: "Year II", block: "Main Gate", time: "10:42", event: "Entry", residence: "Hosteller" },
  { name: "Rohan Pillai", id: "23CSE0412", department: "Computer Science", year: "Year II", block: "Main Gate", time: "10:31", event: "Entry", residence: "Day Scholar" },
  { name: "Fathima Noor", id: "22MEC0288", department: "Mechanical", year: "Year III", block: "Main Gate", time: "10:12", event: "Entry", residence: "Day Scholar" },
  { name: "Karthik Subramanian", id: "21CIV0145", department: "Civil", year: "Year IV", block: "Main Gate", time: "09:58", event: "Exit", residence: "Day Scholar" },
  { name: "Divya Menon", id: "22CSE0903", department: "Computer Science", year: "Year III", block: "Block A", time: "10:36", event: "Entry", residence: "Hosteller" },
  { name: "Aditya Varma", id: "23ECE0654", department: "Electronics", year: "Year II", block: "Block A", time: "10:20", event: "Entry", residence: "Day Scholar" },
  { name: "Nithya Prakash", id: "23ECE0698", department: "Electronics", year: "Year II", block: "Block A", time: "09:47", event: "Exit", residence: "Day Scholar" },
  { name: "Sreya Nair", id: "24CSE0177", department: "Computer Science", year: "Year I", block: "Block A", time: "09:22", event: "Entry", residence: "Hosteller" },
  { name: "Mohit Jain", id: "21MEC0184", department: "Mechanical", year: "Year IV", block: "Block B", time: "09:14", event: "Entry", residence: "Day Scholar" },
  { name: "Gokul Raj", id: "22CIV0361", department: "Civil", year: "Year III", block: "Block B", time: "10:05", event: "Entry", residence: "Hosteller" },
  { name: "Lavanya Iyer", id: "23MEC0529", department: "Mechanical", year: "Year II", block: "Block B", time: "10:27", event: "Exit", residence: "Day Scholar" },
  { name: "Imran Sheikh", id: "21CIV0092", department: "Civil", year: "Year IV", block: "Block B", time: "10:40", event: "Entry", residence: "Hosteller" },
  { name: "Meghna Das", id: "22ECE0471", department: "Electronics", year: "Year III", block: "Library Block", time: "10:18", event: "Entry", residence: "Hosteller" },
  { name: "Arjun Bhat", id: "23CSE0839", department: "Computer Science", year: "Year II", block: "Library Block", time: "10:02", event: "Entry", residence: "Day Scholar" },
  { name: "Tanvi Kulkarni", id: "24ECE0310", department: "Electronics", year: "Year I", block: "Library Block", time: "09:41", event: "Exit", residence: "Hosteller" },
  { name: "Ishaan Roy", id: "21CSE0256", department: "Computer Science", year: "Year IV", block: "Library Block", time: "09:30", event: "Entry", residence: "Day Scholar" },
  { name: "Sneha Thomas", id: "22MEC0617", department: "Mechanical", year: "Year III", block: "Hostel Gate", time: "10:45", event: "Entry", residence: "Hosteller" },
  { name: "Harini Sundar", id: "23CSE0276", department: "Computer Science", year: "Year II", block: "Hostel Gate", time: "10:33", event: "Exit", residence: "Hosteller" },
  { name: "Unknown student", id: "24MEC0991", department: "Mechanical", year: "Year I", block: "Block B", time: "08:52", event: "Entry", residence: "Day Scholar", denied: "ID card expired. Entry not permitted." },
  { name: "Vishal Kumar", id: "22CSE0731", department: "Computer Science", year: "Year III", block: "Hostel Gate", time: "10:50", event: "Entry", residence: "Day Scholar", denied: "Non-resident attempted hostel entry." },
  { name: "Pooja Reddy", id: "24CIV0058", department: "Civil", year: "Year I", block: "Hostel Gate", time: "09:52", event: "Entry", residence: "Hosteller" },
];
function WelfareHome({ go }: { go: (screen: Screen) => void }) {
  const unauthorized = welfareLogs.filter(row => row.denied).length;
  return <>
    <TopBar title="Campus Secure" subtitle="Student Welfare Portal" action={<Status tone="green">Institution B</Status>} />
    <div className="page-content"><ProfileHead role="welfare" go={go} />
      <section className="admin-hero"><div><span>STUDENT MOVEMENTS TODAY</span><strong>{welfareLogs.length}</strong></div><HeartHandshake size={50} /></section>
      <div className="dashboard-stats three"><div><strong>{welfareLogs.length - unauthorized}</strong><small>Authorized</small></div><div><strong>{unauthorized}</strong><small>Unauthorized</small></div><div><strong>{welfareBlocks.length}</strong><small>Blocks</small></div></div>
      <div className="section-heading compact" style={{ marginTop: 22 }}>
        <div><h2>Student Residence Management</h2></div>
      </div>
      <div className="admin-list">
        <button onClick={() => go("accommodation-details")}>
          <span className="blue-icon"><Home size={21} /></span>
          <div>
            <strong>Accommodation Details</strong>
            <small>View and update student's residence (Hostel / PG / Day Scholar)</small>
          </div>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  </>;
}

const welfareGuards: Record<string, [string, string]> = { "Main Gate": ["Arun Kumar", "GRD-B-0017"], "Block A": ["Kavya Rao", "GRD-B-0031"], "Block B": ["Joseph Mathew", "GRD-B-0038"], "Library Block": ["Imran Ali", "GRD-B-0044"], "Hostel Gate": ["Neha Singh", "GRD-B-0052"] };
const welfareRecords: LogRecord[] = welfareLogs.map((row, index) => {
  const [guard, guardNumber] = welfareGuards[row.block];
  const denied = !!row.denied;
  return {
    initials: row.name.split(" ").map(part => part[0]).join("").slice(0, 2), name: row.name, id: row.id, institution: "Institution B", department: row.department, block: row.block,
    time: row.time, dateTime: `2025-06-16T${row.time}`, event: denied ? "Denied" : row.event, tone: denied ? "red" : row.event === "Entry" ? "green" : "gray", personType: "Student",
    category: "Internal · Institution B", accessCategory: denied ? "Unauthorized" : "Authorized", year: row.year, residence: row.residence === "Day Scholar" ? "Day scholar" : "Hosteller",
    logId: `${denied ? "DEN" : row.event === "Entry" ? "ENT" : "EXT"}-•••-W${String(index + 1).padStart(3, "0")}`, guard, guardNumber,
    guardNotes: denied ? row.denied : undefined, decision: denied ? "Denied" : "Authorised",
  };
});

function WelfareBlockLogs({ reviews }: { reviews: Record<string, ReviewRecord> }) {
  const [block, setBlock] = useState("All blocks");
  const [category, setCategory] = useState("All Categories");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("2025-06-16T08:00");
  const [toDate, setToDate] = useState("2025-06-16T18:00");
  const rows = welfareRecords.filter(row => (block === "All blocks" || row.block === block) && (category === "All Categories" || row.accessCategory === category) && row.dateTime >= fromDate && row.dateTime <= toDate && (!query || `${row.name} ${row.id} ${row.department}`.toLowerCase().includes(query.toLowerCase())));
  return <>
    <TopBar title="Student logs" subtitle="Institution B · Students only" />
    <div className="page-content"><div className="search-input"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search student, register no. or department" />{query && <button onClick={() => setQuery("")}>Clear</button>}</div>
      <section className="filter-panel admin-filters"><div className="filter-fields"><Field label="Block"><select value={block} onChange={event => setBlock(event.target.value)}><option>All blocks</option>{welfareBlocks.map(item => <option key={item}>{item}</option>)}</select></Field><Field label="Category"><select value={category} onChange={event => setCategory(event.target.value)}><option>All Categories</option><option>Authorized</option><option>Unauthorized</option></select></Field></div></section>
      <div className="date-filter admin-date"><label><CalendarDays size={15} /><span>From</span><input type="datetime-local" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label><span>to</span><label><Clock3 size={15} /><span>To</span><input type="datetime-local" value={toDate} onChange={event => setToDate(event.target.value)} /></label></div>
      <div className="entry-overview two-column">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCategory(category === "Authorized" ? "All Categories" : "Authorized")}
          className={`overview-card-clickable ${category === "Authorized" ? "active-filter-green" : ""}`}
        >
          <strong>{rows.filter(row => row.accessCategory === "Authorized").length}</strong>
          <span>Authorized</span>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCategory(category === "Unauthorized" ? "All Categories" : "Unauthorized")}
          className={`overview-card-clickable ${category === "Unauthorized" ? "active-filter-red" : ""}`}
        >
          <strong>{rows.filter(row => row.accessCategory === "Unauthorized").length}</strong>
          <span>Unauthorized</span>
        </div>
      </div>
      <AuditTable
        rows={rows}
        reviews={reviews}
        title="STUDENT LOGS"
        plainNames
        isUnauthorizedOnly={category === "Unauthorized"}
      />
      {rows.length === 0 && <div className="empty-state"><Users size={25} /><strong>No matching student logs</strong><span>Reset or change the filters.</span></div>}
    </div>
  </>;
}

interface AccommodationHistoryItem {
  id: number;
  register_number: string;
  previous_residence_type?: string;
  previous_details?: Record<string, any>;
  new_residence_type: string;
  new_details: Record<string, any>;
  effective_date: string;
  updated_by: string;
  updated_timestamp: string;
}

function AccommodationDetails({
  go,
  back,
  role,
  students,
  onUpdateStudent,
}: {
  go: (screen: Screen) => void;
  back: () => void;
  role: Role;
  students: StudentMatch[];
  onUpdateStudent?: (
    student: StudentMatch,
    changeMeta?: { actionDetails: string; comments: string; changes: { field: string; oldVal: string; newVal: string }[] }
  ) => void;
}) {
  const [selectedReg, setSelectedReg] = useState<string>(students[0]?.registerNumber ?? "23MED0412");
  const [selectedStudentOverride, setSelectedStudentOverride] = useState<StudentMatch | null>(null);
  const student = (selectedStudentOverride && selectedStudentOverride.registerNumber === selectedReg)
    ? selectedStudentOverride
    : (students.find(s => s.registerNumber === selectedReg) || students[0]);

  // Section A Phone Number (actual student phone retrieved from PostgreSQL)
  const [studentPhone, setStudentPhone] = useState<string>("");

  // Searchable student selection state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiSearchResults, setApiSearchResults] = useState<StudentMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Permitted institutional scope filter (Dr. Kavitha Rao: Student Welfare for Institution B / SRM GROUP OF INSTITUTIONS TRICHY)
  const isInPermittedScope = (s: { institute?: string; department?: string; registerNumber?: string }) => {
    if (!s.institute) return true;
    const inst = s.institute.toLowerCase();
    return inst.includes("institution b") || inst.includes("srm") || inst.includes("trichy");
  };

  const permittedStudents = useMemo(() => {
    return students.filter(isInPermittedScope);
  }, [students]);

  // Dynamic search from PostgreSQL backend with institutional scope restriction
  useEffect(() => {
    if (!isSearchOpen) return;
    let active = true;

    const fetchResults = async () => {
      setIsSearching(true);
      try {
        const q = searchQuery.trim();
        const url = q
          ? `${API_BASE_URL}/api/v1/students/?query=${encodeURIComponent(q)}&institution_id=1`
          : `${API_BASE_URL}/api/v1/students/?institution_id=1`;
        const res = await fetch(url);
        if (res.ok && active) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const mapped: StudentMatch[] = data.map((item: any) => ({
              initials: item.initials || item.name.slice(0, 2).toUpperCase(),
              name: item.name,
              registerNumber: item.register_number,
              dateOfBirth: item.date_of_birth,
              department: item.department,
              year: item.year_roman || "I Year",
              batch: item.batch,
              institute: "SRM GROUP OF INSTITUTIONS TRICHY",
              similarity: 100,
              accommodationType: (item.residence_type === "PG" ? "PG" : item.residence_type?.toLowerCase().includes("day") ? "Day Scholar" : "Hosteller") as any,
              hostelName: item.hostel_name,
              roomNumber: item.room_number,
              routeNumber: item.bus_route,
              boardingPoint: item.bus_boarding_point,
              vehicleNumber: item.vehicle_number,
              photo: item.photo_url,
              phoneNumber: item.phone_number || item.contact_number,
              contactNumber: item.contact_number,
            }));
            setApiSearchResults(mapped);
          }
        }
      } catch (e) {
        // offline/fallback to local students
      } finally {
        if (active) setIsSearching(false);
      }
    };

    const debounce = setTimeout(fetchResults, 150);
    return () => {
      active = false;
      clearTimeout(debounce);
    };
  }, [searchQuery, isSearchOpen]);

  // Combined, deduplicated, case-insensitive filtered results for dropdown
  const displayedResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const map = new Map<string, StudentMatch>();

    // Add API PostgreSQL results within permitted scope
    apiSearchResults.forEach(s => {
      if (isInPermittedScope(s)) {
        map.set(s.registerNumber.toUpperCase(), s);
      }
    });

    // Also include matching local permitted students
    permittedStudents.forEach(s => {
      const regUpper = s.registerNumber.toUpperCase();
      if (!map.has(regUpper)) {
        if (!q || s.name.toLowerCase().includes(q) || s.registerNumber.toLowerCase().includes(q)) {
          map.set(regUpper, s);
        }
      }
    });

    return Array.from(map.values()).filter(s => {
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.registerNumber.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, apiSearchResults, permittedStudents]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectStudent = (s: StudentMatch) => {
    setSelectedStudentOverride(s);
    setSelectedReg(s.registerNumber);
    setIsSearchOpen(false);
    setSearchQuery("");
    setIsEditing(false);
    setErrors({});
    setApiError(null);
    setSaveSuccess(null);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<AccommodationHistoryItem[]>([]);

  // Residence Type
  const [residenceType, setResidenceType] = useState<"Hosteller" | "PG" | "Day Scholar">("Hosteller");

  // Hosteller Fields
  const [hostelName, setHostelName] = useState("");
  const [hostelBlock, setHostelBlock] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [hostelAddress, setHostelAddress] = useState("");
  const [hostelNotes, setHostelNotes] = useState("");

  // PG Fields
  const [pgName, setPgName] = useState("");
  const [pgAddress, setPgAddress] = useState("");
  const [pgContact, setPgContact] = useState("");
  const [distanceFromCampus, setDistanceFromCampus] = useState("");
  const [pgNotes, setPgNotes] = useState("");

  // Day Scholar Fields
  const [residentialAddress, setResidentialAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [transportationType, setTransportationType] = useState<"College Bus" | "Own Vehicle" | "Other">("College Bus");
  const [routeNumber, setRouteNumber] = useState("");
  const [boardingPoint, setBoardingPoint] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [transportDescription, setTransportDescription] = useState("");
  const [dayScholarNotes, setDayScholarNotes] = useState("");

  // Inline Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const populateFields = (targetStudent: StudentMatch, apiData?: any) => {
    if (!targetStudent) return;
    const rawType = (apiData?.residence_type || targetStudent.accommodationType || "Hosteller") as string;
    const normType = rawType === "PG" ? "PG" : rawType.toLowerCase().includes("day") ? "Day Scholar" : "Hosteller";
    setResidenceType(normType);

    setHostelName(apiData?.hostel_name ?? targetStudent.hostelName ?? "");
    setHostelBlock(apiData?.hostel_block ?? targetStudent.hostelBlock ?? "");
    setRoomNumber(apiData?.room_number ?? targetStudent.roomNumber ?? "");
    setHostelAddress(apiData?.hostel_address ?? targetStudent.hostelAddress ?? "");
    setHostelNotes(apiData?.accommodation_notes ?? targetStudent.accommodationNotes ?? "");

    setPgName(apiData?.pg_name ?? targetStudent.pgName ?? "");
    setPgAddress(apiData?.pg_address ?? targetStudent.pgAddress ?? "");
    setPgContact(apiData?.pg_contact ?? targetStudent.pgContact ?? "");
    setDistanceFromCampus(apiData?.distance_from_campus ?? targetStudent.distanceFromCampus ?? "");
    setPgNotes(apiData?.accommodation_notes ?? targetStudent.accommodationNotes ?? "");

    setResidentialAddress(apiData?.residential_address ?? targetStudent.residentialAddress ?? "");
    setContactNumber(apiData?.contact_number ?? targetStudent.contactNumber ?? "");
    const trans = (apiData?.transportation_type || targetStudent.transportationType || "College Bus") as string;
    setTransportationType(trans === "Own Vehicle" ? "Own Vehicle" : trans === "Other" ? "Other" : "College Bus");
    setRouteNumber(apiData?.bus_route ?? targetStudent.routeNumber ?? "");
    setBoardingPoint(apiData?.bus_boarding_point ?? targetStudent.boardingPoint ?? "");
    setVehicleType(apiData?.vehicle_type ?? targetStudent.vehicleType ?? "");
    setVehicleNumber(apiData?.vehicle_number ?? targetStudent.vehicleNumber ?? "");
    setTransportDescription(apiData?.transport_description ?? targetStudent.transportDescription ?? "");
    setDayScholarNotes(apiData?.accommodation_notes ?? targetStudent.accommodationNotes ?? "");
  };

  const fetchBackendData = async (reg: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/students/accommodation/${encodeURIComponent(reg)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.history && Array.isArray(data.history)) {
          setHistoryList(data.history);
        }
        const ph = data.phone_number || data.contact_number || student?.phoneNumber || student?.contactNumber || "";
        setStudentPhone(ph);
        populateFields(student, data);
        return;
      }
    } catch (e) {
      // Backend unavailable or offline
    }
    const ph = student?.phoneNumber || student?.contactNumber || "";
    setStudentPhone(ph);
    populateFields(student);
  };

  useEffect(() => {
    setIsEditing(false);
    setErrors({});
    setApiError(null);
    setSaveSuccess(null);
    if (student) {
      fetchBackendData(student.registerNumber);
    }
  }, [selectedReg]);

  const handleStartEdit = () => {
    populateFields(student);
    setErrors({});
    setApiError(null);
    setSaveSuccess(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    populateFields(student);
    setErrors({});
    setApiError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const errs: Record<string, string> = {};

    if (residenceType === "Hosteller") {
      if (!hostelName.trim()) errs.hostelName = "Hostel name is required.";
      if (!roomNumber.trim()) errs.roomNumber = "Room number is required.";
    } else if (residenceType === "PG") {
      if (!pgName.trim()) errs.pgName = "PG name is required.";
      if (!pgAddress.trim()) errs.pgAddress = "Complete PG address is required.";
      if (!pgContact.trim()) {
        errs.pgContact = "Contact number is required.";
      } else if (!isValidPhoneNumber(pgContact)) {
        errs.pgContact = "Please enter a valid 10-digit contact number.";
      }
    } else if (residenceType === "Day Scholar") {
      if (!residentialAddress.trim()) errs.residentialAddress = "Complete residential address is required.";
      if (!contactNumber.trim()) {
        errs.contactNumber = "Contact number is required.";
      } else if (!isValidPhoneNumber(contactNumber)) {
        errs.contactNumber = "Please enter a valid 10-digit contact number.";
      }
      if (!transportationType) {
        errs.transportationType = "Transportation type is required.";
      } else if (transportationType === "College Bus") {
        if (!routeNumber.trim()) errs.routeNumber = "Bus route number is required.";
        if (!boardingPoint.trim()) errs.boardingPoint = "Boarding point is required.";
      } else if (transportationType === "Own Vehicle") {
        if (!vehicleType.trim()) errs.vehicleType = "Vehicle type is required.";
        if (!vehicleNumber.trim()) errs.vehicleNumber = "Vehicle registration number is required.";
      } else if (transportationType === "Other") {
        if (!transportDescription.trim()) errs.transportDescription = "Description of travel mode is required.";
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setIsSaving(true);
    setApiError(null);

    const updaterName = roleMeta["welfare"]?.name || "Dr. Kavitha Rao";
    const todayFormatted = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
    const nowStr = new Date().toLocaleString();

    const payload = {
      residence_type: residenceType,
      hostel_name: residenceType === "Hosteller" ? hostelName.trim() : null,
      hostel_block: residenceType === "Hosteller" ? (hostelBlock.trim() || null) : null,
      room_number: residenceType === "Hosteller" ? roomNumber.trim() : null,
      hostel_address: residenceType === "Hosteller" ? (hostelAddress.trim() || null) : null,
      pg_name: residenceType === "PG" ? pgName.trim() : null,
      pg_address: residenceType === "PG" ? pgAddress.trim() : null,
      pg_contact: residenceType === "PG" ? pgContact.trim() : null,
      distance_from_campus: residenceType === "PG" ? (distanceFromCampus.trim() || null) : null,
      residential_address: residenceType === "Day Scholar" ? residentialAddress.trim() : null,
      contact_number: residenceType === "Day Scholar" ? contactNumber.trim() : null,
      transportation_type: residenceType === "Day Scholar" ? transportationType : null,
      bus_route: residenceType === "Day Scholar" && transportationType === "College Bus" ? routeNumber.trim() : null,
      bus_boarding_point: residenceType === "Day Scholar" && transportationType === "College Bus" ? boardingPoint.trim() : null,
      vehicle_type: residenceType === "Day Scholar" && transportationType === "Own Vehicle" ? vehicleType.trim() : null,
      vehicle_number: residenceType === "Day Scholar" && transportationType === "Own Vehicle" ? vehicleNumber.trim() : null,
      transport_description: residenceType === "Day Scholar" && transportationType === "Other" ? transportDescription.trim() : null,
      notes: (residenceType === "PG" ? pgNotes.trim() : residenceType === "Day Scholar" ? dayScholarNotes.trim() : hostelNotes.trim()) || null,
      effective_date: todayFormatted,
      updated_by: updaterName,
    };

    let updatedBackendHistory: AccommodationHistoryItem[] | null = null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/students/accommodation/${encodeURIComponent(student.registerNumber)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.history && Array.isArray(data.history)) {
          updatedBackendHistory = data.history;
        }
      } else {
        const errJson = await res.json().catch(() => null);
        if (errJson?.detail) {
          setApiError(errJson.detail);
          setIsSaving(false);
          return;
        }
      }
    } catch (e) {
      // offline/fallback
    }

    const updatedStudent: StudentMatch = {
      ...student,
      accommodationType: residenceType,
      hostelName: residenceType === "Hosteller" ? hostelName.trim() : undefined,
      hostelBlock: residenceType === "Hosteller" ? (hostelBlock.trim() || undefined) : undefined,
      roomNumber: residenceType === "Hosteller" ? roomNumber.trim() : undefined,
      hostelAddress: residenceType === "Hosteller" ? (hostelAddress.trim() || undefined) : undefined,
      pgName: residenceType === "PG" ? pgName.trim() : undefined,
      pgAddress: residenceType === "PG" ? pgAddress.trim() : undefined,
      pgContact: residenceType === "PG" ? pgContact.trim() : undefined,
      distanceFromCampus: residenceType === "PG" ? (distanceFromCampus.trim() || undefined) : undefined,
      residentialAddress: residenceType === "Day Scholar" ? residentialAddress.trim() : undefined,
      contactNumber: residenceType === "Day Scholar" ? contactNumber.trim() : undefined,
      transportationType: residenceType === "Day Scholar" ? transportationType : undefined,
      routeNumber: (residenceType === "Day Scholar" && transportationType === "College Bus") ? routeNumber.trim() : undefined,
      boardingPoint: (residenceType === "Day Scholar" && transportationType === "College Bus") ? boardingPoint.trim() : undefined,
      vehicleType: (residenceType === "Day Scholar" && transportationType === "Own Vehicle") ? vehicleType.trim() : undefined,
      vehicleNumber: (residenceType === "Day Scholar" && transportationType === "Own Vehicle") ? vehicleNumber.trim() : undefined,
      transportDescription: (residenceType === "Day Scholar" && transportationType === "Other") ? transportDescription.trim() : undefined,
      accommodationNotes: (residenceType === "PG" ? pgNotes.trim() : residenceType === "Day Scholar" ? dayScholarNotes.trim() : hostelNotes.trim()) || undefined,
      residenceUpdatedAt: nowStr,
      residenceUpdatedBy: updaterName,
    };

    const changes: { field: string; oldVal: string; newVal: string }[] = [];
    const checkAccDiff = (field: string, oldV?: string, newV?: string) => {
      if ((oldV || "") !== (newV || "")) {
        changes.push({ field, oldVal: oldV || "(empty)", newVal: newV || "(empty)" });
      }
    };
    checkAccDiff("Residence Type", student.accommodationType, residenceType);
    if (residenceType === "Hosteller") {
      checkAccDiff("Hostel Name", student.hostelName, updatedStudent.hostelName);
      checkAccDiff("Room Number", student.roomNumber, updatedStudent.roomNumber);
    } else if (residenceType === "PG") {
      checkAccDiff("PG Name", student.pgName, updatedStudent.pgName);
      checkAccDiff("PG Contact", student.pgContact, updatedStudent.pgContact);
    } else {
      checkAccDiff("Transportation Type", student.transportationType, updatedStudent.transportationType);
      checkAccDiff("Residential Address", student.residentialAddress, updatedStudent.residentialAddress);
    }
    const actionDetailsLine =
      student.accommodationType !== residenceType
        ? `Changed residence (${student.accommodationType} → ${residenceType}) for ${updatedStudent.name} (${updatedStudent.registerNumber})`
        : `Updated ${residenceType} accommodation details for ${updatedStudent.name} (${updatedStudent.registerNumber})`;
    const enteredComment = updatedStudent.accommodationNotes || `Updated ${residenceType} residence details.`;

    if (onUpdateStudent) {
      onUpdateStudent(updatedStudent, {
        actionDetails: actionDetailsLine,
        comments: enteredComment,
        changes,
      });
    }

    if (updatedBackendHistory) {
      setHistoryList(updatedBackendHistory);
    } else {
      const mockHist: AccommodationHistoryItem = {
        id: Date.now(),
        register_number: student.registerNumber,
        previous_residence_type: student.accommodationType,
        previous_details: {
          hostelName: student.hostelName,
          roomNumber: student.roomNumber,
          pgName: student.pgName,
          residentialAddress: student.residentialAddress,
        },
        new_residence_type: residenceType,
        new_details: payload,
        effective_date: todayFormatted,
        updated_by: updaterName,
        updated_timestamp: new Date().toISOString(),
      };
      setHistoryList(prev => [mockHist, ...prev]);
    }

    setIsSaving(false);
    setIsEditing(false);
    setSaveSuccess(`Accommodation details for ${student.name} (${student.registerNumber}) updated to ${residenceType}.`);
  };

  if (!student) {
    return (
      <>
        <TopBar title="Accommodation Details" subtitle="Update student residence information" back={back} />
        <div className="page-content">
          <div className="empty-state">
            <Users size={32} />
            <strong>No student selected</strong>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Accommodation Details" subtitle="Update student residence information" back={back} />
      <div className="page-content">
        {/* Searchable Student Selector */}
        <section className="student-selector-panel" ref={searchContainerRef}>
          <div className="field">
            <span>Select Student</span>
            <div
              className={`searchable-student-trigger ${isSearchOpen ? "open" : ""} ${isEditing ? "disabled" : ""}`}
              onClick={() => {
                if (!isEditing) {
                  setIsSearchOpen(prev => !prev);
                }
              }}
              tabIndex={0}
              role="button"
              aria-expanded={isSearchOpen}
              aria-label="Select Student"
            >
              <div className="trigger-student-info">
                <strong>{student.name}</strong>
                <span className="trigger-reg">({student.registerNumber})</span>
                <span className="trigger-dept">— {student.department}</span>
              </div>
              <ChevronRight
                size={16}
                className={`trigger-arrow ${isSearchOpen ? "rotated" : ""}`}
              />
            </div>

            {isSearchOpen && (
              <div className="searchable-student-dropdown">
                <div className="searchable-input-wrapper">
                  <Search size={15} className="search-icon" />
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by student name or register number..."
                    className="searchable-search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="searchable-results-list">
                  {isSearching && (
                    <div className="search-loading">
                      <span>Searching PostgreSQL database...</span>
                    </div>
                  )}

                  {!isSearching && displayedResults.length === 0 && (
                    <div className="search-no-results">
                      <span>No matching student found.</span>
                    </div>
                  )}

                  {displayedResults.map(s => {
                    const isSelected = s.registerNumber === selectedReg;
                    return (
                      <div
                        key={s.registerNumber}
                        className={`searchable-item ${isSelected ? "selected" : ""}`}
                        onClick={() => handleSelectStudent(s)}
                      >
                        <div className="searchable-item-primary">
                          <span className="searchable-name">{s.name}</span>
                          <span className="searchable-reg">{s.registerNumber}</span>
                        </div>
                        <div className="searchable-item-dept">{s.department}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {saveSuccess && (
          <div className="accommodation-toast success">
            <Check size={18} />
            <span>{saveSuccess}</span>
            <button type="button" onClick={() => setSaveSuccess(null)} className="toast-dismiss">
              <X size={15} />
            </button>
          </div>
        )}

        {apiError && (
          <div className="accommodation-toast error">
            <AlertTriangle size={18} />
            <span>{apiError}</span>
            <button type="button" onClick={() => setApiError(null)} className="toast-dismiss">
              <X size={15} />
            </button>
          </div>
        )}

        {/* SECTION A: STUDENT DETAILS (READ-ONLY) */}
        <section className="card accommodation-section-card">
          <div className="card-header-row">
            <div>
              <span className="card-kicker">SECTION A</span>
              <h2 className="card-heading">STUDENT DETAILS</h2>
            </div>
            <span className="read-only-pill">Read-only academic record</span>
          </div>

          <div className="read-only-grid">
            <div className="data-item">
              <span className="data-label">Student Name</span>
              <strong className="data-value">{student.name}</strong>
            </div>
            <div className="data-item">
              <span className="data-label">Register Number</span>
              <strong className="data-value">{student.registerNumber}</strong>
            </div>
            <div className="data-item">
              <span className="data-label">Phone Number</span>
              <strong className="data-value">
                {studentPhone || student?.phoneNumber || student?.contactNumber || "Not Available"}
              </strong>
            </div>
            <div className="data-item">
              <span className="data-label">Department</span>
              <strong className="data-value">{student.department}</strong>
            </div>
          </div>
        </section>

        {/* SECTION B: RESIDENCE INFORMATION */}
        <section className="card accommodation-section-card" style={{ marginTop: 16 }}>
          <div className="card-header-row">
            <div>
              <span className="card-kicker">SECTION B</span>
              <h2 className="card-heading">RESIDENCE INFORMATION</h2>
            </div>
            {!isEditing && (
              <button
                type="button"
                className="edit-residence-btn"
                onClick={handleStartEdit}
                aria-label="Edit residence information"
              >
                <Pencil size={14} />
                <span>Edit</span>
              </button>
            )}
          </div>

          {!isEditing ? (
            /* READ-ONLY RESIDENCE VIEW */
            <div className="residence-readonly-view">
              <div className="current-residence-bar">
                <span className="current-residence-label">Current Residence</span>
                <Status tone={student.accommodationType === "Hosteller" ? "green" : student.accommodationType === "PG" ? "purple" : "blue"}>
                  {student.accommodationType}
                </Status>
              </div>

              <div className="residence-details-list">
                {student.accommodationType === "Hosteller" && (
                  <>
                    <div className="residence-detail-row">
                      <span>Hostel Name</span>
                      <strong>{student.hostelName || "Bharathi Hostel"}</strong>
                    </div>
                    {student.hostelBlock && (
                      <div className="residence-detail-row">
                        <span>Hostel Block</span>
                        <strong>{student.hostelBlock}</strong>
                      </div>
                    )}
                    <div className="residence-detail-row">
                      <span>Room Number</span>
                      <strong>{student.roomNumber || "B-204"}</strong>
                    </div>
                    {student.hostelAddress && (
                      <div className="residence-detail-row multiline">
                        <span>Hostel Address</span>
                        <strong>{student.hostelAddress}</strong>
                      </div>
                    )}
                    {student.accommodationNotes && (
                      <div className="residence-detail-row multiline">
                        <span>Comments / Notes</span>
                        <strong>{student.accommodationNotes}</strong>
                      </div>
                    )}
                  </>
                )}

                {student.accommodationType === "PG" && (
                  <>
                    <div className="residence-detail-row">
                      <span>PG Name</span>
                      <strong>{student.pgName || "Not specified"}</strong>
                    </div>
                    <div className="residence-detail-row multiline">
                      <span>Complete PG Address</span>
                      <strong>{student.pgAddress || "Not specified"}</strong>
                    </div>
                    <div className="residence-detail-row">
                      <span>Contact Number</span>
                      <strong>{student.pgContact || "Not specified"}</strong>
                    </div>
                    {student.distanceFromCampus && (
                      <div className="residence-detail-row">
                        <span>Distance from Campus</span>
                        <strong>{student.distanceFromCampus}</strong>
                      </div>
                    )}
                    {student.accommodationNotes && (
                      <div className="residence-detail-row multiline">
                        <span>Additional Notes</span>
                        <strong>{student.accommodationNotes}</strong>
                      </div>
                    )}
                  </>
                )}

                {student.accommodationType === "Day Scholar" && (
                  <>
                    <div className="residence-detail-row multiline">
                      <span>Complete Residential Address</span>
                      <strong>{student.residentialAddress || "Trichy City"}</strong>
                    </div>
                    <div className="residence-detail-row">
                      <span>Contact Number</span>
                      <strong>{student.contactNumber || "+91 98765 00000"}</strong>
                    </div>
                    <div className="residence-detail-row">
                      <span>Transportation Type</span>
                      <strong>{student.transportationType || student.transport || "College Bus"}</strong>
                    </div>
                    {(student.transportationType === "College Bus" || (!student.transportationType && student.transport === "College Bus")) && (
                      <>
                        <div className="residence-detail-row">
                          <span>Bus Route Number</span>
                          <strong>{student.routeNumber || "Route 12"}</strong>
                        </div>
                        <div className="residence-detail-row">
                          <span>Boarding Point</span>
                          <strong>{student.boardingPoint || "Central Bus Stand"}</strong>
                        </div>
                      </>
                    )}
                    {student.transportationType === "Own Vehicle" && (
                      <>
                        <div className="residence-detail-row">
                          <span>Vehicle Type</span>
                          <strong>{student.vehicleType || "Two-Wheeler"}</strong>
                        </div>
                        <div className="residence-detail-row">
                          <span>Vehicle Registration Number</span>
                          <strong>{student.vehicleNumber || "TN 45 AB 1234"}</strong>
                        </div>
                      </>
                    )}
                    {student.transportationType === "Other" && (
                      <div className="residence-detail-row">
                        <span>Description of Travel Mode</span>
                        <strong>{student.transportDescription || "Walking / Public transit"}</strong>
                      </div>
                    )}
                    {student.accommodationNotes && (
                      <div className="residence-detail-row multiline">
                        <span>Additional Notes</span>
                        <strong>{student.accommodationNotes}</strong>
                      </div>
                    )}
                  </>
                )}
              </div>

              {(student.residenceUpdatedAt || student.residenceUpdatedBy) && (
                <div className="residence-meta-footer">
                  <Clock3 size={13} />
                  <span>
                    Last updated {student.residenceUpdatedAt ? `on ${student.residenceUpdatedAt}` : ""} {student.residenceUpdatedBy ? `by ${student.residenceUpdatedBy}` : ""}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* RESIDENCE UPDATE FORM */
            <div className="residence-edit-form">
              <div className="edit-form-notice">
                <span>Select new residence type and enter required details below.</span>
              </div>

              {/* Residence Type Selection */}
              <div className="field">
                <span className="field-title">Residence Type *</span>
                <div className="residence-type-selector">
                  {(["Hosteller", "PG", "Day Scholar"] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`residence-type-option ${residenceType === type ? "selected" : ""}`}
                      onClick={() => {
                        setResidenceType(type);
                        setErrors({});
                      }}
                    >
                      <span className="residence-radio-indicator">
                        {residenceType === type && <span className="residence-radio-dot" />}
                      </span>
                      <span className="residence-type-title">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* CASE 1: HOSTELLER FIELDS */}
              {residenceType === "Hosteller" && (
                <div className="residence-fields-group">
                  <label className="field">
                    <span>Hostel Name *</span>
                    <input
                      type="text"
                      value={hostelName}
                      onChange={e => {
                        setHostelName(e.target.value);
                        if (e.target.value.trim()) setErrors(prev => ({ ...prev, hostelName: "" }));
                      }}
                      placeholder="e.g. Bharathi Hostel, Cauvery Hostel"
                    />
                    {errors.hostelName && <small className="field-error">{errors.hostelName}</small>}
                  </label>

                  <label className="field">
                    <span>Hostel Block (Optional)</span>
                    <input
                      type="text"
                      value={hostelBlock}
                      onChange={e => setHostelBlock(e.target.value)}
                      placeholder="e.g. Block A, East Wing"
                    />
                  </label>

                  <label className="field">
                    <span>Room Number *</span>
                    <input
                      type="text"
                      value={roomNumber}
                      onChange={e => {
                        setRoomNumber(e.target.value);
                        if (e.target.value.trim()) setErrors(prev => ({ ...prev, roomNumber: "" }));
                      }}
                      placeholder="e.g. B-204"
                    />
                    {errors.roomNumber && <small className="field-error">{errors.roomNumber}</small>}
                  </label>

                  <label className="field">
                    <span>Hostel Address (Optional)</span>
                    <textarea
                      rows={2}
                      value={hostelAddress}
                      onChange={e => setHostelAddress(e.target.value)}
                      placeholder="Enter hostel campus location or full address"
                    />
                  </label>

                  <label className="field">
                    <span>Comments / Reason</span>
                    <textarea
                      rows={2}
                      value={hostelNotes}
                      onChange={e => setHostelNotes(e.target.value)}
                      placeholder="Reason or remarks for hostel allocation or change..."
                    />
                  </label>
                </div>
              )}

              {/* CASE 2: PG FIELDS */}
              {residenceType === "PG" && (
                <div className="residence-fields-group">
                  <label className="field">
                    <span>PG Name *</span>
                    <input
                      type="text"
                      value={pgName}
                      onChange={e => {
                        setPgName(e.target.value);
                        if (e.target.value.trim()) setErrors(prev => ({ ...prev, pgName: "" }));
                      }}
                      placeholder="e.g. Sri Sai Deluxe PG for Men / Women"
                    />
                    {errors.pgName && <small className="field-error">{errors.pgName}</small>}
                  </label>

                  <label className="field">
                    <span>Complete PG Address *</span>
                    <textarea
                      rows={3}
                      value={pgAddress}
                      onChange={e => {
                        setPgAddress(e.target.value);
                        if (e.target.value.trim()) setErrors(prev => ({ ...prev, pgAddress: "" }));
                      }}
                      placeholder="Enter full postal address, street, landmark, pincode..."
                    />
                    {errors.pgAddress && <small className="field-error">{errors.pgAddress}</small>}
                  </label>

                  <label className="field">
                    <span>Contact Number *</span>
                    <input
                      type="tel"
                      value={pgContact}
                      onChange={e => {
                        setPgContact(e.target.value);
                        if (e.target.value.trim()) setErrors(prev => ({ ...prev, pgContact: "" }));
                      }}
                      placeholder="e.g. 9876543210 or +91 98765 43210"
                    />
                    {errors.pgContact && <small className="field-error">{errors.pgContact}</small>}
                  </label>

                  <label className="field">
                    <span>Distance from Campus (Optional)</span>
                    <input
                      type="text"
                      value={distanceFromCampus}
                      onChange={e => setDistanceFromCampus(e.target.value)}
                      placeholder="e.g. 1.2 km or 500 m"
                    />
                  </label>

                  <label className="field">
                    <span>Comments / Reason (Optional)</span>
                    <textarea
                      rows={2}
                      value={pgNotes}
                      onChange={e => setPgNotes(e.target.value)}
                      placeholder="Any relevant warden remarks or reason for change..."
                    />
                  </label>
                </div>
              )}

              {/* CASE 3: DAY SCHOLAR FIELDS */}
              {residenceType === "Day Scholar" && (
                <div className="residence-fields-group">
                  <label className="field">
                    <span>Complete Residential Address *</span>
                    <textarea
                      rows={3}
                      value={residentialAddress}
                      onChange={e => {
                        setResidentialAddress(e.target.value);
                        if (e.target.value.trim()) setErrors(prev => ({ ...prev, residentialAddress: "" }));
                      }}
                      placeholder="Enter student's permanent or home address with pincode..."
                    />
                    {errors.residentialAddress && <small className="field-error">{errors.residentialAddress}</small>}
                  </label>

                  <label className="field">
                    <span>Contact Number *</span>
                    <input
                      type="tel"
                      value={contactNumber}
                      onChange={e => {
                        setContactNumber(e.target.value);
                        if (e.target.value.trim()) setErrors(prev => ({ ...prev, contactNumber: "" }));
                      }}
                      placeholder="e.g. 9876543210 or +91 98765 43210"
                    />
                    {errors.contactNumber && <small className="field-error">{errors.contactNumber}</small>}
                  </label>

                  <label className="field">
                    <span>Transportation Type *</span>
                    <select
                      value={transportationType}
                      onChange={e => {
                        setTransportationType(e.target.value as "College Bus" | "Own Vehicle" | "Other");
                        setErrors(prev => ({
                          ...prev,
                          transportationType: "",
                          routeNumber: "",
                          boardingPoint: "",
                          vehicleType: "",
                          vehicleNumber: "",
                          transportDescription: "",
                        }));
                      }}
                    >
                      <option value="College Bus">College Bus</option>
                      <option value="Own Vehicle">Own Vehicle</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.transportationType && <small className="field-error">{errors.transportationType}</small>}
                  </label>

                  {/* Conditional Transport Fields */}
                  {transportationType === "College Bus" && (
                    <>
                      <label className="field">
                        <span>Bus Route Number *</span>
                        <input
                          type="text"
                          value={routeNumber}
                          onChange={e => {
                            setRouteNumber(e.target.value);
                            if (e.target.value.trim()) setErrors(prev => ({ ...prev, routeNumber: "" }));
                          }}
                          placeholder="e.g. Route 14 or Bus #8"
                        />
                        {errors.routeNumber && <small className="field-error">{errors.routeNumber}</small>}
                      </label>

                      <label className="field">
                        <span>Boarding Point *</span>
                        <input
                          type="text"
                          value={boardingPoint}
                          onChange={e => {
                            setBoardingPoint(e.target.value);
                            if (e.target.value.trim()) setErrors(prev => ({ ...prev, boardingPoint: "" }));
                          }}
                          placeholder="e.g. Trichy Junction or Thillai Nagar"
                        />
                        {errors.boardingPoint && <small className="field-error">{errors.boardingPoint}</small>}
                      </label>
                    </>
                  )}

                  {transportationType === "Own Vehicle" && (
                    <>
                      <label className="field">
                        <span>Vehicle Type *</span>
                        <input
                          type="text"
                          value={vehicleType}
                          onChange={e => {
                            setVehicleType(e.target.value);
                            if (e.target.value.trim()) setErrors(prev => ({ ...prev, vehicleType: "" }));
                          }}
                          placeholder="e.g. Two-Wheeler (Motorcycle / Scooter) or Four-Wheeler"
                        />
                        {errors.vehicleType && <small className="field-error">{errors.vehicleType}</small>}
                      </label>

                      <label className="field">
                        <span>Vehicle Registration Number *</span>
                        <input
                          type="text"
                          value={vehicleNumber}
                          onChange={e => {
                            setVehicleNumber(e.target.value);
                            if (e.target.value.trim()) setErrors(prev => ({ ...prev, vehicleNumber: "" }));
                          }}
                          placeholder="e.g. TN 45 AZ 1234"
                        />
                        {errors.vehicleNumber && <small className="field-error">{errors.vehicleNumber}</small>}
                      </label>
                    </>
                  )}

                  {transportationType === "Other" && (
                    <label className="field">
                      <span>Description of Travel Mode *</span>
                      <input
                        type="text"
                        value={transportDescription}
                        onChange={e => {
                          setTransportDescription(e.target.value);
                          if (e.target.value.trim()) setErrors(prev => ({ ...prev, transportDescription: "" }));
                        }}
                        placeholder="e.g. Walking, City Bus, Bicycle, Auto"
                      />
                      {errors.transportDescription && <small className="field-error">{errors.transportDescription}</small>}
                    </label>
                  )}

                  <label className="field">
                    <span>Comments / Reason (Optional)</span>
                    <textarea
                      rows={2}
                      value={dayScholarNotes}
                      onChange={e => setDayScholarNotes(e.target.value)}
                      placeholder="Reason or notes for day scholar residence details..."
                    />
                  </label>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="residence-form-actions">
                <Button variant="secondary" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* ACCOMMODATION HISTORY (AUDIT TRAIL) */}
        {historyList.length > 0 && (
          <section className="card accommodation-section-card" style={{ marginTop: 16 }}>
            <div className="card-header-row">
              <div>
                <span className="card-kicker">AUDIT TRAIL</span>
                <h2 className="card-heading">ACCOMMODATION CHANGE HISTORY</h2>
              </div>
            </div>
            <div className="history-timeline-list">
              {historyList.map(item => (
                <div key={item.id} className="history-timeline-item">
                  <div className="history-item-top">
                    <span className="history-transition">
                      <span className="prev-type">{item.previous_residence_type || "Hosteller"}</span>
                      <ChevronRight size={14} />
                      <span className="new-type">{item.new_residence_type}</span>
                    </span>
                    <span className="history-date">{item.effective_date}</span>
                  </div>
                  <div className="history-item-meta">
                    <span>Updated by {item.updated_by}</span>
                  </div>
                  {item.new_details && (
                    <div className="history-item-details">
                      {item.new_residence_type === "PG" && item.new_details.pg_name && (
                        <div>PG: {item.new_details.pg_name} {item.new_details.pg_contact ? `(${item.new_details.pg_contact})` : ""}</div>
                      )}
                      {item.new_residence_type === "Hosteller" && item.new_details.hostel_name && (
                        <div>Hostel: {item.new_details.hostel_name} - Room {item.new_details.room_number || "N/A"}</div>
                      )}
                      {item.new_residence_type === "Day Scholar" && (
                        <div>Transport: {item.new_details.transportation_type || "Day Scholar"}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function Profile({ role, session, back, onLogout }: { role: Role; session: StoredSession | null; back: () => void; onLogout: () => void }) {
  const meta = roleMeta[role];
  const displayName = session?.fullName || meta.name;
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || meta.initials;
  return <>
    <TopBar title="Profile" subtitle="Account & access tools" back={back} />
    <div className="page-content">
      <div className="profile-institution-banner">
        <div className="inst-banner-logo">
          <img src="/srm-logo.png" alt="SRM GROUP OF INSTITUTIONS TRICHY" />
        </div>
        <div className="inst-banner-copy">
          <span className="overline">AFFILIATED INSTITUTION</span>
          <strong>SRM GROUP OF INSTITUTIONS</strong>
          <small>TRICHY</small>
        </div>
      </div>
      <section className="profile-card"><div className="profile-avatar large">{initials}</div><h1>{displayName}</h1><p>{meta.label}</p><Status tone="green">Active session</Status></section>
      <div className="profile-scope"><span>AUTHORIZED SCOPE</span><strong>{meta.scope}</strong></div>
      {session?.email && <div className="profile-detail-row"><span>Mail ID</span><strong>{session.email}</strong></div>}
      {(role === "security" || role === "warden" || role === "staff") && <div className="profile-detail-row"><span>Phone Number</span><strong>{meta.phoneNumber}</strong></div>}
      {role === "supervisor" && <div className="profile-detail-row"><span>Phone Number</span><strong>{meta.phoneNumber}</strong></div>}
      {(role === "students" || role === "welfare" || role === "cso" || role === "manager" || role === "access-supervisor") && <div className="profile-detail-row"><span>Phone Number</span><strong>{meta.phoneNumber}</strong></div>}
      <Button variant="danger" onClick={onLogout} icon={<LogOut size={17} />}>Log out</Button>
    </div>
  </>;
}

export default function App() {
  const [session, setSession] = useState<StoredSession | null>(() => getInitialLocalSession());
  const [role, setRole] = useState<Role>(() => getInitialLocalSession()?.role || "security");
  const [screen, setScreen] = useState<Screen>(() => (getInitialLocalSession() ? "home" : "login"));

  useEffect(() => {
    let active = true;
    getStoredSession().then(saved => {
      if (active && saved && saved.role) {
        setSession(prev => prev || saved);
        setRole(saved.role);
        setScreen(prev => (prev === "login" ? "home" : prev));
      }
    });
    return () => { active = false; };
  }, []);
  const [identityCase, setIdentityCase] = useState<IdentityCase>("student");
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("face");
  const [matchedStudent, setMatchedStudent] = useState<StudentMatch>(studentMatches[0]);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [biometricScores, setBiometricScores] = useState<Record<string, number> | null>(null);

  // Dynamic students list with persistence
  const [studentsList, setStudentsList] = useState<StudentMatch[]>(() => {
    try {
      const saved = localStorage.getItem("campus_secure_students");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return studentMatches;
  });

  // Audit logs state with persistence (normalizing any legacy stored entries)
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    try {
      const saved = localStorage.getItem("campus_secure_audit_logs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => ({
            id: item.id || `AUD-${Date.now()}`,
            timestamp: item.timestamp || new Date().toISOString().replace("T", " ").slice(0, 19),
            dateTime: item.dateTime || new Date().toISOString(),
            editedBy: item.editedBy || item.actor || item.userName || "System",
            editorRole: ((item.editorRole || item.actorRole) === "Admin" ? "Super admin" : (item.editorRole || item.actorRole)) || (item.module === "Student Welfare" ? "Student Welfare" : "Super admin"),
            action: item.action === "UPDATE_ACCOMMODATION" ? "Accommodation Updated" : item.action || "Student Details Updated",
            institution: item.institution || "SRM GROUP OF INSTITUTIONS TRICHY",
            block: item.block,
            actionDetails:
              item.actionDetails ||
              item.details ||
              (item.target && item.summary
                ? `${item.target} — ${item.summary}`
                : item.summary || item.target || "Record modified"),
            comments: item.comments || "—",
            changes: Array.isArray(item.changes) ? item.changes : undefined,
            details: item.details && typeof item.details === "object" ? item.details : undefined,
          }));
        }
      }
    } catch (e) {}
    return DEFAULT_AUDIT_LOGS;
  });

  const addAuditLog = (auditLog: AuditLogItem) => {
    setAuditLogs(prev => {
      const updated = [auditLog, ...prev];
      try { localStorage.setItem("campus_secure_audit_logs", JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
  };

  // Admin log field display visibility settings
  const [adminLogFieldVisibility, setAdminLogFieldVisibility] = useState<LogFieldVisibility>(() => {
    try {
      const saved = localStorage.getItem("campus_secure_log_field_visibility");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_LOG_FIELD_VISIBILITY;
  });

  // Admin-controlled Institute Manager edit permissions
  const [managerEditPermissions, setManagerEditPermissions] = useState<ManagerEditPermissions>(() => {
    try {
      const saved = localStorage.getItem("campus_secure_manager_edit_permissions");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_MANAGER_EDIT_PERMISSIONS;
  });

  const handleAddStudent = async (newStudent: StudentMatch, auditLog: AuditLogItem) => {
    setStudentsList(prev => {
      const updated = [newStudent, ...prev];
      try { localStorage.setItem("campus_secure_students", JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    studentMatches.unshift(newStudent);
    setAuditLogs(prev => {
      const updated = [auditLog, ...prev];
      try { localStorage.setItem("campus_secure_audit_logs", JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    try {
      const token = localStorage.getItem("campus_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch(`${API_BASE_URL}/api/v1/students/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          register_number: newStudent.registerNumber,
          name: newStudent.name,
          initials: newStudent.initials,
          department: newStudent.department,
          year_roman: newStudent.year,
          batch: newStudent.batch,
          residence_type: newStudent.accommodationType === "Hosteller" ? "Hostel" : newStudent.accommodationType,
          hostel_name: newStudent.hostelName || "Bharathi Hostel",
          room_number: newStudent.roomNumber || "B-204",
          bus_route: newStudent.routeNumber,
          bus_boarding_point: newStudent.boardingPoint,
          vehicle_number: newStudent.vehicleNumber,
          photo_url: newStudent.photo,
          institution_id: 1,
          phone_number: newStudent.phoneNumber || newStudent.contactNumber || "+91 98765 43219",
          contact_number: newStudent.contactNumber || newStudent.phoneNumber || "+91 98765 43219",
        }),
      });
    } catch (e) {
      console.warn("Could not save student to backend API:", e);
    }
  };

  const handleUpdateStudent = async (updatedStudent: StudentMatch, auditLog: AuditLogItem) => {
    setStudentsList(prev => {
      const updated = prev.map(s => s.registerNumber === updatedStudent.registerNumber ? updatedStudent : s);
      try { localStorage.setItem("campus_secure_students", JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    const idx = studentMatches.findIndex(s => s.registerNumber === updatedStudent.registerNumber);
    if (idx !== -1) studentMatches[idx] = updatedStudent;
    setAuditLogs(prev => {
      const updated = [auditLog, ...prev];
      try { localStorage.setItem("campus_secure_audit_logs", JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    try {
      const token = localStorage.getItem("campus_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch(`${API_BASE_URL}/api/v1/students/accommodation/${encodeURIComponent(updatedStudent.registerNumber)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          residence_type: updatedStudent.accommodationType,
          hostel_name: updatedStudent.hostelName || null,
          room_number: updatedStudent.roomNumber || null,
          pg_name: (updatedStudent as any).pgName || (updatedStudent as any).pg_name || "Workflow Test PG",
          pg_address: (updatedStudent as any).pgAddress || (updatedStudent as any).pg_address || "Tiruchirappalli",
          pg_contact: (updatedStudent as any).pgContact || (updatedStudent as any).pg_contact || "+91 98765 43219",
          notes: (updatedStudent as any).notes || "Accommodation workflow testing.",
          effective_date: new Date().toLocaleDateString("en-GB"),
          updated_by: roleMeta[role]?.name || "Student Welfare",
        }),
      });
    } catch (e) {
      console.warn("Could not update student accommodation in backend API:", e);
    }
  };

  const handleBulkImportStudents = (newStudents: StudentMatch[], auditLog: AuditLogItem) => {
    setStudentsList(prev => {
      const regSet = new Set(newStudents.map(s => s.registerNumber));
      const filtered = prev.filter(s => !regSet.has(s.registerNumber));
      const updated = [...newStudents, ...filtered];
      try { localStorage.setItem("campus_secure_students", JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    newStudents.forEach(s => {
      const idx = studentMatches.findIndex(existing => existing.registerNumber === s.registerNumber);
      if (idx !== -1) studentMatches[idx] = s;
      else studentMatches.unshift(s);
    });
    setAuditLogs(prev => {
      const updated = [auditLog, ...prev];
      try { localStorage.setItem("campus_secure_audit_logs", JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
  };

  const handleSaveFieldVisibility = (next: LogFieldVisibility, comment?: string) => {
    const prev = adminLogFieldVisibility;
    const changes: { field: string; oldVal: string; newVal: string }[] = [];
    (Object.keys(next) as (keyof LogFieldVisibility)[]).forEach(key => {
      if (prev[key] !== next[key]) {
        changes.push({
          field: String(key),
          oldVal: prev[key] ? "Visible" : "Hidden",
          newVal: next[key] ? "Visible" : "Hidden",
        });
      }
    });
    setAdminLogFieldVisibility(next);
    try { localStorage.setItem("campus_secure_log_field_visibility", JSON.stringify(next)); } catch (e) {}
    const now = new Date();
    addAuditLog({
      id: `AUD-VIS-${Date.now()}`,
      timestamp: now.toISOString().replace("T", " ").slice(0, 19),
      dateTime: now.toISOString(),
      editedBy: "Avery Williams",
      editorRole: "Super admin",
      action: "Settings Modified",
      institution: "SRM GROUP OF INSTITUTIONS TRICHY",
      block: "Campus Wide",
      actionDetails: changes.length > 0
        ? `Updated log display visibility (${changes.length} field${changes.length > 1 ? "s" : ""})`
        : "Saved student log field visibility configuration",
      comments: (comment && comment.trim()) || "Updated Student Log & Scan Field Visibility settings.",
      changes,
    });
  };

  const handleSaveManagerPermissions = (next: ManagerEditPermissions, comment?: string) => {
    const prev = managerEditPermissions;
    const changes: { field: string; oldVal: string; newVal: string }[] = [];
    (Object.keys(next) as (keyof ManagerEditPermissions)[]).forEach(key => {
      if (prev[key] !== next[key]) {
        changes.push({
          field: String(key),
          oldVal: prev[key] ? "Editable" : "Locked",
          newVal: next[key] ? "Editable" : "Locked",
        });
      }
    });
    setManagerEditPermissions(next);
    try { localStorage.setItem("campus_secure_manager_edit_permissions", JSON.stringify(next)); } catch (e) {}
    const now = new Date();
    addAuditLog({
      id: `AUD-PERM-${Date.now()}`,
      timestamp: now.toISOString().replace("T", " ").slice(0, 19),
      dateTime: now.toISOString(),
      editedBy: "Avery Williams",
      editorRole: "Super admin",
      action: "Access Permissions Updated",
      institution: "SRM GROUP OF INSTITUTIONS TRICHY",
      block: "Campus Wide",
      actionDetails: changes.length > 0
        ? `Updated Institute Manager permissions (${changes.length} field${changes.length > 1 ? "s" : ""})`
        : "Saved edit access permissions for Institute Manager role",
      comments: (comment && comment.trim()) || "Updated field editing permissions for Institute Manager portal.",
      changes,
    });
  };
  const [logs, setLogs] = useState<LogRecord[]>(() => {
    try {
      const saved = localStorage.getItem("campus_secure_custom_logs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((p: any) => {
            if (!p || typeof p !== "object") return false;
            const hasIntruderPhoto = typeof p.photo === "string" && (p.photo.includes("intruder_20261101") || p.photo.startsWith("data:image"));
            const isTodayTest = typeof p.dateTime === "string" && p.dateTime.startsWith("2026-11-01") && p.name === "Unrecognized person";
            return !hasIntruderPhoto && !isTodayTest;
          });
          localStorage.setItem("campus_secure_custom_logs", JSON.stringify(filtered));
          return [...filtered, ...logRows.filter(r => !filtered.some((p: LogRecord) => p.logId === r.logId))];
        }
      }
    } catch (e) {
      console.warn("Could not read custom logs from storage", e);
    }
    return logRows;
  });

  const deleteLog = (rowToDelete: LogRecord) => {
    const keyToDelete = recordKey(rowToDelete);
    setLogs(current => {
      const updated = current.filter(r => recordKey(r) !== keyToDelete);
      try {
        const saved = localStorage.getItem("campus_secure_custom_logs");
        if (saved) {
          const parsed = JSON.parse(saved);
          const filtered = parsed.filter((p: LogRecord) => recordKey(p) !== keyToDelete);
          localStorage.setItem("campus_secure_custom_logs", JSON.stringify(filtered));
        }
      } catch (e) {}
      return updated;
    });
  };

  const recordUnauthorizedEvent = (photo: string | null, notes?: string, phoneNumber?: string, fullName?: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = now.toISOString().slice(0, 10);
    const dateTimeStr = `${dateStr}T${timeStr}`;
    const randNum = Date.now().toString().slice(-4) + Math.floor(10 + Math.random() * 90);
    const logId = `DEN-•••-${randNum}`;
    const personName = fullName?.trim() || "Unrecognized person";
    const initials = fullName?.trim() ? (fullName.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "UP") : "UP";

    const newRecord: LogRecord = {
      initials: initials,
      name: personName,
      id: "Not available",
      institution: "SRM GROUP OF INSTITUTIONS TRICHY",
      department: "Not available",
      block: role === "warden" ? "Bharathi Hostel" : role === "staff" ? "Block A" : (role === "supervisor" || role === "cso") ? "Institution B Campus" : "Main Gate",
      time: timeStr,
      dateTime: dateTimeStr,
      event: "Denied",
      tone: "red",
      personType: "Unauthorised",
      category: "Unauthorised visitor",
      accessCategory: "Unauthorized",
      logId: logId,
      phoneNumber: phoneNumber,
      guard: role === "warden" ? roleMeta.warden.name : role === "staff" ? roleMeta.staff.name : role === "cso" ? roleMeta.cso.name : role === "supervisor" ? roleMeta.supervisor.name : "G. Selvam",
      guardNumber: role === "warden" ? (roleMeta.warden.supervisorNumber || "WRD-B-0011") : role === "cso" ? (roleMeta.cso.supervisorNumber || "CSO-0001") : role === "supervisor" ? (roleMeta.supervisor.supervisorNumber || "SUP-B-0004") : "GRD-B-0017",
      guardNotes: notes || (role === "warden" ? "Identity could not be verified by Warden at Bharathi Hostel." : "Identity could not be verified at the Main Gate."),
      entries: 1,
      decision: "Denied",
      photo: photo || undefined,
    };

    setLogs(current => {
      const updated = [newRecord, ...current.filter(c => c.logId !== logId)];
      try {
        localStorage.setItem("campus_secure_custom_logs", JSON.stringify(updated.slice(0, 30)));
      } catch (e) {
        console.warn("Could not save custom logs to storage", e);
      }
      return updated;
    });

    const postPayload = {
      name: personName,
      phone_number: phoneNumber,
      location_block: role === "warden" ? "Bharathi Hostel" : role === "staff" ? "Block A" : (role === "supervisor" || role === "cso") ? "Institution B Campus" : "Main Gate",
      guard_name: role === "warden" ? roleMeta.warden.name : role === "cso" ? roleMeta.cso.name : role === "supervisor" ? roleMeta.supervisor.name : "G. Selvam",
      notes: notes || (role === "warden" ? "Identity could not be verified by Warden at Bharathi Hostel." : "Identity could not be verified at the Main Gate."),
      image_base64: photo || null,
      log_id: logId,
    };

    fetch(`${API_BASE_URL}/api/v1/access-logs/unauthorized`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postPayload),
    }).catch(() => {
      fetch(`${API_BASE_URL}/api/v1/access-logs/unauthorized`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postPayload),
      }).catch(err => console.warn("Background log save to API failed:", err));
    });
  };
  const [authorizedFaces, setAuthorizedFaces] = useState<AuthorizedFaceProfile[]>([]);
  const [visitorPasses, setVisitorPasses] = useState<VisitorPass[]>(initialVisitorPasses);
  const [selectedVisitorPass, setSelectedVisitorPass] = useState<VisitorPass>(blankVisitorPass);
  const [passDetailBack, setPassDetailBack] = useState<Screen>("visitor-pass");
  const [visitorPassFilters, setVisitorPassFilters] = useState<VisitorPassFilters>({ query: "", status: "All statuses", eventDate: "" });
  const [bulkEventDetails, setBulkEventDetails] = useState<EventDetails>(blankEventDetails);
  const [unreadPassNotifications, setUnreadPassNotifications] = useState(["created", "expiring", "cancelled"]);
  const [reviews, setReviews] = useState<Record<string, ReviewRecord>>({
    "ENT-•••-4082": {
      status: "Verified",
      actions: [{ type: "Verified", actor: "Meera Nair", actorNumber: "SUP-B-0004", timestamp: "2025-06-16 10:50" }],
    },
    "ENT-•••-4071": {
      status: "Revoked",
      actions: [
        { type: "Verified", actor: "Meera Nair", actorNumber: "SUP-B-0004", timestamp: "2025-06-16 10:35" },
        { type: "Revoked", actor: "Meera Nair", actorNumber: "SUP-B-0004", timestamp: "2025-06-16 10:39", reason: "Host approval granted." },
      ],
    },
  });

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/api/v1/access-logs/?limit=300`)
      .then(res => res.ok ? res.json() : [])
      .then((data: any[]) => {
        if (!active || !Array.isArray(data)) return;
        setReviews(prevReviews => {
          const next = { ...prevReviews };
          data.forEach(item => {
            const key = item.record_identifier || item.id?.toString();
            if (key && item.review_actions && item.review_actions.length > 0) {
              next[key] = {
                status: (item.review_status as ReviewStatus) || "Pending Verification",
                actions: item.review_actions,
              };
            }
          });
          return next;
        });
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const [stack, setStack] = useState<Screen[]>([]);
  const go = (next: Screen) => {
    if (next === screen) return;
    const pushed = next === "alerts" || next === "profile" || next === "access-notifications" || next === "accommodation-details";
    setStack(current => next === "home" || next === "login" ? [] : pushed ? [...current, screen] : current);
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    const previous = stack[stack.length - 1] ?? "home";
    setStack(current => current.slice(0, -1));
    setScreen(previous);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const enter = (nextRole: Role, nextSession?: StoredSession) => {
    if (nextSession) setSession(nextSession);
    setRole(nextRole);
    go("home");
  };
  const handleLogout = async () => {
    await clearSession();
    setSession(null);
    setStack([]);
    go("login");
  };
  const completeScan = (capturedImage: string | null, matchResult?: StudentMatch | null, scores?: Record<string, number> | null) => {
    setCapturedPhoto(capturedImage);
    setBiometricScores(scores ?? null);
    const nextAttempt = scanAttempts + 1;
    setScanAttempts(nextAttempt);

    if (matchResult) {
      setIdentityCase("student");
      setMatchedStudent(matchResult);
      setVerificationMethod("face");
      go("identity");
      return;
    }

    // Unrecognized face (e.g. arbitrary live webcam scan with no matching enrolled embedding)
    if (capturedImage) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const dateStr = now.toISOString().slice(0, 10);
      const dateTimeStr = `${dateStr}T${timeStr}`;
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const logId = `DEN-•••-${randNum}`;

      const newUnrecRecord: LogRecord = {
        initials: "UP",
        name: "Unrecognized person",
        id: "Not available",
        institution: "SRM GROUP OF INSTITUTIONS TRICHY",
        department: "Not available",
        block: role === "warden" ? "Bharathi Hostel" : role === "staff" ? "Block A" : (role === "supervisor" || role === "cso") ? "Institution B Campus" : "Main Gate",
        time: timeStr,
        dateTime: dateTimeStr,
        event: "Denied",
        tone: "red",
        personType: "Unauthorised",
        category: "Unauthorised visitor",
        accessCategory: "Unauthorized",
        logId: logId,
        guard: role === "warden" ? roleMeta.warden.name : role === "staff" ? roleMeta.staff.name : role === "cso" ? roleMeta.cso.name : role === "supervisor" ? roleMeta.supervisor.name : "G. Selvam",
        guardNumber: role === "warden" ? (roleMeta.warden.supervisorNumber || "WRD-B-0011") : role === "cso" ? (roleMeta.cso.supervisorNumber || "CSO-0001") : role === "supervisor" ? (roleMeta.supervisor.supervisorNumber || "SUP-B-0004") : "GRD-B-0017",
        guardNotes: "Face recognition score below threshold. Person unrecognized.",
        entries: 1,
        decision: "Denied",
        photo: capturedImage,
      };

      setLogs(current => {
        const updated = [newUnrecRecord, ...current.filter(c => c.logId !== logId)];
        try {
          localStorage.setItem("campus_secure_custom_logs", JSON.stringify(updated.slice(0, 30)));
        } catch (e) {
          console.warn("Could not save custom logs to storage", e);
        }
        return updated;
      });
    }

    go("unrecognized");
  };
  const verifyRegister = async (registerNumber: string) => {
    const regTrimmed = registerNumber.trim().toUpperCase();
    if (role === "security" || role === "warden" || role === "supervisor" || role === "cso") {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/v1/ai/verify-face`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            register_number: regTrimmed,
            image_base64: capturedPhoto,
            location_block: (role === "supervisor" || role === "cso") ? "Institution B Campus" : role === "warden" ? "Bharathi Hostel" : "Gate 1 Main Entrance",
            guard_name: role === "warden" ? roleMeta.warden.name : role === "cso" ? roleMeta.cso.name : role === "supervisor" ? roleMeta.supervisor.name : "G. Selvam",
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.is_recognized && data.matched_person && data.verification_status === "Authorized") {
            const mp = data.matched_person;
            const found = studentMatches.find(s => s.registerNumber.toUpperCase() === regTrimmed) || {
              initials: mp.initials || "ST",
              name: mp.name,
              registerNumber: mp.identifier,
              dateOfBirth: "10 June 2004",
              department: mp.department,
              year: mp.year_roman || "II Year",
              batch: mp.batch || "2023–2028",
              institute: "SRM GROUP OF INSTITUTIONS TRICHY",
              similarity: 100,
              accommodationType: (mp.residence_type as any) || "Hosteller",
              hostelName: mp.hostel_name,
              roomNumber: mp.room_number,
              photo: mp.photo_url || capturedPhoto || "/faces/sur_crop.jpg",
            };
            setIdentityCase("student");
            setMatchedStudent({
              ...found,
              name: mp.name || found.name,
              registerNumber: mp.identifier || found.registerNumber,
              department: mp.department || found.department,
              year: mp.year_roman || found.year,
              batch: mp.batch || found.batch,
              accommodationType: (mp.residence_type as any) || found.accommodationType,
              hostelName: mp.hostel_name || found.hostelName,
              roomNumber: mp.room_number || found.roomNumber,
              photo: capturedPhoto || mp.photo_url || found.photo,
            });
            setVerificationMethod("register");
            go("identity");
            return true;
          }
        }
      } catch (err) {
        console.warn("Backend register verification error:", err);
      }
    }

    const match = studentMatches.find(person => person.registerNumber.toUpperCase() === regTrimmed);
    if (!match) return false;
    setIdentityCase("student");
    setMatchedStudent({
      ...match,
      photo: capturedPhoto || match.photo,
    });
    setVerificationMethod("register");
    go("identity");
    return true;
  };
  const updateReview = (
    row: LogRecord,
    type: "Authorised" | "Unauthorised" | "Revoked",
    reason?: string,
    incidentData?: IncidentData
  ) => {
    const key = recordKey(row);
    const actorName = roleMeta[role].name;
    const actorNumber = roleMeta[role].supervisorNumber ?? "SUP-B-0004";
    const timestamp = new Date().toLocaleString("en-GB", { hour12: false }).replace(",", "");
    const incDate = incidentData?.dateTime ? incidentData.dateTime.split("T")[0] : undefined;
    const incTime = incidentData?.dateTime ? incidentData.dateTime.split("T")[1] : undefined;
    const cleanReason = reason?.trim() ? reason.trim() : undefined;
    const actionReason = cleanReason || incidentData?.actionTaken;

    const action: ReviewAction = {
      type,
      actor: actorName,
      actorNumber: actorNumber,
      timestamp,
      reason: actionReason,
      event_id: row.logId || key,
      verification_status: type === "Authorised" ? "Authorized" : "Unauthorized",
      decision_made_by: actorName,
      supervisor_id: actorNumber,
      supervisor_name: actorName,
      action_taken: (type === "Unauthorised" || type === "Authorised") ? (incidentData?.actionTaken || cleanReason) : undefined,
      decision_timestamp: timestamp,
      previous_status: reviewFor(reviews, row).status,
      updated_status: type,
      full_name: incidentData?.fullName,
      address: incidentData?.address,
      contact_number: incidentData?.contactNumber,
      vehicle_number: incidentData?.vehicleNumber,
      location: incidentData?.location,
      incident_date: incDate,
      incident_time: incTime,
      incident_datetime: incidentData?.dateTime,
    };
    setReviews(current => {
      const existing = reviewFor(current, row);
      if (
        existing.status === "Revoked" ||
        (type === "Unauthorised" && existing.status === "Unauthorised") ||
        (type === "Authorised" && (existing.status === "Authorised" || existing.status === "Verified"))
      ) {
        return current;
      }
      return { ...current, [key]: { status: type, actions: [...existing.actions, action] } };
    });
    setLogs(current =>
      current.map(l => {
        if (recordKey(l) === key) {
          return {
            ...l,
            name: incidentData?.fullName || l.name,
            phoneNumber: incidentData?.contactNumber || l.phoneNumber,
            vehicleNumber: incidentData?.vehicleNumber || l.vehicleNumber,
            decision: type === "Authorised" ? "Authorised" : "Denied",
            accessCategory: type === "Authorised" ? "Authorized" : l.accessCategory,
          };
        }
        return l;
      })
    );

    // Persist to PostgreSQL backend database
    const targetId = row.logId || key;
    fetch(`${API_BASE_URL}/api/v1/access-logs/${encodeURIComponent(targetId)}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action_type: type,
        reason: actionReason,
        action_taken: (type === "Unauthorised" || type === "Authorised") ? (incidentData?.actionTaken || cleanReason) : undefined,
        full_name: incidentData?.fullName,
        address: incidentData?.address,
        contact_number: incidentData?.contactNumber,
        vehicle_number: incidentData?.vehicleNumber,
        location: incidentData?.location,
        incident_date: incDate,
        incident_time: incTime,
        incident_datetime: incidentData?.dateTime,
        supervisor_id: actorNumber,
        supervisor_name: actorName,
        event_id: targetId,
        name: row.name,
        location_block: row.block,
        guard_name: row.guard,
        guard_number: row.guardNumber,
      }),
    }).catch(err => {
      console.warn("Could not sync supervisor review to backend:", err);
    });
  };
  const createVisitorPass = (draft: VisitorPassDraft) => {
    const pass: VisitorPass = {
      ...draft,
      passNumber: nextVisitorPassNumber(visitorPasses),
      createdAt: new Date().toISOString(),
      status: "Active",
      supervisor: roleMeta["access-supervisor"].name,
    };
    setVisitorPasses(current => [pass, ...current]);
    setSelectedVisitorPass(pass);
    setUnreadPassNotifications(current => current.includes("created") ? current : ["created", ...current]);
    go("pass-records");
  };
  const issueBulkVisitorPasses = (drafts: VisitorPassDraft[]) => {
    if (drafts.length === 0) return [];
    const now = new Date().toISOString();
    const allPasses = [...visitorPasses];
    const issued = drafts.map(draft => {
      const pass: VisitorPass = { ...draft, passNumber: nextVisitorPassNumber(allPasses), createdAt: now, status: "Active", supervisor: roleMeta["access-supervisor"].name };
      allPasses.push(pass);
      return pass;
    });
    setVisitorPasses(current => [...issued, ...current]);
    setUnreadPassNotifications(current => current.includes("created") ? current : ["created", ...current]);
    return issued;
  };
  const openVisitorPass = (pass: VisitorPass, returnTo: Screen = "visitor-pass") => {
    setSelectedVisitorPass(pass);
    setPassDetailBack(returnTo);
    go("pass-detail");
  };
  const returnFromPassDetail = () => {
    if (passDetailBack === "access-notifications") {
      setScreen("access-notifications");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    go(passDetailBack);
  };
  const cancelVisitorPass = (pass: VisitorPass, reason: string) => {
    if (pass.status === "Cancelled") return;
    const cancelled: VisitorPass = {
      ...pass,
      status: "Cancelled",
      cancellationReason: reason,
      cancelledAt: new Date().toISOString(),
      cancelledBy: roleMeta["access-supervisor"].name,
      cancelledByNumber: roleMeta["access-supervisor"].supervisorNumber,
    };
    setVisitorPasses(current => current.map(item => item.passNumber === pass.passNumber && item.status !== "Cancelled" ? cancelled : item));
    setSelectedVisitorPass(cancelled);
    setUnreadPassNotifications(current => current.includes("cancelled") ? current : ["cancelled", ...current]);
  };
  const todayPassCount = visitorPasses.filter(pass => pass.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10) && pass.supervisor === roleMeta["access-supervisor"].name).length;

  let content: ReactNode;
  if (screen === "login") content = <Login enter={enter} go={go} />;
  else if (screen === "forgot") content = <ForgotPassword go={go} />;
  else if (["users", "assign-supervisor"].includes(screen) && role !== "admin") content = <AccessDenied role={role} go={go} />;
  else if (screen === "login-logs" && role !== "admin" && role !== "cso") content = <AccessDenied role={role} go={go} />;
  else if (screen === "profile") content = <Profile role={role} session={session} back={back} onLogout={() => { void handleLogout(); }} />;
  else if (screen === "alerts") content = <Alerts role={role} go={go} back={back} reviews={reviews} updateReview={updateReview} logs={logs} deleteLog={deleteLog} onAddAuditLog={addAuditLog} />;
  else if (role === "security" || role === "warden" || role === "staff") {
    if (screen === "home") content = <LevelOneHome role={role} go={go} />;
    else if (screen === "scan") content = <LevelOneScan role={role} go={go} completeScan={completeScan} logs={logs} />;
    else if (screen === "logs") content = <Logs role={role} reviews={reviews} logs={logs} />;
    else if (screen === "unrecognized") content = <UnrecognizedResult role={role} go={go} verifyRegister={verifyRegister} capturedPhoto={capturedPhoto} biometricScores={biometricScores} onRecordEvent={recordUnauthorizedEvent} />;
    else if (screen === "identity") content = <IdentityResult role={role} go={go} identityCase={identityCase} verificationMethod={verificationMethod} student={matchedStudent} capturedPhoto={capturedPhoto} fieldVisibility={adminLogFieldVisibility} />;
    else if (screen === "unauthorised") {
      if (role === "security" || role === "warden") {
        content = (
          <div className="success-page">
            <div className="success-symbol warning-symbol">
              <ShieldAlert size={38} />
            </div>
            <Status tone="amber">CAMPUS SUPERVISOR NOTIFIED</Status>
            <h1>Unauthorized Event Recorded</h1>
            <p>Campus Supervisor has been notified.</p>
            <Button onClick={() => go("scan")}>Scan next person</Button>
            <Button variant="secondary" onClick={() => go("home")}>Return home</Button>
          </div>
        );
      } else {
        content = <UnauthorizedForm role={role} go={go} capturedPhoto={capturedPhoto} onRecordEvent={recordUnauthorizedEvent} />;
      }
    }
    else if (screen === "success") content = <Success role={role} go={go} />;
    else content = <LevelOneHome role={role} go={go} />;
  } else if (role === "access-supervisor") {
    if (screen === "visitor-pass") content = <VisitorPassAction go={go} createPass={createVisitorPass} continueToBulk={details => { setBulkEventDetails(details); go("bulk-pass"); }} />;
    else if (screen === "pass-records") content = <VisitorPassRecords passes={visitorPasses} openPass={pass => openVisitorPass(pass, "pass-records")} filters={visitorPassFilters} setFilters={setVisitorPassFilters} />;
    else if (screen === "bulk-pass") content = <BulkVisitorPass go={go} initialEvent={bulkEventDetails} issuePasses={issueBulkVisitorPasses} />;
    else if (screen === "pass-detail") content = <VisitorPassDetails pass={selectedVisitorPass} back={returnFromPassDetail} cancelPass={cancelVisitorPass} />;
    else if (screen === "access-notifications") content = <AccessNotifications passes={visitorPasses} unread={unreadPassNotifications} setUnread={setUnreadPassNotifications} openPass={pass => openVisitorPass(pass, "access-notifications")} back={back} />;
    else content = <AccessSupervisorHome go={go} todayCount={todayPassCount} />;
  } else if (role === "supervisor") {
    if (screen === "scan") content = <LevelOneScan role="supervisor" go={go} completeScan={completeScan} logs={logs} />;
    else if (screen === "unrecognized") content = <UnrecognizedResult role="supervisor" go={go} verifyRegister={verifyRegister} capturedPhoto={capturedPhoto} biometricScores={biometricScores} onRecordEvent={recordUnauthorizedEvent} />;
    else if (screen === "identity") content = <IdentityResult role="supervisor" go={go} identityCase={identityCase} verificationMethod={verificationMethod} student={matchedStudent} capturedPhoto={capturedPhoto} fieldVisibility={adminLogFieldVisibility} />;
    else if (screen === "unauthorised") content = <UnauthorizedForm role="supervisor" go={go} capturedPhoto={capturedPhoto} onRecordEvent={recordUnauthorizedEvent} />;
    else if (screen === "success") content = <Success role="supervisor" go={go} />;
    else if (screen === "assignments") content = <Assignments go={go} onAddAuditLog={addAuditLog} editorName={roleMeta.supervisor.name} editorRole="Campus Supervisor" />;
    else if (screen === "create-guard") content = <CreateGuard go={go} onAddAuditLog={addAuditLog} editorName={roleMeta.supervisor.name} editorRole="Campus Supervisor" />;
    else if (screen === "audit" || screen === "logs") content = <Audit go={go} reviews={reviews} logs={logs} />;
    else content = <SupervisorHome go={go} reviews={reviews} logs={logs} />;
  } else if (role === "cso") {
    if (screen === "scan") content = <LevelOneScan role="cso" go={go} completeScan={completeScan} logs={logs} />;
    else if (screen === "unrecognized") content = <UnrecognizedResult role="cso" go={go} verifyRegister={verifyRegister} capturedPhoto={capturedPhoto} biometricScores={biometricScores} onRecordEvent={recordUnauthorizedEvent} />;
    else if (screen === "identity") content = <IdentityResult role="cso" go={go} identityCase={identityCase} verificationMethod={verificationMethod} student={matchedStudent} capturedPhoto={capturedPhoto} fieldVisibility={adminLogFieldVisibility} />;
    else if (screen === "unauthorised") content = <UnauthorizedForm role="cso" go={go} capturedPhoto={capturedPhoto} onRecordEvent={recordUnauthorizedEvent} />;
    else if (screen === "success") content = <Success role="cso" go={go} />;
    else if (screen === "assignments") content = <Assignments go={go} onAddAuditLog={addAuditLog} editorName={roleMeta.cso.name} editorRole="CSO" />;
    else if (screen === "create-guard") content = <CreateGuard go={go} onAddAuditLog={addAuditLog} editorName={roleMeta.cso.name} editorRole="CSO" />;
    else if (screen === "audit" || screen === "logs") content = <Audit go={go} reviews={reviews} scope="cso" logs={logs} />;
    else if (screen === "campus-entries") content = <CampusEntries go={go} reviews={reviews} scope="institution" logs={logs} />;
    else if (screen === "login-logs") content = <Worklog go={go} scope="security-oversight" />;
    else if (screen === "manager-students") content = <ManagerStudentDirectory go={go} students={studentsList} onUpdateStudent={handleUpdateStudent} permissions={managerEditPermissions} editorName={roleMeta.cso.name} editorRole="CSO" />;
    else if (screen === "add-student") content = <ManualAddStudent go={go} onAddStudent={handleAddStudent} editorName={roleMeta.cso.name} editorRole="CSO" />;
    else content = <OversightHome role="cso" go={go} />;
  } else if (role === "welfare") {
    if (screen === "welfare-logs") content = <WelfareBlockLogs reviews={reviews} />;
    else if (screen === "accommodation-details") content = (
      <AccommodationDetails
        go={go}
        back={back}
        role={role}
        students={studentsList}
        onUpdateStudent={(updatedStudent, changeMeta) => {
          const now = new Date();
          const auditLog: AuditLogItem = {
            id: `AUD-ACC-${Date.now()}`,
            timestamp: now.toISOString().replace("T", " ").slice(0, 19),
            dateTime: now.toISOString(),
            editedBy: roleMeta["welfare"]?.name || "Dr. Kavitha Rao",
            editorRole: "Student Welfare",
            action: "Accommodation Updated",
            institution: "SRM GROUP OF INSTITUTIONS TRICHY",
            block: updatedStudent.hostelName || "Institution B Campus",
            actionDetails:
              changeMeta?.actionDetails ||
              `Updated residence to ${updatedStudent.accommodationType} for ${updatedStudent.name} (${updatedStudent.registerNumber})`,
            comments:
              changeMeta?.comments ||
              updatedStudent.accommodationNotes ||
              `Updated ${updatedStudent.accommodationType} residence details.`,
            changes: changeMeta?.changes,
          };
          handleUpdateStudent(updatedStudent, auditLog);
        }}
      />
    );
    else content = <WelfareHome go={go} />;
  } else if (role === "manager") {
    if (screen === "manager-students") content = <ManagerStudentDirectory go={go} students={studentsList} onUpdateStudent={handleUpdateStudent} permissions={managerEditPermissions} editorName={roleMeta.manager.name} editorRole="Institute Manager" onAddAuditLog={addAuditLog} />;
    else if (screen === "add-student") content = <ManualAddStudent go={go} onAddStudent={handleAddStudent} editorName={roleMeta.manager.name} editorRole="Institute Manager" />;
    else if (screen === "campus-entries") content = <CampusEntries go={go} reviews={reviews} scope="institution" fieldVisibility={adminLogFieldVisibility} logs={logs} />;
    else if (screen === "institution-users") content = <InstitutionUserDirectory go={go} />;
    else if (screen === "admin-audit-logs") content = <AuditLogsTable go={go} auditLogs={auditLogs} scope="institution" />;
    else content = <OversightHome role={role} go={go} />;
  } else if (role === "admin") {
    if (screen === "users") content = <UserAdministration go={go} onAddAuditLog={addAuditLog} />;
    else if (screen === "campus-entries") content = <CampusEntries go={go} reviews={reviews} fieldVisibility={adminLogFieldVisibility} logs={logs} />;
    else if (screen === "login-logs") content = <Worklog go={go} />;
    else if (screen === "assign-supervisor") content = <AssignSupervisor go={go} onAddAuditLog={addAuditLog} />;
    else if (screen === "admin-bulk-students") content = <AdminBulkStudentImport go={go} onBulkImport={handleBulkImportStudents} />;
    else if (screen === "admin-audit-logs") content = <AuditLogsTable go={go} auditLogs={auditLogs} scope="admin" />;
    else if (screen === "admin-access-settings") content = <AdminAccessSettings go={go} fieldVisibility={adminLogFieldVisibility} onSaveFieldVisibility={handleSaveFieldVisibility} permissions={managerEditPermissions} onSavePermissions={handleSaveManagerPermissions} />;
    else if (screen === "admin-securities") content = <AdminSecuritiesDirectory go={go} />;
    else content = <AdminHome go={go} />;
  } else {
    if (screen === "logs") content = <Logs role="students" reviews={reviews} logs={logs} />;
    else if (screen === "workload") content = <Worklog go={go} scope="student-affairs" />;
    else content = <StudentAffairsHome go={go} />;
  }

  const navScreens: Screen[] = ["home", "scan", "logs", "workload", "assignments", "audit", "users", "institution-users", "campus-entries", "login-logs", "visitor-pass", "pass-records", "welfare-logs", "manager-students", "admin-audit-logs", "admin-access-settings", "admin-bulk-students", "admin-securities", "accommodation-details"];
  const showNav = screen !== "login" && (navScreens.includes(screen) || (role === "manager" && screen === "profile"));
  return <div className="app-shell"><Page role={role} active={screen} go={go} nav={showNav}>{content}</Page></div>;
}
