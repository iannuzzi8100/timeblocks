#!/usr/bin/env python3
"""
Cloud State Sync CLI for Derek's Google Apps Script Web App & Local State.

Endpoint:
https://script.google.com/macros/s/AKfycbz64ug5Ys6N4Kz8vEzsJfOyxhf6bKtqSD63CLuWjzDfTds_pBdH4RH6Pl8spCZx-LSxNg/exec

Commands:
- pull: Fetches live JSON state from the Google Sheet cloud endpoint and saves to app/schedule_state.json
- push: Pushes app/schedule_state.json to the Google Sheet cloud endpoint
- set-day <YYYY-MM-DD>: Pulls live state, switches activeDay to <YYYY-MM-DD>, and pushes back to cloud
- log-day [YYYY-MM-DD]: Calls action="log-sheet" on the cloud endpoint to append today's metrics & blocks to Untitled & Timeblocks_DB
"""

import argparse
import json
import sys
import urllib.request
from pathlib import Path

GAS_URL = "https://script.google.com/macros/s/AKfycbz64ug5Ys6N4Kz8vEzsJfOyxhf6bKtqSD63CLuWjzDfTds_pBdH4RH6Pl8spCZx-LSxNg/exec"
BASE_DIR = Path(__file__).resolve().parent.parent
STATE_PATH = BASE_DIR / "app" / "schedule_state.json"


def pull_cloud_state():
    url = f"{GAS_URL}?api=state"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if data and "days" in data:
        STATE_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def push_cloud_state(state_obj=None):
    if state_obj is None:
        state_obj = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    else:
        STATE_PATH.write_text(json.dumps(state_obj, indent=2), encoding="utf-8")

    body = json.dumps(state_obj).encode("utf-8")
    req = urllib.request.Request(
        GAS_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def log_day_to_sheet(day_key=None):
    state_obj = pull_cloud_state()
    key = day_key or state_obj.get("activeDay")
    payload = {"action": "log-sheet", "dayKey": key, "state": state_obj}
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        GAS_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    parser = argparse.ArgumentParser(description="Sync Derek's Timeblock State with Google Sheet Cloud Web App")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("pull", help="Pull live state from Google Sheet Cloud to local schedule_state.json")
    sub.add_parser("push", help="Push local schedule_state.json to Google Sheet Cloud")

    sd = sub.add_parser("set-day", help="Set activeDay in Cloud and local state")
    sd.add_argument("date", help="Date key YYYY-MM-DD")

    ld = sub.add_parser("log-day", help="Append day's metrics and timeblocks to Untitled & Timeblocks_DB tabs")
    ld.add_argument("--date", help="Optional date key YYYY-MM-DD (defaults to activeDay)")

    args = parser.parse_args()

    if args.cmd == "pull":
        data = pull_cloud_state()
        active = data.get("activeDay")
        day_info = data.get("days", {}).get(active, {})
        print(json.dumps({"ok": True, "activeDay": active, "day": day_info}, indent=2))
    elif args.cmd == "push":
        res = push_cloud_state()
        print(json.dumps(res, indent=2))
    elif args.cmd == "set-day":
        data = pull_cloud_state()
        data["activeDay"] = args.date
        res = push_cloud_state(data)
        print(json.dumps({"ok": True, "activeDay": args.date, "cloud": res}, indent=2))
    elif args.cmd == "log-day":
        res = log_day_to_sheet(args.date)
        print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
