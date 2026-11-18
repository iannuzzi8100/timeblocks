#!/usr/bin/env python3
"""
Google Tasks 10-Row Fixed Visual Row-ID Mapping Helper for Derek's Daily Scheduler.

Implements the exact protocol from AGENTS.md:
- 10 fixed task IDs corresponding to Visual Row 1 (Top) through Visual Row 10 (Bottom).
- Every schedule block is formatted strictly as '[Start - End Time] | [Task Name]'.
- Leaves description/notes and due date empty so iPhone widget stays compact.
- If any of the 10 rows were checked off during the day, updates all 10 titles in place,
  marks any remaining open rows complete, and uncompletes in reverse order (Row 10 -> Row 1)
  sequentially so Row 1 lands at the very top of the 'Today' list (Sorted by: My order).
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

FIXED_ROWS = [
    {"row": 1,  "id": "GhIKEEFkRTJIT25zMFp4ajNETkQ", "role": "Earliest Morning Routine"},
    {"row": 2,  "id": "GhIKEG5odXMyaHlOc1VVNTFlanE", "role": "Block 2"},
    {"row": 3,  "id": "GhIKEGlGaEx1Z2VrY1ZweGhhcWs", "role": "Block 3"},
    {"row": 4,  "id": "GhIKEGNtQ3J1LW5KVEswb1ZsODg", "role": "Block 4"},
    {"row": 5,  "id": "GhIKEGt5NDc4a3JwUUxOUUxteC0", "role": "Block 5"},
    {"row": 6,  "id": "GhIKEGNfNVpoTTRIQTFOMDZHR1A", "role": "Block 6"},
    {"row": 7,  "id": "GhIKEENBZ1VYMWFnN0dBLTZpQlk", "role": "Block 7"},
    {"row": 8,  "id": "GhIKEFpNY3ZJY2NsN2x0ekhfRHI", "role": "Block 8"},
    {"row": 9,  "id": "GhIKEGpaSmdXelBMX1ByLXpaWXA", "role": "Block 9"},
    {"row": 10, "id": "GhIKEF9MTkZXSXV5RkVLWFRReFI", "role": "8:30 PM | Wind Down & Sleep"},
]

SCOPES = ["https://www.googleapis.com/auth/tasks"]
BASE_DIR = Path(__file__).resolve().parent.parent
TOKEN_PATH = BASE_DIR / "scripts" / "gtasks_token.json"
CREDS_PATH = BASE_DIR / "scripts" / "gtasks_client_secret.json"
STATE_PATH = BASE_DIR / "app" / "schedule_state.json"


def get_tasks_service():
    """Returns an authenticated Google Tasks API v1 service if OAuth credentials exist."""
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
    except ImportError:
        print(
            "Missing Google API packages. Run: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib",
            file=sys.stderr,
        )
        sys.exit(1)

    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDS_PATH.exists():
                raise FileNotFoundError(
                    f"OAuth client secret not found at {CREDS_PATH}.\n"
                    "Download a Desktop OAuth client JSON from Google Cloud Console (Tasks API enabled) "
                    f"and save it to {CREDS_PATH}, then run: python scripts/gtasks_sync.py auth"
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_PATH), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")

    return build("tasks", "v1", credentials=creds)


def find_today_tasklist(service, list_name="Today"):
    """Finds the tasklist ID matching 'Today' (or falls back to '@default')."""
    results = service.tasklists().list(maxResults=100).execute()
    for item in results.get("items", []):
        if item.get("title", "").strip().lower() == list_name.lower():
            return item["id"], item["title"]
    return "@default", "Default"


def get_status(service, list_name="Today"):
    """Fetches current status of the 10 fixed rows and other lists."""
    tasklist_id, title = find_today_tasklist(service, list_name)
    rows_out = []
    for row_cfg in FIXED_ROWS:
        try:
            t = service.tasks().get(tasklist=tasklist_id, task=row_cfg["id"]).execute()
            rows_out.append({
                "row": row_cfg["row"],
                "id": row_cfg["id"],
                "title": t.get("title", ""),
                "status": t.get("status", "needsAction"),
                "completed": t.get("status") == "completed",
                "updated": t.get("updated", ""),
            })
        except Exception as e:
            rows_out.append({
                "row": row_cfg["row"],
                "id": row_cfg["id"],
                "error": str(e),
            })
    return {"tasklist_id": tasklist_id, "tasklist_title": title, "rows": rows_out}


def sync_10_rows(service, titles, list_name="Today", force_reorder=False):
    """
    Populates the 10 schedule blocks into Google Tasks using the Fixed Visual Row-ID Mapping Protocol.
    - Updates all 10 titles in place with empty notes and due date.
    - If any row was completed (or force_reorder=True), completes all open rows and uncompletes
      Row 10 -> Row 1 sequentially so Row 1 lands at the top of the visual list.
    """
    if len(titles) != 10:
        raise ValueError(f"Expected exactly 10 schedule blocks, got {len(titles)}")

    tasklist_id, _ = find_today_tasklist(service, list_name)
    any_completed = force_reorder
    current_states = {}

    # 1. Inspect current states and update all 10 titles in place
    for idx, row_cfg in enumerate(FIXED_ROWS):
        task_id = row_cfg["id"]
        new_title = titles[idx].strip()
        task_obj = service.tasks().get(tasklist=tasklist_id, task=task_id).execute()
        is_completed = task_obj.get("status") == "completed"
        current_states[task_id] = is_completed
        if is_completed:
            any_completed = True

        # Update title in place, clear notes & due date
        patch_body = {
            "id": task_id,
            "title": new_title,
            "notes": "",
            "due": None,
        }
        service.tasks().patch(tasklist=tasklist_id, task=task_id, body=patch_body).execute()

    # 2. If any row was checked off during the day, execute reverse complete/uncomplete reset
    if any_completed:
        for row_cfg in FIXED_ROWS:
            task_id = row_cfg["id"]
            if not current_states.get(task_id, False):
                service.tasks().patch(
                    tasklist=tasklist_id,
                    task=task_id,
                    body={"id": task_id, "status": "completed"},
                ).execute()
                time.sleep(0.15)

        # Uncomplete in reverse order: Row 10 -> Row 9 -> ... -> Row 1
        for row_cfg in reversed(FIXED_ROWS):
            task_id = row_cfg["id"]
            service.tasks().patch(
                tasklist=tasklist_id,
                task=task_id,
                body={"id": task_id, "status": "needsAction", "completed": None},
            ).execute()
            time.sleep(0.25)

    return {"synced": True, "reordered": any_completed, "blocks": titles}


def main():
    parser = argparse.ArgumentParser(description="Derek's Google Tasks 10-Row Sync Helper")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("auth", help="Authenticate with Google Tasks API")
    sub.add_parser("status", help="Inspect current 10-row tasks in Google Tasks")

    sync_p = sub.add_parser("sync", help="Sync 10 schedule blocks to Google Tasks and local app state")
    sync_p.add_argument("--file", "-f", help="JSON file containing a list of 10 block title strings")
    sync_p.add_argument("--blocks", nargs=10, help="10 schedule block strings directly")
    sync_p.add_argument("--force-reorder", action="store_true", help="Force Row 10 -> Row 1 reorder reset")
    sync_p.add_argument("--local-only", action="store_true", help="Update local iPhone PWA state without calling Google Tasks API")

    args = parser.parse_args()

    if args.cmd == "auth":
        get_tasks_service()
        print(f"Authenticated successfully. Token saved to {TOKEN_PATH}")
    elif args.cmd == "status":
        svc = get_tasks_service()
        print(json.dumps(get_status(svc), indent=2))
    elif args.cmd == "sync":
        if args.file:
            data = json.loads(Path(args.file).read_text(encoding="utf-8"))
            titles = data["blocks"] if isinstance(data, dict) and "blocks" in data else data
        elif args.blocks:
            titles = args.blocks
        else:
            print("Provide --file or --blocks with 10 strings", file=sys.stderr)
            sys.exit(1)

        # Always save to local iPhone app state as well
        STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
        state = {}
        if STATE_PATH.exists():
            try:
                state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
            except Exception:
                state = {}
        state["blocks"] = [
            {
                "row": FIXED_ROWS[i]["row"],
                "id": FIXED_ROWS[i]["id"],
                "title": titles[i],
                "completed": False,
            }
            for i in range(10)
        ]
        STATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")

        if args.local_only:
            print(json.dumps({"local_saved": str(STATE_PATH), "blocks": titles}, indent=2))
        else:
            svc = get_tasks_service()
            res = sync_10_rows(svc, titles, force_reorder=args.force_reorder)
            print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
