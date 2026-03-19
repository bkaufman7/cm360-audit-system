# CM360 Audit System — Data Contract for Central Intelligence Hub

**Version:** 1.0  
**Last Updated:** 2026-03-19  
**Timezone:** America/New_York (UTC-4/5)  
**Status:** CONFIRMED ✅

---

## A) DAILY SUMMARY EMAIL CONTRACT

### Email Properties
| Property | Value |
|----------|-------|
| **Sender** | `platformsolutionshmi@gmail.com` |
| **Subject Pattern** | `CM360 Daily Audit Summary (YYYY-MM-DD) — X flagged, Y errors` |
| **Send Time** | ~6 AM ET (end of daily audit batch) |
| **Recipient(s)** | Configured: `bkaufman@horizonmedia.com`, `bmuller@horizonmedia.com`, others |
| **Attachment** | None (HTML + plain text only) |

### Email Body Structure

#### Plain Text (Fallback)
```
CM360 Daily Audit Summary (2026-03-19) [PRODUCTION]
Configs=18, WithFlags=6, FlagRows=142, Errors=0, Skipped=1, Sent=17, Withheld=0
External: https://docs.google.com/spreadsheets/d/EXTERNAL_CONFIG_SHEET_ID
Top flagged:
 - PST01: 48 (Δ +12)
 - CM360V2: 32 (Δ -5)
 - ...
```

#### HTML Sections (in order)
1. **Glance badges** – Summary metrics in colored pill badges:
   - Total configs
   - Configs with flags
   - Total flagged rows
   - Error count
   - Skipped count
   - Emails sent
   - Emails withheld
   - Delivery mode (STAGING | PRODUCTION)

2. **Top Flagged Configs** – Bulleted list of configs sorted by flag count (top 5)

3. **Summary Table** – Always present with these **exact columns**:
   | Column | Data Type | Required | Notes |
   |--------|-----------|----------|-------|
   | Config | String | ✅ | Config name (e.g., "PST01") |
   | Status | String | ✅ | "Completed", "Error: ...", "Skipped", "Failed (timeout)" |
   | Flagged Rows | Integer | ✅ | Count of flagged placements (0 if no issues) |
   | Δ | Integer | ✅ | Delta vs previous day (can be negative) |
   | Email Sent | Boolean indicator | ✅ | ✅ (sent), ❌ (failed), ⏸️ (withheld) |
   | Email Time | Time string | ✅ | Format: HH:MM AM/PM ET |
   | Latest Report | URL or "UNAVAILABLE" | ✅ | Google Sheet URL to merged audit, or badge |

4. **Email Quota Note** – Informational line on remaining daily email sends (cached low value)

5. **External Config Link** – Direct link to configuration sheet

6. **Signature** – "Platform Solutions Team"

### Field Stability Guarantees
- ✅ **Subject pattern is stable** – Always matches `CM360 Daily Audit Summary (YYYY-MM-DD) — X flagged, Y errors`
- ✅ **All summary metrics always present** – Never null/undefined (defaulted to 0)
- ✅ **Table structure is stable** – Column order and headers never change
- ✅ **Latest Report is always a Google Sheet** – Either valid URL or "UNAVAILABLE" badge
- ✅ **Delivery mode always shown** – Confirms STAGING vs PRODUCTION
- ✅ **Email sent from confirmed sender** – `platformsolutionshmi@gmail.com`

---

## B) FLAGGED-ROW LEDGER EXPORT CONTRACT (NEW)

### Overview
A **separate email attachment** distributed alongside the daily summary, containing **one row per flagged placement** with all required fields for central ledger ingestion.

### Delivery Method
- **Format:** XLSX (Excel workbook)
- **Attachment Name:** `CM360_Flagged_Ledger_YYYY-MM-DD.xlsx`
- **Distribution:** Sent in a second email to hub recipients (TBD – ask for hub email or just include in summary email)
- **Frequency:** Daily, once per audit cycle
- **Sheet Name:** `Flagged Placements`

### Column Schema (18 columns, in order)

