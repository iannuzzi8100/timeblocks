#!/usr/bin/env python3
"""
Local HTTP & API Server for Derek's Bubble-List Timeblock & Goal Metric App.
Serves the iPhone PWA from /app and provides endpoints to:
- GET /api/state: read schedule_state.json
- POST /api/state: save checked-off tasks, annotated metric values, and backlog additions
- POST /api/log-sheet: push the active day's checked-off tasks, workout metrics, and timeblocks
  directly to the Habit & Metric Progression Tracker Google Sheet database (Untitled & Timeblocks_DB tabs).
"""

from datetime import datetime
import http.server
import json
import socketserver
import subprocess
from pathlib import Path

PORT = 8765
APP_DIR = Path(__file__).resolve().parent
STATE_FILE = APP_DIR / "schedule_state.json"
TRACKER_SHEET_ID = "15dIn64ky-LmlAoKlrnYZJEGB4q1WWz2AsmLpKM8d7og"
GSHEETS_CMD = r"C:\Users\D\.gemini\config\plugins\gsheets\skills\gsheets\scripts\gsheets.cmd"


def fmt_sec(total_sec):
    s = max(0, int(round(float(total_sec or 0))))
    m = s // 60
    rem = s % 60
    return f"{m}:{rem:02d}"


class SchedulerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def _send_json(self, data, status=200):
        raw = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path.startswith("/api/state"):
            if STATE_FILE.exists():
                data = json.loads(STATE_FILE.read_text(encoding="utf-8-sig"))
                self._send_json(data)
            else:
                self._send_json({"error": "schedule_state.json not found"}, status=404)
            return
        return super().do_GET()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(length) if length > 0 else b"{}"
        try:
            payload = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            payload = {}

        if self.path.startswith("/api/state"):
            STATE_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
            self._send_json({"ok": True})
            return

        if self.path.startswith("/api/log-sheet"):
            try:
                day_key = payload.get("dayKey")
                state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
                day_key = day_key or state.get("activeDay")
                day_obj = state["days"][day_key]
                m = day_obj.get("metrics", {})

                am_num = int(m.get("pushups_morning", 100))
                day_num = int(m.get("pushups_day", 0))
                total_pushups = str(am_num + day_num)
                am_display = f"{am_num} (33/33/34)" if am_num == 100 else str(am_num)
                day_display = f"{day_num} ({day_num // 25}x25)" if day_num >= 25 else str(day_num)

                plank_str = fmt_sec(m.get("plank_sec", 105))
                horse_str = fmt_sec(m.get("horse_sec", 80))

                day_name = day_obj.get("fullLabel", day_obj.get("label", day_key)).split(" ")[0]
                completed_tasks = [b["task"] for b in day_obj.get("blocks", []) if b.get("completed")]
                tasks_summary = "; ".join(completed_tasks) if completed_tasks else "In progress"
                notes = m.get("notes") or f"Synced via Timeblock DB ({len(completed_tasks)}/{len(day_obj.get('blocks', []))} blocks checked)"

                row_values = [
                    day_key,
                    day_name,
                    am_display,
                    day_display,
                    total_pushups,
                    plank_str,
                    horse_str,
                    f"{m.get('peloton_bike', 10)} mins",
                    str(m.get("peloton_ab", "Off")),
                    f"{m.get('peloton_stretch', 10)} mins",
                    f"{m.get('youtube_mins', 0)} mins",
                    tasks_summary,
                    notes,
                ]

                now_iso = datetime.now().isoformat(timespec="seconds")
                tb_rows = []
                for b in day_obj.get("blocks", []):
                    tb_rows.append([
                        day_key,
                        day_obj.get("label", day_key),
                        str(b.get("row", "")),
                        b.get("time", ""),
                        b.get("task", ""),
                        "TRUE" if b.get("completed") else "FALSE",
                        f"Push:{am_num}+{day_num} | Plank:{plank_str} | Horse:{horse_str}" if b.get("row") == 1 else "",
                        now_iso,
                    ])

                batch_req = [
                    {
                        "op": "append",
                        "range": "Untitled!A1",
                        "data": [row_values],
                    },
                    {
                        "op": "append",
                        "range": "Timeblocks_DB!A1",
                        "data": tb_rows,
                    },
                ]
                batch_file = APP_DIR / "tmp_batch.json"
                batch_file.write_text(json.dumps(batch_req), encoding="utf-8")

                proc = subprocess.run(
                    [GSHEETS_CMD, "mutate", "batch", TRACKER_SHEET_ID, "-f", str(batch_file)],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if batch_file.exists():
                    batch_file.unlink()

                if proc.returncode == 0:
                    self._send_json({"ok": True, "output": proc.stdout.strip()})
                else:
                    self._send_json({"ok": False, "error": proc.stderr.strip() or proc.stdout.strip()}, status=500)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, status=500)
            return

        self._send_json({"error": "Unknown endpoint"}, status=404)


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", PORT), SchedulerHandler) as httpd:
        print(f"Serving Derek's Timeblock & Goal App at http://localhost:{PORT}")
        httpd.serve_forever()
