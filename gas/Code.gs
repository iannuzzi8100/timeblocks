/**
 * On Track — Derek's Self-Sustaining Timeblock, Tasks_Board & Fitness Cloud Engine (Google Apps Script)
 *
 * Bound to: Habit & Metric Progression Tracker (15dIn64ky-LmlAoKlrnYZJEGB4q1WWz2AsmLpKM8d7og)
 *
 * What this engine does automatically (eliminating manual Sunday schedule generation):
 * 1. Reads all 9 side-by-side columns from your 'Tasks_Board' tab (checkboxes + ★ starred priorities).
 * 2. Fetches live 7-day weather for South Patrick Shores, FL (Open-Meteo API, no key required).
 * 3. Applies your exact scheduling rules & 6-tier priority formula:
 *    - Mon-Thu Workdays: 4:20 AM wake-up -> 6:00 AM-2:30 PM Work -> 3:15-5:00 PM Dynamic Project Window (hard stop 5:00 PM)
 *    - Fri-Sun Off-Days: 7:00 AM wake-up -> Sat 8:30 AM-12:30 PM 4-Hr Deep Work ('Bigger projects') -> no breakfast/lunch ever
 *    - Weather Routing: Rain >= 40% routes Outdoor tasks to dry days & fills rainy blocks with Indoor/YouTube/Computer tasks
 *    - Evening Anchor Sequence: Dinner (5:15) -> Feed Dogs (5:45) -> Walk Dogs (6:00) -> Peloton Ride/Stretch (6:35) -> Sleep (8:30)
 *    - Adaptive Fitness Progression: Auto-bumps Plank & Horse Stance baselines whenever a new PR is logged
 * 4. Two-way sync: Checking off a task in On Track checks its real checkbox on 'Tasks_Board'!
 */

const SHEET_ID = "15dIn64ky-LmlAoKlrnYZJEGB4q1WWz2AsmLpKM8d7og";
const SPS_LAT = 28.2036;
const SPS_LON = -80.5945;

const OUTDOOR_REGEX = /(sprinkler|trailer|walkway|wash|paint|lean-to|leanto|yard|palm|weed|grass|shed|outdoor|window|garage floor|roof|solar|edger|trunk|driveway|plumb|dirt|rock wall)/i;

function getSpreadsheet() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function fmtSec(totalSec) {
  const s = Math.max(0, Math.round(Number(totalSec || 0)));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m + ":" + (rem < 10 ? "0" + rem : rem);
}

function getLocalDateKey(dateObj) {
  return Utilities.formatDate(dateObj, "America/New_York", "yyyy-MM-dd");
}

function getDayShortLabel(dateObj) {
  return Utilities.formatDate(dateObj, "America/New_York", "EEE M/d");
}

function getDayFullLabel(dateObj) {
  return Utilities.formatDate(dateObj, "America/New_York", "EEEE M/d");
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

/**
 * Reads all 9 side-by-side category columns from 'Tasks_Board'
 * Returns structured list of tasks with exact row/col coordinates for two-way checkbox sync.
 */
function readTasksBoard() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Tasks_Board");
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  const tasks = [];

  for (let col = 0; col < headers.length; col += 2) {
    const tierName = String(headers[col + 1] || "").trim();
    if (!tierName) continue;

    for (let r = 1; r < values.length; r++) {
      const checkedVal = values[r][col];
      const titleRaw = String(values[r][col + 1] || "").trim();
      if (!titleRaw) continue;
      // Skip section headers like "Shorts:" or "Longs:" or indented sub-bullets
      if (titleRaw.endsWith(":") || titleRaw.startsWith("- ")) continue;

      const isCompleted = checkedVal === true || String(checkedVal).toUpperCase() === "TRUE";
      const isStarred = titleRaw.indexOf("★") !== -1 || titleRaw.indexOf("[*]") !== -1;
      const cleanTitle = titleRaw.replace(/★/g, "").replace(/\[\*\]/g, "").trim();
      const env = OUTDOOR_REGEX.test(cleanTitle) ? "Outdoor" : "Indoor";

      tasks.push({
        id: "TB-" + (r + 1) + "-" + (col + 2),
        boardRow: r + 1,
        boardCheckCol: col + 1,
        tier: tierName,
        title: cleanTitle,
        starred: isStarred,
        env: env,
        status: isCompleted ? "Completed" : "Active",
        pushCount: 0
      });
    }
  }
  return tasks;
}

/**
 * Syncs completed items back to the real checkboxes on 'Tasks_Board'
 */
