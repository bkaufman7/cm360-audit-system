# ARCHITECTURE MAP

Repository: `cm360-audit-system`

## 1. One-Page System Map

**System purpose**
- Automate CM360 daily audit ingestion, normalization, rule evaluation, and stakeholder notifications across multiple client configs.

**Main inputs**
- Gmail attachments from labels `Daily Audits/CM360/<CONFIG>` (`.xlsx`, `.csv`, `.zip`)
- Spreadsheet configuration tables (`Audit Recipients`, `Audit Thresholds`, `Audit Exclusions`, `Performance Drop Thresholds`, `Audit Requests`)
- Script Properties and CacheService state

**Main outputs**
- Per-config audit emails + attachments
- Daily summary email
- Merged report Google Sheets in Drive
- Performance cache JSON files in Drive
- Deletion log records

**Core modules (in `Code.js`)**
- Config/sheet management
- Gmail ingestion + file conversion
- Merge/normalization engine
- Rule engine (flags + exclusions + thresholds)
- Email/report generation
- Batch orchestration + checkpoint/resume
- External config sync
- Cleanup/retention
- Health/watchdog/diagnostics

**Execution flow**
- Time trigger/UI action → load config → ingest files → merge → evaluate flags → generate output → send email → persist state/metrics.

**Operator touchpoints**
- Admin menu (`onOpen` + `createAuditMenu`)
- Dashboard sidebar (`Dashboard.html`)
- Config picker / threshold tester dialogs
- External helper request/create-config workflows

**External dependencies**
- Google Apps Script runtime (V8)
- Advanced Services: Drive v2, Gmail v1, Sheets v4
- GmailApp/DriveApp/SpreadsheetApp/HtmlService/ScriptApp/PropertiesService/CacheService
- External config spreadsheet ID `1-566gqkyZRNDeNtXWUjKDB_H8A9XbhCu8zL-uaZdGT8`

---

## 2. File Responsibility Matrix

| File | Responsibility | Depends On | Used By | Notes |
|---|---|---|---|---|
| `Code.js` | Entire runtime system (triggers, ingest, merge, rules, email, sync, cleanup, UI handlers) | GAS services + advanced APIs + config sheets | All runtime workflows | Monolith (~12.6k lines) |
| `appsscript.json` | Runtime/scopes/services manifest | GAS deployment | Apps Script runtime | Enables Drive/Gmail/Sheets advanced services |
| `Dashboard.html` | Sidebar status + batch tools UI | `google.script.run` | `showAuditDashboard()` | Calls `getAuditConfigSummaries`, trigger installers/checkers |
| `ConfigPicker.html` | Single-config run modal | `google.script.run` | `showConfigPicker()` | Calls `runDailyAuditByName` |
| `ThresholdTestPicker.html` | Threshold-debug modal | `google.script.run` | `showThresholdTestPicker()` | Calls `testAuditWithThresholdLogging` |
| `AdminRefreshPrompt.html` | Prompt to refresh external instructions | `google.script.run` | `onOpen()` flow | Calls `refreshExternalConfigInstructions` |
| `AdminControlsHelp.html` | Help dialog template | GAS templating | `showAdminControlsHelp()` | Displays menu function metadata |
| `ButtonsSidebar.html` | Legacy sidebar placeholder | none | deprecated | Declares menu-only migration |
| `README.md` | High-level project overview | repo content | developers | Architecture + setup summary |
| `TEAM_HANDOFF_README.md` | Operational runbook | production procedures | ops/admins | Service account + handoff-critical |
| `AUDIT_FLAGS_GUIDE.md` | Flag semantics and troubleshooting | rule logic in `Code.js` | operators | Human-friendly rule reference |
| `PERFORMANCE_DROP_THRESHOLDS_README.md` | Perf-drop/launch setup guide | perf/launch features | operators/admins | Two-spreadsheet model guidance |
| `CONTRIBUTING.md` | Contribution workflow | git/clasp | contributors | Process documentation |
| `SECURITY.md` | Vulnerability policy | email contact channel | contributors/security | Disclosure and controls guidance |
| `package.json` | Dev scripts for clasp lifecycle | Node + `@google/clasp` | local development | No runtime effect in GAS |
| `package-lock.json` | Dependency lockfile | npm | local development | Reproducible dev installs |
| `.clasp.json` | Script binding metadata | clasp | local development | Script ID linkage (sensitive) |
| `.claspignore` | Deploy/pull inclusion rules | clasp | local development | Controls pushed files |
| `helper/external-helper-complete.js` | Reference external-sheet helper implementation | Spreadsheet UI + Gmail/Mail APIs | manual copy into external script | Separate helper surface |
| `migrate_perf_drop_thresholds.js` | One-time migration utility | `Code.js` symbols + sheets | manual run | Adds/restructures perf thresholds tab |
| `tools/find-nonascii.js` | Retired utility placeholder | none | none | Intentionally blank |
| `tools/normalize-text.js` | Retired utility placeholder | none | none | Intentionally blank |
| `remove_duplicate_validate.py` | Local source maintenance utility | local filesystem | manual dev ops | Targets old local path |
| `update_email_truncation.py` | Local patch utility | local filesystem | manual dev ops | Scripted text replacement |
| `update_runDailyAudit.py` | Local patch utility | local filesystem | manual dev ops | Scripted text replacement |
| `CM360_Audit_Workflow.drawio` | Visual architecture diagram source | draw.io | documentation consumers | Non-runtime artifact |
| `DIAGRAM_ACCESS_INSTRUCTIONS.md` | Diagram usage notes | docs | humans | Non-runtime |
| `DIAGRAM_INSTRUCTIONS_SIMPLE.txt` | Diagram quick instructions | docs | humans | Non-runtime |
| `cm360-combined.code-workspace` | VS Code workspace config | VS Code | developers | Local tooling convenience |
| `archive/*` | Historical backups/retired files | none | reference only | Not part of active runtime |

