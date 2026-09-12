/**
 * =========================================================================
 * CLICKIIT.CO - GOOGLE APPS SCRIPT TWO-WAY SYNC & EMAIL DISPATCHER
 * =========================================================================
 * 
 * INSTRUCTIONS FOR SETUP:
 * 1. Open Google Sheets (https://sheets.new) and create a new sheet.
 *    Name it: "Clickiit Bookings 2026".
 * 
 * 2. In Row 1, add these exact column headers in order:
 *    A1: ID
 *    B1: Date Created
 *    C1: Client Name
 *    D1: WhatsApp Number
 *    E1: Event Date
 *    F1: Event Time
 *    G1: Session Plan
 *    H1: Event Type
 *    I1: Venue Address
 *    J1: Notes
 *    K1: Status
 *    L1: Last Updated
 * 
 * 3. In the Google Sheets menu, click: Extensions -> Apps Script.
 * 
 * 4. Replace everything in the script editor with this entire code.
 * 
 * 5. (Optional) In line 29 below, set your notification email:
 *    const NOTIFICATION_EMAIL = "your-email@gmail.com";
 * 
 * 6. Click the blue "Deploy" button (top right) -> "New deployment".
 *    - Select type: "Web app" (click gear icon -> Web app).
 *    - Description: "Clickiit Sync v1".
 *    - Execute as: "Me (your google account)".
 *    - Who has access: "Anyone" (CRITICAL: must be "Anyone" so your website can post to it).
 *    - Click "Deploy", then authorize permissions.
 * 
 * 7. Copy the "Web app URL" (looks like: https://script.google.com/macros/s/.../exec).
 * 
 * 8. Open your Clickiit Admin Panel (admin.html), click "Connect Google Sheet",
 *    paste your Web app URL, and click "Save & Test Connection"!
 * =========================================================================
 */

// OPTIONAL: Enter your email to receive instant alerts when someone books
const NOTIFICATION_EMAIL = ""; // e.g. "clickiit.studio@gmail.com"
const SEND_EMAIL_ALERTS = true;