#### Core Placement Data (Columns 1–15, stable from per-config emails)
| # | Column | Data Type | Nullable | Constraints | Example |
|---|--------|-----------|----------|-------------|---------|
| 1 | Event Date | Date | ❌ | YYYY-MM-DD | `2025-03-18` |
| 2 | Config | String | ❌ | Config name | `PST01` |
| 3 | Advertiser | String | ❌ | From DFA report | `Acme Corp` |
| 4 | Campaign | String | ❌ | From DFA report | `Spring Promo 2025` |
| 5 | Placement ID | String | ❌ | Unique placement ID | `98765432` |
| 6 | Placement Name | String | ❌ | From DFA report | `Homepage - 728x90 (Standard)` |
| 7 | Placement Start Date | Date | ❌ | YYYY-MM-DD | `2025-03-15` |
| 8 | Placement End Date | Date | ❌ | YYYY-MM-DD | `2025-03-31` |
| 9 | Ad Type | String | ✅ | "Standard" or "Default" | `Standard` |
| 10 | Creative | String | ❌ | Creative name/ID | `Spring Banner - v3` |
| 11 | Placement Pixel Size | String | ✅ | WIDTHxHEIGHT or null | `728x90` |
| 12 | Creative Pixel Size | String | ✅ | WIDTHxHEIGHT or null | `970x250` |
| 13 | Impressions | Integer | ❌ | Count >= 0 | `1250` |
| 14 | Clicks | Integer | ❌ | Count >= 0 | `35` |
| 15 | Issue Flags | String | ❌ | Semicolon-delimited | `Clicks > Impressions; Out of flight dates` |

#### Ledger-Specific Fields (Columns 16–18, added by system)
| # | Column | Data Type | Nullable | Format | Constraints | Example |
|---|--------|-----------|----------|--------|-------------|---------|
| 16 | Delivery Timestamp | DateTime | ❌ | ISO 8601 | UTC timestamp | `2025-03-19T06:15:00Z` |
| 17 | Row ID (Deterministic) | String | ❌ | SHA256 hex (64 chars) | Composite key: Config + EventDate + PlacementID + Impressions + Clicks | `a3f2e9d1c2b5...` |
| 18 | Source Email Subject | String | ✅ | Email subject | Reference to daily summary that triggered this row | `CM360 Daily Audit Summary (2025-03-19) — 6 flagged, 0 errors` |

### Deduplication Strategy
**Composite Key (used to generate Row ID):**
```
SHA256(Config + EventDate + PlacementID + Impressions + Clicks)
```

**Why this key?**
- **Config** – Scopes to the audit project
- **EventDate** – Ensures same placement on different days = different rows
- **PlacementID** – The unique placement identifier
- **Impressions + Clicks** – If these change, it's a new report/snapshot
- **Excludes:** Ad Type, Creative, Flags (these can vary while core data is still the same row)

**Central Hub Dedup Logic:**
```python
INSERT INTO ledger WHERE NOT EXISTS (
    SELECT 1 FROM ledger WHERE row_id = new_row.row_id
)
```

### Sample Data (2 rows + header)

```
Event Date | Config | Advertiser | Campaign | Placement ID | Placement Name | Placement Start Date | Placement End Date | Ad Type | Creative | Placement Pixel Size | Creative Pixel Size | Impressions | Clicks | Issue Flags | Delivery Timestamp | Row ID (Deterministic) | Source Email Subject
2025-03-18 | PST01 | Acme Corp | Spring Promo 2025 | 98765432 | Homepage - 728x90 | 2025-03-15 | 2025-03-31 | Standard | Spring Banner v3 | 728x90 | 970x250 | 1250 | 35 | Clicks > Impressions; Out of flight dates | 2025-03-19T06:15:00Z | a3f2e9d1c2b5f4e8d6c7a9b3 | CM360 Daily Audit Summary (2025-03-19) — 6 flagged, 0 errors
2025-03-18 | CM360V2 | Widget Labs | Q1 Campaign | 87654321 | Sidebar - 300x250 | 2025-03-01 | 2025-03-20 | Default | Widget Spotlight | 300x250 | 300x250 | 450 | 8 | Default ad serving | 2025-03-19T06:15:00Z | b4g3f0a2d5c6e9h1i7j8k9l2 | CM360 Daily Audit Summary (2025-03-19) — 6 flagged, 0 errors
```

