/**
 * BalFin → Google Sheets auto-sync endpoint.
 *
 * SETUP (one time, ~2 minutes):
 *  1. Open your linked Google Sheet (the one on your Gmail account).
 *  2. Extensions → Apps Script. Delete any code there, paste this file.
 *  3. Deploy → New deployment → type "Web app".
 *     - Execute as: Me
 *     - Who has access: Anyone
 *     Click Deploy and authorise when Google asks.
 *  4. Copy the Web app URL (https://script.google.com/macros/s/AKfy.../exec)
 *     and paste it in BalFin → Manage → Google Sheets sync.
 *
 * Every entry saved in BalFin is pushed here automatically and lands in two
 * tabs: "BalFin Ledger" (one row per money movement, Debit/Credit columns)
 * and "Monthly Summary" (per-month rollup vs budget).
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // serialise bursts of entries
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "busy" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  try {
    var data = JSON.parse(e.postData.contents);
    writeTab_("BalFin Ledger", data.txns.headers, data.txns.rows);
    if (data.summary && data.summary.rows && data.summary.rows.length) {
      writeTab_("Monthly Summary", data.summary.headers, data.summary.rows);
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true, rows: data.txns.rows.length, at: data.generatedAt }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function writeTab_(name, headers, rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  sheet.clear();
  var all = [headers].concat(rows || []);
  var width = headers.length;
  var values = all.map(function (r) {
    var out = [];
    for (var i = 0; i < width; i++) out.push(r[i] === "" || r[i] === undefined ? "" : r[i]);
    return out;
  });
  sheet.getRange(1, 1, values.length, width).setValues(values);

  // styling: bold frozen header, money columns right-aligned
  var head = sheet.getRange(1, 1, 1, width);
  head.setFontWeight("bold").setBackground("#0b1326").setFontColor("#42e5a2");
  sheet.setFrozenRows(1);
  for (var c = 1; c <= width; c++) {
    var isMoney = /debit|credit|amount|income|expense|net|budget|goal/i.test(headers[c - 1]);
    if (isMoney) sheet.getRange(2, c, Math.max(1, values.length - 1), 1).setNumberFormat("#,##0.00");
  }
  sheet.autoResizeColumns(1, width);
}
