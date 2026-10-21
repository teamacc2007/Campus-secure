# Campus Secure - Mobile App Frontend

A comprehensive, identity-led campus access and security mobile application frontend built with React 19, TypeScript, Vite, and Tailwind CSS.

## 🚀 Features & Roles

This application contains full frontend user experiences for 10 distinct campus roles:

- **Security Personnel (`security`):** Entry/exit scanning (Face Recognition / Register ID), unauthorized attempt logging, pass inspection, and critical alerts.
- **Hostel Warden (`warden`):** Student verification, entry/exit logs, and block monitoring.
- **Faculty / Staff (`staff`):** Student identification and departmental activity logging.
- **Campus Supervisor (`supervisor`):** Guard workload tracking, shift assignments, audit records, and security team management.
- **Access Supervisor (`access`):** Visitor pass issuance (single and bulk CSV/Excel import), pass records search, pass cancellation, and PDF/Excel export.
- **Student Affairs (`students`):** Verification records, student workload, and identity profile.
- **Student Welfare (`welfare`):** Block activity and student movement records.
- **System Administrator (`admin`):** User management, campus entries log, supervisor assignment, and shift worklogs.
- **Chief Security Officer (`cso`):** Institution-wide security oversight, entry analytics, and alerts.
- **Institute Manager (`manager`):** Campus-wide attendance and user directory overview.

## 💻 Tech Stack

- **Framework:** React 19 + TypeScript
- **Bundler:** Vite 8
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Exports:** jsPDF, XLSX

## 🛠️ Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- `pnpm` (or `npm`)

### Installation & Development

```bash
# Install dependencies
pnpm install

# Start local development server
pnpm dev
```

Open [http://localhost:8443](http://localhost:8443) (or the port specified in console) to view the application.

### Demo Credentials

Sign in with password: **`12345`** and any of the role usernames:
- `security`
- `warden`
- `staff`
- `supervisor`
- `access`
- `students`
- `welfare`
- `admin`
- `cso`
- `manager`