---

## 3. Entry Point Map

### A) Trigger-based entry points

| Entry point | Type | First function called | Downstream functions | Final outputs |
|---|---|---|---|---|
| `onOpen` | Built-in trigger/UI init | `onOpen()` | `createAuditMenu`, `syncDeliveryModeStatus`, optional prompt/sidebar helpers | Admin menu rendered; mode banner synced |
| `onEdit` | Built-in trigger | `onEdit(e)` | Exclusions branch: `LOOKUP_PLACEMENT_NAME`; Recipients branch: timestamp update | Placement names auto-filled; last-updated stamps |
| `runDailyAuditsBatch1..13` | Time trigger (8 AM) | `runDailyAuditsBatchN()` | `getAuditConfigBatches` → `runAuditBatch` → `executeAudit` | Per-config emails, merged reports, run state |
| `resumeTimedOutBatches` | Time trigger (9:15 AM) | `resumeTimedOutBatches()` | checkpoint load → rerun pending via `runAuditBatch` | Resumed/finished batches |
| `sendDailySummaryFailover` | Time trigger (9:30 AM) | `sendDailySummaryFailover()` | `buildSummaryResultSet_` → `sendDailySummaryEmail` | Daily summary email |
| `runHealthCheckAndEmail` | Time trigger (5 AM) | `runHealthCheckAndEmail()` | `buildHealthCheckReport_` → `formatHealthCheckHtml_` → `safeSendEmail` | Health report email |
| `auditWatchdogCheck` | Time trigger (3-hour) | `auditWatchdogCheck()` | run-state scan → alerts → `attemptSendDailySummary_` | Timeout alert + optional summary |
| `runDeliveryModeSync` | Time trigger (3-hour) | `runDeliveryModeSync()` | `syncDeliveryModeStatus` | Delivery mode instruction sync |
| `autoFixRequestsSheet_` | Time trigger (4-hour) | `autoFixRequestsSheet_()` | `fixAuditRequestsSheet` path | Requests sheet repaired |
| `runNightlyMaintenance` | Time trigger (2:20 AM) | `runNightlyMaintenance()` | rebalance/sync/instructions/update-names/clear-state/cleanup/delete-email | Nightly maintenance bundle complete |
| `forwardGASFailureNotificationsToAdmin` | Time trigger (hourly) | `forwardGASFailureNotificationsToAdmin()` | Gmail query + forward + labeling | Forwarded GAS failure notices |
| `cleanupOldAuditFiles` continuation | One-shot trigger | `cleanupOldAuditFiles()` | phase-based cleanup + `scheduleCleanupContinuation_` | Progressive deletion + log updates |
| `performanceBackfillHistory` continuation | One-shot trigger | `performanceBackfillHistory()` | backfill state machine + continuation trigger | Historical perf cache built |

### B) Menu/UI action entry points (`Admin Controls`)

