import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import * as XLSX from "xlsx";
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
  Shield,
  ShieldAlert,
  ShieldCheck,
  TicketCheck,
  Trash2,
  Upload,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  X,
  ScanLine,
} from "lucide-react";

type Role = "security" | "warden" | "staff" | "supervisor" | "access-supervisor" | "students" | "welfare" | "admin" | "cso" | "manager";
type ReviewStatus = "Pending Verification" | "Verified" | "Unauthorised" | "Revoked";
type ReviewAction = {
  type: "Verified" | "Unauthorised" | "Revoked";
  actor: string;
  actorNumber: string;
  timestamp: string;
  reason?: string;
};
type ReviewRecord = {
  status: ReviewStatus;
  actions: ReviewAction[];
};
type Screen =
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
  | "welfare-logs";

type IdentityCase = "student" | "staff";
type VerificationMethod = "face" | "register";
type StudentMatch = {
  initials: string;
  name: string;
  registerNumber: string;
  dateOfBirth: string;
  department: string;
  year: string;
  batch: string;
  institute: string;
  similarity: number;
  accommodationType: "Hosteller" | "Day Scholar";
  hostelName?: string;
  roomNumber?: string;
  transportationType?: "College Bus" | "Own Vehicle";
  boardingPoint?: string;
  routeNumber?: string;
};

const roleMeta: Record<Role, { label: string; name: string; initials: string; scope: string; guardNumber?: string; supervisorNumber?: string; phoneNumber?: string }> = {
  security: { label: "Security", name: "Arun Kumar", initials: "AK", scope: "Main Gate · Institution B", guardNumber: "GRD-B-0017", phoneNumber: "+91 98765 43210" },
  warden: { label: "Hostel Warden", name: "Lakshmi Iyer", initials: "LI", scope: "Bharathi Hostel · Institution B", phoneNumber: "+91 98765 40518" },
  staff: { label: "Staff", name: "Vijay Nair", initials: "VN", scope: "Block A · Institution B", phoneNumber: "+91 98765 40624" },
  supervisor: { label: "Campus Supervisor", name: "Meera Nair", initials: "MN", scope: "Institution B Campus", supervisorNumber: "SUP-B-0004", phoneNumber: "+91 98765 40128" },
  "access-supervisor": { label: "Access Supervisor", name: "Arun Sharma", initials: "AS", scope: "Main Gate · College Campus", supervisorNumber: "ACS-B-0012", phoneNumber: "+91 98765 40812" },
  students: { label: "Student Affairs", name: "Daniel Thomas", initials: "DT", scope: "Institution B · Students", phoneNumber: "+91 98765 40216" },
  welfare: { label: "Student Welfare", name: "Dr. Kavitha Rao", initials: "KR", scope: "Institution B · Blockwise student logs", phoneNumber: "+91 98765 40733" },
  admin: { label: "Admin", name: "Avery Williams", initials: "AW", scope: "All campus institutions" },
  cso: { label: "Chief Security Officer", name: "Rohan Mehta", initials: "RM", scope: "Institution B", supervisorNumber: "CSO-0001", phoneNumber: "+91 98765 40377" },
  manager: { label: "Institute Manager", name: "Priya Raman", initials: "PR", scope: "Institution B · Assigned institution", phoneNumber: "+91 98765 40455" },
};

const roleIcons: Record<Role, ReactNode> = {
  security: <ShieldCheck size={21} />,
  warden: <Building2 size={21} />,
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
  { initials: "AK", name: "Ananya Krishnan", registerNumber: "23ECE0721", dateOfBirth: "14 August 2005", department: "Electronics & Communication", year: "II", batch: "2023–2027", institute: "Institution B", similarity: 86, accommodationType: "Hosteller", hostelName: "Bharathi Hostel", roomNumber: "B-214" },
  { initials: "NP", name: "Nithya Prakash", registerNumber: "23ECE0698", dateOfBirth: "02 November 2005", department: "Electronics & Communication", year: "II", batch: "2023–2027", institute: "Institution B", similarity: 74, accommodationType: "Day Scholar", transportationType: "College Bus", boardingPoint: "Central Bus Stand", routeNumber: "B-12" },
  { initials: "SM", name: "Sneha Menon", registerNumber: "22CSE1142", dateOfBirth: "27 March 2004", department: "Computer Science", year: "III", batch: "2022–2026", institute: "Institution A", similarity: 63, accommodationType: "Hosteller", hostelName: "Jasmine Women's Hostel", roomNumber: "A-108" },
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
  variant?: "primary" | "secondary" | "danger" | "warning" | "quiet";
  icon?: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return <button type={type} className={`btn btn-${variant}`} onClick={onClick} disabled={disabled}>{icon}{children}</button>;
}

function Status({ tone, children }: { tone: "green" | "blue" | "amber" | "red" | "gray"; children: ReactNode }) {
  return <span className={`status status-${tone}`}><i />{children}</span>;
}

function TopBar({ title, subtitle, back, action, collegeBrand = false }: { title: string; subtitle?: string; back?: () => void; action?: ReactNode; collegeBrand?: boolean }) {
  return <header className={`top-bar ${collegeBrand ? "college-brand-bar" : ""}`}>
    {back ? <button className="icon-btn" onClick={back} aria-label="Back"><ArrowLeft size={20} /></button> : collegeBrand ? <div className="college-logo"><img src="/srm-trichy-logo.png" alt="SRM Trichy emblem" /></div> : <div className="app-mark"><Shield size={20} /></div>}
    <div className="top-copy"><strong>{title}</strong>{subtitle && <span>{subtitle}</span>}</div>
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
      { screen: "home", label: "Overview", icon: <Building2 size={20} /> },
      { screen: "scan", label: "Identify", icon: <ScanFace size={20} /> },
      { screen: "logs", label: "Logs", icon: <FileClock size={20} /> },
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
      { screen: "users", label: "Users", icon: <UserCog size={20} /> },
      { screen: "campus-entries", label: "Records", icon: <DoorOpen size={20} /> },
      { screen: "login-logs", label: "Worklog", icon: <FileClock size={20} /> },
    ],
    cso: [
      { screen: "home", label: "Overview", icon: <Shield size={20} /> },
      { screen: "campus-entries", label: "Entries", icon: <DoorOpen size={20} /> },
      { screen: "login-logs", label: "Worklog", icon: <UserCog size={20} /> },
      { screen: "alerts", label: "Alerts", icon: <Bell size={20} /> },
    ],
    manager: [
      { screen: "home", label: "Overview", icon: <Building2 size={20} /> },
      { screen: "campus-entries", label: "Records", icon: <FileClock size={20} /> },
      { screen: "institution-users", label: "Users", icon: <Users size={20} /> },
      { screen: "profile", label: "Profile", icon: <CircleUserRound size={20} /> },
    ],
  };
  return <nav className={`bottom-nav ${menus[role].length === 3 ? "three-items" : menus[role].length === 2 ? "two-items" : ""}`}>{menus[role].map(item => <button key={item.label} className={active === item.screen ? "active" : ""} onClick={() => go(item.screen)}>{item.icon}<span>{item.label}</span>{item.screen === "alerts" && <b>3</b>}</button>)}</nav>;
}

function Page({ children, nav, role, active, go }: { children: ReactNode; nav?: boolean; role: Role; active: Screen; go: (screen: Screen) => void }) {
  return <main className={`phone-page ${nav ? "with-nav" : ""}`}>{children}{nav && <BottomNav role={role} active={active} go={go} />}</main>;
}

