import puppeteer from 'puppeteer-core';

const BASE_URL = 'http://localhost:8443';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loginAs(page, username, password = '12345') {
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE_URL);
  await page.waitForSelector('input[placeholder*="username" i]', { timeout: 6000 });

  await page.evaluate((u, p) => {
    function setVal(el, val) {
      const proto = el.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      const lastValue = el.value;
      desc.set.call(el, val);
      const tracker = el._valueTracker;
      if (tracker) tracker.setValue(lastValue);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const uIn = document.querySelector('input[placeholder*="username" i]');
    const pIn = document.querySelector('input[placeholder*="password" i]');
    if (uIn) setVal(uIn, u);
    if (pIn) setVal(pIn, p);

    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign in'));
    if (btn) btn.click();
  }, username, password);

  await sleep(1200);
}

async function runEndToEndTests() {
  console.log('================================================================');
  console.log('STARTING COMPLETE END-TO-END AUTOMATED VERIFICATION');
  console.log('================================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const summary = {
    steps: {},
    persistence: {},
    diagnostics: []
  };

  try {
    // ----------------------------------------------------
    // STEP 1: Verify Application Load & DB Fallback
    // ----------------------------------------------------
    console.log('\n>>> STEP 1: Verifying Application Load & Connectivity...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    const pageTitle = await page.title();
    console.log('App Title:', pageTitle);
    summary.steps['Step 1 - Application & Connectivity'] = pageTitle.includes('Campus Secure') ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // STEP 2: Create Test Student in CSO Portal
    // ----------------------------------------------------
    console.log('\n>>> STEP 2: Create Test Student in CSO Portal...');
    await loginAs(page, 'cso', '12345');

    // Click "Add new student" button
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(btn => btn.innerText.includes('Add new student'));
      if (b) b.click();
    });
    await page.waitForSelector('input[placeholder="e.g. Arun Kumar"]', { timeout: 6000 });

    // Type name, reg number, department, year, accommodation
    const nameInput = await page.$('input[placeholder="e.g. Arun Kumar"]');
    await nameInput.click();
    await page.keyboard.type('Workflow Test Student');

    const regInput = await page.$('input[placeholder="e.g. 23IT1042"]');
    await regInput.click();
    await page.keyboard.type('TEST2026001');

    const selects = await page.$$('select');
    await selects[0].select('Computer Science & Engineering');
    await selects[1].select('III');
    await selects[3].select('Hosteller');
    await sleep(400);

    // Trigger form submit
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
    await sleep(3500);

    const enrolledText = await page.evaluate(() => document.body.innerText);
    const enrolledOk = enrolledText.includes('FACE MODEL TRAINED') && enrolledText.includes('TEST2026001');
    console.log('CSO Student Enrolled & Trained:', enrolledOk);
    summary.steps['Step 2 - CSO Student Enrollment'] = enrolledOk ? 'PASS' : 'FAIL';

    // Verify search in Manager Students
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(btn => btn.innerText.includes('View all students'));
      if (b) b.click();
    });
    await sleep(1000);

    const searchInput = await page.$('.search-input input, input[placeholder*="Search" i]');
    if (searchInput) {
      await searchInput.click({ clickCount: 3 });
      await searchInput.type('TEST2026001');
      await sleep(600);
      const searchRes = await page.evaluate(() => document.body.innerText);
      const searchOk = searchRes.includes('Workflow Test Student');
      console.log('Student directory search by Reg No:', searchOk);
      summary.steps['Step 2 - Student Directory Search'] = searchOk ? 'PASS' : 'FAIL';
    }

    // ----------------------------------------------------
    // STEP 3: Welfare Portal Accommodation Update (Hosteler -> PG)
    // ----------------------------------------------------
    console.log('\n>>> STEP 3: Welfare Portal Accommodation Update (Hosteler -> PG)...');
    await loginAs(page, 'welfare', '12345');

    // Click Accommodation Details
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(btn => btn.innerText.includes('Accommodation Details'));
      if (b) b.click();
    });
    await sleep(1000);

    // Open search dropdown
    await page.evaluate(() => {
      document.querySelector('.searchable-student-trigger')?.click();
    });
    await sleep(400);

    // Search TEST2026001
    const accSearchInput = await page.$('.searchable-search-input');
    await accSearchInput.type('TEST2026001');
    await sleep(600);

    // Select TEST2026001
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.searchable-item'));
      const t = items.find(i => i.innerText.includes('TEST2026001'));
      if (t) t.click();
    });
    await sleep(600);

    // Click Edit
    await page.evaluate(() => {
      document.querySelector('.edit-residence-btn')?.click();
    });
    await sleep(500);

    // Switch to PG
    await page.evaluate(() => {
      const opts = Array.from(document.querySelectorAll('.residence-type-option'));
      const pg = opts.find(o => o.innerText.includes('PG'));
      if (pg) pg.click();
    });
    await sleep(400);

    // Fill PG details using value tracker
    await page.evaluate(() => {
      function setVal(el, val) {
        const proto = el.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        const lastValue = el.value;
        desc.set.call(el, val);
        const tracker = el._valueTracker;
        if (tracker) tracker.setValue(lastValue);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const pgName = document.querySelector('input[placeholder*="Sri Sai Deluxe PG"]');
      if (pgName) setVal(pgName, 'Workflow Test PG');

      const pgAddr = document.querySelector('textarea[placeholder*="postal address"]');
      if (pgAddr) setVal(pgAddr, '12, Salai Road, Tiruchirappalli, Tamil Nadu 620018');

      const pgPhone = document.querySelector('input[placeholder*="9876543210 or"]');
      if (pgPhone) setVal(pgPhone, '9876543219');

      const notes = document.querySelector('textarea[placeholder*="warden remarks"]');
      if (notes) setVal(notes, 'Accommodation workflow testing.');
    });

    // Save changes
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.residence-form-actions button'));
      const s = btns.find(b => b.innerText.includes('Save'));
      if (s) s.click();
    });
    await sleep(2000);

    const welfareAfterSave = await page.evaluate(() => document.body.innerText);
    const welfareOk = welfareAfterSave.includes('Workflow Test PG') && welfareAfterSave.includes('PG') && welfareAfterSave.includes('Updated by Dr. Kavitha Rao');
    console.log('Welfare Accommodation updated to PG:', welfareOk);
    summary.steps['Step 3 - Welfare Accommodation Update (Hosteler -> PG)'] = welfareOk ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // STEP 4: Security Guard Portal - Record Unauthorized Event
    // ----------------------------------------------------
    console.log('\n>>> STEP 4: Security Guard Records Unauthorized Event...');
    await loginAs(page, 'security', '12345');

    // Click Scan
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const scanBtn = btns.find(b => b.innerText.includes('Scan') || b.className.includes('scan'));
      if (scanBtn) scanBtn.click();
    });
    await sleep(1000);

    // Trigger live scan
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.innerText.includes('Scan face with live camera'));
      if (b) b.click();
    });
    await sleep(1200);

    // Click Mark as unauthorized
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.innerText.includes('Mark as unauthorized'));
      if (b) b.click();
    });
    await sleep(1000);

    // Fill Unauthorized Form
    await page.evaluate(() => {
      function setVal(el, val) {
        const proto = el.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        const lastValue = el.value;
        desc.set.call(el, val);
        const tracker = el._valueTracker;
        if (tracker) tracker.setValue(lastValue);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const nameIn = document.querySelector('input[placeholder*="Name" i], input[type="text"]');
      if (nameIn) setVal(nameIn, 'Workflow Test Intruder');

      const phoneIn = document.querySelector('input[type="tel"], input[placeholder*="phone" i], input[placeholder*="Phone" i]');
      if (phoneIn) setVal(phoneIn, '9876543210');

      const notesIn = document.querySelector('textarea');
      if (notesIn) setVal(notesIn, 'Unauthorized attempt detected at Main Gate. Identity could not be verified.');

      const btns = Array.from(document.querySelectorAll('button'));
      const submitBtn = btns.find(b => b.innerText.includes('Record & notify') || b.innerText.includes('Record unauthorized'));
      if (submitBtn) submitBtn.click();
    });
    await sleep(2000);

    const securitySubmitText = await page.evaluate(() => document.body.innerText);
    const securityOk = securitySubmitText.includes('CAMPUS SUPERVISOR NOTIFIED') || securitySubmitText.includes('Unauthorized event recorded');
    console.log('Security Unauthorized event logged:', securityOk);
    summary.steps['Step 4 - Security Guard Unauthorized Scan'] = securityOk ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // STEP 5: Campus Supervisor Reviews & Adds Action Taken
    // ----------------------------------------------------
    console.log('\n>>> STEP 5: Supervisor Reviews & Adds Action Taken...');
    await loginAs(page, 'supervisor', '12345');

    // Click Alerts via stat card or bottom nav
    await page.evaluate(() => {
      const alertsNavBtn = Array.from(document.querySelectorAll('.bottom-nav button')).find(b => b.innerText.includes('Alerts'));
      if (alertsNavBtn) {
        alertsNavBtn.click();
      } else {
        const statCard = document.querySelector('.dashboard-stats div:nth-child(2)');
        if (statCard) statCard.click();
      }
    });
    await sleep(1200);

    // Open first alert card
    const supAlerts = await page.$$('article.alert-card');
    if (supAlerts.length > 0) {
      await supAlerts[0].click();
      await sleep(1000);

      // Click Unauthorised
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(btn => btn.innerText.trim() === 'Unauthorised');
        if (b) b.click();
      });
      await sleep(600);

      // Fill in Supervisor Incident Dialog
      await page.evaluate(() => {
        function setVal(el, val) {
          const proto = el.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
          const desc = Object.getOwnPropertyDescriptor(proto, 'value');
          const lastValue = el.value;
          desc.set.call(el, val);
          const tracker = el._valueTracker;
          if (tracker) tracker.setValue(lastValue);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const dialog = document.querySelector('.confirm-dialog, .modal, .dialog, [role="dialog"]') || document.body;
        const inputs = Array.from(dialog.querySelectorAll('input, textarea'));
        inputs.forEach(el => {
          const ph = (el.getAttribute('placeholder') || '').toLowerCase();
          if (ph.includes('full name') || ph.includes('name')) {
            setVal(el, 'Workflow Test Intruder');
          } else if (ph.includes('address')) {
            setVal(el, '15, Cantonment, Tiruchirappalli');
          } else if (ph.includes('number') || el.type === 'tel') {
            setVal(el, '9876543210');
          } else if (ph.includes('action taken') || ph.includes('action') || ph.includes('notes')) {
            setVal(el, 'Person denied entry and referred to campus security for further verification.');
          }
        });

        const sel = dialog.querySelector('select');
        if (sel) {
          sel.value = 'Main Gate';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const btns = Array.from(dialog.querySelectorAll('button'));
        const b = btns.find(btn => btn.innerText.includes('Confirm') || btn.innerText.includes('Unauthorised'));
        if (b) b.click();
      });
      await sleep(2000);

      const supDetailsText = await page.evaluate(() => document.body.innerText);
      const supActionOk = supDetailsText.includes('Person denied entry and referred to campus security for further verification.');
      console.log('Supervisor Action Taken displayed in alert details:', supActionOk);
      summary.steps['Step 5 - Supervisor Action Taken Confirmation'] = supActionOk ? 'PASS' : 'FAIL';
    }

    // ----------------------------------------------------
    // STEP 6: Verify Action Taken in Higher-Official Portals
    // ----------------------------------------------------
    console.log('\n>>> STEP 6: Verify Action Taken in Manager Portal...');
    await loginAs(page, 'manager', '12345');

    // Click Institution entry logs
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.innerText.includes('Institution entry logs'));
      if (b) b.click();
    });
    await sleep(1200);

    const mgrHeaders = await page.evaluate(() => Array.from(document.querySelectorAll('th')).map(th => th.innerText.trim()));
    const mgrActionCol = mgrHeaders.includes('Action Taken');
    console.log('Manager Portal Action Taken column visible:', mgrActionCol);
    summary.steps['Step 6 - Manager Portal Action Taken Column'] = mgrActionCol ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // STEP 7: CSO Portal Action Taken & Decision Workflow
    // ----------------------------------------------------
    console.log('\n>>> STEP 7: CSO Action Taken Column & Decision Workflow...');
    await loginAs(page, 'cso', '12345');

    // 1. Entry logs table
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.innerText.includes('Institution entry logs'));
      if (b) b.click();
    });
    await sleep(1200);

    const csoHeaders = await page.evaluate(() => Array.from(document.querySelectorAll('th')).map(th => th.innerText.trim()));
    const csoActionCol = csoHeaders.includes('Action Taken');
    console.log('CSO Portal Action Taken column visible:', csoActionCol);
    summary.steps['Step 7 - CSO Portal Action Taken Column'] = csoActionCol ? 'PASS' : 'FAIL';

    // 2. CSO decision on separate pending alert
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.bottom-nav button'));
      const b = btns.find(btn => btn.innerText.includes('Alerts'));
      if (b) b.click();
    });
    await sleep(1200);

    const csoAlertArticles = await page.$$('article.alert-card');
    if (csoAlertArticles.length > 1) {
      await csoAlertArticles[1].click();
      await sleep(1000);

      // Check if alert has Unauthorised button
      const unauthBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.innerText.trim() === 'Unauthorised');
      });

      if (unauthBtn && (await unauthBtn.asElement())) {
        await unauthBtn.asElement().click();
        await sleep(600);

        // Fill CSO incident
        await page.evaluate(() => {
          function setVal(el, val) {
            const proto = el.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
            const desc = Object.getOwnPropertyDescriptor(proto, 'value');
            const lastValue = el.value;
            desc.set.call(el, val);
            const tracker = el._valueTracker;
            if (tracker) tracker.setValue(lastValue);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }

          const dialog = document.querySelector('.confirm-dialog, .modal, .dialog, [role="dialog"]') || document.body;
          const inputs = Array.from(dialog.querySelectorAll('input, textarea'));
          inputs.forEach(el => {
            const ph = (el.getAttribute('placeholder') || '').toLowerCase();
            if (ph.includes('full name') || ph.includes('name')) {
              setVal(el, 'CSO Handled Intruder');
            } else if (ph.includes('address')) {
              setVal(el, '10, Thillai Nagar, Trichy');
            } else if (ph.includes('number') || el.type === 'tel') {
              setVal(el, '9876543211');
            } else if (ph.includes('action taken') || ph.includes('action') || ph.includes('notes')) {
              setVal(el, 'CSO instructed security team to escort person out of premises.');
            }
          });

          const sel = dialog.querySelector('select');
          if (sel) {
            sel.value = 'Gate 1 Main Entrance';
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }

          const btns = Array.from(dialog.querySelectorAll('button'));
          const b = btns.find(btn => btn.innerText.includes('Confirm') || btn.innerText.includes('Unauthorised'));
          if (b) b.click();
        });
        await sleep(2000);
      }

      const csoDetailsText = await page.evaluate(() => document.body.innerText);
      const csoDecisionOk = csoDetailsText.includes('CSO instructed security team to escort person out of premises.');
      console.log('CSO Decision saved with distinct CSO Action Taken:', csoDecisionOk);
      summary.steps['Step 7 - CSO Unauthorized Decision Workflow'] = csoDecisionOk ? 'PASS' : 'FAIL';
    }

    // ----------------------------------------------------
    // STEP 8: Database & Backend API Persistence Verification
    // ----------------------------------------------------
    console.log('\n>>> STEP 8: Database & Backend API Persistence Verification...');
    // 1. Verify student record
    const studentRes = await fetch('http://localhost:8000/api/v1/students/?query=TEST2026001&institution_id=1');
    if (studentRes.ok) {
      const data = await studentRes.json();
      const match = data.find(s => s.register_number === 'TEST2026001');
      const persisted = Boolean(match && match.name === 'Workflow Test Student' && match.department === 'Computer Science & Engineering');
      console.log('Student record in DB:', persisted);
      summary.persistence['Student Persistence'] = persisted ? 'PASS' : 'FAIL';
    }

    // 2. Verify accommodation record
    const accRes = await fetch('http://localhost:8000/api/v1/students/accommodation/TEST2026001');
    if (accRes.ok) {
      const data = await accRes.json();
      const accOk = data.residence_type === 'PG' && data.pg_name === 'Workflow Test PG' && data.history && data.history.length > 0;
      console.log('Accommodation update in DB:', accOk);
      summary.persistence['Accommodation Persistence'] = accOk ? 'PASS' : 'FAIL';
    }

    // 3. Verify access logs & action taken
    const logsRes = await fetch('http://localhost:8000/api/v1/access-logs/?limit=10');
    if (logsRes.ok) {
      const data = await logsRes.json();
      const logOk = data.length > 0;
      console.log('Access logs count in DB:', data.length);
      summary.persistence['Access Logs Persistence'] = logOk ? 'PASS' : 'FAIL';
    }

  } catch (err) {
    console.error('Test execution caught error:', err);
    summary.diagnostics.push(err.message);
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log('FINAL END-TO-END TEST SUITE SUMMARY:');
  console.log(JSON.stringify(summary, null, 2));
  console.log('================================================================');
}

runEndToEndTests().catch(console.error);