| Entry point | Type | First function called | Downstream functions | Final outputs |
|---|---|---|---|---|
| Prepare Environment | UI action | `prepareAuditEnvironment` | label/folder existence + create routines | Infrastructure bootstrapped |
| Check Authorization | UI action | `checkAuthorizationStatus` | scope/service checks | Authorization status alert/log |
| Thresholds create/open | UI action | `getOrCreateThresholdsSheet` | schema + validation setup | Threshold sheet ready |
| Exclusions create/open | UI action | `getOrCreateExclusionsSheet` | schema + protection + validation | Exclusions sheet ready |
| Recipients create/open | UI action | `getOrCreateRecipientsSheet` | schema + validation | Recipients sheet ready |
| Perf-drop thresholds create/open | UI action | `getOrCreatePerformanceDropThresholdsSheet` | schema + validation | Perf thresholds sheet ready |
| Migrate perf-drop thresholds | UI action | `migratePerformanceDropThresholdsSheet` | backup + recreate + restore | Migrated sheet structure |
| Refresh recipients attachment mode | UI action | `refreshRecipientsAttachmentMode` | column/instruction sync routines | Attachment mode normalized |
| Config builder helper | UI action | `showConfigCreationHelper` | Html dialog flow + write helpers | New config rows and guidance |
| Sync TO external | UI action | `syncToExternalConfig` | tab copy Admin→External | External config updated |
| Sync FROM external | UI action | `syncFromExternalConfig` | tab copy External→Admin | Admin config updated |
| Create audit request | UI action | `showCreateAuditRequestPicker` | `createAuditRequestInExternal_` | PENDING request row |
| Process audit requests | UI action | `processAuditRequests` | pre-sync → per-row `executeAudit` | request statuses + summary email |
| Fix audit requests sheet | UI action | `fixAuditRequestsSheet` | header/instruction/packing repairs | Requests tab repaired |
| Test run picker | UI action | `showBatchTestPicker` | prompt-driven `executeAudit`/`runAuditBatch` | Manual test run results |
| Run audit for config | UI action | `showConfigPicker` | HTML calls `runDailyAuditByName` | Single-config audit outputs |
| Rerun failed configs | UI action | `rerunFailedConfigs` | run-state analysis → rerun batch | Failed configs retried |
| Update placement names | UI action | `updatePlacementNamesFromReportsWithUI` | report scan + sheet writes | Exclusion names refreshed |
| Validate configs | UI action | `debugValidateAuditConfigs` | config validation | Diagnostics output |
| Verify dedicated isolation | UI action | `verifyNEXTSD01Isolation` | batch map checks | Isolation diagnostics |
| Debug email delivery | UI action | `debugEmailDeliveryStatus` | mode/quota checks | Toast/log diagnostics |
| Send test admin email | UI action | `sendTestAdminEmail` | `safeSendEmail` | Test email sent |
| Preview daily summary | UI action | `previewDailySummaryNow` | summary build + modal preview | HTML summary preview |
| Silent withhold check | UI action | `showSilentWithholdCheck` | `runSilentWithholdCheck_` + `executeAudit` (suppressed emails) | Decision simulation output |
| Run health check | UI action | `runHealthCheckAndEmail` | health report pipeline | Health email |
| Test thresholds | UI action | `showThresholdTestPicker` | HTML calls `testAuditWithThresholdLogging` | Deep threshold logs |
| Open timing audit | UI action | `openBatchTimeAuditSheet` | sheet create/open | Raw timing sheet visible |
| Open timing summary | UI action | `openBatchTimeAuditSummarySheet` | sheet create/open | Summary timing sheet visible |
| Refresh timing summary | UI action | `refreshBatchTimeAuditSummary` | `updateExecutionMetricsSummary_` | Percentile summary refreshed |
| Batch assignments | UI action | `showBatchAssignmentsModal` | `getAuditConfigSummaries` | Batch/config modal |
| Install all triggers | UI action | `installAllAutomationTriggers` | trigger reconcile/install | Trigger set installed |
| Install health trigger | UI action | `installHealthCheckTrigger` | wrapper to trigger installer | Health trigger installed |
| Install watchdog trigger | UI action | `installAuditWatchdogTrigger` | wrapper to trigger installer | Watchdog trigger installed |
| Sync delivery mode now | UI action | `runDeliveryModeSync` | sync status rows | Mode rows updated |
| About help | UI action | `showAdminControlsHelp` | template render | Help dialog |