function Login({ enter, go }: { enter: (role: Role) => void; go: (screen: Screen) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const credentials: Record<string, Role> = {
    security: "security",
    warden: "warden",
    "hostel warden": "warden",
    staff: "staff",
    "campus supervisor": "supervisor",
    "access supervisor": "access-supervisor",
    access: "access-supervisor",
    "student affair": "students",
    "student affairs": "students",
    welfare: "welfare",
    "student welfare": "welfare",
    admin: "admin",
    cso: "cso",
    manager: "manager",
    "institute manager": "manager",
  };
  const signIn = () => {
    if (!username.trim() || !password) {
      setError(!username.trim() ? "Username is required." : "Password is required.");
      return;
    }
    const matchedRole = credentials[username.trim().toLowerCase()];
    if (!matchedRole || password !== "12345") {
      setError("Incorrect username or password. Please try again.");
      return;
    }
    setError("");
    enter(matchedRole);
  };
  return <main className="phone-page login-page">
    <section className="login-brand"><div className="large-mark"><ShieldCheck size={32} /></div><div><h1>Campus Secure</h1><p>Identity-led campus access</p></div></section>
    <section className="login-card">
      <span className="overline">OFFICIAL ACCESS</span><h2>Sign in</h2>
      <label className="field"><span>Username</span><input value={username} onChange={event => setUsername(event.target.value)} placeholder="Enter username" autoCapitalize="none" /></label>
      <label className="field"><span>Password</span><div className="password-input"><input type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter password" /><button onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}><Eye size={17} /></button></div></label>
      <button className="text-action forgot-link" onClick={() => go("forgot")}>Forgot password?</button>
      {error && <div className="login-error"><AlertTriangle size={14} />{error}</div>}
      <Button onClick={signIn}>Sign in securely<ChevronRight size={17} /></Button>
    </section>
  </main>;
}

function LevelOneHome({ role, go }: { role: "security" | "warden" | "staff"; go: (screen: Screen) => void }) {
  const isSecurity = role === "security";
  const isWarden = role === "warden";
  const portalTitle = isSecurity ? "Security Portal" : isWarden ? "Hostel Warden Portal" : "Staff Portal";
  const heading = isWarden ? "Verify a resident" : "Verify a person";
  const actionTitle = isWarden ? "Identify resident" : "Scan person";
  const actionCopy = isWarden ? "" : isSecurity ? "Capture face and verify campus identity" : "Identify a person for your assigned duty";
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

function LevelOneScan({ go, completeScan, role }: { go: (screen: Screen) => void; completeScan: () => void; role: "security" | "warden" | "staff" }) {
  const [scanning, setScanning] = useState(false);
  const location = role === "warden" ? "Bharathi Hostel · Institution B" : role === "staff" ? "Block A · Institution B" : "Main Gate · Institution B";
  const scan = () => {
    setScanning(true);
    window.setTimeout(completeScan, 900);
  };
  return <>
    <TopBar title={role === "warden" ? "Resident verification" : "Face verification"} subtitle={location} back={() => go("home")} />
    <div className="camera-view">
      <div className="camera-noise" /><div className={`face-guide ${scanning ? "scanning" : ""}`}><i /><i /><i /><i /><ScanFace size={64} /></div>
      <div className="scan-message"><strong>{scanning ? "Verifying campus identity…" : "Position face inside the frame"}</strong>{scanning && <span>Please keep the device steady</span>}</div>
      <Status tone={scanning ? "blue" : "green"}>{scanning ? "Scanning" : "Camera ready"}</Status>
    </div>
    <div className="scan-panel"><span className="overline">FACE SCAN</span>
      <Button onClick={scanning ? undefined : scan} icon={<ScanFace size={18} />}>{scanning ? "Scanning…" : "Scan face"}</Button>    </div>
  </>;
}

function IdentityResult({ go, identityCase, verificationMethod, student, role }: { go: (screen: Screen) => void; identityCase: IdentityCase; verificationMethod: VerificationMethod; student: StudentMatch; role: "security" | "warden" | "staff" }) {
  const staff = identityCase === "staff";
  const registerVerified = verificationMethod === "register";
  const staffMember = {
    name: "Pranav Sharma",
    employeeId: "EMP-B-1042",
    designation: "Professor",
    department: "Mechanical Engineering",
    institute: "Institution B",
  };
  const personName = staff ? staffMember.name : student.name;
  const institute = staff ? staffMember.institute : student.institute;
  const location = role === "warden" ? "Bharathi Hostel" : role === "staff" ? "Block A" : "Main Gate";
  return <>
    <TopBar title="Identity verified" subtitle="Review before confirming" back={() => go(registerVerified ? "unrecognized" : "scan")} />
    <div className="page-content">
      <div className="progress-line"><span className="done"><Check size={12} /></span><i className="done" /><span className="active">2</span><i /><span>3</span></div>
      <section className="identity-hero"><div className={`captured-photo ${staff ? "staff-photo" : ""}`}><CircleUserRound size={48} /><span>Captured at 10:42 AM</span></div><div className="verified-badge"><ShieldCheck size={14} />{registerVerified ? "Register number verified" : `${student.similarity}% face match`}</div><h1>{personName}</h1><p>{staff ? "Staff" : "Student"} · {institute}</p></section>
      <section className="info-card"><div className="card-kicker"><IdCard size={15} />IDENTITY DETAILS</div>{staff ? <dl><div><dt>Name</dt><dd>{staffMember.name}</dd></div><div><dt>Employee ID</dt><dd>{staffMember.employeeId}</dd></div><div><dt>Designation</dt><dd>{staffMember.designation}</dd></div><div><dt>Department</dt><dd>{staffMember.department}</dd></div><div><dt>Institute</dt><dd>{staffMember.institute}</dd></div></dl> : <dl><div><dt>Name</dt><dd>{student.name}</dd></div><div><dt>Register Number</dt><dd>{student.registerNumber}</dd></div><div><dt>Date of Birth</dt><dd>{student.dateOfBirth}</dd></div><div><dt>Department</dt><dd>{student.department}</dd></div><div><dt>Year</dt><dd>{student.year}</dd></div><div><dt>Batch</dt><dd>{student.batch}</dd></div><div><dt>Accommodation Type</dt><dd>{student.accommodationType}</dd></div>{student.accommodationType === "Hosteller" && <><div><dt>Hostel Name</dt><dd>{student.hostelName}</dd></div><div><dt>Room Number</dt><dd>{student.roomNumber}</dd></div></>}{student.accommodationType === "Day Scholar" && <><div><dt>Transportation Type</dt><dd>{student.transportationType}</dd></div><div><dt>Boarding Point</dt><dd>{student.boardingPoint ?? "null"}</dd></div><div><dt>Route Number</dt><dd>{student.routeNumber ?? "null"}</dd></div></>}</dl>}</section>
      <section className="access-card allowed"><div><ShieldCheck size={21} /></div><div><span>{role === "warden" ? "RESIDENT IDENTITY" : "CAMPUS IDENTITY"}</span><strong>Internal person recognized</strong><p>Confirm to record entry at {location}.</p></div></section>
      <Button onClick={() => go("success")} icon={<Check size={17} />}>Confirm entry into {location}</Button>
    </div>
  </>;
}

function UnrecognizedResult({ go, verifyRegister, role }: { go: (screen: Screen) => void; verifyRegister: (registerNumber: string) => boolean; role: "security" | "warden" | "staff" }) {
  const [registerNumber, setRegisterNumber] = useState("");
  const [notVerified, setNotVerified] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const visibleMatches = role === "warden"
    ? studentMatches.filter(match => match.institute === "Institution B" && match.hostelName === "Bharathi Hostel")
    : studentMatches;
  const verify = () => {
    if (verifyRegister(registerNumber)) {
      return;
    }
    setNotVerified(true);
  };
  return <>
    <TopBar title="Face not recognized" subtitle="Verify with register number" back={() => go("scan")} />
    <div className="page-content"><div className="unrecognized-hero"><div className="captured-photo unknown-capture"><CircleUserRound size={46} /><span>Captured at {role === "warden" ? "Bharathi Hostel" : "Main Gate"}</span></div><Status tone="amber">FACE NOT RECOGNIZED</Status><h1>Verify campus identity</h1></div>
      <section className="similar-matches">
        <div className="similar-matches-head"><div><span>POSSIBLE MATCHES</span><h2>Similar campus identities</h2></div><small>Above 60% similarity</small></div>
        <div className="similar-match-list">{visibleMatches.map(match => {
          const selected = selectedMatch === match.registerNumber;
          return <article key={match.registerNumber} className={selected ? "selected" : ""}>
            <button className="similar-match-summary" onClick={() => setSelectedMatch(selected ? null : match.registerNumber)} aria-expanded={selected}>
              <span className="person-avatar">{match.initials}</span>
              <span className="similar-match-person"><strong>{match.name}</strong><small>{match.registerNumber} · {match.institute}</small></span>
              <span className="similarity-score">{match.similarity}% match</span>
              <ChevronRight className={selected ? "expanded" : ""} size={16} />
            </button>
            {selected && <div className="similar-match-details">
              <dl><div><dt>Name</dt><dd>{match.name}</dd></div><div><dt>Register Number</dt><dd>{match.registerNumber}</dd></div><div><dt>Date of Birth</dt><dd>{match.dateOfBirth}</dd></div><div><dt>Department</dt><dd>{match.department}</dd></div><div><dt>Year</dt><dd>{match.year}</dd></div></dl>
              <Button variant="secondary" icon={<IdCard size={16} />} onClick={() => { setRegisterNumber(match.registerNumber); setNotVerified(false); }}>Use this register number</Button>
            </div>}
          </article>;
        })}</div>
      </section>
      <form className="register-verify-card" onSubmit={(event) => { event.preventDefault(); verify(); }}>
        <label className="field"><span>Register number</span><input value={registerNumber} onChange={(event) => { setRegisterNumber(event.target.value); setNotVerified(false); }} placeholder="e.g. 23ECE0721" autoCapitalize="characters" /></label>
        <Button type="submit" icon={<IdCard size={17} />}>Verify register number</Button>
      </form>
      {notVerified && <section className="unverified-card"><div><ShieldAlert size={21} /></div><div><span>UNAUTHORIZED PERSON</span><strong>Register number not verified</strong><p>No active campus identity was found. Do not permit entry.</p></div></section>}
      <div className="unauthorized-action"><p>Can&apos;t verify this person?</p><Button variant="danger" onClick={() => go("unauthorised")} icon={<ShieldAlert size={17} />}>Mark as unauthorized</Button></div>
    </div>
  </>;
}

function Field({ label, placeholder, value, type = "text", children }: { label: string; placeholder?: string; value?: string; type?: string; children?: ReactNode }) {
  return <label className="field"><span>{label}</span>{children || <input type={type} placeholder={placeholder} defaultValue={value} />}</label>;
}

function UnauthorizedForm({ go, role }: { go: (screen: Screen) => void; role: "security" | "warden" | "staff" }) {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) return <div className="success-page"><div className="success-symbol warning-symbol"><ShieldAlert size={38} /></div><Status tone="amber">CAMPUS SUPERVISOR NOTIFIED</Status><h1>Unauthorized event recorded</h1><p>The captured image, location, time, attempted register number, and officer notes were sent to the Campus Supervisor.</p><Button onClick={() => go("scan")}>Scan next person</Button><Button variant="secondary" onClick={() => go("home")}>Return home</Button></div>;
  return <>
    <TopBar title="Unauthorized person" subtitle="Record security event" back={() => go("unrecognized")} />
    <div className="page-content form-page">
      <Status tone="amber">SUPERVISOR WILL BE NOTIFIED</Status>
      <div className="form-intro"><h1>Record event details</h1><p>Review the captured event before notifying the Campus Supervisor.</p></div>
      <div className="form-stack">
        <Field label="Full name" placeholder="Enter name if available" />
        <Field label={role === "warden" ? "Warden notes" : role === "staff" ? "Staff notes" : "Security notes"} placeholder="Optional operational notes" />
      </div>
      <Button onClick={() => setSubmitted(true)} icon={<ShieldAlert size={17} />}>Record & notify Campus Supervisor</Button>
    </div>
  </>;
}

function Success({ go, role }: { go: (screen: Screen) => void; role: "security" | "warden" | "staff" }) {
  const location = role === "warden" ? "Bharathi Hostel" : role === "staff" ? "Block A" : "Main Gate";
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
    <TopBar title="Trichy SRM Medical College Hospital & Research Centre" subtitle="Access Supervisor Portal" collegeBrand />
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
  const collegeLogo = await assetDataUrl("/srm-trichy-logo.png");

  pdf.setFillColor(21, 60, 114);
  pdf.rect(0, 0, pageWidth, 33, "F");
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(14, 4, 24, 25, 2, 2, "F");
  pdf.addImage(collegeLogo, "PNG", 16, 5, 20, 22);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("TRICHY SRM MEDICAL COLLEGE", 44, 11);
  pdf.setFontSize(9);
  pdf.text("HOSPITAL & RESEARCH CENTRE", 44, 17);
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
  pdf.save(`visitor-pass-${safeName || pass.passNumber.toLowerCase()}-${pass.passNumber}.pdf`);
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
  const sheet = XLSX.utils.aoa_to_sheet([bulkTemplateColumns, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "student-list");
  XLSX.writeFile(workbook, "CampusSecure_Student_Entry_Template.xlsx");
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
          {!file ? <><div className="bulk-section-icon"><Upload size={24} /></div><h2>Upload Excel</h2><p>Upload the completed Excel file containing student names, student numbers, and optional photo paths.</p><button className="bulk-browse-button" onClick={() => fileInput.current?.click()}><Upload size={15} />Upload Excel</button><small>Drag and drop or browse · .xlsx only · Maximum {bulkUploadMaxBytes / 1024 / 1024} MB</small></> : <div className="bulk-selected-file"><div><FileSpreadsheet size={23} /></div><span><strong>{file.name}</strong><small>{fileSize} · {progress}</small></span><Status tone={progress === "Import Failed" ? "red" : progress === "Import Complete" ? "green" : "blue"}>{progress}</Status></div>}
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
      <section className="info-card pass-information"><div className="card-kicker"><TicketCheck size={15} />PASS INFORMATION</div><dl>
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
  hostName?: string;
  visitPurpose?: string;
  exitTime?: string;
  vehicleNumber?: string;
  guard: string;
  guardNumber: string;
  guardNotes?: string;
  entries?: number;
  decision: "Authorised" | "Denied" | "Pending review";
};

const logRows: LogRecord[] = [
  { initials: "AK", name: "Ananya Krishnan", id: "23ECE0721", institution: "Institution B", department: "Electronics", block: "Main Gate", time: "10:42", dateTime: "2025-06-16T10:42", event: "Entry", tone: "green", personType: "Student", category: "Internal · Institution B", accessCategory: "Authorized", year: "Year II", batch: "2023–2027", residence: "Hosteller", hostel: "Bharathi Hostel", room: "B-214", logId: "ENT-•••-4082", guard: "Arun Kumar", guardNumber: "GRD-B-0017", decision: "Authorised" },
  { initials: "AK", name: "Ananya Krishnan", id: "23ECE0721", institution: "Institution B", department: "Electronics", block: "Bharathi Hostel", time: "10:18", dateTime: "2025-06-16T10:18", event: "Entry", tone: "green", personType: "Student", category: "Hostel resident", accessCategory: "Authorized", year: "Year II", batch: "2023–2027", residence: "Hosteller", hostel: "Bharathi Hostel", room: "B-214", logId: "HST-•••-3018", guard: "Lakshmi Iyer", guardNumber: "WRD-B-0011", decision: "Authorised" },
  { initials: "ST", name: "Sneha Thomas", id: "22MEC0617", institution: "Institution B", department: "Mechanical", block: "Bharathi Hostel", time: "09:46", dateTime: "2025-06-16T09:46", event: "Exit", tone: "gray", personType: "Student", category: "Hostel resident", accessCategory: "Authorized", year: "Year III", residence: "Hosteller", hostel: "Bharathi Hostel", room: "C-108", logId: "HST-•••-3012", guard: "Lakshmi Iyer", guardNumber: "WRD-B-0011", decision: "Authorised" },
  { initials: "UP", name: "Unrecognized person", id: "Not available", institution: "Not identified", department: "Not available", block: "Bharathi Hostel", time: "09:21", dateTime: "2025-06-16T09:21", event: "Denied", tone: "red", personType: "Unauthorised", category: "Unrecognized hostel entry", accessCategory: "Unauthorized", residence: "Hosteller", hostel: "Bharathi Hostel", logId: "HST-DEN-•••-3009", guard: "Lakshmi Iyer", guardNumber: "WRD-B-0011", guardNotes: "Unrecognized person attempted to enter Bharathi Hostel.", entries: 1, decision: "Denied" },
  { initials: "RM", name: "Rahul Menon", id: "22CSE1048", institution: "Institution A", department: "Computer Science", block: "Main Gate", time: "10:28", dateTime: "2025-06-16T10:28", event: "Entry", tone: "green", personType: "Student", category: "Internal · Other institution", accessCategory: "Authorized", year: "Year III", residence: "Day scholar", transport: "College Bus", pickup: "Central Railway Station", visitPurpose: "Meeting a campus host", logId: "ENT-•••-4071", guard: "Arun Kumar", guardNumber: "GRD-B-0017", decision: "Authorised" },
  { initials: "DV", name: "Deepa Varma", id: "VIS-2048", institution: "Greenfield College", department: "Architecture", block: "Main Gate", time: "10:06", dateTime: "2025-06-16T10:06", event: "Visitor", tone: "amber", personType: "External", category: "External", accessCategory: "Visitors", logId: "VIS-•••-2048", guard: "Arun Kumar", guardNumber: "GRD-B-0017", decision: "Authorised" },
  { initials: "SK", name: "Sanjay Kumar", id: "EMP-B-1084", institution: "Institution B", department: "Mechanical", block: "Block A", time: "09:51", dateTime: "2025-06-16T09:51", event: "Exit", tone: "gray", personType: "Staff", category: "Internal · Institution B", accessCategory: "Authorized", designation: "Professor", logId: "EXT-•••-4062", guard: "Kavya Rao", guardNumber: "GRD-B-0031", decision: "Authorised" },
  { initials: "NB", name: "Nila Bose", id: "EMP-C-0912", institution: "Institution C", department: "Administration", block: "Library Block", time: "09:32", dateTime: "2025-06-16T09:32", event: "Entry", tone: "green", personType: "Staff", category: "Internal · Other institution", accessCategory: "Authorized", designation: "Administrator", logId: "ENT-•••-4055", guard: "Imran Ali", guardNumber: "GRD-B-0044", decision: "Authorised" },
  { initials: "MJ", name: "Mohit Jain", id: "21MEC0184", institution: "Institution B", department: "Mechanical", block: "Block B", time: "09:14", dateTime: "2025-06-16T09:14", event: "Entry", tone: "green", personType: "Student", category: "Internal · Institution B", accessCategory: "Authorized", year: "Year IV", residence: "Day scholar", transport: "Own Vehicle", logId: "ENT-•••-4048", guard: "Joseph Mathew", guardNumber: "GRD-B-0038", decision: "Authorised" },
  { initials: "RG", name: "Unrecognized person", id: "Not available", institution: "Not identified", department: "Not available", block: "Main Gate", time: "08:48", dateTime: "2025-06-16T08:48", event: "Denied", tone: "red", personType: "Unauthorised", category: "Unauthorised visitor", accessCategory: "Unauthorized", logId: "DEN-•••-4039", guard: "Arun Kumar", guardNumber: "GRD-B-0017", guardNotes: "Identity could not be verified at the Main Gate.", entries: 1, decision: "Denied" },
];

const assignedGuardNumbers = new Set(["GRD-B-0017", "GRD-B-0031", "GRD-B-0038", "GRD-B-0044", "GRD-B-0052"]);
const recordKey = (row: LogRecord) => row.logId ?? `${row.name}-${row.dateTime}`;
const reviewFor = (reviews: Record<string, ReviewRecord>, row: LogRecord): ReviewRecord =>
  reviews[recordKey(row)] ?? { status: "Pending Verification", actions: [] };
const reviewTone = (status: ReviewStatus) => status === "Verified" || status === "Revoked" ? "green" : status === "Unauthorised" ? "red" : "amber";
const recordCategory = (reviews: Record<string, ReviewRecord>, row: LogRecord) =>
  reviewFor(reviews, row).status === "Revoked" ? "Revoked" : row.accessCategory;
const latestRevocation = (reviews: Record<string, ReviewRecord>, row: LogRecord) =>
  [...reviewFor(reviews, row).actions].reverse().find(action => action.type === "Revoked");

const missingValues = ["", "not available", "not identified", "unknown", "n/a", "null", "undefined", "—", "-"];
const logValue = (value?: string | null) => (value && !missingValues.includes(value.trim().toLowerCase()) ? value : "-");
const accommodationOf = (row: LogRecord) => (row.residence === "Day scholar" ? "Day Scholar" : row.residence);

function AuditTable({ rows, reviews, title = "AUDIT LOG", hideCommonInfo = false, plainNames = false }: { rows: LogRecord[]; reviews: Record<string, ReviewRecord>; title?: string; hideCommonInfo?: boolean; plainNames?: boolean }) {
  const [selected, setSelected] = useState<LogRecord | null>(null);
  const personCategory = selected?.personType === "Student" ? "Student" : selected?.personType === "Staff" ? "Staff" : selected?.personType === "Unauthorised" ? "Unauthorized person" : "Visitor";
  const authorizationStatus = selected?.decision === "Authorised" ? "Authorized" : selected?.decision;
  const knownInstitution = selected && !["Not identified", "Not available"].includes(selected.institution);
  const recordedBy = selected ? `${selected.guard} · ${selected.guardNumber}` : "";
  const review = selected ? reviewFor(reviews, selected) : null;
  const revocation = selected ? latestRevocation(reviews, selected) : undefined;
  const isRevoked = review?.status === "Revoked";
  return <>{title && <div className="list-label">{rows.length} RECORDS · {title}</div>}<div className="audit-table-wrap"><table className="audit-table"><thead><tr><th>S.No</th><th>Name</th><th>Reg No</th><th>Dept</th><th>Institute</th><th>Year</th><th>Category</th><th>Accommodation</th></tr></thead><tbody>{rows.map((row, index) => { const rowReview = reviewFor(reviews, row); const category = recordCategory(reviews, row); return <tr key={`${row.name}${row.time}`} onClick={() => setSelected(row)}><td>{index + 1}</td><td><strong>{logValue(row.name)}</strong>{!plainNames && <div className="record-badges"><Status tone={row.tone}>{row.event}</Status><Status tone={category === "Authorized" || category === "Revoked" ? "green" : category === "Visitors" ? "amber" : "red"}>{category}</Status><Status tone={reviewTone(rowReview.status)}>{rowReview.status}</Status></div>}</td><td>{logValue(row.id)}</td><td>{logValue(row.department)}</td><td>{logValue(row.institution)}</td><td>{logValue(row.year?.replace("Year ", ""))}</td><td>{category}</td><td>{logValue(accommodationOf(row))}</td></tr>; })}</tbody></table></div>{selected && <section className="audit-profile log-details-panel"><div className="audit-profile-head"><div className="captured-photo small-capture"><CircleUserRound size={38} /><span>{isRevoked ? "Entry capture" : `Entry capture · ${selected.time}`}</span></div><div><span>{personCategory.toUpperCase()} LOG DETAILS</span><h2>{selected.name}</h2>{!isRevoked && <p>{logValue(selected.id)} · {logValue(selected.institution)}</p>}</div><button onClick={() => setSelected(null)} aria-label="Close log details"><X size={18} /></button></div>
    {isRevoked && <><div className="audit-detail-section"><div className="audit-detail-title">VISIT DETAILS</div><dl><div><dt>Reason to visit</dt><dd>{selected.visitPurpose ?? selected.guardNotes ?? "Not recorded"}</dd></div>{selected.hostName && <div><dt>Person to meet</dt><dd>{selected.hostName}</dd></div>}</dl></div><div className="audit-detail-section revocation-details revoked-priority"><div className="audit-detail-title">REVOCATION DETAILS</div><dl><div><dt>Reason for revocation by supervisor</dt><dd>{revocation?.reason ?? "Not recorded"}</dd></div></dl></div></>}
    {!isRevoked && <div className="audit-detail-section"><div className="audit-detail-title">{personCategory.toUpperCase()} DETAILS</div>
      <dl><div><dt>S.No</dt><dd>{rows.indexOf(selected) + 1}</dd></div>{!isRevoked && <div><dt>Name</dt><dd>{logValue(selected.name)}</dd></div>}{selected.id && logValue(selected.id) !== "-" && <div><dt>{selected.personType === "Student" ? "Register number" : "ID number"}</dt><dd>{selected.id}</dd></div>}{selected.rollNumber && <div><dt>Roll number</dt><dd>{selected.rollNumber}</dd></div>}{selected.department && logValue(selected.department) !== "-" && <div><dt>Department</dt><dd>{selected.department}</dd></div>}{knownInstitution && <div><dt>Institute</dt><dd>{selected.institution}</dd></div>}{selected.year && <div><dt>Year</dt><dd>{selected.year.replace("Year ", "")}</dd></div>}{selected.batch && <div><dt>Batch</dt><dd>{selected.batch}</dd></div>}<div><dt>Category</dt><dd>{recordCategory(reviews, selected)}</dd></div>{accommodationOf(selected) && <div><dt>Accommodation</dt><dd>{accommodationOf(selected)}</dd></div>}{selected.hostName && <div><dt>Person to meet</dt><dd>{selected.hostName}</dd></div>}{!isRevoked && selected.visitPurpose && <div><dt>Purpose of visit</dt><dd>{selected.visitPurpose}</dd></div>}{selected.phoneNumber && <div><dt>Phone number</dt><dd>{selected.phoneNumber}</dd></div>}{selected.hostel && <div><dt>Hostel</dt><dd>{selected.hostel}</dd></div>}{selected.room && <div><dt>Room</dt><dd>{selected.room}</dd></div>}{selected.transport && <div><dt>Transport</dt><dd>{selected.transport}</dd></div>}{selected.pickup && <div><dt>Pickup point</dt><dd>{selected.pickup}</dd></div>}{selected.routeNumber && <div><dt>Route number</dt><dd>{selected.routeNumber}</dd></div>}{selected.vehicleNumber && <div><dt>Vehicle number</dt><dd>{selected.vehicleNumber}</dd></div>}{!isRevoked && selected.guardNotes && <div><dt>Reason</dt><dd>{selected.guardNotes}</dd></div>}{isRevoked && revocation && <><div><dt>Revoked by</dt><dd>{revocation.actor} · {revocation.actorNumber}</dd></div><div><dt>Revoked at</dt><dd>{revocation.timestamp}</dd></div></>}</dl>
    </div>}
    {!isRevoked && revocation && <div className="audit-detail-section revocation-details"><div className="audit-detail-title">REVOCATION DETAILS</div><dl><div><dt>Reason <b>*</b></dt><dd>{revocation.reason}</dd></div><div><dt>Supervisor comments</dt><dd>{revocation.reason}</dd></div><div><dt>Revoked by</dt><dd>{revocation.actor} · {revocation.actorNumber}</dd></div><div><dt>Revoked at</dt><dd>{revocation.timestamp}</dd></div></dl></div>}
    {!isRevoked && !hideCommonInfo && <div className="audit-detail-section"><div className="audit-detail-title">ORIGINAL SECURITY EVENT</div><dl>{selected.logId && <div><dt>Log ID / Reference Number</dt><dd>{selected.logId}</dd></div>}<div><dt>Person Category</dt><dd>{personCategory}</dd></div><div><dt>Original Event Category</dt><dd>{selected.accessCategory}</dd></div><div><dt>Security Decision</dt><dd>{authorizationStatus}</dd></div><div><dt>Entry or Exit Event</dt><dd>{selected.event}</dd></div><div><dt>Date</dt><dd>{selected.dateTime.slice(0, 10)}</dd></div><div><dt>Timestamp</dt><dd>{selected.dateTime.replace("T", " ")}</dd></div>{knownInstitution && <div><dt>Institution</dt><dd>{selected.institution}</dd></div>}<div><dt>Assigned Gate / Location</dt><dd>{selected.block} · {knownInstitution ? selected.institution : "Institution B"}</dd></div><div><dt>Security Name / Number</dt><dd>{recordedBy}</dd></div></dl></div>}
    {!isRevoked && review && (review.status !== "Pending Verification" || selected.accessCategory === "Unauthorized") && <div className="audit-detail-section"><div className="audit-detail-title">SUPERVISOR REVIEW & AUDIT HISTORY</div><div className="review-current"><span>Current verification status</span><Status tone={reviewTone(review.status)}>{review.status}</Status></div><div className="history-list"><div><i><Shield size={13} /></i><p><strong>Original event created</strong><span>{selected.guard} · {selected.guardNumber}</span><small>{selected.dateTime.replace("T", " ")} · {selected.block}</small></p></div>{review.actions.map((action, index) => <div key={`${action.type}${action.timestamp}${index}`}><i className={action.type === "Unauthorised" ? "danger-history" : ""}>{action.type === "Verified" || action.type === "Revoked" ? <Check size={13} /> : <ShieldAlert size={13} />}</i><p><strong>Record {action.type.toLowerCase()}</strong><span>{action.actor} · {action.actorNumber}</span><small>{action.timestamp}{action.reason ? ` · Reason: ${action.reason}` : ""}</small></p></div>)}</div></div>}
    {!isRevoked && <div className="capture-note"><Camera size={14} />Photograph captured with this log record.</div>}</section>}</>;
}

function SupervisorAuditTable({ rows, reviews }: { rows: LogRecord[]; reviews: Record<string, ReviewRecord> }) {
  const [selected, setSelected] = useState<LogRecord | null>(null);
  const displayName = (row: LogRecord) => missingValues.includes(row.name.trim().toLowerCase()) || row.name === "Unrecognized person" ? "Unauthorized person" : row.name;
  const enquiryStatus = (row: LogRecord) => reviewFor(reviews, row).status === "Revoked" ? "Verified" : "Pending Verification";
  const entryCount = (row: LogRecord) => row.entries ?? 1;

  return <>
    <div className="audit-table-wrap supervisor-audit-table-wrap">
      <table className="audit-table supervisor-audit-table">
        <thead><tr><th>S.No</th><th>Name</th><th>Reason</th><th>Enquiry details</th><th>Entries</th></tr></thead>
        <tbody>{rows.map((row, index) => <tr key={recordKey(row)} onClick={() => setSelected(row)}>
          <td>{index + 1}</td>
          <td><strong>{displayName(row)}</strong></td>
          <td>{row.guardNotes ?? "-"}</td>
          <td><Status tone={enquiryStatus(row) === "Verified" ? "green" : "amber"}>{enquiryStatus(row)}</Status></td>
          <td>{entryCount(row)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {selected && <section className="audit-profile supervisor-log-details">
      <div className="supervisor-log-details-head"><div><span>LOG DETAILS</span><h2>{displayName(selected)}</h2></div><button onClick={() => setSelected(null)} aria-label="Close log details"><X size={18} /></button></div>
      <dl>
        <div><dt>S.No</dt><dd>{rows.indexOf(selected) + 1}</dd></div>
        <div><dt>Name</dt><dd>{displayName(selected)}</dd></div>
        <div><dt>Reason</dt><dd>{selected.guardNotes ?? "-"}</dd></div>
        <div><dt>Enquiry details</dt><dd><Status tone={enquiryStatus(selected) === "Verified" ? "green" : "amber"}>{enquiryStatus(selected)}</Status></dd></div>
        <div><dt>Entries</dt><dd>{entryCount(selected)}</dd></div>
      </dl>
    </section>}
  </>;
}

function Logs({ role, reviews }: { role: Role; reviews: Record<string, ReviewRecord> }) {
  const levelOneRole = role === "security" || role === "warden" || role === "staff";
  const dateOnlyFilters = levelOneRole || role === "students";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeType, setActiveType] = useState("All");
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(dateOnlyFilters ? "2025-06-16" : "2025-06-16T08:00");
  const [toDate, setToDate] = useState(dateOnlyFilters ? "2025-06-16" : "2025-06-16T18:00");
  const [category, setCategory] = useState("All Categories");
  const [institution, setInstitution] = useState("All visible institutions");
  const [department, setDepartment] = useState("All departments");
  const [academicYear, setAcademicYear] = useState("All years");
  const [block, setBlock] = useState(role === "security" ? "Main Gate" : "All Institution B blocks");
  const [exported, setExported] = useState(false);
  const title = role === "security" ? "Entries Log" : role === "warden" ? "Hostel Entries Log" : role === "staff" ? "Assigned Entries Log" : "Campus records";
  const types = role === "students" ? ["All", "Entry", "Exit", "Denied"] : ["All", "Entry", "Exit", "Visitor", "Denied"];
  const scopedRows = logRows.filter(row => {
    if (role === "security" && row.block !== "Main Gate") return false;
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
    setToDate(dateOnlyFilters ? "2025-06-16" : "2025-06-16T18:00");
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
      <div className={`log-summary ${role === "students" ? "two-column" : ""}`}>{levelOneRole || role === "students" ? <><div><strong>{scopedRows.filter(row => recordCategory(reviews, row) === "Authorized").length}</strong><span>Authorized</span></div><div><strong>{scopedRows.filter(row => recordCategory(reviews, row) === "Unauthorized").length}</strong><span>Unauthorized</span></div>{levelOneRole && <div><strong>{scopedRows.filter(row => recordCategory(reviews, row) === "Revoked").length}</strong><span>Revoked</span></div>}</> : <><div><strong>{scopedRows.filter(row => row.event === "Entry").length}</strong><span>Entries</span></div><div><strong>{scopedRows.filter(row => row.event === "Exit").length}</strong><span>Exits</span></div><div><strong>{scopedRows.filter(row => ["Visitor", "Internal visit"].includes(row.event)).length}</strong><span>Visits</span></div></>}</div>
      <AuditTable rows={scopedRows} reviews={reviews} title={role === "warden" ? "" : levelOneRole ? "ASSIGNED SCOPE LOG" : "CAMPUS RECORDS"} plainNames={role === "students" || role === "warden"} />
      {scopedRows.length === 0 && <div className="empty-state"><History size={25} /><strong>No matching records</strong><span>Change a filter or expand the date range.</span></div>}
    </div>
  </>;
}

function SupervisorHome({ go }: { go: (screen: Screen) => void }) {
  return <>
    <TopBar title="Campus Secure" subtitle="Campus Supervisor Portal" action={<Status tone="green">Live</Status>} />
    <div className="page-content"><ProfileHead role="supervisor" go={go} />
      <section className="supervisor-hero"><div><span>CAMPUS STATUS</span><strong>5 / 5</strong><p>Assigned Security</p></div><ShieldCheck size={55} /></section>
      <div className="dashboard-stats"><div><span className="stat-icon blue-bg"><UserCog size={18} /></span><strong>8</strong><small>Security on duty</small></div><div><span className="stat-icon amber-bg"><ShieldAlert size={18} /></span><strong>3</strong><small>Alerts to review</small></div></div>
      <div className="section-heading compact"><div><h2>Campus operations</h2></div></div>
      <div className="admin-list">
        <button onClick={() => go("assignments")}><span><UserCog size={21} /></span><div><strong>Security assignments</strong></div><ChevronRight size={18} /></button>
        <button onClick={() => go("audit")}><span><FileClock size={21} /></span><div><strong>Assigned security records</strong></div><ChevronRight size={18} /></button>
        <button onClick={() => go("alerts")}><span className="red-icon"><ShieldAlert size={21} /></span><div><strong>Access event alerts</strong></div><b>3</b><ChevronRight size={18} /></button>
      </div>
      <div className="section-heading compact"><div><h2>Block coverage</h2></div><button onClick={() => go("assignments")}>Manage</button></div>
      <div className="coverage-list">{["Main Gate · Arun Kumar", "Block A · Kavya Rao", "Library · Imran Ali"].map((item, i) => <div key={item}><span><MapPin size={16} /></span><div><strong>{item.split(" · ")[0]}</strong><small>{item.split(" · ")[1]}</small></div><Status tone={i === 2 ? "amber" : "green"}>{i === 2 ? "Break" : "Active"}</Status></div>)}</div>
    </div>
  </>;
}

function Assignments({ go }: { go: (screen: Screen) => void }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [guards, setGuards] = useState([["Main Gate", "Arun Kumar", "08:00–16:00"], ["Block A", "Kavya Rao", "08:00–16:00"], ["Block B", "Joseph Mathew", "12:00–20:00"], ["Library Block", "Imran Ali", "08:00–16:00"], ["Hostel Gate", "Neha Singh", "16:00–00:00"]]);
  const reassign = (index: number) => {
    setGuards(current => current.map((guard, guardIndex) => guardIndex === index ? [guard[0], "Vikram Das", `${startTime}–${endTime}`] : guard));
    setEditing(null);
  };
  const toggleReassignment = (index: number) => {
    if (editing === index) {
      setEditing(null);
      return;
    }
    const [currentStart, currentEnd] = guards[index][2].split("–");
    setStartTime(currentStart);
    setEndTime(currentEnd);
    setEditing(index);
  };
  return <>
    <TopBar title="Security assignments" subtitle="Institution B · 5 blocks" back={() => go("home")} />
    <div className="page-content">
      <div className="assignment-list">{guards.map((guard, index) => <section key={guard[0]}><div className="block-icon"><Building2 size={20} /></div><div><span>{guard[0]}</span><strong>{guard[1]}</strong><small>{guard[2]} · On duty</small></div><button onClick={() => toggleReassignment(index)}>{editing === index ? "Cancel" : "Reassign"}</button>{editing === index && <div className="reassign-panel"><Field label="Available security officer"><select defaultValue="Vikram Das"><option>Vikram Das</option><option>Sarah John</option><option>Ravi Menon</option></select></Field><div className="two-fields"><label className="field"><span>Start Time</span><input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} /></label><label className="field"><span>End Time</span><input type="time" value={endTime} onChange={event => setEndTime(event.target.value)} /></label></div><Button onClick={() => reassign(index)}>Confirm reassignment</Button></div>}</section>)}</div>
      <Button variant="secondary" onClick={() => go("create-guard")} icon={<UserPlus size={17} />}>Create new security account</Button>
    </div>
  </>;
}

function CreateGuard({ go }: { go: (screen: Screen) => void }) {
  const [created, setCreated] = useState(false);
  if (created) return <div className="success-page">
    <div className="success-symbol"><UserCheck size={38} /></div>
    <Status tone="green">SECURITY ACCOUNT CREATED</Status>
    <h1>Security user added</h1>
    <p>Vikram Das can now sign in. The duty assignment has been added to the Campus Supervisor audit log.</p>
    <section className="success-receipt">
      <div><span>Security officer</span><strong>Vikram Das</strong></div>
      <div><span>Security employee ID</span><strong>GRD-B-1086</strong></div>
      <div><span>Assigned post</span><strong>Block A · Relief duty</strong></div>
      <div><span>Shift</span><strong>08:00–16:00</strong></div>
    </section>
    <Button onClick={() => go("assignments")}>Return to security assignments</Button>
    <Button variant="secondary" onClick={() => setCreated(false)}>Create another security user</Button>
  </div>;

  return <>
    <TopBar title="Create security account" subtitle="Institution B · Campus Supervisor action" back={() => go("assignments")} />
    <form className="page-content form-page" onSubmit={(event) => { event.preventDefault(); setCreated(true); window.scrollTo(0, 0); }}>
      <div className="form-section-title"><span>1</span><div><strong>Security identity</strong></div></div>
      <div className="form-stack guard-form">
        <label className="field"><span>Full name <b>*</b></span><input required placeholder="Enter the officer's legal name" defaultValue="Vikram Das" /></label>
        <label className="field"><span>Security employee ID <b>*</b></span><input required placeholder="e.g. GRD-B-1086" defaultValue="GRD-B-1086" /></label>
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
        <label className="field"><span>Assigned block or gate <b>*</b></span><select required defaultValue="Block A · Relief duty"><option>Block A · Relief duty</option><option>Main Gate · Relief duty</option><option>Block B · Relief duty</option><option>Library Block · Relief duty</option><option>Hostel Gate · Relief duty</option></select></label>
        <div className="two-fields">
          <label className="field"><span>Shift starts <b>*</b></span><input required type="time" defaultValue="08:00" /></label>
          <label className="field"><span>Shift ends <b>*</b></span><input required type="time" defaultValue="16:00" /></label>
        </div>
        <label className="field"><span>Campus Supervisor notes</span><textarea rows={3} placeholder="Optional onboarding or assignment notes" defaultValue="Relief coverage for Block A." /></label>
      </div>
      <label className="confirmation-check"><input required type="checkbox" defaultChecked /><span>I confirm that the employment details and initial duty assignment are correct. <b>*</b></span></label>
      <Button type="submit" icon={<UserPlus size={17} />}>Create security account</Button>
    </form>
  </>;
}

function Audit({ go, reviews, scope = "supervisor" }: { go: (screen: Screen) => void; reviews: Record<string, ReviewRecord>; scope?: "supervisor" | "cso" }) {
  const [auditFrom, setAuditFrom] = useState("2025-06-16");
  const [auditTo, setAuditTo] = useState("2025-06-16");
  const auditRows = logRows.filter(row => {
    if (!assignedGuardNumbers.has(row.guardNumber)) return false;
    if (row.accessCategory !== "Unauthorized") return false;
    const recordDate = row.dateTime.slice(0, 10);
    return recordDate >= auditFrom && recordDate <= auditTo;
  });
  const resetAudit = () => {
    setAuditFrom("2025-06-16");
    setAuditTo("2025-06-16");
  };
  return <>
    <TopBar title="Campus records" subtitle={scope === "cso" ? "Institution B · CSO scope" : "Institution B · Campus Supervisor scope"} back={() => go("home")} />
    <div className="page-content">
      <section className="filter-panel supervisor-audit-filters"><div className="filter-panel-head"><div></div><button onClick={resetAudit}>Reset</button></div><div className="filter-fields"><Field label="From Date"><input type="date" value={auditFrom} onChange={event => setAuditFrom(event.target.value)} /></Field><Field label="To Date"><input type="date" value={auditTo} onChange={event => setAuditTo(event.target.value)} /></Field></div></section>
      <div className="result-count"><strong>{auditRows.length} results</strong></div>
      <SupervisorAuditTable rows={auditRows} reviews={reviews} />
      {auditRows.length === 0 && <div className="empty-state"><FileClock size={25} /><strong>No matching records</strong><span>Reset filters or choose another date period.</span></div>}
    </div>
  </>;
}

function Alerts({
  go,
  back,
  role,
  reviews,
  updateReview,
}: {
  go: (screen: Screen) => void;
  back: () => void;
  role: Role;
  reviews: Record<string, ReviewRecord>;
  updateReview: (row: LogRecord, type: "Unauthorised" | "Revoked", reason?: string) => void;
}) {
  const alertRows = logRows.filter(row => {
    if (row.accessCategory !== "Unauthorized") return false;
    if (role === "security") return row.block === "Main Gate";
    if (role === "warden") return row.guard === roleMeta.warden.name && row.hostel === "Bharathi Hostel" && row.personType === "Unauthorised";
    if (role === "staff") return row.institution === "Institution B" && row.block === "Block A";
    return assignedGuardNumbers.has(row.guardNumber);
  });
  const [readKeys, setReadKeys] = useState<string[]>([]);
  const [alertOrder, setAlertOrder] = useState(() => alertRows.map(recordKey));
  const [selected, setSelected] = useState<LogRecord | null>(null);
  const [dialog, setDialog] = useState<"unauthorised" | "revoke" | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const markAllRead = () => setReadKeys(alertRows.map(recordKey));
  const openAlert = (row: LogRecord) => {
    const key = recordKey(row);
    setSelected(row);
    setReadKeys(current => current.includes(key) ? current : [...current, key]);
    setAlertOrder(current => [...current.filter(item => item !== key), key]);
  };
  const confirmAction = () => {
    if (!selected || !dialog) return;
    if (dialog === "revoke" && !reason.trim()) {
      setReasonError(true);
      return;
    }
    updateReview(selected, dialog === "unauthorised" ? "Unauthorised" : "Revoked", reason.trim() || undefined);
    setDialog(null);
    setReason("");
    setReasonError(false);
  };
  if (selected) {
    const review = reviewFor(reviews, selected);
    const knownInstitution = !["Not identified", "Not available"].includes(selected.institution);
    return <>
      <TopBar title="Alert details" subtitle={selected.logId} back={() => { setSelected(null); setDialog(null); }} />
      <div className="page-content">
        <section className="alert-record-head">
          <div className={`alert-symbol ${selected.accessCategory === "Authorized" ? "blue-bg" : ""}`}>{selected.accessCategory === "Authorized" ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}</div>
          <div><h1>{selected.name}</h1>{selected.personType !== "Unauthorised" && <p>{`${selected.personType} · ${selected.id}`}</p>}</div>
          <Status tone={reviewTone(review.status)}>{review.status}</Status>
        </section>
        <section className="info-card alert-info"><div className="card-kicker"><FileClock size={15} />ORIGINAL SECURITY RECORD</div><dl><div><dt>Original event category</dt><dd>{selected.accessCategory}</dd></div><div><dt>Event</dt><dd>{selected.event}</dd></div><div><dt>Security officer</dt><dd>{selected.guard}</dd></div><div><dt>Security number</dt><dd>{selected.guardNumber}</dd></div><div><dt>Institution</dt><dd>{knownInstitution ? selected.institution : "Institution B"}</dd></div><div><dt>Gate / Location</dt><dd>{selected.block}</dd></div><div><dt>Date & time</dt><dd>{selected.dateTime.replace("T", " ")}</dd></div><div><dt>Current verification status</dt><dd>{review.status}</dd></div></dl></section>
        <section className="info-card action-history"><div className="card-kicker"><History size={15} />ACTION HISTORY</div><div className="history-list"><div><i><Shield size={13} /></i><p><strong>Original event recorded</strong><span>{selected.guard} · {selected.guardNumber}</span><small>{selected.dateTime.replace("T", " ")} · {selected.block}</small></p></div>{review.actions.map((action, index) => <div key={`${action.timestamp}${index}`}><i className={action.type === "Unauthorised" ? "danger-history" : ""}>{action.type === "Verified" || action.type === "Revoked" ? <Check size={13} /> : <ShieldAlert size={13} />}</i><p><strong>{action.type}</strong><span>{action.actor} · {action.actorNumber}</span><small>{action.timestamp}{action.reason ? ` · Reason: ${action.reason}` : ""}</small></p></div>)}</div></section>
        {role === "supervisor" && <div className="review-actions two-actions"><Button variant="warning" onClick={() => setDialog("unauthorised")} icon={<ShieldAlert size={17} />} disabled={review.status === "Unauthorised" || review.status === "Revoked"}>Unauthorised</Button><Button onClick={() => setDialog("revoke")} icon={<ShieldCheck size={17} />} disabled={review.status === "Revoked"}>Revoke</Button></div>}
      </div>
      {dialog && <div className="dialog-backdrop"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className={`dialog-icon ${dialog === "unauthorised" ? "danger" : ""}`}>{dialog === "unauthorised" ? <ShieldAlert size={23} /> : <ShieldCheck size={23} />}</div><h2 id="dialog-title">{dialog === "unauthorised" ? "Mark as unauthorised?" : "Revoke unauthorised entry?"}</h2><p>{dialog === "unauthorised" ? "This marks the entry as unauthorised and records your identity and timestamp in the audit history." : "Revoke only if this entry is valid. Provide the reason, e.g. host approval granted."}</p><div className="dialog-summary"><strong>{selected.name}</strong><span>{selected.accessCategory} · {selected.guard}</span><small>{selected.block} · {knownInstitution ? selected.institution : "Institution B"}</small></div>{dialog === "revoke" && <label className="field"><span>Reason for revocation *</span><textarea value={reason} onChange={event => { setReason(event.target.value); setReasonError(false); }} rows={3} placeholder="e.g. Host approval granted" />{reasonError && <small className="field-error">A revocation reason is required.</small>}</label>}<div className="dialog-actions"><Button variant="secondary" onClick={() => { setDialog(null); setReasonError(false); }}>Cancel</Button><Button variant={dialog === "revoke" ? "primary" : "warning"} onClick={confirmAction}>{dialog === "unauthorised" ? "Confirm unauthorised" : "Confirm revoke"}</Button></div></section></div>}
    </>;
  }
  return <>
    <TopBar title={role === "warden" ? "Hostel alerts" : role === "staff" ? "Staff alerts" : role === "cso" ? "Alerts" : "Security alerts"} subtitle={role === "warden" ? "Unrecognized entry attempts · Bharathi Hostel" : role === "supervisor" ? "" : role === "cso" ? "Institution B · CSO review" : "Relevant to your assigned scope"} back={back} action={<button className="text-action" onClick={markAllRead}>{readKeys.length === alertRows.length ? "All read" : "Mark read"}</button>} />
    <div className="page-content">
      <div className="notification-legend"><span><i />Unread</span><strong>{alertRows.filter(row => reviewFor(reviews, row).status === "Pending Verification").length} pending verification</strong></div>
      <div className="alert-list">
        {alertOrder.map(key => alertRows.find(row => recordKey(row) === key)).filter((row): row is LogRecord => Boolean(row)).map(row => {
          const review = reviewFor(reviews, row);
          const unread = !readKeys.includes(recordKey(row));
          const notificationType = role === "warden" ? "Unrecognized Hostel Entry" : review.status === "Verified" ? "Verification Completed" : review.status === "Unauthorised" ? "Marked Unauthorised" : review.status === "Revoked" ? "Unauthorized Decision Revoked" : `${row.accessCategory} Event Alert`;
          return <article key={recordKey(row)} className={`alert-card ${row.accessCategory === "Unauthorized" ? "high" : ""} ${unread ? "unread" : "muted"}`} onClick={() => openAlert(row)}><div className={`alert-symbol ${row.accessCategory === "Authorized" ? "blue-bg" : ""}`}>{row.accessCategory === "Authorized" ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}</div><div><span>{notificationType.toUpperCase()}</span><h3>{row.name}</h3><p>{row.personType} · {row.guard} ({row.guardNumber})</p><div className="notification-location"><MapPin size={12} />{row.block} — {["Not identified", "Not available"].includes(row.institution) ? "Institution B" : row.institution}</div><div className="alert-meta"><b>{row.dateTime.replace("T", " ")}</b><Status tone={reviewTone(review.status)}>{review.status}</Status><button onClick={(event) => { event.stopPropagation(); openAlert(row); }}>Open<ChevronRight size={13} /></button></div></div></article>;
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
    <section className="login-brand"><div className="large-mark"><KeyRound size={30} /></div><div><h1>Reset password</h1><p>Every Entry. Verified.</p></div></section>
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
    <div className="page-content"><div className="empty-state"><Lock size={28} /><strong>You do not have permission</strong><span>This area is reserved for Admin. Your role cannot open administrative configuration or user management. This attempt has been recorded in the audit history.</span></div>
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
      <div className="admin-list">
        {cso && <button onClick={() => go("campus-entries")}><span><DoorOpen size={21} /></span><div><strong>Institution entry logs</strong></div><ChevronRight size={18} /></button>}
        {cso && <button onClick={() => go("login-logs")}><span><FileClock size={21} /></span><div><strong>Worklog</strong></div><ChevronRight size={18} /></button>}
        {!cso && <button onClick={() => go("alerts")}><span><Bell size={21} /></span><div><strong>Alerts from security</strong></div><ChevronRight size={18} /></button>}
        {!cso && <button onClick={() => go("institution-users")}><span><Users size={21} /></span><div><strong>Institution users</strong></div><ChevronRight size={18} /></button>}
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
    <TopBar title="Campus Secure" subtitle="Admin Portal" action={<Status tone="green">All institutions</Status>} />
    <div className="page-content"><ProfileHead role="admin" go={go} />
      <section className="admin-hero"><div><span>TODAY'S CAMPUS ENTRIES</span><strong>8,426</strong></div><BarChart3 size={50} /></section>
      <div className="dashboard-stats three"><div><strong>42</strong><small>Portal users</small></div><div><strong>8,426</strong><small>Authorized</small></div><div><strong>27</strong><small>Unauthorized</small></div></div>
      <section className="chart-card"><div className="chart-head"><div><span>ENTRY TREND</span><strong>52,840</strong></div><small>Last 7 days</small></div><div className="login-chart admin-chart">{[62, 76, 59, 86, 78, 45, 51].map((height, index) => <div key={index}><i style={{ height: `${height}%` }} /><span>{["M", "T", "W", "T", "F", "S", "S"][index]}</span></div>)}</div></section>
      <div className="section-heading compact"><div><h2>Admin tools</h2></div></div>
      <div className="admin-list"><button onClick={() => go("assign-supervisor")}><span><UserCheck size={21} /></span><div><strong>Assign Campus Supervisor</strong></div><ChevronRight size={18} /></button><button onClick={() => go("users")}><span><UserCog size={21} /></span><div><strong>Manage portal users</strong></div><ChevronRight size={18} /></button><button onClick={() => go("campus-entries")}><span><DoorOpen size={21} /></span><div><strong>All campus records</strong></div><ChevronRight size={18} /></button><button onClick={() => go("login-logs")}><span><FileClock size={21} /></span><div><strong>User worklog</strong></div><ChevronRight size={18} /></button></div>
    </div>
  </>;
}

function UserAdministration({ go }: { go: (screen: Screen) => void }) {
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [createdRole, setCreatedRole] = useState<(typeof adminPortalDesignations)[number]>(adminPortalDesignations[0]);
  const [createdInstitution, setCreatedInstitution] = useState(institutions[0]);
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
  const nextEmpId = `EMP-${String(1001 + users.length).padStart(4, "0")}`;
  const filteredUsers = users.filter(user => `${user.name} ${user.role} ${user.email} ${user.institution}`.toLowerCase().includes(query.toLowerCase()) && (institutionFilter === "All institutions" || user.institution === institutionFilter) && (designationFilter === "All designations" || user.role === designationFilter));
  const editUser = (user: typeof users[number]) => {
    setEditingEmail(editingEmail === user.email ? null : user.email);
    setDraft({ ...user });
  };
  const saveUser = () => {
    if (!editingEmail) return;
    setUsers(current => current.map(user => user.email === editingEmail ? { ...draft, initials: draft.name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase() } : user));
    setEditingEmail(null);
  };
  if (created) return <div className="success-page"><div className="success-symbol"><UserCheck size={38} /></div><Status tone="green">USER CREATED</Status><h1>Portal account created</h1><p>An account invitation was sent to the user's official email address.</p><section className="success-receipt"><div><span>Employee ID</span><strong>{nextEmpId}</strong></div><div><span>Role</span><strong>{createdRole}</strong></div><div><span>Institution</span><strong>{createdInstitution}</strong></div><div><span>Status</span><strong>Invitation pending</strong></div></section><Button onClick={() => { setCreated(false); setCreating(false); }}>Return to users</Button></div>;
  if (creating) return <><TopBar title="Create portal user" subtitle="Admin action" back={() => setCreating(false)} /><form className="page-content form-page" onSubmit={event => { event.preventDefault(); setCreated(true); }}><div className="form-stack guard-form"><label className="field"><span>Employee ID</span><input readOnly value={nextEmpId} aria-label="Employee ID, generated automatically" /><small>Generated automatically when the user is created</small></label><label className="field"><span>Full name <b>*</b></span><input required placeholder="Enter official name" /></label><label className="field"><span>Phone number <b>*</b></span><input required type="tel" inputMode="tel" placeholder="+91 98765 43210" /></label><label className="field"><span>Role <b>*</b></span><select required value={createdRole} onChange={event => setCreatedRole(event.target.value as typeof createdRole)}>{adminPortalDesignations.map(item => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Institution</span><select value={createdInstitution} onChange={event => setCreatedInstitution(event.target.value)}>{institutions.map(item => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Official email</span><input type="email" placeholder="name@campus.edu" /></label><label className="field"><span>Department / office</span><input placeholder="e.g. Campus Security" /></label></div><label className="confirmation-check"><input required type="checkbox" /><span>I confirm this person is authorised to receive the selected role. <b>*</b></span></label><Button type="submit" icon={<Mail size={17} />}>Create account & send invite</Button></form></>;
  return <>
    <TopBar title="Portal users" back={() => go("home")} action={<button className="icon-btn primary" onClick={() => setCreating(true)}><Plus size={19} /></button>} />
    <div className="page-content"><div className="search-input"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email, role or institution" />{query && <button onClick={() => setQuery("")}>Clear</button>}</div><section className="filter-panel user-admin-filters"><div className="user-filter-reset"><button onClick={() => { setInstitutionFilter("All institutions"); setDesignationFilter("All designations"); }}>Reset</button></div><div className="filter-fields"><Field label="Institution"><select value={institutionFilter} onChange={event => setInstitutionFilter(event.target.value)}><option>All institutions</option>{institutions.map(item => <option key={item}>{item}</option>)}</select></Field><Field label="Designation"><select value={designationFilter} onChange={event => setDesignationFilter(event.target.value)}><option>All designations</option>{adminPortalDesignations.map(item => <option key={item}>{item}</option>)}</select></Field></div></section><div className="portal-user-list">{filteredUsers.map(user => <section key={user.email}><div className="person-avatar">{user.initials}</div><div><strong>{user.name}</strong><span>{user.email}</span><small>{user.role} · {user.institution}</small></div><Status tone={user.active ? "green" : "red"}>{user.active ? "Active" : "Disabled"}</Status><button className="user-edit-button" onClick={() => editUser(user)} aria-label={`Edit ${user.name}`} aria-expanded={editingEmail === user.email}><MoreVertical size={18} /></button>{editingEmail === user.email && <div className="portal-user-editor"><div className="audit-detail-title">EDIT USER DETAILS</div><div className="form-stack"><label className="field"><span>Full name</span><input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></label><label className="field"><span>Official email</span><input type="email" value={draft.email} onChange={event => setDraft(current => ({ ...current, email: event.target.value }))} /></label><label className="field"><span>Role</span><select value={draft.role} onChange={event => setDraft(current => ({ ...current, role: event.target.value }))}>{adminPortalDesignations.map(item => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Institution</span><select value={draft.institution} onChange={event => setDraft(current => ({ ...current, institution: event.target.value }))}>{institutions.map(item => <option key={item}>{item}</option>)}</select></label></div><div className={`account-status-control ${draft.active ? "active" : "disabled"}`}><div><strong>Account status</strong><span>{draft.active ? "Active" : "Disabled"}</span></div><button type="button" className="status-switch" role="switch" aria-checked={draft.active} aria-label={`Set account ${draft.active ? "disabled" : "active"}`} onClick={() => setDraft(current => ({ ...current, active: !current.active }))}><i /></button></div><div className="editor-actions"><Button variant="secondary" onClick={() => setEditingEmail(null)}>Cancel</Button><Button onClick={saveUser}>Save changes</Button></div></div>}</section>)}</div><Button variant="secondary" onClick={() => setCreating(true)} icon={<UserPlus size={17} />}>Create portal user</Button></div>
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

function Worklog({ go, scope = "admin" }: { go: (screen: Screen) => void; scope?: "admin" | "student-affairs" | "security-oversight" }) {
  const studentAffairsScope = scope === "student-affairs";
  const securityOversightScope = scope === "security-oversight";
  const [roleFilter, setRoleFilter] = useState("All designations");
  const [institutionFilter, setInstitutionFilter] = useState("All institutions");
  const [fromDate, setFromDate] = useState("2025-06-16");
  const [toDate, setToDate] = useState("2025-06-16");
  const [selectedOfficerName, setSelectedOfficerName] = useState<string | null>(null);
  const accessibleEntries = worklogEntries.filter(item => securityOversightScope ? item.institution === "Institution B" && ["Campus Supervisor", "Hostel Warden", "Staff", "Security"].includes(item.designation) : studentAffairsScope ? ["Campus Supervisor", "Security"].includes(item.designation) : adminPortalDesignations.includes(item.designation as typeof adminPortalDesignations[number]));
  const rows = accessibleEntries.filter(item => (roleFilter === "All designations" || item.designation === roleFilter) && (securityOversightScope || institutionFilter === "All institutions" || item.institution === institutionFilter) && item.date >= fromDate && item.date <= toDate);
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
    const officerWorklogs = rows.filter(item => item.name === selectedOfficer.name);
    const officerScans = logRows.filter(row => row.guard === selectedOfficer.name);
    const initials = selectedOfficer.name.split(" ").map(part => part[0]).join("");
    return <>
      <TopBar title="Officer details" subtitle="Worklog & scan activity" back={() => setSelectedOfficerName(null)} />
      <div className="page-content">
        <section className="officer-detail-head"><div className="person-avatar">{initials}</div><div><span>OFFICER PROFILE</span><h1>{selectedOfficer.name}</h1><p>{selectedOfficer.designation} · {selectedOfficer.institution}</p></div><Status tone="green">Active</Status></section>
        <div className="officer-scan-stats"><div><strong>{officerScans.length}</strong><span>Total scans performed</span></div><div><strong>{officerScans.filter(row => row.accessCategory === "Authorized").length}</strong><span>Authorized detected</span></div><div><strong>{officerScans.filter(row => row.accessCategory === "Unauthorized").length}</strong><span>Unauthorized detected</span></div></div>
        <section className="info-card officer-info"><div className="card-kicker"><IdCard size={15} />OFFICER DETAILS</div><dl><div><dt>Name</dt><dd>{selectedOfficer.name}</dd></div><div><dt>Officer ID</dt><dd>{selectedOfficer.officerId}</dd></div><div><dt>Designation</dt><dd>{selectedOfficer.designation}</dd></div><div><dt>Institution</dt><dd>{selectedOfficer.institution}</dd></div><div><dt>Email</dt><dd>{selectedOfficer.email}</dd></div></dl></section>
        <div className="list-label">WORKLOG HISTORY</div>
        <div className="login-event-list worklog-list officer-history">{officerWorklogs.map(item => <article key={`${item.name}${item.day}`}><div className="login-dot"><FileClock size={16} /></div><div className="worklog-person"><strong>{item.day}</strong><span>{item.designation} · {item.institution}</span><small>{formatDuration(item.durationMinutes)} logged</small></div><div className="worklog-times"><div><span>Entry</span><strong>{item.entry}</strong></div><div><span>Exit</span><strong>{item.exit}</strong></div><div><span>Duration</span><strong>{formatDuration(item.durationMinutes)}</strong></div></div></article>)}</div>
        <div className="list-label officer-scan-label">SCAN RECORDS</div>
        <div className="officer-scan-list">{officerScans.map(record => <article key={recordKey(record)}><div className={`scan-record-icon ${record.accessCategory === "Unauthorized" ? "danger" : ""}`}>{record.accessCategory === "Unauthorized" ? <ShieldAlert size={17} /> : <ShieldCheck size={17} />}</div><div><strong>{record.name}</strong><span>{record.dateTime.replace("T", " ")} · {record.block}</span><small>{record.id === "Not available" ? "Identity unavailable" : record.id}</small></div><Status tone={record.accessCategory === "Unauthorized" ? "red" : record.accessCategory === "Authorized" ? "green" : "amber"}>{record.accessCategory}</Status></article>)}</div>
        {officerScans.length === 0 && <div className="empty-state compact-empty"><ScanFace size={25} /><strong>No scan records</strong><span>No scans are assigned to this officer in the current records.</span></div>}
      </div>
    </>;
  }
  return <>
    <TopBar title={studentAffairsScope ? "Officer workload" : securityOversightScope ? "Worklog" : "User worklog"} subtitle={studentAffairsScope ? "Campus Supervisors & security" : securityOversightScope ? "Institution B · Security personnel" : "Entries & timing"} back={() => go("home")} />
    <div className="page-content">{scope === "admin" && <section className="day-tiles" aria-label="Today's activity"><div className="day-tiles-head"><strong>Today</strong><span>16 Jun 2025</span></div><div className="day-tiles-grid">{dayTiles.map(tile => <div key={tile.label} className={`day-tile ${tile.tone}`}><strong>{tile.value}</strong><span>{tile.label}</span></div>)}</div></section>}{scope !== "admin" && <div className="login-summary"><div><strong>{rows.length}</strong><span>{securityOversightScope ? "Worklog sessions" : studentAffairsScope ? "Officer entries" : "User entries"}</span></div><div><strong>{formatDuration(totalMinutes)}</strong><span>Total logged time</span></div></div>}<section className="filter-panel login-filter worklog-filter"><div className={`filter-fields ${securityOversightScope ? "single-field" : ""}`}><Field label="Designation"><select value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option>All designations</option>{securityOversightScope ? <><option>Campus Supervisor</option><option>Hostel Warden</option><option>Staff</option><option>Security</option></> : studentAffairsScope ? <><option>Campus Supervisor</option><option>Security</option></> : adminPortalDesignations.map(item => <option key={item}>{item}</option>)}</select></Field>{!securityOversightScope && <Field label="Institution"><select value={institutionFilter} onChange={event => setInstitutionFilter(event.target.value)}><option>All institutions</option>{institutions.map(item => <option key={item}>{item}</option>)}</select></Field>}</div><div className="date-filter worklog-date-range"><label><CalendarDays size={15} /><span>From Date</span><input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label><span>to</span><label><CalendarDays size={15} /><span>To Date</span><input type="date" value={toDate} onChange={event => setToDate(event.target.value)} /></label></div></section><div className="worklog-section-head"></div><div className="worklog-table-wrap"><table className="worklog-table"><thead><tr><th>S.No</th><th>Name</th><th>Designation</th><th>Login</th><th>Logout</th><th>Scans</th><th>Authorized</th><th>Unauthorized</th></tr></thead><tbody>{rows.map((item, index) => { const scans = logRows.filter(row => row.guard === item.name); return <tr key={`${item.name}${item.day}`}><td>{index + 1}</td><td><button className="worklog-name-button" onClick={() => setSelectedOfficerName(item.name)}>{item.name}</button></td><td><span className={`designation-badge designation-${item.designation.toLowerCase().replace(" ", "-")}`}>{item.designation}</span></td><td>{item.entry}</td><td>{item.exit}</td><td><strong>{scans.length}</strong></td><td><span className="worklog-count authorized">{scans.filter(row => row.accessCategory === "Authorized").length}</span></td><td><span className="worklog-count unauthorized">{scans.filter(row => row.accessCategory === "Unauthorized").length}</span></td></tr>; })}</tbody></table></div>{rows.length === 0 && <div className="empty-state"><FileClock size={25} /><strong>No worklog entries</strong><span>Change one or more filters.</span></div>}</div>
  </>;
}

function CampusEntries({ go, reviews, scope = "admin" }: { go: (screen: Screen) => void; reviews: Record<string, ReviewRecord>; scope?: "admin" | "institution" }) {
  const [institution, setInstitution] = useState(scope === "institution" ? "Institution B" : "All institutions");
  const [block, setBlock] = useState("All blocks");
  const [category, setCategory] = useState("All Categories");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("2025-06-16T08:00");
  const [toDate, setToDate] = useState("2025-06-16T18:00");
  const rows = logRows.filter(row => row.accessCategory !== "Visitors" && (scope === "institution" ? row.institution === "Institution B" || assignedGuardNumbers.has(row.guardNumber) : (institution === "All institutions" || row.institution === institution)) && (block === "All blocks" || row.block === block) && (category === "All Categories" || recordCategory(reviews, row) === category) && row.dateTime >= fromDate && row.dateTime <= toDate && (!query || `${row.name} ${row.id} ${row.institution} ${row.department} ${row.guard}`.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  return <>
    <TopBar title={scope === "institution" ? "Institution records" : "Campus records"} subtitle={scope === "institution" ? "Institution B · Read-only records" : "All institutions · Read-only"} back={() => go("home")} />
    <div className="page-content"><div className="search-input"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={scope === "institution" ? "Search name, ID, department or security" : "Search person, institution or department"} />{query && <button onClick={() => setQuery("")}>Clear</button>}</div><section className="filter-panel admin-filters"><div className="filter-fields"><Field label="Institution"><select disabled={scope === "institution"} value={institution} onChange={event => setInstitution(event.target.value)}><option>All institutions</option>{institutions.map(item => <option key={item}>{item}</option>)}</select></Field><Field label="Block"><select value={block} onChange={event => setBlock(event.target.value)}><option>All blocks</option><option>Main Gate</option><option>Block A</option><option>Block B</option><option>Library Block</option><option>Bharathi Hostel</option></select></Field><Field label="Category"><select value={category} onChange={event => setCategory(event.target.value)}><option>All Categories</option><option>Authorized</option><option>Unauthorized</option><option>Revoked</option></select></Field></div></section><div className="date-filter admin-date"><label><CalendarDays size={15} /><span>From</span><input type="datetime-local" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label><span>to</span><label><Clock3 size={15} /><span>To</span><input type="datetime-local" value={toDate} onChange={event => setToDate(event.target.value)} /></label></div><div className="entry-overview two-column"><div><strong>{rows.filter(row => recordCategory(reviews, row) === "Authorized").length}</strong><span>Authorized</span></div><div><strong>{rows.filter(row => recordCategory(reviews, row) === "Unauthorized").length}</strong><span>Unauthorized</span></div></div><div className="manager-log-count"><strong>{rows.length}</strong><span>matching records</span></div><AuditTable rows={rows} reviews={reviews} title="" plainNames />{rows.length === 0 && <div className="empty-state"><DoorOpen size={25} /><strong>No matching campus records</strong><span>Reset or change the filters.</span></div>}</div>
  </>;
}

function AssignSupervisor({ go }: { go: (screen: Screen) => void }) {
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
  const [done, setDone] = useState(false);
  const changeInstitution = (nextInstitution: string) => {
    setInstitution(nextInstitution);
    setBlock(blocksByInstitution[nextInstitution][0]);
  };
  if (done) return <div className="success-page"><div className="success-symbol"><UserCheck size={38} /></div><Status tone="green">ASSIGNED</Status><h1>Campus Supervisor assigned</h1><p>{supervisor} now supervises {block} in {institution}.</p><section className="success-receipt"><div><span>Campus Supervisor</span><strong>{supervisor}</strong></div><div><span>Institution</span><strong>{institution}</strong></div><div><span>Block</span><strong>{block}</strong></div><div><span>Duration</span><strong>{days} {Number(days) === 1 ? "day" : "days"}</strong></div></section><Button onClick={() => { setDone(false); go("home"); }}>Back to overview</Button></div>;
  return <>
    <TopBar title="Assign Campus Supervisor" subtitle="Admin action" back={() => go("home")} />
    <form className="page-content form-page" onSubmit={event => { event.preventDefault(); setDone(true); }}>
      <div className="form-stack guard-form">
        <Field label="Campus Supervisor *"><select value={supervisor} onChange={event => setSupervisor(event.target.value)}>{supervisors.map(item => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Institution *"><select value={institution} onChange={event => changeInstitution(event.target.value)}>{institutions.map(item => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Block *"><select value={block} onChange={event => setBlock(event.target.value)}>{blocksByInstitution[institution].map(item => <option key={item}>{item}</option>)}</select></Field>
        <label className="field"><span>Duration (days) <b>*</b></span><input required type="number" min={1} step={1} inputMode="numeric" value={days} onChange={event => setDays(event.target.value)} placeholder="e.g. 30" /></label>
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
      <div className="entry-overview two-column"><div><strong>{rows.filter(row => row.accessCategory === "Authorized").length}</strong><span>Authorized</span></div><div><strong>{rows.filter(row => row.accessCategory === "Unauthorized").length}</strong><span>Unauthorized</span></div></div>
      <AuditTable rows={rows} reviews={reviews} title="STUDENT LOGS" plainNames />
      {rows.length === 0 && <div className="empty-state"><Users size={25} /><strong>No matching student logs</strong><span>Reset or change the filters.</span></div>}
    </div>
  </>;
}

function Profile({ role, go, back }: { role: Role; go: (screen: Screen) => void; back: () => void }) {
  const meta = roleMeta[role];
  return <>
    <TopBar title="Profile" subtitle="Account & access tools" back={back} />
    <div className="page-content"><section className="profile-card"><div className="profile-avatar large">{meta.initials}</div><h1>{meta.name}</h1><p>{meta.label}</p><Status tone="green">Active session</Status></section>
      <div className="profile-scope"><span>AUTHORIZED SCOPE</span><strong>{meta.scope}</strong></div>
      {(role === "security" || role === "warden" || role === "staff") && <div className="profile-detail-row"><span>Phone Number</span><strong>{meta.phoneNumber}</strong></div>}
      {role === "supervisor" && <div className="profile-detail-row"><span>Phone Number</span><strong>{meta.phoneNumber}</strong></div>}
      {(role === "students" || role === "welfare" || role === "cso" || role === "manager" || role === "access-supervisor") && <div className="profile-detail-row"><span>Phone Number</span><strong>{meta.phoneNumber}</strong></div>}
      <Button variant="danger" onClick={() => go("login")} icon={<LogOut size={17} />}>Log out</Button>
    </div>
  </>;
}

export default function App() {
  const [role, setRole] = useState<Role>("security");
  const [screen, setScreen] = useState<Screen>("login");
  const [identityCase, setIdentityCase] = useState<IdentityCase>("student");
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("face");
  const [matchedStudent, setMatchedStudent] = useState<StudentMatch>(studentMatches[0]);
  const [scanAttempts, setScanAttempts] = useState(0);
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
  const [stack, setStack] = useState<Screen[]>([]);
  const go = (next: Screen) => {
    if (next === screen) return;
    const pushed = next === "alerts" || next === "profile" || next === "access-notifications";
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
  const enter = (nextRole: Role) => { setRole(nextRole); go("home"); };
  const completeScan = () => {
    const nextAttempt = scanAttempts + 1;
    setScanAttempts(nextAttempt);
    if (nextAttempt % 2 === 0) {
      go("unrecognized");
      return;
    }
    setIdentityCase("student");
    setMatchedStudent(studentMatches[0]);
    setVerificationMethod("face");
    go("identity");
  };
  const verifyRegister = (registerNumber: string) => {
    const match = studentMatches.find(person => person.registerNumber === registerNumber.trim().toUpperCase());
    if (!match) return false;
    if (role === "warden" && (match.institute !== "Institution B" || match.hostelName !== "Bharathi Hostel")) return false;
    setIdentityCase("student");
    setMatchedStudent(match);
    setVerificationMethod("register");
    go("identity");
    return true;
  };
  const updateReview = (row: LogRecord, type: "Unauthorised" | "Revoked", reason?: string) => {
    const key = recordKey(row);
    const action: ReviewAction = {
      type,
      actor: roleMeta[role].name,
      actorNumber: roleMeta[role].supervisorNumber ?? "SUP-B-0004",
      timestamp: new Date().toLocaleString("en-GB", { hour12: false }).replace(",", ""),
      reason,
    };
    setReviews(current => {
      const existing = reviewFor(current, row);
      if (existing.status === "Revoked" || (type === "Unauthorised" && existing.status === "Unauthorised")) return current;
      return { ...current, [key]: { status: type, actions: [...existing.actions, action] } };
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
  else if (screen === "profile") content = <Profile role={role} go={go} back={back} />;
  else if (screen === "alerts") content = <Alerts role={role} go={go} back={back} reviews={reviews} updateReview={updateReview} />;
  else if (role === "security" || role === "warden" || role === "staff") {
    if (screen === "home") content = <LevelOneHome role={role} go={go} />;
    else if (screen === "scan") content = <LevelOneScan role={role} go={go} completeScan={completeScan} />;
    else if (screen === "logs") content = <Logs role={role} reviews={reviews} />;
    else if (screen === "unrecognized") content = <UnrecognizedResult role={role} go={go} verifyRegister={verifyRegister} />;
    else if (screen === "identity") content = <IdentityResult role={role} go={go} identityCase={identityCase} verificationMethod={verificationMethod} student={matchedStudent} />;
    else if (screen === "unauthorised") content = <UnauthorizedForm role={role} go={go} />;
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
    if (screen === "assignments") content = <Assignments go={go} />;
    else if (screen === "create-guard") content = <CreateGuard go={go} />;
    else if (screen === "audit" || screen === "logs") content = <Audit go={go} reviews={reviews} />;
    else content = <SupervisorHome go={go} />;
  } else if (role === "cso") {
    if (screen === "assignments") content = <Assignments go={go} />;
    else if (screen === "create-guard") content = <CreateGuard go={go} />;
    else if (screen === "audit" || screen === "logs") content = <Audit go={go} reviews={reviews} scope="cso" />;
    else if (screen === "campus-entries") content = <CampusEntries go={go} reviews={reviews} scope="institution" />;
    else if (screen === "login-logs") content = <Worklog go={go} scope="security-oversight" />;
    else content = <OversightHome role="cso" go={go} />;
  } else if (role === "welfare") {
    if (screen === "welfare-logs") content = <WelfareBlockLogs reviews={reviews} />;
    else content = <WelfareHome go={go} />;
  } else if (role === "manager") {
    if (screen === "campus-entries") content = <CampusEntries go={go} reviews={reviews} scope="institution" />;
    else if (screen === "institution-users") content = <InstitutionUserDirectory go={go} />;
    else content = <OversightHome role={role} go={go} />;
  } else if (role === "admin") {
    if (screen === "users") content = <UserAdministration go={go} />;
    else if (screen === "campus-entries") content = <CampusEntries go={go} reviews={reviews} />;
    else if (screen === "login-logs") content = <Worklog go={go} />;
    else if (screen === "assign-supervisor") content = <AssignSupervisor go={go} />;
    else content = <AdminHome go={go} />;
  } else {
    if (screen === "logs") content = <Logs role="students" reviews={reviews} />;
    else if (screen === "workload") content = <Worklog go={go} scope="student-affairs" />;
    else content = <StudentAffairsHome go={go} />;
  }

  const navScreens: Screen[] = ["home", "logs", "workload", "assignments", "audit", "users", "institution-users", "campus-entries", "login-logs", "visitor-pass", "pass-records", "welfare-logs"];
  const showNav = screen !== "login" && (navScreens.includes(screen) || (role === "manager" && screen === "profile"));
  return <div className="app-shell"><Page role={role} active={screen} go={go} nav={showNav}>{content}</Page></div>;
}