function syncCompletedToTasksBoard(stateObj) {
  if (!stateObj || !Array.isArray(stateObj.backlog)) return;
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Tasks_Board");
  if (!sheet) return;

  stateObj.backlog.forEach(function(item) {
    if (item.boardRow && item.boardCheckCol) {
      const wantChecked = item.status === "Completed";
      const cell = sheet.getRange(item.boardRow, item.boardCheckCol);
      if (cell.getValue() !== wantChecked) {
        cell.setValue(wantChecked);
      }
    }
  });
}

/**
 * Fetches live 7-day forecast for South Patrick Shores, FL via Open-Meteo (free, no key)
 */
function fetchSouthPatrickWeather() {
  const forecastByDate = {};
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + SPS_LAT +
      "&longitude=" + SPS_LON +
      "&daily=temperature_2m_max,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America%2FNew_York";
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (resp.getResponseCode() === 200) {
      const json = JSON.parse(resp.getContentText());
      const dates = (json.daily && json.daily.time) || [];
      const highs = (json.daily && json.daily.temperature_2m_max) || [];
      const rains = (json.daily && json.daily.precipitation_probability_max) || [];
      for (let i = 0; i < dates.length; i++) {
        forecastByDate[dates[i]] = {
          highF: Math.round(highs[i] || 75),
          rainPct: Math.round(rains[i] || 15),
          isRainy: (rains[i] || 0) >= 40
        };
      }
    }
  } catch (e) {
    // Fallback gracefully if offline
  }
  return forecastByDate;
}

/**
 * Priority Scoring Formula for Derek's 6-Tier System + Weather Routing + Red Push Urgency
 */
function scoreTaskForSlot(task, isRainyDay, slotType) {
  if (task.status === "Completed") return -9999;

  let score = 0;
  const tier = (task.tier || "").toLowerCase();

  // Base tier weights
  if (tier.indexOf("this week") !== -1) score += 100;
  else if (tier.indexOf("this month") !== -1) score += 75;
  else if (tier.indexOf("youtube") !== -1) score += 60;
  else if (tier.indexOf("bigger") !== -1) score += 50;
  else if (tier.indexOf("computer") !== -1) score += 45;
  else if (tier.indexOf("next month") !== -1) score += 30;
  else if (tier.indexOf("general") !== -1) score += 25;
  else score += 10; // Lowes / Publix

  // Starred priority boost
  if (task.starred) score += 35;

  // Progressive Red Urgency Boost (each "Not Today" push adds +30 priority!)
  score += Number(task.pushCount || 0) * 30;

  // Slot-specific affinity
  if (slotType === "youtube" && (tier.indexOf("youtube") !== -1 || /youtube|short/i.test(task.title))) {
    score += 90;
  }
  if (slotType === "deep_work" && tier.indexOf("bigger") !== -1) {
    score += 120;
  }
  if (slotType === "computer" && tier.indexOf("computer") !== -1) {
    score += 95;
  }

  // Weather Routing (South Patrick Shores, FL)
  if (isRainyDay) {
    if (task.env === "Outdoor") score -= 80;
    else score += 20;
  } else {
    if (task.env === "Outdoor" && slotType !== "youtube" && slotType !== "computer") {
      score += 15;
    }
  }

  return score;
}

/**
 * Rolling 7-Day Smart Auto-Scheduler Engine
 * Rebuilds/updates the next 7 days directly from 'Tasks_Board' + Live Weather + Rules
 * while preserving today's completed checkboxes, workout metrics, and pushed items.
 */