### C) HTML-invoked entry points

| Entry point | Type | First function called | Downstream functions | Final outputs |
|---|---|---|---|---|
| ConfigPicker run button | UI action (HTML) | `runDailyAuditByName(config)` | `getAuditConfigByName` → `executeAudit` | Per-config audit outputs |
| ThresholdTestPicker run button | UI action (HTML) | `testAuditWithThresholdLogging(config)` | audit + verbose logging | Diagnostic logs |
| Dashboard load | UI action (HTML) | `getAuditConfigSummaries()` | batch/config summary assembly | Sidebar data render |
| Dashboard check runners | UI action (HTML) | `checkMissingBatchRunners()` | source/runtime scan | Missing runner report |
| Dashboard reinstall triggers | UI action (HTML) | `installAllAutomationTriggers()` | trigger orchestration | Trigger installation report |
| Dashboard generate stubs | UI action (HTML) | `generateMissingBatchStubs()` | batch count + function presence check | Stub source text |
| Admin refresh prompt button | UI action (HTML) | `refreshExternalConfigInstructions()` | instruction/template refresh on external tabs | Instructions refreshed |

### D) Manual/dev execution entry points

| Entry point | Type | First function called | Downstream functions | Final outputs |
|---|---|---|---|---|
| `runDailyAuditByName` | Manual run | `runDailyAuditByName` | config lookup → `executeAudit` | one-config audit result |
| `runPST01Audit`, `runPST02Audit`, `runPST03Audit`, `runNEXTCD01Audit`, `runNEXT01Audit`, `runNEXT02Audit`, `runNEXT03Audit`, `runSPTM01Audit`, `runNFL01Audit`, `runGMNR01Audit`, `runWRI01Audit` | Manual wrappers | wrapper fn | `runDailyAuditByName` | same as above |
| `setupAndInstallBatchTriggers` | Manual admin run | `setupAndInstallBatchTriggers` | batch function scan + trigger install | setup report |
| `installGASFailureNotifierTrigger` | Manual admin run | `installGASFailureNotifierTrigger` | trigger setup | notifier trigger |
| `createExternalConfigSheet` | Manual admin run | `createExternalConfigSheet` | spreadsheet creation + initial tab copy | external config sheet |
| `setupExternalConfigMenu` | Manual admin run | `setupExternalConfigMenu` | emits helper code payload | install instructions/logs |

---

## 4. Runtime Flow Diagram

```text
Daily 8:00 AM Trigger (runDailyAuditsBatchN)
  → getAuditConfigBatches
  → runAuditBatch
     → preload config tables
     → for each config:
        → executeAudit
           → loadRecipients/Thresholds/Exclusions/PerfThresholds
           → fetchDailyAuditAttachments (Gmail label search, attachment save/extract)
           → mergeDailyAuditExcels (header detect, normalize, dedupe)
           → rule engine (4 standard flags + exclusions + thresholds)
           → detectPerformanceDrops_ (history compare)
           → detectLaunchesFromMergedData_ (launch window check)
           → output selection:
              ├─ flaggedCount > 0 → emailFlaggedRows (FULL or FLAGGED_ONLY attachment)
              └─ flaggedCount = 0
                 ├─ withholdNoFlagEmails = TRUE → no-send (state only)
                 └─ else → sendNoIssueEmail
           → persist:
              ├─ savePerformanceCache_
              ├─ storeCombinedAuditResults_
              └─ logExecutionMetric_
     → if timeout risk → save checkpoint + exit
     → if final batch → attemptSendDailySummary_

9:15 AM Trigger (resumeTimedOutBatches)
  → load checkpoints / stale run-state scan
  → runAuditBatch on remaining configs

9:30 AM Trigger (sendDailySummaryFailover)
  → buildSummaryResultSet_ (including partials/stubs)
  → sendDailySummaryEmail

2:20 AM Trigger (runNightlyMaintenance)
  → rebalanceAuditBatchesUsingSummary
  → runNightlyExternalSync (if external sheet configured)
  → refreshExternalConfigInstructionsSilent
  → updatePlacementNamesFromReports
  → clearDailyScriptProperties
  → cleanupOldCheckpoints_
  → cleanupOldAuditFiles (may schedule continuation)
  → deleteOldAuditEmails

UI Path (menu/html)
  → user action (picker/dashboard/request)
  → corresponding server handler
  → optional executeAudit/sync/repair/diagnostic path
  → modal/toast/log/email output
```

