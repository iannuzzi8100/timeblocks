/**
 * Derek's Daily Timeblock & Habit Tracking System — Google Apps Script Cloud Backend
 *
 * Bound directly to: Habit & Metric Progression Tracker (15dIn64ky-LmlAoKlrnYZJEGB4q1WWz2AsmLpKM8d7og)
 *
 * Features:
 * 1. Serves the Full-Screen iPhone Bubble Checklist Web App on GET (default)
 * 2. Serves live JSON state to the iOS Scriptable Home Screen Widget on GET ?api=state
 * 3. Handles instant 1-tap row toggles directly from the iOS Widget via GET ?toggleRow=1..10
 * 4. Saves state changes & appends daily metrics to 'Untitled', 'Timeblocks_DB', 'Backlog_DB', and 'App_State'
 *    via POST or google.script.run.
 *
 * 60-SECOND SETUP IN YOUR GOOGLE SHEET:
 * 1. Open your Habit & Metric Progression Tracker sheet:
 *    https://docs.google.com/spreadsheets/d/15dIn64ky-LmlAoKlrnYZJEGB4q1WWz2AsmLpKM8d7og/edit
 * 2. Click Extensions -> Apps Script.
 * 3. Paste this file into Code.gs.
 * 4. Click the '+' button next to Files -> HTML -> name it "index" (it creates index.html) and paste app/index.html.
 * 5. Click Deploy -> New deployment -> Type: Web app ->
 *    - Execute as: Me (iannuzzi8100@gmail.com)
 *    - Who has access: Anyone (so your iPhone Scriptable widget can fetch JSON without OAuth popups)
 * 6. Copy the Web App URL (https://script.google.com/macros/s/.../exec) and paste it into SERVER_URL in Scriptable!
 */

const SHEET_ID = "15dIn64ky-LmlAoKlrnYZJEGB4q1WWz2AsmLpKM8d7og";

function getSpreadsheet() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function readLiveState() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("App_State");
  if (!sheet) {
    sheet = ss.insertSheet("App_State");
    sheet.getRange("A1:C1").setValues([["Key", "JSON_State", "Updated_At"]]);
  }
  const raw = sheet.getRange("B2").getValue();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function writeLiveState(stateObj) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("App_State");
  if (!sheet) {
    sheet = ss.insertSheet("App_State");
    sheet.getRange("A1:C1").setValues([["Key", "JSON_State", "Updated_At"]]);
  }
  const nowIso = new Date().toISOString();
  sheet.getRange("A2:C2").setValues([["LIVE_STATE", JSON.stringify(stateObj), nowIso]]);
  return { ok: true, updatedAt: nowIso };
}

function fmtSec(totalSec) {
  const s = Math.max(0, Math.round(Number(totalSec || 0)));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m + ":" + (rem < 10 ? "0" + rem : rem);
}

function syncDayToDatabaseTabs(dayKey, stateObj) {
  const state = stateObj || readLiveState();
  const key = dayKey || state.activeDay;
  if (!state.days || !state.days[key]) {
    return { ok: false, error: "Day not found: " + key };
  }

  // Save state first
  writeLiveState(state);

  const dayObj = state.days[key];
  const m = dayObj.metrics || {};
  const amNum = Number(m.pushups_morning || 100);
  const dayNum = Number(m.pushups_day || 0);
  const totalPushups = String(amNum + dayNum);
  const amDisplay = amNum === 100 ? "100 (33/33/34)" : String(amNum);
  const dayDisplay = dayNum >= 25 ? dayNum + " (" + Math.floor(dayNum / 25) + "x25)" : String(dayNum);
  const plankStr = fmtSec(m.plank_sec || 105);
  const horseStr = fmtSec(m.horse_sec || 80);

  const dayName = (dayObj.fullLabel || dayObj.label || key).split(" ")[0];
  const completedTasks = (dayObj.blocks || []).filter(function(b) { return b.completed; }).map(function(b) { return b.task; });
  const tasksSummary = completedTasks.length > 0 ? completedTasks.join("; ") : "In progress";
  const notes = m.notes || ("Synced via iPhone Timeblock App (" + completedTasks.length + "/" + (dayObj.blocks || []).length + " blocks checked)");

  const ss = getSpreadsheet();

  // 1. Append or update row in 'Untitled' (Master 13-Column Daily Log)
  const logSheet = ss.getSheetByName("Untitled");
  if (logSheet) {
    const rowValues = [
      key,
      dayName,
      amDisplay,
      dayDisplay,
      totalPushups,
      plankStr,
      horseStr,
      (m.peloton_bike || 10) + " mins",
      String(m.peloton_ab || "Off"),
      (m.peloton_stretch || 10) + " mins",
      (m.youtube_mins || 0) + " mins",
      tasksSummary,
      notes
    ];
    logSheet.appendRow(rowValues);
  }

  // 2. Append blocks to 'Timeblocks_DB'
  const tbSheet = ss.getSheetByName("Timeblocks_DB");
  if (tbSheet) {
    const nowIso = new Date().toISOString();
    (dayObj.blocks || []).forEach(function(b) {
      tbSheet.appendRow([
        key,
        dayObj.label || key,
        String(b.row || ""),
        b.time || "",
        b.task || "",
        b.completed ? "TRUE" : "FALSE",
        b.row === 1 ? ("Push:" + amNum + "+" + dayNum + " | Plank:" + plankStr + " | Horse:" + horseStr) : "",
        nowIso
      ]);
    });
  }

  return { ok: true };
}

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};

  // 1. If called by iOS Scriptable Widget for JSON state: ?api=state
  if (params.api === "state") {
    const state = readLiveState();
    return ContentService
      .createTextOutput(JSON.stringify(state))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 2. If tapped a specific row on iOS Scriptable Widget: ?toggleRow=1..10
  if (params.toggleRow) {
    const rowNum = parseInt(params.toggleRow, 10);
    const state = readLiveState();
    const activeKey = state.activeDay || Object.keys(state.days || {})[0];
    if (activeKey && state.days[activeKey]) {
      const blocks = state.days[activeKey].blocks || [];
      for (let i = 0; i < blocks.length; i++) {
        if (Number(blocks[i].row) === rowNum) {
          blocks[i].completed = !blocks[i].completed;
          break;
        }
      }
      writeLiveState(state);
    }
  }

  // 3. Render the Full-Screen iPhone Web App (index.html)
  const tpl = HtmlService.createHtmlOutputFromFile("index");
  tpl.setTitle("Timeblocks");
  tpl.addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover");
  return tpl;
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    if (payload.action === "log-sheet") {
      const res = syncDayToDatabaseTabs(payload.dayKey, payload.state);
      return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
    }
    // Default: save full state
    const stateToSave = payload.state || payload;
    const res = writeLiveState(stateToSave);
    return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}