function replanRollingWeek() {
  const state = readLiveState();
  const boardTasks = readTasksBoard();
  const weatherMap = fetchSouthPatrickWeather();

  // Merge pushCount from existing backlog so red urgency is never lost
  const prevPushMap = {};
  (state.backlog || []).forEach(function(old) {
    if (old.title && old.pushCount) {
      prevPushMap[old.title.toLowerCase()] = Number(old.pushCount || 0);
    }
  });
  boardTasks.forEach(function(t) {
    const prevP = prevPushMap[t.title.toLowerCase()];
    if (prevP) t.pushCount = prevP;
  });

  if (boardTasks.length > 0) {
    state.backlog = boardTasks;
  }

  const activePool = (state.backlog || []).filter(function(t) { return t.status !== "Completed"; });
  const assignedIds = {};

  function pickTopTask(isRainy, slotType) {
    let best = null;
    let bestScore = -9999;
    for (let i = 0; i < activePool.length; i++) {
      const t = activePool[i];
      if (assignedIds[t.id]) continue;
      const sc = scoreTaskForSlot(t, isRainy, slotType);
      if (sc > bestScore) {
        bestScore = sc;
        best = t;
      }
    }
    if (best) assignedIds[best.id] = true;
    return best;
  }

  const now = new Date();
  const todayKey = getLocalDateKey(now);
  state.days = state.days || {};
  state.weatherMap = weatherMap;

  const pushupCfg = state.pushupSetConfig || [33, 33, 34];
  const hc = state.holdConfig || { plankTargetSec: 105, horseTargetSec: 80, plankGoalSec: 300, horseGoalSec: 240, countdownSec: 3 };

  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(now.getTime() + offset * 86400000);
    const dKey = getLocalDateKey(d);
    const dow = Number(Utilities.formatDate(d, "America/New_York", "u")); // 1=Mon ... 7=Sun
    const isWorkday = dow >= 1 && dow <= 4;
    const isSat = dow === 6;
    const isSun = dow === 7;
    const isAbDay = dow === 2 || dow === 4; // Tue & Thu

    const wx = weatherMap[dKey] || { highF: 75, rainPct: 15, isRainy: false };
    const existingDay = state.days[dKey];

    // Preserve completed status of any already-checked blocks on today
    const completedTitles = {};
    if (existingDay && Array.isArray(existingDay.blocks)) {
      existingDay.blocks.forEach(function(b) {
        if (b.completed) completedTitles[b.task] = true;
      });
    }

    const blocks = [];
    function addB(time, task, recurring, backlogItem) {
      blocks.push({
        row: blocks.length + 1,
        time: time,
        task: task,
        completed: Boolean(completedTitles[task]),
        recurring: recurring,
        pushCount: backlogItem ? Number(backlogItem.pushCount || 0) : 0,
        backlogId: backlogItem ? backlogItem.id : "",
        metricKeys: []
      });
    }

    if (isWorkday) {
      addB("4:20 - 5:15 AM", "Morning Routine (Feed Dogs, 20m Stretch, Calisthenics, Coffee)", true);
      addB("5:15 - 6:00 AM", "Commute to Work", true);
      addB("6:00 AM - 2:30 PM", "Work", true);
      addB("2:30 - 3:15 PM", "Commute Home", true);

      const slot1Type = (dow >= 2 && dow <= 4) ? "youtube" : "general";
      const t1 = pickTopTask(wx.isRainy, slot1Type);
      const t2 = pickTopTask(wx.isRainy, dow === 4 ? "computer" : "general");

      if (t1) addB("3:15 - 4:30 PM", t1.tier + ": " + t1.title, false, t1);
      if (t2) addB("4:30 - 5:00 PM", t2.tier + ": " + t2.title, false, t2);

      addB("5:15 - 6:00 PM", "Dinner (5:15) & Feed Dogs (5:45)", true);
      addB("6:00 - 6:35 PM", "Walk Dogs (Walking Off Dinner)", true);
      addB("6:35 - 7:20 PM", isAbDay ? "Evening Peloton Ride, Stretch, Ab Class & Check-In" : "Evening Peloton Ride, Stretch & 7:05 PM Check-In", true);
      addB("8:30 PM", "Wind Down & Sleep", true);
    } else if (isSat) {
      addB("7:00 - 8:30 AM", "Off-Day Morning Routine (Feed Dogs, 20m Stretch, Calisthenics, Coffee)", true);
      const deepTask = pickTopTask(wx.isRainy, "deep_work");
      if (deepTask) addB("8:30 AM - 12:30 PM", "4-Hr Deep Work: " + deepTask.title, false, deepTask);
      addB("12:30 - 2:00 PM", "Workshop Tidy & Project Reset", true);
      const pm1 = pickTopTask(wx.isRainy, "general");
      const pm2 = pickTopTask(wx.isRainy, "general");
      if (pm1) addB("2:00 - 3:30 PM", pm1.tier + ": " + pm1.title, false, pm1);
      if (pm2) addB("3:30 - 5:00 PM", pm2.tier + ": " + pm2.title, false, pm2);
      addB("5:15 - 6:00 PM", "Dinner (5:15) & Feed Dogs (5:45)", true);
      addB("6:00 - 6:35 PM", "Walk Dogs", true);
      addB("6:35 - 7:20 PM", "Evening Peloton Ride, Stretch & 7:05 PM Check-In", true);
      addB("8:30 PM", "Wind Down & Sleep", true);
    } else {
      // Friday or Sunday Off-Day
      addB("7:00 - 8:30 AM", "Off-Day Morning Routine (Feed Dogs, 20m Stretch, Calisthenics, Coffee)", true);
      const amTask = pickTopTask(wx.isRainy, "general");
      if (amTask) addB("8:30 - 11:30 AM", amTask.tier + ": " + amTask.title, false, amTask);
      addB("11:30 AM - 1:00 PM", "Daytime Buffer & Errand Prep", true);
      const pm1 = pickTopTask(wx.isRainy, isSun ? "computer" : "general");
      const pm2 = pickTopTask(wx.isRainy, "general");
      if (pm1) addB("1:00 - 3:00 PM", pm1.tier + ": " + pm1.title, false, pm1);
      if (pm2) addB("3:00 - 5:00 PM", pm2.tier + ": " + pm2.title, false, pm2);
      addB("5:15 - 6:00 PM", "Dinner (5:15) & Feed Dogs (5:45)", true);
      addB("6:00 - 6:35 PM", "Walk Dogs", true);
      addB("6:35 - 7:20 PM", "Evening Peloton Ride, Stretch & 7:05 PM Check-In", true);
      addB("8:30 PM", "Wind Down & Sleep", true);
    }

    const dayMetrics = (existingDay && existingDay.metrics) ? existingDay.metrics : {
      pushup_sets_done: pushupCfg.map(function() { return false; }),
      pushup_extra_log: [],
      pushups_morning: 0,
      pushups_day: 0,
      plank_sec: hc.plankTargetSec,
      plank_done: false,
      horse_sec: hc.horseTargetSec,
      horse_done: false,
      peloton_bike: 10,
      peloton_bike_done: false,
      peloton_stretch: 10,
      peloton_stretch_done: false,
      peloton_ab: isAbDay ? "10m Core" : "Off",
      peloton_ab_done: false,
      youtube_mins: 0,
      notes: ""
    };

    state.days[dKey] = {
      label: getDayShortLabel(d),
      fullLabel: getDayFullLabel(d),
      dayType: isWorkday ? "Workday" : (isSat ? "Deep Work" : "Off-Day"),
      weather: wx.highF + "°F · " + wx.rainPct + "% Rain" + (wx.isRainy ? " (Indoor Routed)" : ""),
      blocks: blocks,
      metrics: dayMetrics
    };
  }

  state.activeDay = todayKey;
  state.lastAutoPlanned = new Date().toISOString();
  writeLiveState(state);
  return state;
}