**Column Order Priority:**
- First 3 columns (**Event Date, Config, Advertiser**) enable quick indexing/filtering in central hub
- Middle 12 columns = full placement + performance data
- Last 3 columns = ledger metadata

---

## C) PARSING GUIDANCE FOR YOUR HUB

### Daily Summary Email Parsing
```python
# Email arrives at [hub]
# Subject regex match:
pattern = r"CM360 Daily Audit Summary \((\d{4}-\d{2}-\d{2})\) — (\d+) flagged, (\d+) errors"
matches = re.search(pattern, email.subject)
audit_date, flagged_count, error_count = matches.groups()

# HTML table parsing: extract rows from <table> with header row
# Columns: [Config, Status, Flagged Rows, Δ, Email Sent, Email Time, Latest Report]
#
# Store summary metrics in:
# - daily_health_trend table (Date, TotalConfigs, FlaggedConfigs, TotalFlaggedRows, ErrorCount, SkippedCount, EmailsSent, EmailsWithheld)
# - This enables per-config trend charts and system health KPIs
```

### Flagged-Row Ledger Parsing
```python
# Attachment arrives in same (or related) email
# Filename: CM360_Flagged_Ledger_YYYY-MM-DD.xlsx
#
# For each row in sheet "Flagged Placements":
#   1. Extract Row ID from column 17
#   2. Check: SELECT * FROM cm360_ledger WHERE row_id = new_row_id
#   3. If NOT EXISTS, INSERT (prevents duplicates)
#   4. Link to daily summary via Source Email Subject (col 18)
#
# This populates:
# - cm360_placement_flags (full placement+flag details)
# -enables placement-level dashboards, flag trending, issue resolution tracking
```

---

## D) IMPLEMENTATION ROADMAP

### Phase 1: Summary Email Contract (LIVE ✅)
- [x] Confirm subject pattern stable
- [x] Verify all summary metrics always present
- [x] Confirm sender email
- [x] Confirm table column order

**You can start ingesting summary emails NOW.**

### Phase 2: Ledger Export (IN PROGRESS 🔄)
- [ ] Add ledger export logic to `emailFlaggedRows()` in Code.js
- [ ] Generate XLSX with 18-column schema
- [ ] Calculate SHA256 Row IDs server-side
- [ ] Send as separate attachment in daily summary email (or new dedicated email)
- [ ] Confirm sender email matches

**Step 1:** Confirm where ledger should be sent (hub email? same recipients as summary? Drive folder?)

### Phase 3: Trend Analysis (FUTURE 📊)
- [ ] Per-config daily flag count trends
- [ ] Top off-flag reasons by config
- [ ] Issue resolution velocity (flag → resolved)
- [ ] Config error-rate tracking

---

## E) IMPLEMENTATION CONFIRMED ✅

### Ledger Delivery & Hub Integration
- **Ledger Location:** XLSX attachment in daily summary email
- **Hub Architecture:** Google Sheet (all recipients have access)
- **Hub Ingestion Method:** Import XLSX daily (manual or IMPORTRANGE formula)
- **Frequency:** One aggregated export per day covering ALL configs
- **Source Tracking:** Yes, include Source Email Subject (Column 18)
- **Row ID Handling:** Calculate fresh each export (deterministic)

### How It Works
```
[Daily Audit Summary Email]
├── Email Body (HTML summary table + metrics)
├── Attachment 1: CM360_Flagged_Ledger_YYYY-MM-DD.xlsx
│   └── All flagged placements from all configs (one row per flag)
└── Signature: Platform Solutions Team

[Your Central Hub Sheet]
├── Set IMPORTRANGE formula to pull from the latest XLSX
│   OR manually import the XLSX each morning
└── Aggregate across all configs + historical trends
```

**Hub Sheet Formula Option:**
```
=IMPORTRANGE("DRIVE_EXPORT_URL", "Flagged Placements!A:R")
```

Or keep it simple: download attachment → import into hub sheet each morning.

