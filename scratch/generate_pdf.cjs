const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const mermaidCode = `flowchart TD

    %% -------------------------------------------------------------
    %% LANE 1: CAMPUS ARRIVAL & SCAN INITIATION
    %% -------------------------------------------------------------
    subgraph Lane_Arrival ["1. Person Arrival & Gate Entry"]
        P_Arrive(["Person Arrives at College Campus Gate / Hostel Entrance"]):::startEnd
        P_Approach["Approach Turnstile / Security Booth"]:::processNode
        P_Arrive --> P_Approach
    end

    %% -------------------------------------------------------------
    %% LANE 2: SECURITY GUARD / WARDEN GATE VERIFICATION
    %% -------------------------------------------------------------
    subgraph Lane_Security ["2. Security Guard & Warden Gate Verification Portal"]
        SG_Camera{"Is Webcam / Video Feed Operational?"}:::decisionNode
        SG_CamFail["Camera Error: Fallback to Manual ID Lookup"]:::warnNode
        SG_Scan["Security Guard Initiates Face Scan (LevelOneScan)"]:::processNode
        SG_AI_Match{"Biometric Model Check: Cosine Sim >= 0.60?"}:::decisionNode
        
        SG_EnrolledCheck{"Is Enrolled Person Authorized for Campus Entry?"}:::decisionNode
        SG_AuthGrant["Access Granted: Display Student/Staff Card (Green Banner)"]:::authNode
        SG_LogAuth["Log Normal Entry to Backend (POST /access-logs/)"]:::processNode
        SG_EndAuth(["Person Allowed Entry Into Campus"]):::startEnd

        SG_FlaggedCheck["Display Flagged / Debarred Warning to Guard"]:::warnNode
        SG_UnrecScreen["Display Unrecognized Result Screen (Low Match Score)"]:::warnNode
        SG_ManualID{"Guard Enters Register / Roll Number Manually"}:::decisionNode
        SG_ManualMatch{"Student Found in Institution Database?"}:::decisionNode
        
        SG_OpenUnauthForm["Open Unauthorized Incident Form (UnauthorizedForm)"]:::unauthNode
        SG_FillDetails["Capture Intruder Photo, Select Person Type, Location, & Reason"]:::processNode
        SG_SubmitUnauth["Click Submit Incident Report (POST /access-logs/unauthorized)"]:::processNode
        SG_PendingConfirm["Display Notification: Incident Reported (Pending Verification)"]:::pendingNode
    end

    %% -------------------------------------------------------------
    %% LANE 3: BACKEND API & POSTGRESQL DATABASE PERSISTENCE
    %% -------------------------------------------------------------
    subgraph Lane_Backend ["3. Backend API & PostgreSQL Database Layer"]
        DB_SaveAuth[("PostgreSQL: access_logs - Status: Authorized - Decision: Granted")]:::dbNode
        DB_SavePhoto["Save Captured Snapshot to uploads/intruders/ & /faces/captured/"]:::processNode
        DB_GenID["Generate Unique Event ID - e.g. DEN-20261105-XXXX"]:::processNode
        DB_InsertLog[("PostgreSQL: access_logs - verification_status: Unauthorized - review_status: Pending Verification")]:::dbNode
        
        API_PollQueue["Supervisor / CSO Polling Endpoints: GET /access-logs/supervisor-unauthorized"]:::processNode
        
        API_ReviewEndpoint["Review API Endpoint: POST /api/v1/access-logs/{id}/review"]:::processNode
        DB_CheckScope{"Supervisor Scope Validation: Guard Assigned to Supervisor?"}:::decisionNode
        DB_Scope403["Reject Review with 403 Forbidden"]:::unauthNode
        DB_UpdateReview[("PostgreSQL: access_logs - Update review_status, verification_status & Append ReviewAction")]:::dbNode
        
        API_QueryEntries["Campus Entries & Audit Query Endpoints: GET /api/v1/access-logs/"]:::processNode
    end

    %% -------------------------------------------------------------
    %% LANE 4: CAMPUS SUPERVISOR ADJUDICATION
    %% -------------------------------------------------------------
    subgraph Lane_Supervisor ["4. Campus Supervisor Alert & Review Workflow"]
        SUP_Notify["Campus Supervisor Portal (Alerts Badge Counter Increments)"]:::pendingNode
        SUP_OpenEvent["Supervisor Opens Pending Alert: Reviews Photo, Gate, & Guard Notes"]:::processNode
        SUP_Decision{"Supervisor Decision on Unauthorized Event"}:::decisionNode
        
        %% Branch A: Authorised
        SUP_ClickAuth["Click 'Authorised'"]:::authNode
        SUP_AuthModal["Open Authorised Confirmation Dialog (Optional Verification Notes / Action Taken)"]:::authNode
        SUP_AuthSubmit["Confirm Authorisation (with or without notes)"]:::authNode
        
        %% Branch B: Unauthorised
        SUP_ClickUnauth["Click 'Unauthorised'"]:::unauthNode
        SUP_UnauthModal["Open Unauthorised Confirmation Dialog (Mandatory Incident Fields)"]:::unauthNode
        SUP_ValCheck{"All Mandatory Fields Filled? (Name, Address, Phone, Loc, Time, Action Taken)"}:::decisionNode
        SUP_ValFail["Validation Error: Highlight Empty Fields & Return"]:::warnNode
        SUP_UnauthSubmit["Confirm Unauthorised Decision & Save Incident Details"]:::unauthNode
        
        %% Branch C: Revoke
        SUP_ClickRevoke["Click 'Revoke'"]:::warnNode
        SUP_RevokeModal["Open Revoke Confirmation Dialog (Mandatory Reason for Revocation)"]:::warnNode
        SUP_RevokeVal{"Is Revocation Reason Provided?"}:::decisionNode
        SUP_RevokeFail["Validation Error: Reason Required"]:::warnNode
        SUP_RevokeSubmit["Confirm Revocation"]:::warnNode
    end

    %% -------------------------------------------------------------
    %% LANE 5: CHIEF SECURITY OFFICER (CSO) ADJUDICATION & AUDIT
    %% -------------------------------------------------------------
    subgraph Lane_CSO ["5. Chief Security Officer (CSO) Review & Monitoring"]
        CSO_Alerts["CSO Portal Alerts View (Cross-Campus High-Priority Queue)"]:::pendingNode
        CSO_OpenEvent["CSO Opens Event: Reviews Guard & Supervisor Actions"]:::processNode
        CSO_Decision{"CSO Action on Event"}:::decisionNode
        
        CSO_AuthAction["CSO Approves as Authorised (Optional Action Taken Notes)"]:::authNode
        CSO_UnauthAction["CSO Confirms Unauthorised (Mandatory Incident Details & Action Taken)"]:::unauthNode
        CSO_RevokeAction["CSO Revokes Decision (Mandatory Reason for Revocation)"]:::warnNode
        
        CSO_EntriesTab["CSO Campus Entries View: Real-Time Movement Log"]:::processNode
        CSO_ActionCol["Inspect 'Action Taken' Column for Operational Compliance"]:::processNode
        CSO_StudentDir["CSO Student Directory: Manage Student Enrollments & Biometrics"]:::processNode
    end

    %% -------------------------------------------------------------
    %% LANE 6: HIGHER OFFICIALS (MANAGER & INSTITUTE MANAGER)
    %% -------------------------------------------------------------
    subgraph Lane_HigherAuth ["6. Manager & Institute Manager (Read-Only Oversight)"]
        MGR_Portal["Manager / Institute Manager Portal Dashboard"]:::processNode
        MGR_Overview["Overview Dashboard: Movements, Authorized, Unauthorized, Alerts"]:::processNode
        MGR_EntriesTable["Campus Entries Table (Strictly Read-Only Access)"]:::processNode
        MGR_ViewActionTaken["Review 'Action Taken' Column: E.g., 'Denied entry', 'Escorted out'"]:::authNode
        MGR_AuditView["Review Full Verification History & Actor Identity (Supervisor / CSO)"]:::processNode
        MGR_NoEdit(["Read-Only Scope: Higher Officials Cannot Modify Operational Security Decisions"]):::startEnd
    end

    %% -------------------------------------------------------------
    %% LANE 7: SYSTEM ADMINISTRATOR
    %% -------------------------------------------------------------
    subgraph Lane_Admin ["7. System Administrator (System Governance)"]
        ADM_Portal["Admin Portal: Full System Governance"]:::adminNode
        ADM_Users["User Administration: Create/Deactivate Guards, Supervisors, Wardens"]:::adminNode
        ADM_CrossInst["Cross-Institution Campus Entries & Audit Log Monitoring"]:::adminNode
        ADM_Config["Institution & Gateway Hardware Configuration"]:::adminNode
        ADM_DBDirect["Backend Database & System Recovery Control"]:::adminNode
    end

    %% -------------------------------------------------------------
    %% WORKFLOW CONNECTIONS ACROSS LANES
    %% -------------------------------------------------------------

    %% Arrival to Security Scan
    P_Approach --> SG_Camera
    SG_Camera -- "Yes (Webcam OK)" --> SG_Scan
    SG_Camera -- "No (Hardware/Permission Fail)" --> SG_CamFail
    SG_CamFail --> SG_ManualID

    %% AI Face Matching
    SG_Scan --> SG_AI_Match
    SG_AI_Match -- "Yes (Score >= 0.60)" --> SG_EnrolledCheck
    SG_AI_Match -- "No (Score < 0.60 / Unknown)" --> SG_UnrecScreen

    %% Enrolled Person Checks
    SG_EnrolledCheck -- "Access Permitted" --> SG_AuthGrant
    SG_EnrolledCheck -- "Flagged / Restricted" --> SG_FlaggedCheck
    SG_FlaggedCheck --> SG_OpenUnauthForm

    SG_AuthGrant --> SG_LogAuth
    SG_LogAuth --> DB_SaveAuth
    DB_SaveAuth --> SG_EndAuth

    %% Unrecognized Screen & Fallback
    SG_UnrecScreen --> SG_ManualID
    SG_ManualID --> SG_ManualMatch
    SG_ManualMatch -- "Valid Student Found" --> SG_EnrolledCheck
    SG_ManualMatch -- "Not Found / Outsider" --> SG_OpenUnauthForm

    %% Guard Incident Reporting
    SG_OpenUnauthForm --> SG_FillDetails
    SG_FillDetails --> SG_SubmitUnauth
    SG_SubmitUnauth --> DB_SavePhoto
    DB_SavePhoto --> DB_GenID
    DB_GenID --> DB_InsertLog
    DB_InsertLog --> SG_PendingConfirm

    %% Dispatch from Database to Supervisor & CSO
    DB_InsertLog --> API_PollQueue
    API_PollQueue --> SUP_Notify
    API_PollQueue --> CSO_Alerts

    %% Campus Supervisor Review Flow
    SUP_Notify --> SUP_OpenEvent
    SUP_OpenEvent --> SUP_Decision

    %% Supervisor Authorised Branch
    SUP_Decision -- "Authorise" --> SUP_ClickAuth
    SUP_ClickAuth --> SUP_AuthModal
    SUP_AuthModal --> SUP_AuthSubmit
    SUP_AuthSubmit --> API_ReviewEndpoint

    %% Supervisor Unauthorised Branch
    SUP_Decision -- "Mark Unauthorised" --> SUP_ClickUnauth
    SUP_ClickUnauth --> SUP_UnauthModal
    SUP_UnauthModal --> SUP_ValCheck
    SUP_ValCheck -- "Missing Fields" --> SUP_ValFail
    SUP_ValFail --> SUP_UnauthModal
    SUP_ValCheck -- "All Valid" --> SUP_UnauthSubmit
    SUP_UnauthSubmit --> API_ReviewEndpoint

    %% Supervisor Revoke Branch
    SUP_Decision -- "Revoke" --> SUP_ClickRevoke
    SUP_ClickRevoke --> SUP_RevokeModal
    SUP_RevokeModal --> SUP_RevokeVal
    SUP_RevokeVal -- "Missing Reason" --> SUP_RevokeFail
    SUP_RevokeFail --> SUP_RevokeModal
    SUP_RevokeVal -- "Valid Reason" --> SUP_RevokeSubmit
    SUP_RevokeSubmit --> API_ReviewEndpoint

    %% CSO Review Flow
    CSO_Alerts --> CSO_OpenEvent
    CSO_OpenEvent --> CSO_Decision
    CSO_Decision -- "Authorise" --> CSO_AuthAction
    CSO_Decision -- "Mark Unauthorised" --> CSO_UnauthAction
    CSO_Decision -- "Revoke" --> CSO_RevokeAction
    CSO_AuthAction --> API_ReviewEndpoint
    CSO_UnauthAction --> API_ReviewEndpoint
    CSO_RevokeAction --> API_ReviewEndpoint

    %% Backend Review Adjudication & DB Persistence
    API_ReviewEndpoint --> DB_CheckScope
    DB_CheckScope -- "Unauthorized Guard Scope" --> DB_Scope403
    DB_CheckScope -- "Valid Scope" --> DB_UpdateReview

    %% Database updates reflect across monitoring portals
    DB_UpdateReview --> API_QueryEntries
    API_QueryEntries --> CSO_EntriesTab
    CSO_EntriesTab --> CSO_ActionCol
    CSO_Alerts --> CSO_StudentDir

    API_QueryEntries --> MGR_Portal
    MGR_Portal --> MGR_Overview
    MGR_Portal --> MGR_EntriesTable
    MGR_EntriesTable --> MGR_ViewActionTaken
    MGR_EntriesTable --> MGR_AuditView
    MGR_AuditView --> MGR_NoEdit

    API_QueryEntries --> ADM_Portal
    ADM_Portal --> ADM_Users
    ADM_Portal --> ADM_CrossInst
    ADM_Portal --> ADM_Config
    ADM_Portal --> ADM_DBDirect

    %% -------------------------------------------------------------
    %% CLASS DEFINITIONS & COLOR CODING
    %% -------------------------------------------------------------
    classDef startEnd fill:#1e293b,stroke:#0f172a,stroke-width:2px,color:#ffffff;
    classDef processNode fill:#e2e8f0,stroke:#64748b,stroke-width:2px,color:#0f172a;
    classDef decisionNode fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e;
    classDef authNode fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d;
    classDef unauthNode fill:#fee2e2,stroke:#dc2626,stroke-width:2px,color:#7f1d1d;
    classDef pendingNode fill:#ffedd5,stroke:#ea580c,stroke-width:2px,color:#7c2d12;
    classDef warnNode fill:#fef9c3,stroke:#ca8a04,stroke-width:2px,color:#713f12;
    classDef dbNode fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#4c1d95;
    classDef adminNode fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1;
`;

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Campus Security Complete End-to-End Workflow Flowchart</title>
<style>
  @page {
    size: A3 landscape;
    margin: 12mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: #ffffff;
    color: #0f172a;
    margin: 0;
    padding: 0;
  }
  .header-card {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
    padding: 24px 32px;
    border-radius: 12px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  .header-title {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin: 0 0 6px 0;
  }
  .header-subtitle {
    font-size: 13px;
    color: #94a3b8;
    margin: 0;
  }
  .header-badge {
    background-color: #3b82f6;
    color: white;
    padding: 6px 14px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .flowchart-container {
    background-color: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    overflow: visible;
  }
  .flowchart-container svg {
    width: 100% !important;
    height: auto !important;
    max-height: 850px;
  }
  .section-title {
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
    margin: 24px 0 12px 0;
    padding-bottom: 6px;
    border-bottom: 2px solid #e2e8f0;
  }
  .legend-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    font-size: 12px;
    font-weight: 600;
  }
  .legend-pill {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    flex-shrink: 0;
  }
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    margin-bottom: 20px;
    font-size: 11px;
  }
  table.data-table th {
    background-color: #f1f5f9;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
  }
  table.data-table td {
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    color: #1e293b;
  }
  table.data-table tr:nth-child(even) td {
    background-color: #f8fafc;
  }
  .page-break {
    page-break-before: always;
  }