function syncDayToDatabaseTabs(dayKey, stateObj) {
  const state = stateObj || readLiveState();
  const key = dayKey || state.activeDay;
  if (!state.days || !state.days[key]) {
    return { ok: false, error: "Day not found: " + key };
  }

  writeLiveState(state);
  syncCompletedToTasksBoard(state);

  const dayObj = state.days[key];
  const m = dayObj.metrics || {};
  const amNum = Number(m.pushups_morning || 0);
  const dayNum = Number(m.pushups_day || 0);
  const totalPushups = String(amNum + dayNum);
  const splitStr = (state.pushupSetConfig || [33, 33, 34]).join("/");
  const amDisplay = amNum > 0 ? amNum + " (" + splitStr + ")" : "0";
  const dayDisplay = dayNum > 0 ? String(dayNum) : "0";
  const plankStr = fmtSec(m.plank_sec || 105);
  const horseStr = fmtSec(m.horse_sec || 80);

  const dayName = (dayObj.fullLabel || dayObj.label || key).split(" ")[0];
  const completedTasks = (dayObj.blocks || []).filter(function(b) { return b.completed; }).map(function(b) { return b.task; });
  const tasksSummary = completedTasks.length > 0 ? completedTasks.join("; ") : "In progress";
  const notes = m.notes || ("Synced via On Track (" + completedTasks.length + "/" + (dayObj.blocks || []).length + " blocks checked)");

  const ss = getSpreadsheet();

  const logSheet = ss.getSheetByName("Untitled");
  if (logSheet) {
    logSheet.appendRow([
      key,
      dayName,
      amDisplay,
      dayDisplay,
      totalPushups,
      plankStr,
      horseStr,
      (m.peloton_bike_done ? (m.peloton_bike || 10) : 0) + " mins",
      String(m.peloton_ab || "Off"),
      (m.peloton_stretch_done ? (m.peloton_stretch || 10) : 0) + " mins",
      (m.youtube_mins || 0) + " mins",
      tasksSummary,
      notes
    ]);
  }

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

  if (params.api === "replan") {
    const updated = replanRollingWeek();
    return ContentService
      .createTextOutput(JSON.stringify(updated))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (params.api === "state") {
    const state = readLiveState();
    return ContentService
      .createTextOutput(JSON.stringify(state))
      .setMimeType(ContentService.MimeType.JSON);
  }

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

  const tpl = HtmlService.createHtmlOutputFromFile("index");
  tpl.setTitle("On Track");
  tpl.addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover");
  return tpl;
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    if (payload.action === "replan") {
      const updated = replanRollingWeek();
      return ContentService.createTextOutput(JSON.stringify({ ok: true, state: updated })).setMimeType(ContentService.MimeType.JSON);
    }
    if (payload.action === "log-sheet") {
      const res = syncDayToDatabaseTabs(payload.dayKey, payload.state);
      return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
    }
    const stateToSave = payload.state || payload;
    const res = writeLiveState(stateToSave);
    syncCompletedToTasksBoard(stateToSave);
    return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}
