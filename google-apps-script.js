// ═══════════════════════════════════════════════════════════════════════════
// Google Apps Script — Shopify Bulk Product Lister
//
// SETUP:
// 1. Open Google Sheets → Extensions → Apps Script
// 2. Paste this entire file
// 3. Deploy → New deployment → Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 4. Copy Web App URL → paste into the app's "Google Sheets URL" field
//
// IMPORTANT — re-deploy after every edit:
//   Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy
// ═══════════════════════════════════════════════════════════════════════════

const SHEET_NAME = 'Products'; // Change to your desired sheet name

/**
 * Handles POST requests from the Shopify Bulk Product Lister.
 *
 * The browser sends data as application/x-www-form-urlencoded (URLSearchParams)
 * with a single field called "payload" containing the JSON string.
 * This avoids CORS preflight issues that block JSON POST bodies.
 *
 * Payload JSON shape: { headers: [...], rows: [[...], [...]] }
 */
function doPost(e) {
    try {
        // Read from the form parameter "payload" (URLSearchParams encoding)
        let rawJson = '';

        if (e.parameter && e.parameter.payload) {
            // Primary path: sent as URLSearchParams field
            rawJson = e.parameter.payload;
        } else if (e.postData && e.postData.contents) {
            // Fallback: sent as raw body (text/plain or application/json)
            rawJson = e.postData.contents;
        } else {
            return jsonResponse({ success: false, error: 'No payload received.' });
        }

        const payload = JSON.parse(rawJson);
        const headers = payload.headers; // Array of column header strings
        const rows = payload.rows;    // Array of row arrays

        if (!rows || !rows.length) {
            return jsonResponse({ success: false, error: 'No rows provided.' });
        }

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName(SHEET_NAME);

        // Create sheet tab if it doesn't exist yet
        if (!sheet) {
            sheet = ss.insertSheet(SHEET_NAME);
        }

        // Write headers only if the sheet is empty (first import)
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(headers);

            // Style the header row
            const headerRange = sheet.getRange(1, 1, 1, headers.length);
            headerRange
                .setBackground('#1a1d2e')
                .setFontColor('#ffffff')
                .setFontWeight('bold')
                .setFontSize(11);

            sheet.setFrozenRows(1);
        }

        // Append all product rows in one batch for speed
        const dataToAppend = rows.map(row => {
            // Pad short rows so column count always matches headers
            while (row.length < headers.length) row.push('');
            return row;
        });

        if (dataToAppend.length > 0) {
            const startRow = sheet.getLastRow() + 1;
            sheet.getRange(startRow, 1, dataToAppend.length, headers.length)
                .setValues(dataToAppend);
        }

        return jsonResponse({ success: true, added: rows.length });

    } catch (err) {
        console.error('doPost error:', err);
        return jsonResponse({ success: false, error: err.message });
    }
}

/**
 * Handles GET requests — health check / ping endpoint.
 * Visit the Web App URL in a browser to confirm it's live.
 */
function doGet(e) {
    return jsonResponse({
        status: 'ok',
        message: 'Shopify Bulk Lister — Apps Script is active.',
        sheet: SHEET_NAME,
    });
}

/**
 * Helper: return a JSON ContentService response.
 */
function jsonResponse(obj) {
    return ContentService
        .createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}