</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>

  <div class="header-card">
    <div>
      <h1 class="header-title">CAMPUS SECURITY APPLICATION — END-TO-END WORKFLOW FLOWCHART</h1>
      <p class="header-subtitle">Unified Architecture, Gate Facial Biometrics, Incident Adjudication, & Multi-Role Governance</p>
    </div>
    <div class="header-badge">Production Architecture 2026</div>
  </div>

  <div class="flowchart-container">
    <div id="mermaid-target"></div>
  </div>

  <div class="section-title">Workflow Visual Legend & Role Conventions</div>
  <div class="legend-grid">
    <div class="legend-item" style="background-color: #f8fafc;">
      <div class="legend-pill" style="background-color: #1e293b;"></div>
      <span>Start / End Boundary (Arrival / Granted)</span>
    </div>
    <div class="legend-item" style="background-color: #f8fafc;">
      <div class="legend-pill" style="background-color: #fef3c7; border: 1.5px solid #d97706;"></div>
      <span>Decision Diamond (Threshold / Validation)</span>
    </div>
    <div class="legend-item" style="background-color: #dcfce7;">
      <div class="legend-pill" style="background-color: #16a34a;"></div>
      <span>Authorized Path (Granted / Permitted)</span>
    </div>
    <div class="legend-item" style="background-color: #fee2e2;">
      <div class="legend-pill" style="background-color: #dc2626;"></div>
      <span>Unauthorized Path (Denied / Incident)</span>
    </div>
    <div class="legend-item" style="background-color: #ffedd5;">
      <div class="legend-pill" style="background-color: #ea580c;"></div>
      <span>Pending Verification Alert Queue</span>
    </div>
    <div class="legend-item" style="background-color: #fef9c3;">
      <div class="legend-pill" style="background-color: #ca8a04;"></div>
      <span>Exception / Fallback / Revocation</span>
    </div>
    <div class="legend-item" style="background-color: #ede9fe;">
      <div class="legend-pill" style="background-color: #7c3aed;"></div>
      <span>PostgreSQL & API Persistence Layer</span>
    </div>
    <div class="legend-item" style="background-color: #e0f2fe;">
      <div class="legend-pill" style="background-color: #0284c7;"></div>
      <span>System Administrator & Audit Control</span>
    </div>
  </div>

  <div class="page-break"></div>

  <div class="section-title">Status Transition & Lifecycle Reference Matrix</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Previous Status</th>
        <th>Triggering Action</th>
        <th>Acting Role</th>
        <th>New Status</th>
        <th>Verification Status</th>
        <th>Action History Stored</th>
        <th>Higher Authority Visibility</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>None (Arrival)</strong></td>
        <td>Face Scan Recognized & Authorized (Cosine Sim &ge; 0.60)</td>
        <td>Security Guard / Warden</td>
        <td>Completed</td>
        <td>Authorized</td>
        <td>Access Log created with normal entry timestamp</td>
        <td>Visible in Campus Entries as Authorized</td>
      </tr>
      <tr>
        <td><strong>None (Arrival)</strong></td>
        <td>Unrecognized Face or Flagged Person (Fallback Unmatched)</td>
        <td>Security Guard / Warden</td>
        <td>Pending Verification</td>
        <td>Unauthorized</td>
        <td>Incident record with captured photo, gate ID, & guard notes</td>
        <td>Alerts queue badge counter increments in real-time</td>
      </tr>
      <tr>
        <td><strong>Pending Verification</strong></td>
        <td>Authorise with optional notes / Action Taken</td>
        <td>Campus Supervisor / CSO</td>
        <td>Authorised</td>
        <td>Authorized</td>
        <td>ReviewAction with supervisor name, employee code, timestamp</td>
        <td>Status updated; optional notes visible in entry details</td>
      </tr>
      <tr>
        <td><strong>Pending Verification</strong></td>
        <td>Mark Unauthorised (Mandatory Incident Details & Action Taken)</td>
        <td>Campus Supervisor / CSO</td>
        <td>Unauthorised</td>
        <td>Unauthorized</td>
        <td>ReviewAction with Full Name, Address, Phone, Action Taken</td>
        <td><strong>Action Taken column displays recorded action</strong></td>
      </tr>
      <tr>
        <td><strong>Pending Verification</strong></td>
        <td>Revoke with mandatory justification</td>
        <td>Campus Supervisor / CSO</td>
        <td>Revoked</td>
        <td>Revoked</td>
        <td>ReviewAction with mandatory revocation reason</td>
        <td>Marked Revoked; locked against further modifications</td>
      </tr>
      <tr>
        <td><strong>Authorised</strong></td>
        <td>Re-evaluate as Unauthorised</td>
        <td>Chief Security Officer (CSO)</td>
        <td>Unauthorised</td>
        <td>Unauthorized</td>
        <td>Appends second ReviewAction with updated incident fields</td>
        <td>Real-time update across all higher-official portals</td>
      </tr>
      <tr>
        <td><strong>Unauthorised</strong></td>
        <td>Re-evaluate as Authorised</td>
        <td>Chief Security Officer (CSO)</td>
        <td>Authorised</td>
        <td>Authorized</td>
        <td>Appends second ReviewAction with authorization notes</td>
        <td>Real-time update across all higher-official portals</td>
      </tr>
      <tr>
        <td><strong>Revoked</strong></td>
        <td>Subsequent Review Attempt</td>
        <td>Any Role</td>
        <td><strong>LOCKED</strong></td>
        <td><strong>LOCKED</strong></td>
        <td>Action blocked by backend guard (if prev == Revoked return)</td>
        <td>Preserved permanently as an immutable audit record</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">Comprehensive Role-Permission Reference Matrix</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Application Capability</th>
        <th>Security Guard</th>
        <th>Warden</th>
        <th>Campus Supervisor</th>
        <th>Chief Security Officer (CSO)</th>
        <th>Manager</th>
        <th>Institute Manager</th>
        <th>Admin</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Initiate Face Scan at Gate</strong></td>
        <td>Yes</td>
        <td>Yes (Hostel)</td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
      </tr>
      <tr>
        <td><strong>Manual Register No. Fallback</strong></td>
        <td>Yes</td>
        <td>Yes</td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
        <td>Yes</td>
      </tr>
      <tr>
        <td><strong>Log Unauthorized Incident Form</strong></td>
        <td>Yes</td>
        <td>Yes</td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
        <td>Yes</td>
      </tr>
      <tr>
        <td><strong>Receive Real-time Alert Badges</strong></td>
        <td>No</td>
        <td>No</td>
        <td>Yes</td>
        <td>Yes</td>
        <td>No</td>
        <td>No</td>
        <td>Yes</td>
      </tr>
      <tr>
        <td><strong>Authorise Pending Incident</strong></td>
        <td>No</td>
        <td>No</td>
        <td>Yes</td>
        <td>Yes</td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
      </tr>
      <tr>
        <td><strong>Mark Unauthorised (w/ Action Taken)</strong></td>
        <td>No</td>
        <td>No</td>
        <td>Yes</td>
        <td>Yes</td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
      </tr>
      <tr>
        <td><strong>Revoke Incident Decision</strong></td>
        <td>No</td>
        <td>No</td>
        <td>Yes</td>
        <td>Yes</td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
      </tr>
      <tr>
        <td><strong>View Dedicated Action Taken Column</strong></td>
        <td>No</td>
        <td>No</td>
        <td>Yes</td>
        <td>Yes</td>
        <td>Yes</td>
        <td>Yes</td>
        <td>Yes</td>
      </tr>
      <tr>
        <td><strong>Export Entry Logs (CSV / PDF)</strong></td>
        <td>No</td>
        <td>No</td>
        <td>Yes</td>
        <td>Yes</td>
        <td>Yes</td>
        <td>Yes</td>
        <td>Yes</td>
      </tr>
      <tr>
        <td><strong>Operational Record Scope</strong></td>
        <td>Own Gate</td>
        <td>Hostel Gate</td>
        <td>Assigned Scope</td>
        <td>Cross-Campus Scope</td>
        <td>Read-Only</td>
        <td>Read-Only</td>
        <td>Full System</td>
      </tr>
      <tr>
        <td><strong>User & Role Provisioning</strong></td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
        <td>Yes</td>
      </tr>
    </tbody>
  </table>