/**
 * Handle GET Requests: Fetches all bookings as JSON for the Admin Panel
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createJsonResponse({ success: true, bookings: [] });
    }

    const headers = data[0];
    const bookings = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] && !row[2]) continue; // Skip empty rows

      const booking = {
        id: String(row[0] || ''),
        createdAt: formatDate(row[1]),
        name: String(row[2] || ''),
        whatsapp: String(row[3] || ''),
        eventDate: formatDate(row[4]),
        eventTime: String(row[5] || '18:00'),
        sessionPlan: String(row[6] || '4 Hours'),
        eventType: String(row[7] || 'Other Celebration'),
        address: String(row[8] || '-'),
        notes: String(row[9] || ''),
        status: String(row[10] || 'pending').toLowerCase().trim(),
        updatedAt: formatDate(row[11])
      };
      bookings.push(booking);
    }

    // Return newest first
    bookings.reverse();

    return createJsonResponse({
      success: true,
      total: bookings.length,
      bookings: bookings,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Handle POST Requests: Adds new bookings, updates status, deletes, or blocks dates
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Wait up to 10 seconds for concurrent requests
    lock.waitLock(10000);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    let body = {};

    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      body = e.parameter;
    }

    const action = body.action || 'addBooking';

    // -----------------------------------------------------------------------
    // ACTION 1: ADD NEW BOOKING
    // -----------------------------------------------------------------------
    if (action === 'addBooking') {
      const b = body.booking || body;
      const id = b.id || ('BK-' + new Date().getTime().toString().slice(-6));
      const now = new Date().toISOString();

      sheet.appendRow([
        id,
        now,
        b.name || 'Guest Client',
        b.whatsapp || '-',
        b.eventDate || '',
        b.eventTime || '18:00',
        b.sessionPlan || '4 Hours',
        b.eventType || 'Celebration',
        b.address || '-',
        b.notes || '',
        b.status || 'pending',
        now
      ]);

      // Trigger Email Notification if configured
      if (SEND_EMAIL_ALERTS && (NOTIFICATION_EMAIL || body.notificationEmail)) {
        const targetEmail = body.notificationEmail || NOTIFICATION_EMAIL;
        try {
          MailApp.sendEmail({
            to: targetEmail,
            subject: `📸 New Clickiit Booking Request: ${b.name || 'Client'} (${b.eventDate || 'Date TBD'})`,
            htmlBody: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #111112; margin-top: 0;">📸 New Photo Booth Booking Received!</h2>
                <p style="color: #555;">A client has submitted a booking request through <strong>Clickiit.co</strong>:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <tr style="background: #f9f9f9;"><td style="padding: 10px; font-weight: bold; width: 140px;">Booking ID:</td><td style="padding: 10px;">${id}</td></tr>
                  <tr><td style="padding: 10px; font-weight: bold;">Client Name:</td><td style="padding: 10px;">${b.name || '-'}</td></tr>
                  <tr style="background: #f9f9f9;"><td style="padding: 10px; font-weight: bold;">WhatsApp:</td><td style="padding: 10px;">${b.whatsapp || '-'}</td></tr>
                  <tr><td style="padding: 10px; font-weight: bold;">Event Date:</td><td style="padding: 10px;"><strong>${b.eventDate || '-'}</strong> (${b.eventTime || '18:00'})</td></tr>
                  <tr style="background: #f9f9f9;"><td style="padding: 10px; font-weight: bold;">Event Type:</td><td style="padding: 10px;">${b.eventType || '-'}</td></tr>
                  <tr><td style="padding: 10px; font-weight: bold;">Session Plan:</td><td style="padding: 10px;">${b.sessionPlan || '-'}</td></tr>
                  <tr style="background: #f9f9f9;"><td style="padding: 10px; font-weight: bold;">Venue Address:</td><td style="padding: 10px;">${b.address || '-'}</td></tr>
                  <tr><td style="padding: 10px; font-weight: bold;">Client Notes:</td><td style="padding: 10px;">${b.notes || 'None'}</td></tr>
                </table>
                <p><a href="https://wa.me/${(b.whatsapp || '').replace(/[^0-9]/g, '')}" style="background: #25D366; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">💬 Chat on WhatsApp</a></p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #888;">This email was automatically generated by Clickiit.co Google Apps Script.</p>
              </div>
            `
          });
        } catch (mailErr) {
          // Continue even if mail fails
          console.error("Mail error:", mailErr);
        }
      }

      return createJsonResponse({ success: true, message: 'Booking added to sheet', id: id });
    }

    // -----------------------------------------------------------------------
    // ACTION 2: UPDATE BOOKING STATUS (Confirm, Complete, Cancel, Notes)
    // -----------------------------------------------------------------------
    if (action === 'updateStatus' || action === 'updateBooking') {
      const id = body.id;
      if (!id) return createJsonResponse({ success: false, error: 'Booking ID required' });

      const data = sheet.getDataRange().getValues();
      let foundRow = -1;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === String(id).trim()) {
          foundRow = i + 1; // 1-indexed for Sheets
          break;
        }
      }

      if (foundRow === -1) {
        return createJsonResponse({ success: false, error: 'Booking ID not found in sheet' });
      }

      if (body.status) {
        sheet.getRange(foundRow, 11).setValue(String(body.status).toLowerCase()); // Column K: Status
      }
      if (body.notes) {
        sheet.getRange(foundRow, 10).setValue(String(body.notes)); // Column J: Notes
      }
      sheet.getRange(foundRow, 12).setValue(new Date().toISOString()); // Column L: Last Updated

      return createJsonResponse({ success: true, message: 'Booking updated in sheet', id: id });
    }

    // -----------------------------------------------------------------------
    // ACTION 3: DELETE BOOKING
    // -----------------------------------------------------------------------
    if (action === 'deleteBooking') {
      const id = body.id;
      if (!id) return createJsonResponse({ success: false, error: 'Booking ID required' });

      const data = sheet.getDataRange().getValues();
      let foundRow = -1;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === String(id).trim()) {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow === -1) {
        return createJsonResponse({ success: false, error: 'Booking ID not found' });
      }

      sheet.deleteRow(foundRow);
      return createJsonResponse({ success: true, message: 'Booking row removed from sheet' });
    }

    // -----------------------------------------------------------------------
    // ACTION 4: BLOCK DATE DIRECTLY (Reserved Date)
    // -----------------------------------------------------------------------
    if (action === 'blockDate') {
      const id = 'BLK-' + new Date().getTime().toString().slice(-6);
      const now = new Date().toISOString();

      sheet.appendRow([
        id,
        now,
        body.reason || 'Admin Blocked / Maintenance',
        '-',
        body.date,
        'All Day',
        'Full Day',
        'Reserved / Unavailable',
        '-',
        body.notes || 'Reserved by studio administrator',
        'blocked',
        now
      ]);

      return createJsonResponse({ success: true, message: 'Date blocked in sheet', id: id });
    }

    // -----------------------------------------------------------------------
    // ACTION 5: PING TEST CONNECTION
    // -----------------------------------------------------------------------
    if (action === 'ping') {
      return createJsonResponse({
        success: true,
        message: 'Clickiit Google Sheet Webhook is active and connected!',
        sheetName: sheet.getName(),
        rows: sheet.getLastRow(),
        timestamp: new Date().toISOString()
      });
    }

    return createJsonResponse({ success: false, error: 'Unknown action: ' + action });

  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Format dates cleanly (YYYY-MM-DD)
 */
function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).trim();
}

/**
 * Create JSON HTTP Response with CORS headers
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
