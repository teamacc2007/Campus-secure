# Campus Secure - API Documentation

The Campus Secure Backend API provides RESTful endpoints organized under `/api/v1`. Interactive OpenAPI documentation is accessible at `http://localhost:8000/api/v1/docs`.

## 1. Authentication (`/api/v1/auth`)
* `POST /login`: Authenticates user credentials (username, password), returns JWT Bearer access token, refresh token, and user profile.
* `GET /me`: Returns the authenticated user's profile and active permissions.

## 2. Students & Staff (`/api/v1/students`, `/api/v1/staff`)
* `GET /students/`: List students with search (`query`), `department`, and `residence_type` filters.
* `GET /students/by-register/{register_number}`: Get verified student profile.
* `POST /students/`: Enroll new student record.
* `GET /staff/`: List staff members with search and department filtering.
* `GET /staff/by-employee-id/{employee_id}`: Get verified staff profile.

## 3. Visitor Passes (`/api/v1/visitor-passes`)
* `POST /`: Issue single visitor pass with visitor info, purpose, validity dates, accessible blocks, and faculty coordinator.
* `GET /`: Search and list visitor passes with `status` filter (Active, Cancelled, Expired) and pagination.
* `GET /{pass_id}`: Retrieve detailed pass record.
* `POST /{pass_id}/cancel`: Cancel visitor pass. **Requires a mandatory operational cancellation reason** and preserves the original pass and audit history.

## 4. Bulk Entry (`/api/v1/bulk-import`)
* `GET /template`: Download sample XLSX template (`CampusSecure_Student_Entry_Template.xlsx`) with sheet `student-list` and columns `["Name", "Number", "Address", "Photo File Path"]`.
* `POST /preview`: Upload Excel file to validate column headers, detect row errors/duplicates, and preview parsed records.
* `POST /confirm`: Atomic transactional issuance of bulk visitor passes for the event.

## 5. Access Logs & Audits (`/api/v1/access-logs`)
* `POST /`: Record entry or exit event (Face recognition, Register ID, or Unauthorized flag).
* `GET /`: List access records scoped by user role.
* `GET /alerts`: List pending verification alerts for campus supervisors.
* `POST /{log_id}/review`: Supervisor review endpoint (`Verified`, `Unauthorised`, `Revoked`) appending to immutable review history.

## 6. AI & Biometrics (`/api/v1/ai`)
* `POST /verify-face`: Ingests base64 camera frame or register number, performs face detection, liveness anti-spoof checks, embedding extraction, and gallery matching. Automatically generates authorized access logs or supervisor incident alerts.