</body>
</html>`;

async function generate() {
  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 2400, height: 1600, deviceScaleFactor: 2 });

  console.log('Setting HTML content and loading Mermaid...');
  await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

  console.log('Rendering Mermaid flowchart to vector SVG...');
  const renderResult = await page.evaluate(async (chartCode) => {
    try {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        flowchart: {
          useMaxWidth: false,
          htmlLabels: false,
          curve: 'basis'
        }
      });
      const { svg } = await window.mermaid.render('flowchartSvg', chartCode);
      document.getElementById('mermaid-target').innerHTML = svg;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, mermaidCode);

  if (!renderResult.success) {
    console.error('Mermaid render error:', renderResult.error);
    await browser.close();
    process.exit(1);
  }

  console.log('Mermaid successfully rendered into DOM!');
  // Wait brief moment for layout
  await new Promise(r => setTimeout(r, 1000));

  const projectPdfPath = path.resolve('C:\\Users\\Sharan Mathav\\.gemini\\antigravity\\scratch\\Campus-secure\\Campus_Security_Complete_Flowchart.pdf');
  const brainPdfPath = path.resolve('C:\\Users\\Sharan Mathav\\.gemini\\antigravity\\brain\\3fa134b7-268b-4a03-9578-897bc26fb00c\\Campus_Security_Complete_Flowchart.pdf');

  console.log('Generating PDF to:', projectPdfPath);
  await page.pdf({
    path: projectPdfPath,
    format: 'A3',
    landscape: true,
    printBackground: true,
    margin: {
      top: '12mm',
      right: '12mm',
      bottom: '12mm',
      left: '12mm'
    }
  });

  fs.copyFileSync(projectPdfPath, brainPdfPath);
  console.log('PDF copied to brain artifacts directory:', brainPdfPath);

  const stats = fs.statSync(projectPdfPath);
  console.log('PDF generated successfully! Size:', stats.size, 'bytes');

  await browser.close();
}

generate().catch(err => {
  console.error('Fatal error during PDF generation:', err);
  process.exit(1);
});