---

## 5. Dependency Graph

### File/component dependency map

```text
appsscript.json
  └─ enables services/scopes consumed by Code.js

Code.js
  ├─ renders HTML: Dashboard.html, ConfigPicker.html, ThresholdTestPicker.html,
  │               AdminControlsHelp.html, AdminRefreshPrompt.html
  ├─ consumes config docs operationally (human-only): README.md, TEAM_HANDOFF_README.md,
  │   AUDIT_FLAGS_GUIDE.md, PERFORMANCE_DROP_THRESHOLDS_README.md
  ├─ stores data in Google Sheets/Drive/Gmail
  └─ exposes functions invoked by HTML via google.script.run

Dashboard.html / ConfigPicker.html / ThresholdTestPicker.html / AdminRefreshPrompt.html
  └─ depend on exported server functions in Code.js

helper/external-helper-complete.js
  └─ separate helper script pattern (external sheet context), not imported at runtime
```

### Service/API dependency map

```text
Code.js
  ├─ SpreadsheetApp + Sheets API v4 → config tabs, formatting, data validation, metrics tabs
  ├─ GmailApp + Gmail API v1        → label queries, message/attachment intake, forwarding, deletes
  ├─ DriveApp + Drive API v2        → folders/files, XLSX conversion/export, cache files
  ├─ HtmlService                    → modal/sidebar UI
  ├─ ScriptApp                      → trigger lifecycle
  ├─ PropertiesService              → durable state (run/checkpoint/config)
  ├─ CacheService                   → transient result + idempotency cache
  └─ UrlFetchApp                    → export endpoints and external requests
```

### Configuration source dependencies

```text
Constants in Code.js
  + Script Properties
  + Admin spreadsheet config sheets
  + External config spreadsheet (sync source/target)
  + Menu/HTML user input
= effective runtime behavior
```

---

## 6. Data Object Map

| Object name | Created in | Fields | Transformations | Used in |
|---|---|---|---|---|
| `AuditConfig` | `makeAuditConfig_` / `getAuditConfigs` | `name`, `label`, `mergedFolderPath`, `tempDailyFolderPath` | optional custom reordering | `runAuditBatch`, `executeAudit`, UI summaries |
| `recipientsData` | `loadRecipientsFromSheet` | per-config `primary`, `cc`, `withholdNoFlagEmails`, `attachmentMode` | staging/prod resolution via `resolveRecipients/resolveCc` | email dispatch, config derivation |
| `thresholdsData` | `loadThresholdsFromSheet` | per-config per-flag `{minImpressions,minClicks}` | defaults fallback when missing | rule engine in `executeAudit` |
| `exclusionsData` | `loadExclusionsFromSheet` | per-config per-flag arrays (`placementIds`,`siteNames`,`nameFragments`) | `Apply to All Configs` expansion | `isPlacementExcludedForFlag`, rule suppression |
| `perfDropThresholdsData` | `loadPerformanceDropThresholdsFromSheet` | enable flags, percentages, volumes, windows, attachment mode | normalization of booleans/numbers | perf-drop + launch detection + email rendering |
| `MergedRow` | `mergeDailyAuditExcels` | canonical 14 CM360 columns | header detection, fallback mapping, dedupe, sorting | `executeAudit`, caching, attachment output |
| `FlagResult` | `executeAudit` loop | row ref + flag types + metrics context | exclusions + threshold gating | output table build + in-sheet highlighting |
| `PerformanceCacheDay` | `savePerformanceCache_` | date, timestamp, placement metrics list | rolling retention cleanup (7 days) | `readPerformanceCache_`, `detectPerformanceDrops_` |
| `LaunchDetection` | `detectLaunchesFromMergedData_` | placement info + start-age + volume | summary grouping when count large | launch section + optional attachment |
| `AuditRunState` | `runAuditBatch` | batch ID, started/completed timestamps, status map, alert marker | timeout/resume updates | summary builder, watchdog, rerun logic |
| `CheckpointState` | `saveCheckpoint_` | completed/remaining configs, attempt count, timestamps | continuation/retry until clear | `resumeTimedOutBatches`, rerun flows |
| `CombinedResult` | `storeCombinedAuditResults_` | config-level status, counts, timing, links | size-tier serialization fallback | daily summary generation |
| `AuditRequest` | `processAuditRequests` | config, requester, requestedAt, status, notes | PENDING→PROCESSING→COMPLETED/FAILED/ERROR | request queue execution and reporting |