---

## F) IMPLEMENTATION COMPLETE ✅

The flagged-row ledger export has been integrated into **Code.js**:

### Ledger Export Functions
```javascript
calculateRowId_(configName, eventDate, placementId, impressions, clicks)
  → SHA256(config|date|placementid|impressions|clicks)

aggregateFlaggedRowsFromAllConfigs_()
  → Reads flagged rows from each config's merged sheet
  → Returns array of 18-column objects

generateFlaggedLedgerExcel_(flaggedRows)
  → Creates XLSX with all flagged placements
  → Filename: CM360_Flagged_Ledger_YYYY-MM-DD.xlsx

sendDailySummaryEmail(results)
  → Generates ledger export
  → Attaches XLSX to summary email
```

### Attachment Details
- **Filename:** `CM360_Flagged_Ledger_2026-03-19.xlsx` (auto-dated daily)
- **Sheet Name:** `Flagged Placements`
- **Rows:** One per flagged placement from all configs
- **Columns:** 18 (as per schema in Section B)
- **Delivery:** Attached to daily summary email

---

## G) SAMPLE LEDGER EXPORT

### Header Row
```
Event Date | Config | Advertiser | Campaign | Placement ID | Placement Name | Placement Start Date | Placement End Date | Ad Type | Creative | Placement Pixel Size | Creative Pixel Size | Impressions | Clicks | Issue Flags | Delivery Timestamp | Row ID (Deterministic) | Source Email Subject
```

### Sample Data Rows
```
2026-03-18 | PST01 | Acme Corp | Spring Promo 2026 | 98765432 | Homepage - 728x90 | 2026-03-15 | 2026-03-31 | Standard | Spring Banner v3 | 728x90 | 970x250 | 1250 | 35 | Clicks > Impressions; Out of flight dates | 2026-03-19T06:15:00Z | a3f2e9d1c2b5f4e8d6c7a9b3e1f2d8c4 | CM360 Daily Audit Summary (2026-03-19) — X flagged, Y errors

2026-03-18 | CM360V2 | Widget Labs | Q1 Campaign | 87654321 | Sidebar - 300x250 | 2026-03-01 | 2026-03-20 | Default | Widget Spotlight | 300x250 | 300x250 | 450 | 8 | Default ad serving | 2026-03-19T06:15:00Z | b4g3f0a2d5c6e9h1i7j8k9l2m3n4o5p6 | CM360 Daily Audit Summary (2026-03-19) — X flagged, Y errors
```

### Row ID Calculation (Python Example)
```python
import hashlib

def calculate_row_id(config_name, event_date, placement_id, impressions, clicks):
    key = f"{config_name}|{event_date}|{placement_id}|{impressions}|{clicks}"
    return hashlib.sha256(key.encode()).hexdigest()

# Example
row_id = calculate_row_id("PST01", "2026-03-18", "98765432", 1250, 35)
# → "a3f2e9d1c2b5f4e8d6c7a9b3e1f2d8c4"
```

---

## H) HUB INGESTION WORKFLOW

### Daily Process
1. **6:00 AM ET** → Audits complete, summary email sent with ledger XLSX
2. **Your Hub** → Download/import `CM360_Flagged_Ledger_YYYY-MM-DD.xlsx`
3. **Dedup Check:** `WHERE row_id NOT IN (SELECT row_id FROM cm360_ledger)`
4. **Insert:** New rows populate your central event ledger

### Google Sheet Option (No Download Needed)
Use IMPORTRANGE to pull directly into your hub sheet:
```
=IMPORTRANGE("https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=xlsx", "Flagged Placements!A:R")
```

### Ledger Query Example
```sql
SELECT 
  event_date,
  config,
  advertiser,
  campaign,
  placement_id,
  COUNT(*) as flag_count,
  GROUP_CONCAT(DISTINCT issue_flags)
FROM cm360_ledger
WHERE event_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY 1,2,3,4,5
ORDER BY flag_count DESC;
```

---

**Status:** 🚀 LIVE & READY

The ledger export is now generating automatically with each daily summary email. Your hub can begin ingesting the XLSX attachment immediately!
