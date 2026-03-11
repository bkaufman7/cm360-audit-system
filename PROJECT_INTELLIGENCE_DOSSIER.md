# CM360 Audit System — Project Intelligence Dossier

> **Purpose:** Complete architectural analysis and operational knowledge base intended for human engineers and AI systems that must understand, maintain, extend, or refactor this codebase.  
> **Last Analyzed:** All 12,610 lines of `Code.js` plus `appsscript.json`, `README.md`, `TEAM_HANDOFF_README.md`, `Dashboard.html`, `ConfigPicker.html`, `ButtonsSidebar.html`, `AdminControlsHelp.html`, `ThresholdTestPicker.html`, `AdminRefreshPrompt.html`  
> **Analyzed by:** GitHub Copilot deep architectural review  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Repository Overview & File Structure](#2-repository-overview--file-structure)
3. [Platform & Runtime Environment](#3-platform--runtime-environment)
4. [Architecture Overview](#4-architecture-overview)
5. [Configuration Model](#5-configuration-model)
6. [Gmail Ingestion Pipeline](#6-gmail-ingestion-pipeline)
7. [File Merge Engine](#7-file-merge-engine)
8. [Core Audit Engine — Flagging Logic](#8-core-audit-engine--flagging-logic)
9. [Email Infrastructure](#9-email-infrastructure)
10. [Batch Orchestration & Trigger Architecture](#10-batch-orchestration--trigger-architecture)
11. [Checkpoint & Resume System](#11-checkpoint--resume-system)
12. [Results Cache & Run State](#12-results-cache--run-state)
13. [Performance Drop Detection](#13-performance-drop-detection)
14. [Launch Detection](#14-launch-detection)
15. [Exclusions Subsystem](#15-exclusions-subsystem)
16. [Recipients & Delivery Mode](#16-recipients--delivery-mode)
17. [Config List Management & Ordering](#17-config-list-management--ordering)
18. [External Config Sync](#18-external-config-sync)
19. [Cleanup & Retention Subsystem](#19-cleanup--retention-subsystem)
20. [Execution Metrics](#20-execution-metrics)
21. [Health Check, Watchdog & GAS Failure Forwarder](#21-health-check-watchdog--gas-failure-forwarder)
22. [UI & Admin Menu System](#22-ui--admin-menu-system)
23. [Nightly Maintenance & Auxiliary Automation](#23-nightly-maintenance--auxiliary-automation)

- [Appendix A: Known Production Configs](#appendix-a-known-production-configs)
- [Appendix B: Script Properties Inventory](#appendix-b-script-properties-inventory)
- [Appendix C: Drive Folder Structure](#appendix-c-drive-folder-structure)
- [Appendix D: CacheService Keys](#appendix-d-cacheservice-keys)
- [Appendix E: OAuth Scopes & Advanced Services](#appendix-e-oauth-scopes--advanced-services)
- [AI Handoff Notes](#ai-handoff-notes)

---

## 1. Executive Summary

The **CM360 Daily Audit System** is an enterprise-grade Google Apps Script (GAS) monolith that automates quality-control auditing of Campaign Manager 360 (CM360) ad delivery data for Horizon Media. The system runs entirely in the Google Cloud ecosystem (Gmail → Drive → Sheets → GAS triggers) with no external compute dependencies.

**What it does every weekday morning:**
1. Pulls daily CM360 Excel/CSV report attachments from Gmail labels
2. Merges them into canonical Google Sheet "merged reports" stored in Drive
3. Evaluates each placement row against 4 configurable flag types
4. Emails flagged rows (with Excel attachment) to per-config stakeholder lists
5. Sends a consolidated daily summary email to the admin distribution list
6. Detects performance drops and newly launched placements as secondary signals

**Scale:** 23+ active client/brand configs ("teams"), organized into up to 13 trigger-backed batches, running in parallel via timed triggers. Each config processes independently; failures do not cascade.

**Admin:** Currently `bkaufman@horizonmedia.com` (Brian Kaufman). System runs under service account `platformsolutionshmi@gmail.com`.

**Codebase:** Single 12,610-line `Code.js` JavaScript (V8 runtime) covering all subsystems. Zero external npm dependencies at runtime — all is GAS API surface.

---

## 2. Repository Overview & File Structure

```
cm360-audit-system/
├── Code.js                          # Monolithic GAS source (~12,610 lines)
├── appsscript.json                  # GAS manifest: scopes, advanced services, timezone
├── package.json                     # CLASP dev tooling (not deployed)
├── .claspignore / .clasp.json       # CLASP config (gitignored, holds Script ID)
│
├── Dashboard.html                   # Sidebar: batch/config status, admin actions
├── ConfigPicker.html                # Modal: select & run individual config audits
├── ButtonsSidebar.html              # Admin control panel sidebar
├── AdminControlsHelp.html           # In-app help reference
├── AdminRefreshPrompt.html          # One-time session prompt to sync config views
├── ThresholdTestPicker.html         # Threshold test runner UI
│
├── README.md                        # Public-facing documentation
├── TEAM_HANDOFF_README.md           # 2,235-line operational runbook
├── AUDIT_FLAGS_GUIDE.md             # Flag type explanations for end users
├── CONTRIBUTING.md                  # Dev contribution guidelines
├── SECURITY.md                      # Security policy
├── PERFORMANCE_DROP_THRESHOLDS_README.md  # Feature spec for perf drop config
│
├── migrate_perf_drop_thresholds.js  # One-time migration script (not deployed)
├── remove_duplicate_validate.py     # Python utility: cleanup duplicate functions
├── update_email_truncation.py       # Python utility: patch email truncation
├── update_runDailyAudit.py          # Python utility: update runDailyAudit calls
│
├── helper/
│   └── external-helper-complete.js  # Reference code for external config helper menu
│
├── tools/
│   ├── find-nonascii.js             # Scan for non-ASCII characters in source
│   └── normalize-text.js           # Normalize text encoding in source
│
└── archive/                         # Legacy/removed artifacts
    ├── Code.local.backup.js
    ├── ButtonsSidebar.html.REMOVED.txt
    └── clasp-watch.ps1
```

**Key facts about the file structure:**
- The entire runtime system lives in `Code.js` — HTML files are UI templates served via `HtmlService`
- `appsscript.json` is the only other deployed file that matters at runtime
- Python scripts in root are developer utilities, not deployed
- Helper/tools are for development aid only
- The `.clasp.json` file (gitignored) contains the live Script ID linking the local repo to the deployed Apps Script project

---

## 3. Platform & Runtime Environment

| Dimension | Value |
|---|---|
| Runtime | Google Apps Script (GAS) V8 JavaScript engine |
| Timezone | `America/New_York` (Eastern) |
| Execution limit | 6 minutes per invocation (hard GAS limit) |
| Exception logging | Stackdriver (Cloud Logging) |
| Trigger types | Time-based (daily, hourly, every-N-minutes) only; event trigger `onOpen` and `onEdit` |
| Email quota | ~100 emails/day per GAS quota (monitored and tracked) |
| CacheService | 6-hour TTL; 100KB max per entry |
| Script Properties | Unlimited keys; ~500KB total; persists forever |
| Deployment | Script bound to Admin Google Spreadsheet |
| Dev workflow | Local VS Code → CLASP push → GAS runtime |
| Auth | OAuth2 on behalf of `platformsolutionshmi@gmail.com` service account |
| Advanced Services | Drive API v2, Gmail API v1, Sheets API v4 (all enabled in manifest) |

**Key runtime constraints:**
- The 6-minute execution limit is the single biggest architectural driver. Almost every major subsystem (cleanup, backfill, batch orchestration, sync) has timeout-aware logic with checkpoint/continuation patterns.
- Drive API v2 (not the modern v3) is required for the `.toBlob()` Export URL approach that converts Google Sheets → XLSX. If the Drive API is disabled, Excel export falls back to CSV only.
- GAS V8 enables modern JS syntax but `globalThis` access is needed for dynamic function calling by name (used in batch runner detection).

---

## 4. Architecture Overview

### System Topology

```
Gmail (platformsolutionshmi@gmail.com)
  └── Labels: Daily Audits/CM360/<CONFIG>
       │
       ▼
[GAS Trigger: runDailyAuditsBatch1..13 at 8:00 AM]
       │
       ├── fetchDailyAuditAttachments()   ← Gmail → Drive Temp folder
       │
       ├── mergeDailyAuditExcels()        ← Temp folder → Merged Google Sheet
       │
       ├── executeAudit()                 ← Flag 4 issue types per row
       │
       ├── detectPerformanceDrops_()      ← Compare vs Drive JSON cache
       │
       ├── detectLaunchesFromMergedData_() ← New placements within window
       │
       └── emailFlaggedRows() / sendNoIssueEmail()
            ├── To: per-config recipients (or ADMIN_EMAIL in staging)
            └── Attachment: XLSX (FULL or FLAGGED_ONLY mode)

[GAS Trigger: resumeTimedOutBatches at 9:15 AM]
  └── Resume any batch that hit the 6-min wall

[GAS Trigger: sendDailySummaryFailover at 9:30 AM]
  └── Send summary even if some configs are incomplete

[GAS Trigger: runHealthCheckAndEmail at 5:00 AM]
  └── Non-destructive health check → email to ADMIN_EMAIL

[GAS Trigger: auditWatchdogCheck every 3 hours]
  └── Detect hung/stuck batches → alert ADMIN_EMAIL

[GAS Trigger: runNightlyMaintenance at 2:20 AM]
  └── Rebalance batch order, sync external config, update placement names,
      clear daily properties, cleanup checkpoints, cleanup old files,
      delete old Gmail threads

[Admin Spreadsheet UI]
  └── createAuditMenu → 8-submenu Admin Controls menu
```

### Subsystem Dependency Graph

```
loadRecipientsFromSheet()  ──┐
loadThresholdsFromSheet()   ─┼──► executeAudit()
loadExclusionsFromSheet()  ──┘        │
loadPerformanceDropThresholds()  ──── │
                                      │
fetchDailyAuditAttachments() ─────────┤
mergeDailyAuditExcels()      ─────────┤
detectPerformanceDrops_()    ─────────┤
detectLaunchesFromMergedData_() ──────┤
emailFlaggedRows()           ◄────────┘
sendNoIssueEmail()           ◄────────┘
storeCombinedAuditResults_() ◄────────┘
logExecutionMetric_()        ◄────────┘

runAuditBatch() orchestrates executeAudit() calls
  → writes to Script Properties (run states)
  → calls attemptSendDailySummary_() when isFinal

sendDailySummaryEmail() reads from getCombinedAuditResults_() + getAllAuditRunStates_()
```

---

## 5. Configuration Model

### Two-Spreadsheet Pattern

The system uses a **two-spreadsheet pattern**:
1. **Admin Spreadsheet** — bound to the Apps Script project; contains all config sheets; accessible only to admins
2. **External Config Spreadsheet** — shared with team leads for self-service config management; ID hardcoded as `EXTERNAL_CONFIG_SHEET_ID = '1-566gqkyZRNDeNtXWUjKDB_H8A9XbhCu8zL-uaZdGT8'`

`getConfigSpreadsheet()` always returns the Admin spreadsheet (via `SpreadsheetApp.getActiveSpreadsheet()`). When `EXTERNAL_CONFIG_SHEET_ID` is set, sync operations copy between the two.

### Four Configuration Sheets

#### 1. Audit Recipients (`RECIPIENTS_SHEET_NAME`)
Columns: Config Name | Primary Recipients | CC Recipients | Active | Withhold No-Flag Emails | Last Updated | Attachment Mode | INSTRUCTIONS

- **Active** = `TRUE/FALSE` — inactive configs are ignored in all operations
- **Withhold No-Flag Emails** = `TRUE` skips the "no issues found" clean-pass email
- **Attachment Mode** = `FULL` (default) attaches the complete merged sheet; `FLAGGED_ONLY` creates a sparse XLSX with only flagged rows
- This sheet is the **single source of truth** for which configs exist — `getAuditConfigs()` derives the config list from this sheet

#### 2. Audit Thresholds (`THRESHOLDS_SHEET_NAME`)
Columns: Config Name | Flag Type | Min Impressions | Min Clicks | Active | | INSTRUCTIONS

- One row per (Config, Flag Type) pair
- **Threshold logic**: the system looks at which of impressions or clicks is higher for a given placement, then checks that metric against the corresponding threshold column
- Falls back to `{ minImpressions: 0, minClicks: 0 }` if no matching row found (meaning everything above 0 volume is flagged)

#### 3. Audit Exclusions (`EXCLUSIONS_SHEET_NAME`)
Columns: Config Name | Placement ID | Placement Name (auto) | Site Name | Name Fragment | Apply to All Configs | Flag Type | Reason | Added By | Date Added | Active | | INSTRUCTIONS

- **Three exclusion match types**: exact Placement ID, exact Site Name, Name Fragment (substring)
- **Flag Type** can be a specific flag or `all_flags`
- **Apply to All Configs = TRUE** expands the rule to every active config
- Column C (Placement Name) is auto-populated from merged reports and protected against manual editing
- `onEdit()` simple trigger auto-populates column C when columns A or B change

#### 4. Performance Drop Thresholds (`PERFORMANCE_DROP_THRESHOLDS_SHEET_NAME`)
Columns: Config Name | Enable Performance Drop | Drop Percentage Threshold | Min Volume Threshold | Grace Period Days | Enable Launch Detection | Launch Window Days | Launch Min Volume | Include Launch Attachment | Active | Last Updated | INSTRUCTIONS

- Per-config knobs for both performance drop detection and launch detection (two separate features controlled from one sheet)
- **Include Launch Attachment**: `none`/blank, `table only`, `attachment only`, `both` — controls whether flagged email includes a launch inline HTML table, an Excel attachment, or both

### Global Constants (Lines 1–60 of Code.js)

```javascript
const EXTERNAL_CONFIG_SHEET_ID = '1-566gqkyZRNDeNtXWUjKDB_H8A9XbhCu8zL-uaZdGT8';
const getStagingMode_()          // reads Script Property 'STAGING_MODE'; default 'Y'
const ADMIN_EMAIL               // reads Script Property 'ADMIN_EMAIL'; fallback 'bkaufman@horizonmedia.com'
const TRASH_ROOT_PATH           // ['Project Log Files', 'CM360 Daily Audits']; configurable via 'TRASH_ROOT_PATH_JSON'
const BATCH_SIZE = 3            // configs per batch trigger
const DEDICATED_BATCH_CONFIGS   // ['NEXTSD01', 'NEXTSD02'] — get their own single-config batches
const EMAIL_BODY_BYTE_LIMIT = 90000  // 90KB hard cap on HTML email body
const ALWAYS_INCLUDE_EMAIL      // 'bkaufman@horizonmedia.com' — CC on every production email
const PERFORMANCE_CACHE_DAYS = 7
const PERFORMANCE_BACKFILL_DAYS = 4
const PERFORMANCE_CACHE_PATH    // ['Project Log Files', 'CM360 Daily Audits', 'Performance Cache']
```

---

## 6. Gmail Ingestion Pipeline

**Entry point:** `fetchDailyAuditAttachments(config, recipientsData)`

### Flow

1. **Label resolution** (`findGmailLabel_`): 3-step resolver
   - Step 1: exact match on `config.label` (e.g., `Daily Audits/CM360/PST01`)
   - Step 2: case-insensitive match
   - Step 3: suffix match (just the config name portion)
   - Failure → sends notification email and returns `null`

2. **Thread search**: `GmailApp.search()` with `after:todayStr` on the label

3. **Temp folder creation**: timestamped `Temp_CM360_<yyyyMMdd_HHmmss>` under the config's `tempDailyFolderPath`

4. **Attachment extraction** per thread/message:
   - `.xlsx` files → saved directly via blob
   - `.csv` files → saved directly
   - `.zip` files → extracted; each inner file processed
   - XLSX saved via `safeConvertExcelToSheet()` (Drive API conversion to Google Sheet)

5. **Failure handling**: if no files found after processing all threads, sends a "no files found" notification email to recipients

**Key fields on config object:**
```javascript
{
  name: 'PST01',
  label: 'Daily Audits/CM360/PST01',
  mergedFolderPath: ['Project Log Files', 'CM360 Daily Audits', 'To Trash After 60 Days', 'Merged Reports', 'PST01'],
  tempDailyFolderPath: ['Project Log Files', 'CM360 Daily Audits', 'To Trash After 60 Days', 'Temp Daily Reports', 'PST01']
}
```

---

## 7. File Merge Engine

**Entry point:** `mergeDailyAuditExcels(folderId, mergedFolderPath, configName, recipientsData)`

### What it produces

Creates a Google Sheet named `CM360_Merged_Audit_<CONFIG>_<yyyy-MM-dd>` in the config's merged folder. This is the canonical daily audit file — all downstream steps (flagging, emailing, caching) operate on this sheet.

### Required 14-column schema (in order)

| # | Column Name | Notes |
|---|---|---|
| 1 | Advertiser | |
| 2 | Campaign | |
| 3 | Site (CM360) | |
| 4 | Placement ID | Dedup key component |
| 5 | Placement | |
| 6 | Placement Start Date | Dedup key component |
| 7 | Placement End Date | Dedup key component |
| 8 | Ad Type | |
| 9 | Creative | Dedup key component |
| 10 | Placement Pixel Size | |
| 11 | Creative Pixel Size | |
| 12 | Date | |
| 13 | Impressions | |
| 14 | Clicks | Dedup key component (both impressions and clicks) |

### Header detection

- Looks for header row in first 20 rows
- **Strict mode**: all 10 required keyword groups must match
- **Fallback**: at least 50% of `headerKeywords` must match
- `headerKeywords` array: `['advertiser', 'campaign', 'site', 'placement', 'ad type', 'creative', 'pixel size', 'date', 'impression', 'click']`

### Schema failsafes

- **CSV/XLSX fallback**: if the primary file has wrong column count, looks for a counterpart file with same base name but different extension
- **13-column failsafe**: if header has 13 columns, looks for a 14-column counterpart file
- **11-column legacy FLAGGED_ONLY format**: remaps old format to the 14-column schema

### Deduplication

Key: `PlacementID + PlacementStartDate + PlacementEndDate + Creative + Impressions + Clicks`

Dates are normalized before comparison (all to `yyyy-MM-dd` string). Grand Total rows removed.

### Post-merge cleanup

Source temp files moved to `Temp Daily Reports/<configName>` holding area (not deleted — cleanup runs separately).

---

## 8. Core Audit Engine — Flagging Logic

**Entry point:** `executeAudit(config, preloaded)`

The `preloaded` parameter carries pre-loaded config tables from `runAuditBatch()` to avoid redundant sheet reads within a batch.

### Audit Flow (simplified)

```
1. Verify Drive API enabled
2. Load config tables (exclusions, thresholds, recipients, perfDropThresholds)
   → Uses preloaded batch cache if available
3. fetchDailyAuditAttachments()  → temp folder with today's files
4. Read yesterday's perf cache   → baseline for drop detection
5. mergeDailyAuditExcels()       → canonical merged Google Sheet
6. Detect header row in merged sheet
7. FLAGGING LOOP (per row):
   a. clicks_greater_than_impressions
   b. out_of_flight_dates
   c. pixel_size_mismatch
   d. default_ad_serving
8. Sort flagged rows by max(impressions, clicks) DESC
9. Rewrite merged sheet: flagged rows first, then unflagged
10. Apply yellow highlight per flag-type column
11. Apply zebra striping across all rows
12. savePerformanceCache_()       → write today's data as JSON in Drive
13. detectLaunchesFromMergedData_()
14. emailFlaggedRows() or sendNoIssueEmail() or withhold (if withholdNoFlagEmails=TRUE)
15. logExecutionMetric_()
16. Return result object
```

### Flag Type Details

#### `clicks_greater_than_impressions`
- Condition: `clicks > impressions`
- Volume gate: `max(clicks, impressions)` must exceed `max(threshold.minImpressions, threshold.minClicks)` using the higher-side metric to select which threshold to compare against
- Example: if impressions=1500 > clicks=75, uses `minImpressions` threshold

#### `out_of_flight_dates`
- Condition: `placementStartDate > today` OR `placementEndDate < today`
- Both date columns are parsed; empty dates skip flagging

#### `pixel_size_mismatch`
- Condition: `placementPixelSize !== creativePixelSize` (normalized via `normalizePixelSize()`)
- Both columns must be non-empty
- `normalizePixelSize()` standardizes whitespace: `"1 x 1"` → `"1x1"`

#### `default_ad_serving`
- Condition: `adType.toLowerCase().includes('default')`

### Exclusion Check

Before applying any flag, `isPlacementExcludedForFlag(exclusionsData, configName, placementId, flagType, placementName, siteName)` is called. The function checks:
1. `all_flags` block first (placement ID, site name, name fragment)
2. Specific flag type block (placement ID, site name, name fragment)

Returns `true` (excluded) if any match found.

### Flagged Row Sort

Rows with flags are sorted by `Math.max(clicks, impressions)` descending — highest-volume flagged placements appear first in the email and sheet.

### Yellow Highlight Columns

Each flag type maps to a specific column in the merged sheet that gets background `#FFFF00`:
- clicks_greater_than_impressions → Impressions column (13) and Clicks column (14)
- out_of_flight_dates → Start Date (6) and End Date (7)
- pixel_size_mismatch → Placement Pixel Size (10) and Creative Pixel Size (11)
- default_ad_serving → Ad Type (8)

---

## 9. Email Infrastructure

### Central Dispatcher: `safeSendEmail(opts, context)`

All email sending goes through this function. It:
1. Checks `isEmailSuppressed_()` — in "silent run" mode, silently drops the email
2. Logs payload byte size
3. **Staging mode** (`STAGING_MODE = 'Y'`): strips CC/BCC, sends ONLY to `ADMIN_EMAIL`
4. **Production mode**: injects `ALWAYS_INCLUDE_EMAIL` ('bkaufman@horizonmedia.com') into CC on every outbound
5. Optional `bccAdmin` param: adds `ADMIN_EMAIL` to BCC
6. On send error: sends a failure alert to `ADMIN_EMAIL`

**Parameters:**
```javascript
safeSendEmail({
  to: string,           // recipient(s), comma-separated
  cc: string,           // optional CC
  bcc: string,          // optional BCC
  subject: string,
  htmlBody: string,     // HTML email body
  plainBody: string,    // plaintext fallback
  attachments: Blob[],  // optional file attachments
  bccAdmin: boolean,    // whether to BCC ADMIN_EMAIL
  name: string          // sender display name
}, contextLabel)
```

### Body Size Guard

`getEmailPayloadSize_(htmlBody, plainBody)` computes byte size via `Utilities.newBlob`. If the computed size exceeds `EMAIL_BODY_BYTE_LIMIT = 90000` (90KB), `emailFlaggedRows()` progressively truncates the row table:
1. Tries progressively fewer rows (50%, 25%, 10 rows, 5 rows, 1 row)
2. Final fallback: "too many flagged rows to display — see attachment for full details"

### Flagged Row Email: `emailFlaggedRows()`

**Subject:** `⚠️ CM360 Daily Audit: Issues Detected (<configName> - <date>)`

**Aggregated summary mode (≥40 flags):** Instead of a row-by-row table, calls `buildAggregatedFlagSummary_()` which builds a hierarchical breakdown: Flag Type → Site/Campaign → Count.

**Row table (< 40 flags):** 11 HTML columns: Advertiser | Campaign | Site | Placement | Placement ID | Start Date | End Date | Creative | Impr. | Clicks | Flag(s)

**Attachment modes:**
- `FULL` (default): attaches the full merged Google Sheet exported as XLSX
- `FLAGGED_ONLY`: creates a temporary 15-column sparse workbook (just flagged rows) → exports → trashes temp sheet

**Performance drop section**: rendered as a separate HTML table below the flags table (if drops detected)

**Launch section**: controlled by `includeLaunchAttachment` field:
- `none`/blank: no launch section
- `table only`: inline HTML table only
- `attachment only`: XLSX file only  
- `both`: inline HTML table + XLSX file
- < 25 launches = full placement-level detail table
- ≥ 25 launches = grouped summary table (Campaign → Site → Date Launched → Count)

### Daily Summary Email: `sendDailySummaryEmail(results)`

**Recipients:** `bkaufman@horizonmedia.com, bmuller@horizonmedia.com, ewarburton@horizonmedia.com`

**Content:**
- Mode badge (STAGING/PRODUCTION, color-coded)
- Aggregate metrics: total configs, total flagged, errors, skipped, emails sent/withheld
- Delta vs previous day (reads `CM360_PREV_DAY_COUNTS_*` Script Properties)
- Config result table sorted by: most flags → errors → skipped → alphabetical
- Each row links to the merged report Google Sheet (with date validation: `strictLatestLink` mode)
- Top 5 offenders snippet
- Quota remaining display

**Idempotency:** `attemptSendDailySummary_()` uses `CacheService` lock (`CM360_SUMMARY_SENT`, 6hr TTL) to prevent double-send.

**Failover:** `sendDailySummaryFailover()` allows placeholder rows for incomplete configs — runs via dedicated 9:30 AM trigger.

**Force resend:** `forceResendSummaryEmail()` clears the cache flag; `previewDailySummaryNow()` shows in modal without sending.

---

## 10. Batch Orchestration & Trigger Architecture

### Trigger Schedule

| Trigger Function | Schedule | Purpose |
|---|---|---|
| `runDailyAuditsBatch1` through `runDailyAuditsBatch13` | 8:00 AM daily | Daily audit batches |
| `resumeTimedOutBatches` | 9:15 AM daily | Resume batches that hit 6-min limit |
| `sendDailySummaryFailover` | 9:30 AM daily | Send summary even if some configs incomplete |
| `runHealthCheckAndEmail` | 5:00 AM daily | Non-destructive system health report |
| `auditWatchdogCheck` | Every 3 hours | Detect hung/stuck batches |
| `runDeliveryModeSync` | Every 3 hours | Update delivery mode indicator on both config sheets |
| `autoFixRequestsSheet_` | Every 4 hours | Repair/repack Audit Requests sheet in external config |
| `runNightlyMaintenance` | 2:20 AM daily | Batch rebalance, sync, cleanup, property reset |
| `forwardGASFailureNotificationsToAdmin` | Every 1 hour | Forward GAS failure emails to ADMIN_EMAIL |
| `cleanupOldAuditFiles` (continuation) | One-shot 60s delay | Resumable cleanup continuation trigger |

All installed/managed by `installAllAutomationTriggers(options)`. The `options.handlers` array can filter to only reinstall a specific subset.

### Batch Construction

`getAuditConfigBatches(batchSize)`:
1. Separates `DEDICATED_BATCH_CONFIGS` (`NEXTSD01`, `NEXTSD02`) into solo batches (placed first)
2. Groups remaining configs into batches of `BATCH_SIZE = 3`
3. Returns array of arrays: `[[config], [config], [PST01,PST02,PST03], [NEXT01,NEXT02,NEXT03], ...]`

### Batch Runner Functions

`runDailyAuditsBatch1` ... `runDailyAuditsBatch13` are static stub functions in `Code.js`. Each calls `runAuditBatch(getAuditConfigBatches(BATCH_SIZE)[N-1], isLastBatch)`.

`insertMissingBatchFunctionsIntoSource_()` can auto-generate missing stubs by modifying Code.js via the Apps Script REST API (`getScriptProjectContent_()` / `updateScriptProjectContent_()`).

### `runAuditBatch(configs, isFinal)`

1. Validates configs (calls `validateAuditConfigs()`)
2. Generates stable batch ID from sorted config names: `md5-like` deterministic string
3. Checks for existing checkpoint → resume if present (max 3 attempts)
4. Records run state to Script Properties (`CM360_AUDIT_RUN_STATE_<batchId>`)
5. **Preloads all config tables once** (recipients, thresholds, exclusions, perf thresholds) — avoids N×4 sheet reads within one batch
6. **6-minute soft guard**: if approaching timeout (within 30s), saves checkpoint and exits
7. Processes configs one at a time, stores incremental results after each
8. On completion: marks `completedAt` on run state
9. If `isFinal`: calls `attemptSendDailySummary_()` to dispatch the daily summary

### Dedicated Config Handling

`NEXTSD01` gets its own single-config batch because it historically had very large report files and needed isolation. `NEXTSD02` similarly. These dedicated batches run as Batch 1 and Batch 2, ensuring they're never delayed by other configs in a shared batch.

---

## 11. Checkpoint & Resume System

Handles the GAS 6-minute execution wall for multi-config batches.

### Checkpoint Storage

Script Property key: `CHECKPOINT_<batchId>`  
**Structure:**
```json
{
  "batchId": "...",
  "completedConfigs": ["PST01", "PST02"],
  "remainingConfigs": ["PST03"],
  "attemptCount": 1,
  "savedAt": 1700000000000
}
```
Maximum 3 attempts per batch before a batch is considered truly failed.

### Functions

| Function | Purpose |
|---|---|
| `saveCheckpoint_(batchId, completed, remaining, attempts)` | Persist checkpoint to Script Properties |
| `loadCheckpoint_(batchId)` | Load checkpoint or return null |
| `clearCheckpoint_(batchId)` | Remove checkpoint key |
| `getAllCheckpoints_()` | List all CHECKPOINT_ keys |
| `cleanupOldCheckpoints_()` | Remove checkpoints older than 24 hours |

### `resumeTimedOutBatches()`

- **Time window guard**: only runs between 8:00 AM and 9:30 AM (prevents spurious late-morning resumes)
- Checks lock age: if a batch lock is >7 minutes old and incomplete, treats as timed-out
- Resumes ONE batch per call (to avoid chaining timeouts)

### `rerunFailedConfigs()`

UI-interactive function that:
1. Scans `CM360_AUDIT_RUN_LIST_V1` for all batch run IDs
2. For each batch, loads the run state from Script Properties
3. Identifies configs with status: `error`, `failed`, `in_progress` (stale), or not-run
4. Shows user a confirmation dialog listing which configs will be retried
5. Calls `runAuditBatch()` with the failed configs as a new batch

`rerunFailedConfigs_Automated()` is the non-UI equivalent, designed for trigger use (trigger not currently installed).

### `runDailyAuditByName(configName)`

Single-config convenience wrapper used by ConfigPicker UI and named per-config helper functions like `runPST01Audit()`.

---

## 12. Results Cache & Run State

### Run State (Script Properties)

Key: `CM360_AUDIT_RUN_STATE_<batchId>`  
Written by `runAuditBatch()` incrementally during execution.  
Read by summary system and watchdog.

Run list key: `CM360_AUDIT_RUN_LIST_V1` — CSV of all batch IDs that ran today.

### Combined Audit Results Cache (CacheService)

`storeCombinedAuditResults_(newResults)`:
- Merges with existing cache by config name (last-write-wins)
- Tries 3 serialization strategies to fit under 95KB: full → trimmed (removes large fields) → minimal (name/status/flags only)
- 6-hour TTL

Each result object stored in the cache:
```javascript
{
  configName: string,
  status: 'success' | 'error' | 'skipped' | 'no_files_found' | 'in_progress',
  flaggedCount: number,
  emailSent: boolean,
  emailWouldBeWithheld: boolean,
  startTime: ISO string,
  endTime: ISO string,
  durationMs: number,
  latestReportUrl: string,  // URL of merged Google Sheet
  note: string,             // human-readable status note
  batchId: string,
  attemptCount: number
}
```

`getCombinedAuditResults_()`: Deserializes with type validation. Returns latest state for all configs.

`mergeAuditResultsByConfig_(...resultSets)`: Multi-source merge utility; used by summary system to combine cache + run state data.

### `buildSummaryResultSet_(options)`

Assembles complete result set for the daily summary email:
1. Reads from combined audit results cache
2. Reads all Script Property run states
3. Generates placeholder "stub" rows for configs that are in-progress, not-started, or missing
4. Passes `strictLatestLink: true` to validate that today's exact merged report file exists before linking it

---

## 13. Performance Drop Detection

Compares today's per-placement impression/click totals against a rolling 3-day average from a Drive-based JSON cache.

### Cache Storage

- Path: `['Project Log Files', 'CM360 Daily Audits', 'Performance Cache', <configName>]`
- Files: `cache_yyyy-MM-dd.json` per day
- Retention: last 7 days (`PERFORMANCE_CACHE_DAYS = 7`)
- Structure: `{ date, timestamp, data: [{ placementId, impressions, clicks, placementName, siteName, startDate, endDate, advertiser, campaign, creative }] }`

### Detection Logic (`detectPerformanceDrops_`)

1. Reads daily cache files for last 3 days via `readPerformanceCache_(configName, 3)`
2. Builds `historicalMap`: placementId → array of daily metrics
3. For each placement in today's data:
   - Skip if excluded (`isPlacementExcludedForFlag` with flag type `performance_drop`)
   - Apply **grace period**: skip if days-in-flight ≤ `gracePeriod`
   - Skip if placement is not active (not within start/end dates, unless ended within last 3 days)
   - Skip if history has 0 days
   - Calculate 3-day average impressions and clicks
   - Skip if average volume < `minVolume` (both impressions and clicks)
   - Calculate drop %: `((avg - current) / avg) * 100`
   - Flag if drop ≥ `dropPercentage` AND average ≥ `minVolume` (separately for impressions and clicks)
4. Returns list of drop objects with: placementId, name, site, dates, advertiser, campaign, creative, currentImpressions, avgImpressions, impressionDrop%, currentClicks, avgClicks, clickDrop%, daysInHistory

### Per-Config Thresholds

From `loadPerformanceDropThresholdsFromSheet()`:
```javascript
{
  enabled: true,
  dropPercentage: 50,    // % drop to flag (configurable)
  minVolume: 200,        // min avg impressions or clicks to trigger
  gracePeriod: 0,        // skip first N days of flight
  launchDetectionEnabled: true,
  launchWindowDays: 3,
  launchMinVolume: 100,
  includeLaunchAttachment: 'both'  // 'none', 'table only', 'attachment only', 'both'
}
```

### Backfill System

`performanceBackfillHistory()` is a resumable function that backfills historical cache from existing merged report files for configs that have < 3 days of cache. Uses the same checkpoint/continuation pattern (30-second continuation trigger, state in `PERFORMANCE_BACKFILL_STATE_KEY` Script Property).

---

## 14. Launch Detection

Detects placements that started delivery within a configurable window (default: last 3 days).

**Entry point:** `detectLaunchesFromMergedData_(configName, currentData, thresholds, exclusionsData)`

### Logic

For each placement in today's data:
1. Skip if excluded (flag type `launch`)
2. Calculate `daysFromStart = floor((today - startDate) / 1 day)`
3. Flag if 0 ≤ daysFromStart ≤ `launchWindowDays` AND daysFromStart ≤ 7
4. Require `impressions >= launchMinVolume` OR `clicks >= launchMinVolume`

Launch detection result object:
```javascript
{
  placementId, placementName, siteName,
  startDate, endDate, advertiser, campaign, creative,
  impressions, clicks, daysFromStart
}
```

### Email Rendering

- **< 25 launches**: full placement-level HTML table (11 columns)
- **≥ 25 launches**: grouped summary via `buildLaunchSummaryTable_()` (Campaign → Site → Date Launched → Count)

### Dynamic Header

`buildLaunchDetectionHeader_(thresholds)` renders a styled green info box showing the detection criteria (window, min volume, grace period) with actual configured values.

### XLSX Attachment

`createLaunchAttachment_(launchDetections, configName, subjectDate)` creates a temporary Google Sheet, populates it with launch details, exports via Drive API to XLSX blob, trashes the temp sheet, returns the blob.

---

## 15. Exclusions Subsystem

### Loading: `loadExclusionsFromSheet()`

Returns a nested object:
```javascript
{
  "PST01": {
    "all_flags": {
      placementIds: ["424138145"],
      siteNames: ["youtube"],
      nameFragments: ["social media"]
    },
    "clicks_greater_than_impressions": {
      placementIds: [],
      siteNames: [],
      nameFragments: []
    }
  }
}
```

**Note:** If `Apply to All Configs = TRUE`, the function calls `getAuditConfigs()` to expand to all active config names — this creates N copies of the exclusion rule.

### Checking: `isPlacementExcludedForFlag(exclusionsData, configName, placementId, flagType, placementName, siteName)`

Two-pass check:
1. `all_flags` block: placement ID → site name → name fragment
2. Specific `flagType` block: placement ID → site name → name fragment

Site name comparison: `toLowerCase()` on both sides. Name fragment: `trimmedPlacementName.includes(fragment.toLowerCase())`.

Returns `true` if ANY match found.

### Auto-Population: `onEdit()` simple trigger

When user edits Config Name (col 1) or Placement ID (col 2) in the Exclusions sheet, `LOOKUP_PLACEMENT_NAME(configName, placementId)` searches the most recent merged report files for that config and populates col 3 (Placement Name).

### Column C Protection

`enforcePlacementNameProtectionAndStyle_()` applies:
- Gray background (#eeeeee) and gray text (#555555) on C2:C
- Range protection preventing non-owner edits
- Runs on both sheet creation and existing sheet open

### Batch Update: `updatePlacementNamesFromReports()`

Admin-triggered bulk update that finds all rows where Placement Name is empty or contains an error message, then calls `buildIdToNameMap_(configName)` to open the latest merged report for each config and reverse-lookup placement names.

---

## 16. Recipients & Delivery Mode

### Loading: `loadRecipientsFromSheet()`

Returns:
```javascript
{
  "PST01": {
    primary: "user1@company.com, user2@company.com",
    cc: "",
    withholdNoFlagEmails: false,
    attachmentMode: "FULL"  // or "FLAGGED_ONLY"
  }
}
```

### Resolution at Send Time

`resolveRecipients(configName, recipientsData)`:
- In **STAGING mode**: always returns `ADMIN_EMAIL` — recipients are stripped
- In **PRODUCTION mode**: returns `entry.primary` or `ADMIN_EMAIL` as fallback

`resolveCc(configName, recipientsData)`:
- In **STAGING mode**: always returns `''` — CC is stripped
- In **PRODUCTION mode**: returns `entry.cc`

### Delivery Mode Display

`getCurrentDeliveryMode_()` → `'STAGING'` or `'PRODUCTION'`

`syncDeliveryModeStatus()` updates the "Delivery Mode" row in the INSTRUCTIONS column of the Recipients sheet on BOTH the Admin and External config spreadsheets. Called on `onOpen()` and by a 3-hour periodic trigger (`runDeliveryModeSync`).

### Auto-Timestamp: `onEdit()` simple trigger

When editing columns 1–5 in the Recipients sheet (on any row > 1), auto-writes today's date to column F (Last Updated).

### Staging Mode Control

```javascript
setStagingModeOn()   // PropertiesService.setProperty('STAGING_MODE', 'Y')
setStagingModeOff()  // PropertiesService.setProperty('STAGING_MODE', 'N')
```

Default is `'Y'` (staging) if Script Property not set — prevents accidental production sends after a fresh clone/deploy.

---

## 17. Config List Management & Ordering

### `getAuditConfigs(options)`

- Derives config list from the Recipients sheet (`loadRecipientsFromSheet()`)
- Only includes rows where `shouldIncludeConfigRow_()` returns true
- Applies custom ordering if `CONFIG_ORDER_PROPERTY_KEY` Script Property is set
- In-memory cache: `auditConfigsCache_` — invalidated by `clearAuditConfigsCache_()`

### Custom Batch Ordering

`rebalanceAuditBatchesUsingSummary(options)` implements a **high-low pairing algorithm** for load balancing:
1. Reads previous day's config flag counts from `getPreviousSummaryCounts_()`
2. Sorts configs by flag count descending
3. Pairs highest-flagged with lowest-flagged configs to distribute load across batches
4. Saves to `CONFIG_ORDER_PROPERTY_KEY` Script Property

**Tied metrics case**: if all configs have the same count (first run or no data), falls back to alphabetical order or retains existing custom order.

Called nightly by `runNightlyMaintenance()`.

### `makeAuditConfig_(name, label)`

Factory for config objects:
```javascript
{
  name: 'PST01',
  label: 'Daily Audits/CM360/PST01',
  mergedFolderPath: ['Project Log Files', 'CM360 Daily Audits', 'To Trash After 60 Days', 'Merged Reports', 'PST01'],
  tempDailyFolderPath: ['Project Log Files', 'CM360 Daily Audits', 'To Trash After 60 Days', 'Temp Daily Reports', 'PST01']
}
```

---

## 18. External Config Sync

Bidirectional sync between the bound Admin spreadsheet and the External Config spreadsheet.

### `syncToExternalConfig()` (Admin → External)

Copies Recipients, Thresholds, and Exclusions sheets from Admin to External. Copies:
- Values
- Formatting (backgrounds, fonts, font sizes, weights, styles, alignments)
- Data validations (dropdown rules)
- Column widths and row heights (first 50 rows)
- Range protections (up to `MAX_PROTECTIONS = 20`)

### `syncFromExternalConfig(options)` (External → Admin)

Copies Recipients, Thresholds, Performance Drop Thresholds, Exclusions, and Audit Requests from External to Admin.

**Options:**
```javascript
{
  silent: false,           // suppress UI alerts
  valuesOnly: false,       // skip formatting/validations
  copyFormatting: true,
  copyValidations: true,
  copyDimensions: true,
  copyProtections: false   // OFF by default
}
```

**Runtime guard**: aborts remaining sheets if approaching 5-minute budget.  
**Heavy cells threshold**: skips formatting if `rows × cols > 100,000`.

### `syncFromExternalConfigQuick()`

Values-only fast variant for menu use — skips all formatting to avoid timeouts.

### Nightly Sync: `runNightlyExternalSync()`

Runs as part of `runNightlyMaintenance()` with full formatting options.

### Instruction Refresh

`refreshExternalConfigInstructions()` and `refreshExternalHeaderStyles()` apply standardized INSTRUCTIONS sections and header styling to the external config tabs without overwriting data.

`ensureExternalConfigInstructions()` ensures all 4 tabs (Recipients, Thresholds, Exclusions, Audit Requests) exist and have standardized content — also re-applies conditional formatting rules (inactive shading, banding).

---

## 19. Cleanup & Retention Subsystem

### Drive File Cleanup

**Entry point:** `cleanupOldAuditFiles()`

Resumable 60-day retention cleanup with pagination. State stored in Script Property `CM360_CLEANUP_STATE_V1`.

**5 processing phases (in order):**
1. Loose files at `TRASH_ROOT_PATH` root
2. Temp folders per config (`Temp_*` prefix)
3. Merged files per config (`CM360_Merged_Audit_*` prefix inside `Merged Reports/<config>`)
4. Other folders under `To Trash After 60 Days`
5. (Legacy phase 5): additional cleanup around old structure

**Runtime budget**: `CLEANUP_RUNTIME_BUFFER_MS = 5000` (5s remaining when GAS would kill it → saves state and schedules continuation via 60-second one-shot trigger)

**Deletion log**: `CM360 Deletion Log` Google Sheet in `DELETION_LOG_PATH`. Three tabs: Temp Daily Reports | Merged Reports | Gmail Emails.

### Gmail Cleanup

**Entry point:** `deleteOldAuditEmails()`  
Deletes Gmail threads older than 90 days from all `Daily Audits/CM360/*` labels.  
Processes in batches of 100 threads; 500ms sleep between batches.  
Logs deletions (subject, label, date, message count) to the Deletion Log spreadsheet Gmail Emails tab.  
Sends summary email to ADMIN_EMAIL if any deletions occurred.  
Called by `runNightlyMaintenance()`.

### Performance Cache Cleanup

`cleanupOldPerformanceCache_(cacheFolder, currentDateStr)` runs after each daily cache save. Deletes `cache_<date>.json` files older than `PERFORMANCE_CACHE_DAYS = 7` days.

---

## 20. Execution Metrics

Two hidden Google Sheets track execution performance:

### "Batch time audit" (raw)
Columns: Date | Config | Batch ID | Start Time | End Time | Duration (ms) | Flag Count | Status

Written by `logExecutionMetric_(configName, batchId, startMs, endMs, flagCount, status)` after each `executeAudit()` call.

### "Batch time audit - Summary" (aggregated)
Columns: Config | Avg | Min | Max | P50 | P75 | P90 | Total Runs | Last Updated

Rebuilt from scratch by `updateExecutionMetricsSummary_()` which reads the raw sheet, groups by config, and computes percentiles.

### UI Access
- `openBatchTimeAuditSheet()` — shows the raw sheet
- `openBatchTimeAuditSummarySheet()` — shows the summary
- `refreshBatchTimeAuditSummary()` — rebuilds summary → accessible from Admin Controls menu

---

## 21. Health Check, Watchdog & GAS Failure Forwarder

### `runHealthCheckAndEmail()`

Called at 5:00 AM daily. Runs `buildHealthCheckReport_()` then emails result to `ADMIN_EMAIL`. **Bypasses staging mode** — always sends to real admin regardless.

### `buildHealthCheckReport_()`

Read-only, non-destructive check that verifies:
1. Drive API is enabled
2. Config tables can load (recipients, thresholds, exclusions)
3. Each active config has a Gmail label that exists
4. Each active config's Drive folders exist
5. Recipients are non-empty for all active configs
6. Threshold coverage (all 4 flag types configured per config)
7. Trigger posture (checks that expected triggers are installed, reports missing ones)

Returns HTML string summarizing pass/fail status for each check.

### `auditWatchdogCheck()`

Called every 3 hours. Scans `CM360_AUDIT_RUN_LIST_V1` Script Property for all batch IDs. For each:
- Loads run state from Script Properties
- If `startedAt` > 7 minutes ago AND no `completedAt` AND no `alertedAt` → hung batch
- Sends a single grouped alert email covering all hung batches
- Marks `alertedAt` on each hung batch to prevent duplicate alerts
- Calls `attemptSendDailySummary_()` with the partial results available so far

### `forwardGASFailureNotificationsToAdmin()`

Called every hour. Searches Gmail for emails from `noreply-apps-scripts-notifications@google.com` from the last 7 days that haven't been labeled `GAS-Failure-Forwarded`. Forwards each to `ADMIN_EMAIL`. Labels with `GAS-Failure-Forwarded` to prevent double-forward.

Purpose: GAS failure notification emails go to the service account (`platformsolutionshmi@gmail.com`), not to the admin. This trigger ensures the admin always sees them.

---

## 22. UI & Admin Menu System

### `onOpen()` Trigger

Runs when the Admin Spreadsheet opens:
1. Creates the Admin Controls menu via `createAuditMenu(ui)`
2. Runs validators and checks
3. Calls `syncDeliveryModeStatus()` — updates delivery mode in both sheets
4. Shows `AdminRefreshPrompt` sidebar (one-time per session, guarded by User Properties)

### `createAuditMenu(ui)` — 8-submenu Admin Controls Menu

```
Admin Controls
├── 🧰 Setup
│   ├── Prepare Environment (create labels, folders)
│   ├── Install All Automation Triggers
│   ├── Setup & Install Batch Triggers
│   └── Ensure Config Folders Exist
│
├── 📄 Sheets
│   ├── Open Audit Recipients Sheet
│   ├── Open Audit Thresholds Sheet
│   ├── Open Audit Exclusions Sheet
│   ├── Open Performance Drop Thresholds Sheet
│   ├── Add Missing Config Names
│   └── Update Placement Names from Reports
│
├── 🔄 External Config
│   ├── Sync TO External Config (Admin → External)
│   ├── Sync FROM External Config (External → Admin)
│   ├── Sync FROM External Config (Quick / Values Only)
│   ├── Ensure External Config Instructions
│   ├── Refresh External Header Styles
│   ├── Apply External Formatting Rules
│   └── Populate External Config With Defaults
│
├── 📝 Requests
│   ├── Process Audit Requests (from external sheet)
│   └── Fix Audit Requests Sheet
│
├── 🧪 Run
│   ├── Run All Configs (Full Batch)
│   ├── Run Single Config Audit (ConfigPicker dialog)
│   ├── Rerun Failed Configs
│   ├── Preview Daily Summary Now
│   └── Force Resend Summary Email
│
├── 🧯 Diagnostics
│   ├── Validate Audit Configs
│   ├── Run Health Check & Email
│   ├── Check Missing Batch Runners
│   ├── Debug Email Delivery Status
│   ├── Test External Config
│   ├── Debug External Config Data
│   ├── Set Staging Mode ON
│   ├── Set Staging Mode OFF
│   └── Diagnose Thresholds (for specific config)
│
├── ⏱️ Timing Audit
│   ├── Open Batch Time Audit Sheet
│   ├── Open Batch Time Audit Summary
│   └── Refresh Batch Time Audit Summary
│
├── 🧩 Batch Tools
│   ├── Check Missing Batch Runners
│   └── Backfill Performance Cache
│
├── ⏰ Triggers
│   ├── Install All Automation Triggers
│   ├── Install Delivery Mode Sync Trigger
│   └── Remove All Automation Triggers
│
└── ℹ️ Help
    ├── Show Admin Controls Help
    └── Show Config Creation Helper
```

### HTML UI Components

**Dashboard.html** (`showDashboard()` — renders as sidebar)
- Displays batch/config assignments, label paths, recipients, flag counts
- Buttons: Check Missing Runners, Reinstall Triggers, Generate Missing Runner Stubs
- Calls `google.script.run.getAuditConfigSummaries()` on load

**ConfigPicker.html** (`showConfigPicker()` — renders as modal dialog)
- Dropdown of all active configs (populated server-side via GAS template syntax `<? for config in auditConfigs ?>`)
- "Run Audit" button calls `google.script.run.runDailyAuditByName(config)`

**ButtonsSidebar.html** — Admin quick-action panel included as sidebar

**AdminRefreshPrompt.html** — Prompt shown once per session to remind admin to sync external config

**ThresholdTestPicker.html** — UI for running threshold diagnostics against specific configs

**AdminControlsHelp.html** — Static inline documentation for all menu items

---

## 23. Nightly Maintenance & Auxiliary Automation

### `runNightlyMaintenance()` — 2:20 AM daily

Executes the following in sequence (each step try/catch'd independently):

1. `rebalanceAuditBatchesUsingSummary()` — reorder configs by previous day flags
2. `runNightlyExternalSync()` — full External → Admin sync (if EXTERNAL_CONFIG_SHEET_ID set)
3. `refreshExternalConfigInstructionsSilent()` — refresh instruction blocks on external tabs
4. `updatePlacementNamesFromReports()` — backfill Placement Name column in Exclusions sheet
5. `clearDailyScriptProperties()` — clear all `CM360_AUDIT_RUN_STATE_*` and run list
6. `cleanupOldCheckpoints_()` — remove stale checkpoint keys
7. `cleanupOldAuditFiles()` — begin (or continue) 60-day Drive file cleanup
8. `deleteOldAuditEmails()` — delete Gmail threads older than 90 days

Returns array of result messages (logged).

### `processAuditRequests()`

Processes pending rows from the `Audit Requests` sheet in the External Config spreadsheet:
1. First syncs values-only from External → Admin (Recipients + Thresholds) so latest configs are used
2. Reads rows with `Status = 'PENDING'`
3. Calls `executeAudit(config)` for each
4. Updates each row status: `COMPLETED`, `FAILED`, or `ERROR`
5. Sends admin summary email
6. Shows toast notification (non-blocking) instead of modal alert

### `createExternalConfigSheet()`

Creates a new External Config Google Spreadsheet, copies all 3 config sheets from Active Spreadsheet, returns the new ID. Used for initial setup or migration.

### `setupExternalConfigMenu(configSheetId)`

Generates a copy-paste Apps Script code block (printed to Logger) that can be installed as a bound script on the External Config spreadsheet to add a `CM360 Config Helper` menu for self-service config creation and audit requests.

### `populateExternalConfigWithDefaults()`

Seeds the External Config spreadsheet with the 23 production configs (full recipient list) and sample thresholds — convenience function for initial setup.

---

## Appendix A: Known Production Configs

Complete list as of the last analysis. Config names map directly to Gmail label suffixes and Drive folder names.

| Config ID | Primary Recipients (Partial) | Notes |
|---|---|---|
| PST01 | BKaufman@horizonmedia.com | Admin-only (test/special) |
| PST02 | fvariath@horizonmedia.com | |
| PST03 | dmaestre@horizonmedia.com | |
| NEXTBO01 | Seaworld_AdOps@horizon-next.com | |
| NEXTRS01 | UHG_AdOps@horizonmedia.com | |
| NEXTSZ01 | Goddard_AdOps@horizonmedia.com | |
| SPTM01 | spectrum_adops@horizonmedia.com | |
| NFL01 | NFL_AdOps@horizonmedia.com | |
| ENT01 | entertainmentadops@horizonmedia.com | |
| MSG01 | MSG_Adops@horizonmedia.com | |
| AMC01 | AMC_AdOps@horizonmedia.com | |
| OMGA01 | Omega_AdOps@horizonmedia.com | |
| NDC01 | NDC_AdOps@horizonmedia.com | |
| GMNR01 | RegeneronAdOps@horizonmedia.com | |
| CAP01 | capitaloneadops@horizonmedia.com | |
| BTB01 | primobrands_campaignmanagement@horizonmedia.com | |
| DHC01 | DHC_CampaignMgmt@horizonmedia.com | |
| STAR01 | starz_campaignmgmt@horizonmedia.com | |
| CADH01 | Hondas_CampaignMgmt@horizonmedia.com | Honda + CSH combined |
| LION01 | LG_CampaignManagement@horizonmedia.com | |
| NEXTSD01 | sleepnumber_adops@horizonmedia.com | **DEDICATED batch** |
| NEXTCD01 | adtalemAdOps@horizonmedia.com | |
| WRI01 | ImpossibleAdOps + RevlonAdOps@horizonmedia.com | Multi-brand rollup |

**All configs** get `bkaufman@horizonmedia.com` added to primary recipients list.

**Gmail label path for all**: `Daily Audits/CM360/<CONFIG_ID>`

**Drive merge folder path for all**: `Project Log Files/CM360 Daily Audits/To Trash After 60 Days/Merged Reports/<CONFIG_ID>`

**Drive temp folder path for all**: `Project Log Files/CM360 Daily Audits/To Trash After 60 Days/Temp Daily Reports/<CONFIG_ID>`

---

## Appendix B: Script Properties Inventory

| Property Key | Purpose | Cleared By |
|---|---|---|
| `STAGING_MODE` | `'Y'` or `'N'`; controls email routing | Manual / setStagingMode* |
| `ADMIN_EMAIL` | Override for admin email address | Manual |
| `TRASH_ROOT_PATH_JSON` | JSON array override for Drive root path | Manual |
| `CM360_AUDIT_RUN_LIST_V1` | CSV of batch IDs that ran today | `clearDailyScriptProperties()` |
| `CM360_AUDIT_RUN_STATE_<batchId>` | Per-batch run state JSON | `clearDailyScriptProperties()` |
| `CHECKPOINT_<batchId>` | Timeout resume checkpoint JSON | `clearCheckpoint_()` or 24h expiry |
| `CM360_CLEANUP_STATE_V1` | Drive cleanup pagination state JSON | `cleanupOldAuditFiles()` on completion |
| `CM360_CLEANUP_TRIGGER_ID` | Trigger ID for cleanup continuation | `clearCleanupContinuation_()` |
| `CM360_PREV_DAY_COUNTS_*` | Previous day flag counts per config | Written by summary system |
| `CM360_PERF_BACKFILL_STATE` | Performance backfill state JSON | `clearPerformanceBackfillState_()` |
| `CM360_PERF_BACKFILL_TRIGGER_ID` | Trigger ID for backfill continuation | `clearPerformanceBackfillContinuation_()` |
| `CONFIG_ORDER` | Custom batch order JSON array | `saveCustomConfigOrder_()` |
| `CM360_ADMIN_REFRESH_SEEN` | Guard for one-time session prompt | Manual / `clearDailyScriptProperties()` |

---

## Appendix C: Drive Folder Structure

```
Project Log Files/                         (root; configurable via TRASH_ROOT_PATH_JSON)
└── CM360 Daily Audits/
    ├── To Trash After 60 Days/
    │   ├── Merged Reports/
    │   │   ├── PST01/
    │   │   │   └── CM360_Merged_Audit_PST01_2025-01-15   (Google Sheet)
    │   │   ├── PST02/ ...
    │   │   └── <all 23 configs>/
    │   └── Temp Daily Reports/
    │       ├── PST01/
    │       │   └── Temp_CM360_20250115_080132/  (folder with today's source files)
    │       └── <all 23 configs>/
    ├── Performance Cache/
    │   ├── PST01/
    │   │   ├── cache_2025-01-13.json
    │   │   ├── cache_2025-01-14.json
    │   │   └── cache_2025-01-15.json
    │   └── <per config>/
    └── Deletion Log/
        └── CM360 Deletion Log   (Google Sheet)
            ├── Temp Daily Reports  (sheet tab)
            ├── Merged Reports      (sheet tab)
            └── Gmail Emails        (sheet tab)
```

---

## Appendix D: CacheService Keys

| Key | TTL | Purpose |
|---|---|---|
| `CM360_COMBINED_RESULTS` | 6 hours | Combined audit results from all configs |
| `CM360_SUMMARY_SENT` | 6 hours | Idempotency guard: was summary email sent today |
| `CM360_PERF_DROP_CACHE_<config>_<date>` | (implicit) | Yesterday's perf data for drop detection |

---

## Appendix E: OAuth Scopes & Advanced Services

**OAuth Scopes (from appsscript.json):**
- `spreadsheets` — read/write all spreadsheets
- `drive` — full Drive access (needed for file creation, conversion, export)
- `gmail.readonly` — read Gmail threads and search
- `gmail.send` — send emails
- `gmail.modify` — label and trash Gmail threads
- `script.send_mail` — MailApp service
- `script.external_request` — UrlFetchApp (used for XLSX export URL fetch)
- `script.scriptapp` — manage project triggers
- `script.container.ui` — show UI dialogs/sidebars
- `script.projects` — Apps Script REST API (self-modification of source code)
- `userinfo.email` — get current user's email

**Advanced Services (from appsscript.json):**
- `Drive v2` — required for `Drive.Files.list` with pagination, `Drive.Files.update`, and blob export
- `Gmail v1` — used for advanced Gmail operations
- `Sheets v4` — available but primarily uses SpreadsheetApp

---

## AI Handoff Notes

> This section synthesizes everything above into actionable guidance for AI systems working with this codebase.

### Critical Architecture Facts

1. **Everything is in `Code.js`** — There is no module system, no imports, no external packages. All 12,610 lines are a single global JavaScript scope. Functions call each other freely. Any refactoring must maintain this constraint unless the deployment model changes.

2. **The 6-minute wall shapes everything** — The most important architectural constraint is the GAS 6-minute execution limit. Any function that might run long has a `Date.now() - startTime > budget` check with a continuation mechanism. Never add a long-running operation without this pattern.

3. **Script Properties = state persistence** — Script Properties survive trigger invocations and are the only reliable cross-invocation state storage (other than Drive files and Sheets). CacheService is 6-hour volatile. Never assume in-memory state persists between executions.

4. **`getConfigSpreadsheet()` returns the Admin spreadsheet** — The system reads ALL configuration (recipients, thresholds, exclusions) from the Admin spreadsheet at runtime. The external config spreadsheet is only used for sync operations.

5. **Staging mode (`STAGING_MODE = 'Y'`)** is hardcoded as the default. Verify this before testing any email-sending code paths in production.

6. **Config list comes from Recipients sheet** — `getAuditConfigs()` reads the Recipients sheet, not a hardcoded array. Adding a new config = adding a row to Recipients. Removing a config = setting Active = FALSE.

### Common Pitfalls for AI Systems

- **Never read the Recipients sheet assuming column F is "Active"** — the columns are: A=Config Name, B=Primary, C=CC, D=Active, E=Withhold, F=Last Updated, G=Attachment Mode. It's easy to confuse D and F.

- **`onEdit()` has two branches** — it handles both Exclusions (auto-populate placement name) and Recipients (auto-timestamp). Edits to any other sheet are silently ignored.

- **`getOrCreate*Sheet()` functions are idempotent** — They check if the sheet exists, create it with full structure if not, and may run migrations (e.g., adding missing columns). They're safe to call multiple times.

- **Batch IDs are deterministic** — They're generated from sorted config names. The same set of configs always produces the same batch ID. This enables checkpoint lookup across invocations.

- **`DEDICATED_BATCH_CONFIGS` (`NEXTSD01`, `NEXTSD02`)** get solo batches placed FIRST in the batch list. They must remain solo — adding them to a shared batch would break the single-config guarantee.

- **Drive API v2 (not v3)** is used via the Advanced Service. The REST-style `Drive.Files.list()` and `Drive.Files.update()` calls are from the v2 service, not the built-in `DriveApp`. Both coexist.

- **`safeConvertExcelToSheet(blob, filename, parentFolderId, configName)`** is the Excel→Sheet conversion utility. It retries 3 times with exponential backoff. If Drive API is disabled, conversion fails silently and processing falls back to CSV.

- **The Apps Script REST API self-modification** (`getScriptProjectContent_()` / `updateScriptProjectContent_()`) requires the `script.projects` OAuth scope and is used ONLY for auto-generating missing batch runner stubs. This is a fragile feature — if the GAS Script API changes, it will break silently.

### Key External Dependencies

| Dependency | How Used | Risk if Unavailable |
|---|---|---|
| Gmail Labels `Daily Audits/CM360/*` | Report attachment ingestion | Entire audit pipeline fails |
| Drive folder hierarchy | Report storage and cache | Cannot store or retrieve reports |
| External Config Sheet `1-566gqky...` | Config sync target | Sync fails; admin sheet still works |
| Service account `platformsolutionshmi@gmail.com` | System owner | If locked out, triggers stop |
| CM360 daily reports (sender: `platformsolutionshmi@gmail.com`) | Report data | Nothing to audit |

### Architectural Improvement Opportunities

1. **Extract configuration reading into a service layer** — Currently config tables are re-read from sheets in multiple places. A proper caching layer with TTL and lazy loading would reduce sheet API calls significantly.

2. **Replace Script Properties state with a proper journal** — The current approach of using Script Properties as a key-value store for batch state, checkpoints, and run lists is fragile and has a hard size limit. A dedicated "audit runs" Google Sheet would be more reliable and auditable.

3. **Modularize the 12,610-line monolith** — The cleanest refactor would split Code.js into logical files: `email.js`, `merge.js`, `audit.js`, `batch.js`, `config.js`, `cleanup.js`, `sync.js`, `ui.js`. CLASP supports multi-file projects.

4. **Type-safety layer** — The codebase uses plain JS objects throughout for results, config objects, etc. JSDoc type annotations or TypeScript compilation via CLASP would catch many class of bugs.

5. **Eliminate self-referential source modification** — The `insertMissingBatchFunctionsIntoSource_()` approach is clever but fragile. A cleaner alternative is a single `runDailyAuditsByBatchIndex(n)` function that all triggers call with their index, eliminating the need for N separate stub functions.

6. **Performance cache in Sheets, not Drive JSON** — The per-placement JSON files in Drive are slow to read (one API call per file per config per day). Moving the cache to a single Sheets tab per config would be faster and more queryable.

7. **Separate the summary email from audit runs** — Currently `attemptSendDailySummary_()` is triggered by the last batch completing. A cleaner design would have a separate scheduled task at 9:00 AM that always sends the summary from whatever state is available, removing coupling.

8. **Config validation at sync time** — Currently configs are validated on-demand (`validateAuditConfigs()`). Adding validation when data is written to the External Config sheet (via `onEdit` or a post-sync hook) would catch errors earlier.

### For New Feature Development

When adding a new feature to this system, the checklist is:
- [ ] Does the feature involve a new config-level setting? → Add a column to the appropriate config sheet and update `getOrCreate*Sheet()` to add the header on existing sheets
- [ ] Does the feature send emails? → Route through `safeSendEmail()`; respect staging mode
- [ ] Does the feature run on a trigger? → Add to `installAllAutomationTriggers()` with a named handler key
- [ ] Does the feature read from Drive or process files? → add `driveFilesListWithRetry_` and handle the 6-min wall
- [ ] Does the feature produce per-config output? → Add the result fields to the combined results cache schema
- [ ] Does the feature need to be bi-directionally synced to External Config? → Add the sheet name to the `allSheets` array in `syncFromExternalConfig()` and `syncToExternalConfig()`

---

*End of Project Intelligence Dossier*  
*Document generated from full codebase analysis — Code.js 12,610 lines, all HTML files, appsscript.json, README.md, TEAM_HANDOFF_README.md*