---

## 7. Rule and Decision Map

| Rule name | Location | Inputs | Logic | Resulting action | Configurable |
|---|---|---|---|---|---|
| Clicks > Impressions | `executeAudit` | impressions, clicks, thresholds, exclusions | flag if clicks exceed impressions and threshold gate passes | add `clicks_greater_than_impressions` flag | Yes (thresholds + exclusions) |
| Out-of-flight dates | `executeAudit` | start/end date vs today | flag if started in future or ended before today | add `out_of_flight_dates` flag | Yes |
| Pixel size mismatch | `executeAudit` + `normalizePixelSize` | placement size, creative size | normalized inequality check | add `pixel_size_mismatch` flag | Yes |
| Default ad serving | `executeAudit` | ad type text | detect `default` marker | add `default_ad_serving` flag | Yes |
| Threshold gate | `getThresholdForFlag` + audit loop | min impressions/clicks + row volume | evaluate higher-volume metric path | allow/suppress standard flag | Yes |
| Exclusion gate | `isPlacementExcludedForFlag` | config, flagType, placement/site/name | check `all_flags` then specific flag arrays | suppress flags entirely | Yes |
| No-flag email withholding | `executeAudit`/email branch | flagged count + recipient setting | if zero flags and withhold enabled, skip clean email | no-send state recorded | Yes |
| Attachment mode routing | `emailFlaggedRows` | `attachmentMode` | FULL vs FLAGGED_ONLY attachment generation | attachment strategy changes | Yes |
| Performance drop detection | `detectPerformanceDrops_` | current day, 3-day avg, drop %, min volume, grace period | compare deltas and thresholds | add performance-drop section | Yes |
| Launch detection | `detectLaunchesFromMergedData_` | start date, launch window, min volume | window/volume check + exclusions | add launch section/attachment | Yes |
| Summary idempotency | `attemptSendDailySummary_` | cache key lock + completion state | skip duplicate send unless force path | one summary email/day window | Partially |
| Timeout checkpointing | `runAuditBatch` | elapsed runtime, remaining configs | persist checkpoint before hard timeout | resume path enabled | No (hardcoded budget) |
| Runtime sync guard | `syncFromExternalConfig` | elapsed time + per-sheet budget | stop remaining heavy copy near limit | partial-safe sync | Partially |
| Nightly task gating | `runNightlyMaintenance` | external sheet configured? function exists? | conditionally invoke with catch wrappers | resilient maintenance bundle | Partially |

---

## 8. Configuration Surface Map

### A) Constants and hardcoded settings (`Code.js`)
- `EXTERNAL_CONFIG_SHEET_ID`: external config source/target spreadsheet
- `BATCH_SIZE`, `DEDICATED_BATCH_CONFIGS`: batching behavior
- `EMAIL_BODY_BYTE_LIMIT`: HTML truncation limits
- `PERFORMANCE_CACHE_DAYS`, `PERFORMANCE_BACKFILL_DAYS`: cache retention/backfill
- Sheet name constants: recipients/thresholds/exclusions/perf thresholds
- Paths: `TRASH_ROOT_PATH`, `PERFORMANCE_CACHE_PATH`
- Feature defaults and behavior flags in helper functions

### B) Spreadsheet configuration surfaces
- **Audit Recipients**: recipients, active flags, no-flag withholding, attachment mode
- **Audit Thresholds**: per-flag volume gates
- **Audit Exclusions**: suppression rules by ID/site/name fragment and scope
- **Performance Drop Thresholds**: perf and launch criteria + attachment preferences
- **Audit Requests**: ad-hoc request queue
- **Timing sheets / deletion log**: observability and cleanup audit trail

### C) Script Properties (runtime behavior)
- Delivery/admin controls: `STAGING_MODE`, `ADMIN_EMAIL`, path overrides
- Run state: `CM360_AUDIT_RUN_LIST_*`, `CM360_AUDIT_RUN_STATE_*`
- Continuation/checkpoint keys: `CHECKPOINT_*`, cleanup and backfill state keys
- Ordering and summary memory: custom config order + previous-day count keys

### D) Manifest/JSON configuration
- `appsscript.json`: timezone, runtime, OAuth scopes, advanced service enablement
- `package.json`: local dev scripts (`clasp push/pull/open/logs/version`)
- `.clasp.json`: script binding for deployments

