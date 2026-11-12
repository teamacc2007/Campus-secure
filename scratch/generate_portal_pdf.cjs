const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const mermaidCode = `flowchart TD

    %% -------------------------------------------------------------
    %% SYSTEM GOVERNANCE & STUDENT WELFARE
    %% -------------------------------------------------------------
    Admin["Admin Portal<br/><b>(Application-Level Management)</b>"]:::adminPortal
    Welfare["Student Welfare Portal<br/><b>(Student Residence & Accommodation)</b>"]:::welfarePortal

    %% -------------------------------------------------------------
    %% OPERATIONAL SECURITY PORTALS
    %% -------------------------------------------------------------
    Security["Security Guard Portal<br/><b>(Gate Scanning & Incident Detection)</b>"]:::securityPortal
    Supervisor["Campus Supervisor Portal<br/><b>(Alerts & Incident Adjudication)</b>"]:::supervisorPortal
    CSO["CSO Portal<br/><b>(Chief Security Officer Oversight)</b>"]:::csoPortal

    %% -------------------------------------------------------------
    %% HIGHER-AUTHORITY OVERSIGHT PORTALS
    %% -------------------------------------------------------------
    Manager["Manager Portal<br/><b>(Campus Operational Logs & Oversight)</b>"]:::managerPortal
    InstManager["Institute Manager Portal<br/><b>(Executive Governance & Monitoring)</b>"]:::instManagerPortal

    %% -------------------------------------------------------------
    %% ADMIN MANAGEMENT FLOWS (Dotted Lines)
    %% -------------------------------------------------------------
    Admin -. "User Provisioning & System Config" .-> Security
    Admin -. "Role & Scope Assignments" .-> Supervisor
    Admin -. "System Administration" .-> CSO
    Admin -. "System Administration" .-> Manager
    Admin -. "Institutional Governance" .-> InstManager
    Admin -. "User & Portal Permissions" .-> Welfare

    %% -------------------------------------------------------------
    %% OPERATIONAL DATA & EVENT FLOWS (Solid Lines)
    %% -------------------------------------------------------------
    Welfare -->|"Student Residence Info (Hostel / PG / Day Scholar)"| Security
    Security -->|"Entry Logs & Unauthorized Alerts"| Supervisor
    Security -->|"Gate Scans & Cross-Campus Alerts"| CSO

    Supervisor -->|"Adjudicated Incidents & Action Taken"| CSO
    Supervisor -->|"Verified Campus Entry Records"| Manager

    CSO -->|"Cross-Campus Security Reports"| Manager
    Manager -->|"Consolidated Security Summaries"| InstManager
    Welfare -->|"Student Movement & Compliance Logs"| InstManager

    %% -------------------------------------------------------------
    %% COLOR SCHEMES
    %% -------------------------------------------------------------
    classDef adminPortal fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e3a8a;
    classDef welfarePortal fill:#fdf4ff,stroke:#c026d3,stroke-width:2px,color:#701a75;
    classDef securityPortal fill:#f8fafc,stroke:#475569,stroke-width:2px,color:#0f172a;
    classDef supervisorPortal fill:#fff7ed,stroke:#ea580c,stroke-width:2px,color:#7c2d12;
    classDef csoPortal fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#7f1d1d;
    classDef managerPortal fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d;
    classDef instManagerPortal fill:#faf5ff,stroke:#7c3aed,stroke-width:2px,color:#4c1d95;
`;

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Campus Security Front-End Portal Flowchart</title>
<style>
  @page {
    size: A3 landscape;
    margin: 14mm;
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
    padding: 22px 30px;
    border-radius: 12px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  .header-title {
    font-size: 24px;
    font-weight: 800;
    margin: 0 0 5px 0;
    letter-spacing: -0.5px;
  }
  .header-subtitle {
    font-size: 13px;
    color: #94a3b8;
    margin: 0;
  }
  .header-badge {
    background-color: #2563eb;
    color: white;
    padding: 6px 14px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .flowchart-container {
    background-color: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    display: flex;
    justify-content: center;
  }
  .flowchart-container svg {
    width: 100% !important;
    max-width: 1300px;
    height: auto !important;
  }
  .section-title {
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
    margin: 20px 0 10px 0;
    padding-bottom: 6px;
    border-bottom: 2px solid #e2e8f0;
  }
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    font-size: 12px;
  }
  table.data-table th {
    background-color: #f1f5f9;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 10px 14px;
    border: 1px solid #cbd5e1;
  }
  table.data-table td {
    padding: 9px 14px;
    border: 1px solid #e2e8f0;
    color: #1e293b;
  }
  table.data-table tr:nth-child(even) td {
    background-color: #f8fafc;
  }
  .portal-pill {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: 700;
    font-size: 11px;
  }
</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>

  <div class="header-card">
    <div>
      <h1 class="header-title">CAMPUS SECURITY APPLICATION — FRONT-END PORTAL CONNECTIVITY</h1>
      <p class="header-subtitle">High-Level Portal Interconnections, Event Propagation, & System Governance</p>
    </div>
    <div class="header-badge">7 Portals Unified Architecture</div>
  </div>

  <div class="flowchart-container">
    <div id="mermaid-target"></div>
  </div>

  <div class="section-title">Connected Portals Summary & Information Movement</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 22%;">Portal Name</th>
        <th style="width: 25%;">Primary Operational Role</th>
        <th style="width: 26%;">Information Sent To Other Portals</th>
        <th style="width: 27%;">Information Received From Other Portals</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="portal-pill" style="background: #eff6ff; color: #1e3a8a; border: 1px solid #2563eb;">Admin Portal</span></td>
        <td>Application-level governance and user management</td>
        <td>User accounts, roles, access scopes, and security policies</td>
        <td>System audit logs & cross-institution compliance status</td>
      </tr>
      <tr>
        <td><span class="portal-pill" style="background: #fdf4ff; color: #701a75; border: 1px solid #c026d3;">Student Welfare Portal</span></td>
        <td>Student residence management (Hostel / PG / Day Scholar)</td>
        <td>Student residence records to Security Guard; movements to Institute Manager</td>
        <td>Student enrollment directory and institutional movement records</td>
      </tr>
      <tr>
        <td><span class="portal-pill" style="background: #f8fafc; color: #0f172a; border: 1px solid #475569;">Security Guard Portal</span></td>
        <td>Campus gate face scanning & physical entry verification</td>
        <td>Real-time entry logs and unauthorized incident alerts with intruder photos</td>
        <td>Student residence info from Welfare; system config from Admin</td>
      </tr>
      <tr>
        <td><span class="portal-pill" style="background: #fff7ed; color: #7c2d12; border: 1px solid #ea580c;">Campus Supervisor Portal</span></td>
        <td>Alerts queue evaluation & incident adjudication</td>
        <td>Adjudicated decisions (Authorised/Unauthorised/Revoke) and Action Taken</td>
        <td>Real-time unauthorized incident alerts from gate security guards</td>
      </tr>
      <tr>
        <td><span class="portal-pill" style="background: #fef2f2; color: #7f1d1d; border: 1px solid #dc2626;">CSO Portal</span></td>
        <td>Chief Security Officer campus-wide monitoring</td>
        <td>Cross-campus security summaries, verified records, student biometrics</td>
        <td>Direct gate scans from Security Guard and incident reviews from Supervisor</td>
      </tr>
      <tr>
        <td><span class="portal-pill" style="background: #f0fdf4; color: #14532d; border: 1px solid #16a34a;">Manager Portal</span></td>
        <td>Campus operational oversight & movement log monitoring</td>
        <td>Consolidated campus security summaries to Institute Manager</td>
        <td>Verified entry logs & Action Taken descriptions from Supervisor and CSO</td>
      </tr>
      <tr>
        <td><span class="portal-pill" style="background: #faf5ff; color: #4c1d95; border: 1px solid #7c3aed;">Institute Manager Portal</span></td>
        <td>Executive governance and institutional compliance</td>
        <td>Executive directives and institutional compliance requirements</td>
        <td>Consolidated security summaries from Manager; student movement from Welfare</td>
      </tr>
    </tbody>
  </table>

</body>
</html>`;

async function run() {
  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 2400, height: 1600, deviceScaleFactor: 2 });

  console.log('Setting content and rendering Mermaid...');
  await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

  const renderResult = await page.evaluate(async (chartCode) => {
    try {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          curve: 'basis'
        }
      });
      const { svg } = await window.mermaid.render('portalFlowchartSvg', chartCode);
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

  await new Promise(r => setTimeout(r, 1000));

  const destPaths = [
    'C:\\Users\\Sharan Mathav\\.gemini\\antigravity\\scratch\\Campus-secure\\public\\Campus_Security_Portal_Flowchart.pdf',
    'C:\\Users\\Sharan Mathav\\Downloads\\Campus_Security_Portal_Flowchart.pdf',
    'C:\\Users\\Sharan Mathav\\Desktop\\Campus_Security_Portal_Flowchart.pdf',
    'C:\\Users\\Sharan Mathav\\.gemini\\antigravity\\brain\\3fa134b7-268b-4a03-9578-897bc26fb00c\\Campus_Security_Portal_Flowchart.pdf'
  ];

  const primaryPath = destPaths[0];
  console.log('Generating PDF to:', primaryPath);
  await page.pdf({
    path: primaryPath,
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

  for (let i = 1; i < destPaths.length; i++) {
    fs.copyFileSync(primaryPath, destPaths[i]);
    console.log('Copied to:', destPaths[i]);
  }

  const stats = fs.statSync(primaryPath);
  console.log('Portal Flowchart PDF generated successfully! Size:', stats.size, 'bytes');

  await browser.close();
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
