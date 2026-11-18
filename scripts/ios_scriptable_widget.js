// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: check-circle;

/**
 * Derek's Daily Timeblock Checklist — iOS Large Home Screen Widget (Scriptable)
 *
 * Designed specifically for:
 * - Zero fluff on the Home Screen: shows ONLY today's 10 timeblock rows like a clean bubble checklist,
 *   plus a small [+] button in the top-right corner.
 * - Tapping any row on your iPhone Home Screen immediately toggles that row complete and opens the
 *   zero-login checklist view.
 * - Tapping the small [+] box at the top right opens the Quick-Add modal directly.
 *
 * SETUP ON IPHONE:
 * 1. Install the free "Scriptable" app from the iOS App Store.
 * 2. Create a new script named "Timeblocks" and paste this file.
 * 3. Update SERVER_URL below to your PC's local IP / Tailscale IP (e.g. "http://192.168.1.50:8765")
 *    or your Google Apps Script Web App URL.
 * 4. Long-press your iPhone Home Screen -> "+" -> Scriptable -> Large Widget -> Select "Timeblocks"
 *    and set "When Interacting" to "Open URL".
 */

const SERVER_URL = "http://localhost:8765";

async function fetchDayData() {
  try {
    const apiUrl = SERVER_URL.includes("script.google.com")
      ? `${SERVER_URL}?api=state`
      : `${SERVER_URL}/api/state`;
    const req = new Request(apiUrl);
    req.timeoutInterval = 6;
    const state = await req.loadJSON();
    const activeKey = state.activeDay || Object.keys(state.days)[0];
    return { key: activeKey, day: state.days[activeKey] };
  } catch (e) {
    // Fallback offline snapshot so the widget always renders cleanly
    return {
      key: "2026-11-18",
      day: {
        label: "Wed 11/18",
        blocks: [
          { row: 1, time: "4:20-5:15A", task: "Morning Routine (100 Pushups, 1:45 Plank, 1:20 Horse)", completed: true },
          { row: 2, time: "5:15-6:00A", task: "Commute to Work", completed: true },
          { row: 3, time: "6:00A-2:30P", task: "Work", completed: true },
          { row: 4, time: "2:30-3:15P", task: "Commute Home", completed: true },
          { row: 5, time: "3:15-4:30P", task: "YouTube: Finalize Cut & Captions Nov Short #2", completed: false },
          { row: 6, time: "4:30-5:00P", task: "Sud Studs Prep: Trailer Layout & Shelf Sizing", completed: false },
          { row: 7, time: "5:15-6:00P", task: "Dinner (5:15) & Feed Dogs (5:45)", completed: false },
          { row: 8, time: "6:00-6:35P", task: "Walk Dogs (Walking Off Dinner)", completed: false },
          { row: 9, time: "6:35-7:20P", task: "Peloton 10m Ride + 10m Stretch & Check-In", completed: false },
          { row: 10, time: "8:30 PM", task: "Wind Down & Sleep", completed: false }
        ]
      }
    };
  }
}

async function createWidget() {
  const { day } = await fetchDayData();
  const w = new ListWidget();
  w.backgroundColor = new Color("#080b10");
  w.setPadding(12, 14, 12, 14);
  w.url = SERVER_URL;

  // Header Row: Day Title + Completion Count + Small [+] Box at Top Right
  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const titleTxt = header.addText(day.label);
  titleTxt.font = Font.boldSystemFont(15);
  titleTxt.textColor = new Color("#f8fafc");

  header.addSpacer(8);

  const doneCount = day.blocks.filter(b => b.completed).length;
  const countTxt = header.addText(`${doneCount}/${day.blocks.length}`);
  countTxt.font = Font.boldSystemFont(11);
  countTxt.textColor = new Color("#10b981");

  header.addSpacer();

  // Small '+' Box at Top Right
  const addBox = header.addStack();
  addBox.size = new Size(22, 22);
  addBox.cornerRadius = 6;
  addBox.backgroundColor = new Color("#17253b");
  addBox.borderColor = new Color("#3b82f6");
  addBox.borderWidth = 1;
  addBox.centerAlignContent();
  addBox.url = `${SERVER_URL}/?quickAdd=1`;

  const plusTxt = addBox.addText("+");
  plusTxt.font = Font.boldSystemFont(14);
  plusTxt.textColor = new Color("#60a5fa");

  w.addSpacer(8);

  // 10-Row Bubble Checklist
  for (const b of day.blocks.slice(0, 10)) {
    const row = w.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    row.spacing = 7;
    // Tapping a specific row toggles that row immediately
    row.url = `${SERVER_URL}/?toggleRow=${b.row}`;

    // Bubble symbol
    const symName = b.completed ? "checkmark.circle.fill" : "circle";
    const sym = SFSymbol.named(symName);
    sym.applyFont(Font.systemFont(13));
    const img = row.addImage(sym.image);
    img.imageSize = new Size(14, 14);
    img.tintColor = b.completed ? new Color("#10b981") : new Color("#475569");

    // Time
    const tTxt = row.addText(b.time);
    tTxt.font = Font.boldMonospacedSystemFont(10);
    tTxt.textColor = b.completed ? new Color("#475569") : new Color("#60a5fa");

    // Task Title
    const taskTxt = row.addText(b.task);
    taskTxt.font = Font.mediumSystemFont(11.5);
    taskTxt.textColor = b.completed ? new Color("#526077") : new Color("#f1f5f9");
    taskTxt.lineLimit = 1;

    row.addSpacer();
    w.addSpacer(4);
  }

  return w;
}

const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentLarge();
}
Script.complete();
