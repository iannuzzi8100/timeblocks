# Derek's Daily Scheduling & Habit Tracking System (Antigravity Workspace Guide)

This workspace file transfers Derek's complete automated timeblocking, Google Tasks synchronization, and habit-tracking system from Gemini into [Google Antigravity](https://antigravity.google/). Drop this file as `AGENTS.md` in the root of your Antigravity project folder so any local agent immediately has your rules, Google Drive IDs, Google Tasks row-mapping protocol, and scheduled automation prompts.

---

## 1. Quick Setup in Google Antigravity

1. **Install Antigravity:** Download [Antigravity 2.0 or Antigravity IDE](https://antigravity.google/download/) (or the [VS Code Extension](https://antigravity.google/docs/ide/extensions/vscode/)). Antigravity 2.0 supports native scheduled tasks and parallel local agents.
2. **Connect Google Workspace (Drive, Docs, Sheets, Calendar, Tasks):**
   - Configure a Google Workspace MCP server in your Antigravity `mcp_config.json` (see [Antigravity MCP integration](https://marketplace.visualstudio.com/items?itemName=Google.google-antigravity)), or use a local OAuth script / [Google Workspace CLI](https://medium.com/google-cloud/orchestrating-google-workspace-with-antigravity-cli-a-high-performance-agentic-framework-499cae446161) authenticated to `iannuzzi8100@gmail.com`.
3. **Create Scheduled Tasks in Antigravity 2.0:** Set up the three recurring prompts in Section 5 using the exact cron/cadence schedules.

---

## 2. Google Drive Source of Truth (`Gemini Spark Workspace`)

All long-term rules, schedules, goals, and logs live in the **[Gemini Spark Workspace](https://www.google.com/search?q=https://drive.google.com/drive/folders/1iXogVqzj_z_qePoAyXSfanJS8JI2mhnE)** folder (`1iXogVqzj_z_qePoAyXSfanJS8JI2mhnE`).

| Document / Sheet | Type | File ID | Direct Link |
| :--- | :--- | :--- | :--- |
| **Schedule Rules** | Google Doc | `19Yt0Jl0abb-nuwwOKiAKpSHO2Kp1GHipt8c_LM0Em0w` | [Open Doc](https://docs.google.com/document/d/19Yt0Jl0abb-nuwwOKiAKpSHO2Kp1GHipt8c_LM0Em0w/edit) |
| **Weekly Schedule Log** | Google Doc | `1PjzpMJSZijK4vPlsMQo7fy37goN7LlZVThrS6NL_f10` | [Open Doc](https://docs.google.com/document/d/1PjzpMJSZijK4vPlsMQo7fy37goN7LlZVThrS6NL_f10/edit) |
| **Workout Goals & Progression Roadmap** | Google Doc | `1ARG0QgaHOmPZ88WR3wU8pHQxJhFcQyuWBCyf2BB5M5c` | [Open Doc](https://docs.google.com/document/d/1ARG0QgaHOmPZ88WR3wU8pHQxJhFcQyuWBCyf2BB5M5c/edit) |
| **Long Term Goals** | Google Doc | `1VlTQuSD7ZUDB8voIZWj-khtBur3T0dmBJf6Le0GE9Ho` | [Open Doc](https://docs.google.com/document/d/1VlTQuSD7ZUDB8voIZWj-khtBur3T0dmBJf6Le0GE9Ho/edit) |
| **Weekly Task Priorities** | Google Doc | `1xhRrMjKaNeg4wMxX6dmN4MeSXF-sQtY-vqF8LW3J0WI` | [Open Doc](https://docs.google.com/document/d/1xhRrMjKaNeg4wMxX6dmN4MeSXF-sQtY-vqF8LW3J0WI/edit) |
| **Pushup Stamina Progression Plan** | Google Doc | `1GKpARWJie9JZ3G2Ui6u7FEVcKtdJd4J-hDuwYoSbmE4` | [Open Doc](https://docs.google.com/document/d/1GKpARWJie9JZ3G2Ui6u7FEVcKtdJd4J-hDuwYoSbmE4/edit) |
| **Peloton Account Integration Status** | Google Doc | `1T_f531o25ChNUby549S_n1yL9RNPiDTLGLzSVJCRIUM` | [Open Doc](https://docs.google.com/document/d/1T_f531o25ChNUby549S_n1yL9RNPiDTLGLzSVJCRIUM/edit) |
| **Habit & Metric Progression Tracker** | Google Sheet | `15dIn64ky-LmlAoKlrnYZJEGB4q1WWz2AsmLpKM8d7og` | [Open Sheet](https://docs.google.com/spreadsheets/d/15dIn64ky-LmlAoKlrnYZJEGB4q1WWz2AsmLpKM8d7og/edit) |
| **YouTube Content Calendar & Pipeline Tracker** | Google Sheet | `1Q6GC-jY1uTaRtzBzpFI-Ho4sQ3_Ad23hFX9SNITuoq4` | [Open Sheet](https://docs.google.com/spreadsheets/d/1Q6GC-jY1uTaRtzBzpFI-Ho4sQ3_Ad23hFX9SNITuoq4/edit) |

---

## 3. Core Scheduling Rules & Non-Negotiables

* **Location & Weather Routing:** South Patrick Shores, FL. Always check the 7-day forecast before weekly planning; shift outdoor construction/painting to indoor shop work or digital admin when rain/storms are predicted.
* **Workdays (Mon–Thu):**
  * `4:20 AM` wake-up, feed dogs immediately, 20-minute morning stretch, morning calisthenics, morning coffee + light reading.
  * `5:15 – 6:00 AM` commute (45 min) -> `6:00 AM – 2:30 PM` work -> `2:30 – 3:15 PM` commute home.
  * `3:15 – 5:00 PM` immediate transition into afternoon project, editing, or task blocks (hard stop at `5:00 PM` for tasks).
* **Off-Days (Fri–Sun):**
  * `7:00 AM` wake-up, feed dogs, morning stretch, calisthenics, morning coffee.
  * Saturday includes a continuous 4-hour deep work block (`8:30 AM – 12:30 PM`) for top active build projects.
  * Sunday includes weekly Google Tasks review (`3:30 – 4:00 PM`) and weekly schedule generation (`4:00 PM`).
* **Meal Rules (Strict):**
  * **Breakfast:** Never schedule breakfast (coffee only).
  * **Lunch:** Never schedule lunch or lunch breaks on any day (Mon–Sun).
  * **Dinner:** Always schedule dinner **first** in the evening (`~5:15 PM`), right before feeding and walking the dogs.
* **Evening Routine Order (Strict Sequence):**
  1. Dinner (`5:15 – 5:45 PM`)
  2. Feed Dogs (`5:45 – 6:00 PM`)
  3. Walk Dogs (`6:00 – 6:35 PM`, walking off dinner)
  4. Peloton Bike Ride (`10 min` non-negotiable) + Peloton Stretch (`10 min`)
  5. Daily Evening Check-In (`~7:05 PM`)
  6. Wind Down & Sleep (`8:30 PM ±30 mins`)
* **Fitness Baselines (Current as of Nov 2026):**
  * **Morning Pushups:** `100 reps` consolidated in **3 sets (`33 / 33 / 34`)** (achieved 11/13/2026).
  * **Plank Hold:** `1:45` baseline (scaling toward `5:00` by end of 2027).
  * **Horse Stance:** `1:20` PR baseline (achieved 11/16/2026; scaling toward `4:00` by end of 2027).
  * **Peloton Core:** 2 Peloton ab/core workouts per week (typically Tue & Thu). Do not schedule post-work plank/hang or post-work rides.
* **Task & Errand Rules:**
  * **No Emojis:** Never use emojis in schedules or Google Tasks.
  * **No Fatigue Questions:** Never ask about fatigue, energy, or soreness during evening check-ins.
  * **Haircuts:** Haircut place is closed Mondays—schedule haircuts Tue–Sat only.
  * **Multi-Tier Google Tasks Priority:**
    1. `This week` (weekday daytime gaps before 5:00 PM; starred items first)
    2. `This month` (primary monthly targets)
    3. `YouTube` production & `YouTube Ideas` (Tue–Thu `3:15 – 5:00 PM`; 1st Saturday = Long-form, other Saturdays = Shorts; maintain 1-month rolling buffer)
    4. `Bigger projects` & `Next month` (Saturday 4-hour deep work block)
    5. `Computer Tasks` (at least 1 focused block weekly for CAD/MWIs)
    6. `General To Do` (buffer for remaining gaps)

---

## 4. Google Tasks Fixed Visual Row-ID Mapping Protocol

To keep the iPhone Google Tasks widget compact and chronological:
* Format every schedule block strictly as `[Start - End Time] | [Task Name]`.
* Leave `description`, `reminder_date`, and `reminder_time` **empty** (deadlines add clock pills that bloat widget height).
* **API vs. UI Mechanic:** `list_tasks` returns tasks ordered by `updated` timestamp descending, **not** by their visual row position in the Google Tasks app. `update_task` edits a task title in place without changing its visual row position, whereas `uncomplete_task` moves a task to Visual Row 1 (top of the active list).
* **Ensure the `Today` list in Google Tasks is set to `Sort by: My order`** (not alphabetical by Title).

| Visual Row (Top to Bottom) | Task ID | Role |
| :--- | :--- | :--- |
| **Row 1 (Top)** | `GhIKEEFkRTJIT25zMFp4ajNETkQ` | Earliest Morning Routine |
| **Row 2** | `GhIKEG5odXMyaHlOc1VVNTFlanE` | Block 2 |
| **Row 3** | `GhIKEGlGaEx1Z2VrY1ZweGhhcWs` | Block 3 |
| **Row 4** | `GhIKEGNtQ3J1LW5KVEswb1ZsODg` | Block 4 |
| **Row 5** | `GhIKEGt5NDc4a3JwUUxOUUxteC0` | Block 5 |
| **Row 6** | `GhIKEGNfNVpoTTRIQTFOMDZHR1A` | Block 6 |
| **Row 7** | `GhIKEENBZ1VYMWFnN0dBLTZpQlk` | Block 7 |
| **Row 8** | `GhIKEFpNY3ZJY2NsN2x0ekhfRHI` | Block 8 |
| **Row 9** | `GhIKEGpaSmdXelBMX1ByLXpaWXA` | Block 9 |
| **Row 10 (Bottom)** | `GhIKEF9MTkZXSXV5RkVLWFRReFI` | `8:30 PM \| Wind Down & Sleep` |

**Resetting Completed Tasks:** If any of the 10 rows were checked off during the day, first update all 10 titles in place, then `complete_task` any remaining open rows and `uncomplete_task` in reverse order (Row 10 -> Row 9 -> ... -> Row 1) sequentially so Row 1 lands at the very top.

---

## 5. Automated Scheduled Prompts (Copy into Antigravity)

### A. Daily 7:00 PM — Evening Accomplishment Check-In
```text
Conduct my daily evening accomplishment check-in and update my habit and goal tracking logs:

1. Analyze my Google Tasks:
   - Inspect both uncompleted and completed tasks to determine which schedule blocks and to-do items were marked as completed today.
2. Initiate my daily check-in message in chat:
   - Open by acknowledging the specific schedule blocks and to-dos I checked off as completed today in Google Tasks.
   - Ask strictly for specific quantitative metrics on today's workouts:
     (1) Pushups: Morning routine set breakdown toward the 100 morning reps goal (33/33/34), and any additional pushups throughout the day.
     (2) Plank: Exact duration and stability of today's plank hold (tracking toward 1:45 baseline and 5:00 goal).
     (3) Horse Stance: Exact duration of today's horse stance hold (tracking toward 1:20 baseline and 4:00 goal).
     (4) Peloton bike ride: Confirmation of ride duration (verifying the 10-minute minimum post-dinner/walk ride).
     (5) Peloton ab workout: If today was one of the 2 weekly core workout days, which class was completed.
   - Do not ask about fatigue, energy, or soreness.
3. Cross-reference reported metrics against 'Workout Goals & Progression Roadmap', 'Long Term Goals', 'Weekly Schedule Log', and 'Habit & Metric Progression Tracker' in 'Gemini Spark Workspace'.
4. Record accomplishments, task completions, and workout metrics into 'Weekly Schedule Log' and 'Habit & Metric Progression Tracker'.
5. Provide grounded feedback on metrics and pacing, and adjust tomorrow's schedule blocks accordingly.
```

### B. Daily 9:00 PM — Next Day Schedule Delivery & Google Tasks Sync
```text
Deliver tomorrow's daily timeblock schedule to me in chat and populate my Google Tasks schedule for the next day:

1. Retrieve the active weekly schedule entry for tomorrow from 'Weekly Schedule Log' in 'Gemini Spark Workspace'.
2. Check Google Calendar for any scheduled events, meetings, or commitments for tomorrow.
3. Format and deliver tomorrow's chronological schedule in chat without emojis.
4. Populate tomorrow's 10 schedule blocks into Google Tasks using the Fixed Visual Row-ID Mapping Protocol (Row 1 `GhIKEEFkRTJIT25zMFp4ajNETkQ` down to Row 10 `GhIKEF9MTkZXSXV5RkVLWFRReFI`) in tight, single-line format with no reminder deadlines or descriptions.
```

### C. Weekly Sunday 4:00 PM — Weekly Timeblock Schedule Generator
```text
Generate my personalized weekly timeblock schedule for the upcoming week (Monday through Sunday) and update my records:

1. Read 'Schedule Rules', 'Workout Goals & Progression Roadmap', 'Long Term Goals', and 'Weekly Schedule Log' in 'Gemini Spark Workspace'.
2. Check the 7-day weather forecast for South Patrick Shores, FL to route outdoor vs. indoor/admin tasks.
3. Check Google Calendar for upcoming events and Google Tasks using the 6-tier priority system.
4. Build a chronological Mon–Sun schedule following all routine anchors (4:20 AM workdays / 7:00 AM off-days, no breakfast/lunch, dinner -> feed dogs -> walk dogs -> 10m Peloton ride -> 10m stretch -> 8:30 PM bedtime, 2 weekly ab workouts, no tasks after 5:00 PM).
5. Prepend the new weekly schedule into 'Weekly Schedule Log' under Archive Entries and deliver it cleanly in chat without emojis.
```