### E) UI-provided runtime inputs
- Config selection (`ConfigPicker.html`, threshold test picker)
- Batch/config prompt inputs (manual test run)
- Request submission via menu/dialog workflows
- External helper form data for new config creation

---

## 9. Failure Surface Map

| Failure area | Typical cause | Symptom | Impact |
|---|---|---|---|
| Gmail ingestion | missing label/filter, no daily emails, label mismatch | `no files found`, skipped config, alert logs | Audit for config not executed |
| Attachment extraction | malformed ZIP/XLSX/CSV | merge fails or partial ingestion | Missing rows/false negatives |
| Header detection/parse | source schema drift | “header not found” or low row output | Flags not evaluated correctly |
| Drive conversion/export | Drive API unavailable/quota/transient | XLSX conversion/export errors | Attachment missing or fallback behavior |
| Sheet reads/writes | permission issues, missing tabs, schema drift | sync/processing exceptions | stale configs or blocked runs |
| External sync | 6-min runtime pressure, heavy formatting copy | partial sync; warnings in results | Admin/external config divergence |
| Rule evaluation data quality | malformed dates/sizes/numeric fields | under/over-flagging | alert quality degradation |
| Email sending | quota limits, invalid recipients, API errors | failed send logs, missing notifications | stakeholders uninformed |
| Trigger posture | deleted/missing triggers | workflows stop silently until manual check | delayed or absent daily operations |
| Checkpoint state integrity | stale/corrupt script properties | repeated retries or stuck statuses | inconsistent completion reporting |
| Cleanup retention tasks | path/permission issues | old files/threads retained | storage growth, compliance risk |
| Service account access | credentials/ownership disruptions | inability to modify or monitor system | operational lockout risk |

---

## 10. Shared Library Candidates

1. **Config Table Access Layer**
- Candidate extraction: schema definitions, get-or-create, validation, normalization.
- Reuse potential: any spreadsheet-driven rule/config system.

2. **Ingestion + Merge Framework**
- Candidate extraction: attachment intake, file conversion, header detection, dedupe pipeline.
- Reuse potential: other ad-platform or report-ingest automations.

3. **Rule Engine Core**
- Candidate extraction: rule registry, threshold gating, exclusion matching, multi-flag output.
- Reuse potential: generic anomaly/audit frameworks.

4. **Notification Composer/Dispatcher**
- Candidate extraction: safe sender, mode routing, size-aware truncation, attachment strategy.
- Reuse potential: any GAS reporting system.

5. **Batch + Checkpoint Orchestrator**
- Candidate extraction: timeout-aware iteration, checkpoint persistence, resumable triggers.
- Reuse potential: all long-running GAS jobs under 6-minute limits.

6. **Sync Engine (cross-spreadsheet)**
- Candidate extraction: values-only/full sync, runtime budgets, optional formatting/protection copy.
- Reuse potential: admin/external spreadsheet governance patterns.

7. **Health/Watchdog Toolkit**
- Candidate extraction: trigger posture checks, stale-run detection, failure forwarding.
- Reuse potential: operational monitoring for GAS systems.

---

## 11. FAST AI HANDOFF

**What matters most**
- `Code.js` is the system: orchestration, rules, state, UI handlers, and ops tooling all live there.
- `Audit Recipients` sheet is the effective config roster source; active rows determine runtime scope.

**What is fragile**
- Monolithic source + trigger-dependent runtime + spreadsheet schema coupling.
- Ingestion/parse assumptions on incoming file headers and format quality.
- Time-budgeted sync/cleanup paths under GAS 6-minute execution limits.

**What is reusable**
- Resumable batch/checkpoint pattern, exclusion matcher, threshold gate logic, safe email dispatch, and sync budget guardrails.

**What another AI should examine first**
1. `installAllAutomationTriggers` + trigger handlers
2. `runAuditBatch` + `executeAudit`
3. `mergeDailyAuditExcels`
4. `syncFromExternalConfig` / `syncToExternalConfig`
5. `runNightlyMaintenance` + cleanup/email retention

**Automation ideas suggested by this repo**
- Auto-trigger posture reconciliation with drift correction reports
- Contract tests for incoming report schema/header variants
- Rule-registry modularization and typed config validation
- Unified state journal sheet replacing scattered Script Properties
- AI-generated anomaly commentary blocks in summary emails
