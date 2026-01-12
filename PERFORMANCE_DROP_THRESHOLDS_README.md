# Performance Drop Thresholds & Launch Detection

## Overview

The **Performance Drop Thresholds** feature provides automated monitoring for two critical scenarios in your CM360 campaigns:

1. **Performance Drops**: Detects when active placements experience significant drops in impressions or clicks compared to their recent performance history
2. **Launch Detection**: Identifies newly launched placements to provide immediate visibility into campaign starts

Both features integrate seamlessly into your existing CM360 Daily Audit emails, adding dedicated sections when issues are detected.

---

## How It Works

### Performance Drop Detection

The system automatically:
- **Saves daily snapshots** of all placement performance (impressions & clicks) to Google Drive
- **Compares yesterday's data** against a 3-day rolling average
- **Flags placements** that dropped by your specified percentage threshold
- **Respects grace periods** to avoid false positives during campaign ramp-up
- **Excludes low-volume placements** based on minimum thresholds you set

**Technical Details:**
- Historical data is cached in Drive under: `Project Log Files/CM360 Daily Audits/Performance Drop Cache/[ConfigName]/`
- Cache files are automatically cleaned up after 7 days
- On first enable, the system backfills up to 4 days of historical data
- Rolling averages use partial data for early flight days (Day 2 = 1-day avg, Day 3 = 2-day avg, Day 4+ = 3-day avg)

### Launch Detection

The system automatically:
- **Scans all placements** in yesterday's audit data
- **Identifies placements** where the Start Date is within your specified launch window (e.g., last 3 days)
- **Filters by volume** to exclude test placements below your minimum threshold
- **Only flags placements** in their first 7 days of flight

---

## Sheet Structure & Configuration

Access the configuration sheet via: **Admin Controls → Performance Drop Thresholds**

### Column Reference

| Column | Name | Type | Default | Description |
|--------|------|------|---------|-------------|
| **A** | Config Name | Text | - | Must match your audit config name exactly (e.g., `LION01`, `PST01`) |
| **B** | Enable Performance Drop | TRUE/FALSE | FALSE | Turn performance drop detection ON/OFF for this config |
| **C** | Drop Percentage Threshold | Number | 50 | Percentage drop required to flag (e.g., 50 = flag if drops by 50% or more) |
| **D** | Min Volume Threshold | Number | 200 | Minimum impressions OR clicks to consider (filters out low-volume placements) |
| **E** | Grace Period Days | Number | 0 | Days to skip after placement start date (0 = check from Day 1) |
| **F** | Enable Launch Detection | TRUE/FALSE | FALSE | Turn launch detection ON/OFF for this config |
| **G** | Launch Window Days | Number | 3 | How many days back to look for new launches (e.g., 3 = flag if started in last 3 days) |
| **H** | Launch Min Volume | Number | 100 | Minimum impressions OR clicks for launch detection (filters out test placements) |
| **I** | Active | TRUE/FALSE | TRUE | Master on/off switch (FALSE = completely disabled) |
| **J** | Last Updated | Auto | - | System-managed timestamp |
| **K** | INSTRUCTIONS | Text | - | Column explanations (do not edit) |

---

## Step-by-Step Setup Guide

### For Ad Ops Team Members

#### **Step 1: Open the Configuration Sheet**

1. Open your CM360 Audit configuration spreadsheet
2. Go to **Admin Controls** menu (top menu bar)
3. Click **→ Performance Drop Thresholds**
4. A new sheet will appear with pre-formatted columns

#### **Step 2: Add Your Config**

1. Find an empty row (below the header)
2. In **Column A (Config Name)**, enter your config name exactly as it appears in Audit Recipients sheet
   - Example: `LION01`, `PST01`, `NEXTSD01`
   - ⚠️ **Must match exactly** (case-sensitive)

#### **Step 3: Configure Performance Drop Detection** (Optional)

If you want to detect performance drops:

1. **Column B (Enable Performance Drop)**: Enter `TRUE`
2. **Column C (Drop Percentage Threshold)**: Enter percentage
   - `50` = flag if drops by 50% or more
   - `30` = flag if drops by 30% or more (more sensitive)
   - `70` = flag if drops by 70% or more (less sensitive)
3. **Column D (Min Volume Threshold)**: Enter minimum daily volume
   - `200` = only flag if placement normally gets 200+ impressions OR clicks
   - `500` = only flag higher-volume placements
   - `100` = flag lower-volume placements too
4. **Column E (Grace Period Days)**: Enter ramp-up days to skip
   - `0` = check from Day 1 of flight
   - `3` = start checking on Day 4 (skip first 3 days)
   - `7` = start checking on Day 8 (skip first week)

#### **Step 4: Configure Launch Detection** (Optional)

If you want to detect new launches:

1. **Column F (Enable Launch Detection)**: Enter `TRUE`
2. **Column G (Launch Window Days)**: Enter lookback window
   - `3` = flag placements that started in last 3 days
   - `5` = flag placements that started in last 5 days
   - `1` = only flag placements that started yesterday
3. **Column H (Launch Min Volume)**: Enter minimum launch volume
   - `100` = only flag if placement has 100+ impressions OR clicks
   - `50` = flag lower-volume launches too
   - `200` = only flag higher-volume launches

#### **Step 5: Activate the Config**

1. **Column I (Active)**: Enter `TRUE`
2. Press **Enter** to save
3. The system will automatically update **Column J (Last Updated)** with a timestamp

#### **Step 6: Verify Setup**

Run a manual audit to test:
1. Go to **Run Audit** menu
2. Click **→ Single Config**
3. Select your config name
4. Check the execution log for:
   - `"Loaded performance drop thresholds from sheet for 1 configs"`
   - `"Running launch detection"` (if enabled)
   - `"🚩 Detected N performance drops"` (if any found)
   - `"🚀 Detected N new launches"` (if any found)

---

## Configuration Examples

### Example 1: Conservative Performance Monitoring
**Use Case**: Large, stable campaigns where you only want to know about major issues

```
Config Name: LION01
Enable Performance Drop: TRUE
Drop Percentage Threshold: 70
Min Volume Threshold: 500
Grace Period Days: 3
Enable Launch Detection: FALSE
Active: TRUE
```

**Result**: Only flags if impressions/clicks drop by 70%+ on placements with 500+ daily volume, after a 3-day ramp-up period.

---

### Example 2: Aggressive Monitoring + Launch Tracking
**Use Case**: New or critical campaigns where you want early warning of any issues

```
Config Name: PST01
Enable Performance Drop: TRUE
Drop Percentage Threshold: 30
Min Volume Threshold: 100
Grace Period Days: 0
Enable Launch Detection: TRUE
Launch Window Days: 5
Launch Min Volume: 50
Active: TRUE
```

**Result**: Flags drops of 30%+ on any placement with 100+ volume, checks from Day 1, AND flags all new placements started in last 5 days with 50+ volume.

---

### Example 3: Launch Detection Only
**Use Case**: You just want visibility into new campaign starts

```
Config Name: NEXTSD01
Enable Performance Drop: FALSE
Drop Percentage Threshold: 50
Min Volume Threshold: 200
Grace Period Days: 0
Enable Launch Detection: TRUE
Launch Window Days: 3
Launch Min Volume: 100
Active: TRUE
```

**Result**: Only flags new placements that started in last 3 days with 100+ volume. No performance drop checking.

---

## Email Examples

### Email Section: Performance Drops Detected

When performance drops are detected, a **yellow-highlighted section** appears in your daily audit email:

```
⚠️ Performance Drops Detected (3)

The following placements show significant performance drops compared to their 
3-day average. This may indicate delivery issues:

┌────────────────────────────────────────────────────────────────────────┐
│ Advertiser | Campaign      | Site    | Placement           | ID      │
│ ABC Corp   | Spring Sale   | Google  | Display 728x90      | 123456  │
│            |               |         | 3-Day Avg vs Yesterday         │
│            |               |         | Impr: 5,234 → 1,102 (-79%)     │
│            |               |         | Clicks: 156 → 38 (-76%)        │
├────────────────────────────────────────────────────────────────────────┤
│ ABC Corp   | Spring Sale   | Facebook| Video Pre-Roll      | 123457  │
│            |               |         | 3-Day Avg vs Yesterday         │
│            |               |         | Impr: 12,450 → 3,201 (-74%)    │
├────────────────────────────────────────────────────────────────────────┤
│ XYZ Brand  | Q1 Awareness  | Twitter | Display 300x250     | 234567  │
│            |               |         | 3-Day Avg vs Yesterday         │
│            |               |         | Clicks: 234 → 67 (-71%)        │
└────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Yellow background (#fff8dc) for high visibility
- Shows both impressions and clicks when both metrics dropped
- Shows only the metric that triggered the flag if just one dropped
- Displays 3-day average → yesterday's value with percentage drop
- Includes full placement details for quick investigation

---

### Email Section: New Launches Detected

When new placements are detected, a **green-highlighted section** appears in your daily audit email:

```
🚀 New Launches Detected (2)

The following placements recently went live. Monitor their initial performance:

┌────────────────────────────────────────────────────────────────────────┐
│ Advertiser | Campaign      | Site    | Placement           | Launched │
│ ABC Corp   | Summer Launch | Google  | Display 728x90      | Today    │
│            |               |         | Impressions: 2,345             │
│            |               |         | Clicks: 87                     │
├────────────────────────────────────────────────────────────────────────┤
│ XYZ Brand  | New Product   | Facebook| Video 16:9          | 2 days   │
│            |               |         | Impressions: 8,921             │
│            |               |         | Clicks: 234                    │
└────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Green background (#e6f4ea) for positive visibility
- Shows when placement launched (Today, Yesterday, N days ago)
- Displays current impressions and clicks
- Helps you catch new campaigns immediately
- Separate from regular audit flags

---

### Email Positioning

Both sections appear **after** the regular flagged placements table:

```
⚠️ CM360 Daily Audit: Issues Detected (LION01 - 2026-01-12)

[Regular Flagged Placements Table]
↓

⚠️ Performance Drops Detected (3)
[Performance drop details]
↓

🚀 New Launches Detected (2)
[Launch details]
↓

— Platform Solutions Team
```

---

## Troubleshooting

### "No performance drops detected but I expected some"

**Check:**
1. **Grace Period**: Are the placements within the grace period? If Grace Period = 3, placements in their first 3 days won't be flagged.
2. **Min Volume**: Do the placements meet the minimum volume threshold? Average must be >= Min Volume Threshold.
3. **Drop %**: Is the drop severe enough? A 40% drop won't trigger if threshold is 50%.
4. **Historical Data**: First-time enable needs 1 day of history. Run audit once, wait 24 hours, then drops will be detected.
5. **Exclusions**: Check if placement is in Audit Exclusions sheet with "performance_drop" flag type.

---

### "Backfill didn't run automatically"

**Backfill triggers when:**
- Performance Drop is enabled for first time
- Less than 3 cache files exist for the config

**Manual trigger:**
1. Open Apps Script Editor
2. Run function: `performanceBackfillHistory`
3. Check logs for: `"Starting backfill for N configs"`

---

### "Launch detection isn't flagging new placements"

**Check:**
1. **Enable Launch Detection**: Column F must be `TRUE`
2. **Launch Window**: Is the placement start date within the window? If window = 3 days, only placements started in last 3 days are flagged.
3. **Min Volume**: Does the placement have enough volume? Must have >= Launch Min Volume impressions OR clicks.
4. **First 7 Days**: Launch detection only works for placements in their first 7 days of flight.
5. **Exclusions**: Check if placement is excluded with "launch" flag type.

---

### "Too many false positives"

**Adjust thresholds:**
- **Increase Drop %**: Change from 50 → 70 (only flag severe drops)
- **Increase Min Volume**: Change from 200 → 500 (only flag high-volume placements)
- **Add Grace Period**: Change from 0 → 3 (skip first 3 days of ramp-up)
- **Increase Launch Min Volume**: Change from 100 → 200 (only flag higher-volume launches)

**Or add specific exclusions:**
1. Go to **Admin Controls → Audit Exclusions**
2. Add row with placement ID and flag type `performance_drop` or `launch`

---

### "Cache files taking up Drive space"

**Cache cleanup is automatic:**
- Files older than 7 days are deleted automatically
- Located at: `Project Log Files/CM360 Daily Audits/Performance Drop Cache/[ConfigName]/`
- Each file is ~10-50KB depending on placement count
- Typical config uses ~300KB total (7 days × ~40KB/day)

**Manual cleanup:**
1. Navigate to the cache folder in Google Drive
2. Delete old JSON files manually
3. Or run: `cleanupOldPerformanceCache_()` from Apps Script

---

## Best Practices

### 1. Start Conservative
Begin with:
- Drop % = 50 (moderate sensitivity)
- Min Volume = 200 (filters low-volume noise)
- Grace Period = 3 (skip ramp-up)
- Launch Window = 3 days

Monitor results for 1-2 weeks, then adjust.

### 2. Segment by Campaign Type

**High-Stakes Campaigns:**
- Lower thresholds (30-40% drop)
- No grace period
- Enable launch detection

**Evergreen/Stable Campaigns:**
- Higher thresholds (60-70% drop)
- 3-5 day grace period
- Launch detection optional

### 3. Use Exclusions Strategically

Don't disable entire features for one-off issues:
- Add specific placements to Audit Exclusions with `performance_drop` flag type
- Temporary issues: Remove from exclusions after 1 week
- Permanent issues (testing placements): Keep excluded

### 4. Monitor Launch Detection Weekly

Review launch detection emails to:
- Verify new campaigns went live as expected
- Catch unplanned launches
- Identify campaigns with low initial volume

### 5. Coordinate with Teams

Share this guide with:
- **Media Planners**: So they understand grace periods and thresholds
- **Campaign Managers**: So they know what triggers alerts
- **Analytics Team**: So they can correlate drops with external factors

---

## Technical Details

### Cache File Structure

Each cache file contains:
```json
{
  "date": "2026-01-12",
  "timestamp": "2026-01-12T08:15:32Z",
  "data": [
    {
      "placementId": "123456",
      "placementName": "Display 728x90",
      "siteName": "Google",
      "advertiser": "ABC Corp",
      "campaign": "Spring Sale",
      "creative": "Spring_Banner_728x90",
      "startDate": "2026-01-05",
      "endDate": "2026-01-31",
      "impressions": 5234,
      "clicks": 156
    }
    // ... more placements
  ]
}
```

### Rolling Average Calculation

**Day 2 of flight:** 
- Average = Day 1 data only (1-day average)

**Day 3 of flight:**
- Average = (Day 1 + Day 2) / 2 (2-day average)

**Day 4+ of flight:**
- Average = (Day 1 + Day 2 + Day 3) / 3 (full 3-day average)

This prevents false positives during the first few days when historical data is limited.

### Exclusions Integration

Both features respect the Audit Exclusions sheet:
- **Flag Type = `performance_drop`**: Excludes from performance drop detection
- **Flag Type = `launch`**: Excludes from launch detection
- **Flag Type = `ALL`**: Excludes from both features

You can exclude by:
- Placement ID (specific placement)
- Site Name (all placements on that site)
- Placement Name pattern (partial match)

---

## FAQ

**Q: Can I enable this for just one config?**  
A: Yes! Each config has independent settings. Leave other configs with `Active = FALSE`.

**Q: Will this slow down my daily audits?**  
A: No. Both features add ~2-5 seconds per config. The system is optimized for performance.

**Q: What if I delete cache files accidentally?**  
A: The system will rebuild automatically. Backfill runs when <3 cache files exist.

**Q: Can I change thresholds mid-campaign?**  
A: Yes. Changes take effect on next audit run (usually next morning).

**Q: Do I need to run backfill manually?**  
A: No. Backfill runs automatically when you first enable performance drops and cache is insufficient.

**Q: What happens if a placement is paused?**  
A: Performance drops only check in-flight placements or placements that ended in the last 3 days.

**Q: Can I get hourly alerts instead of daily?**  
A: Not currently. The system is designed for daily batch processing aligned with CM360 data availability.

**Q: Will this work with STAGING mode?**  
A: Yes. When STAGING_MODE = 'Y', performance drop and launch emails route to ADMIN_EMAIL only.

---

## TL;DR (Quick Start)

### To Enable Performance Drop Detection:
1. Open **Admin Controls → Performance Drop Thresholds**
2. Add row: `[YourConfig] | TRUE | 50 | 200 | 0 | FALSE | 3 | 100 | TRUE`
3. Wait 24 hours for first cache to build
4. Performance drops appear as **yellow section** in daily audit emails

### To Enable Launch Detection:
1. Same sheet, set Column F = `TRUE`, Column G = `3`, Column H = `100`
2. Works immediately (no cache needed)
3. New launches appear as **green section** in daily audit emails

### Key Settings:
- **Drop %**: 50 = moderate, 30 = aggressive, 70 = conservative
- **Min Volume**: 200 = standard, 100 = sensitive, 500 = high-volume only
- **Grace Period**: 0 = check from Day 1, 3 = skip first 3 days, 7 = skip first week
- **Launch Window**: 3 = last 3 days, 1 = yesterday only, 5 = last 5 days

### Common Patterns:
- **Standard Monitoring**: `50% | 200 vol | 3 grace | 3 launch`
- **Aggressive Monitoring**: `30% | 100 vol | 0 grace | 5 launch`
- **Conservative Monitoring**: `70% | 500 vol | 7 grace | 1 launch`

### Troubleshooting:
- **No drops detected?** Check grace period, min volume, and wait 24hrs for cache
- **Too many alerts?** Increase drop %, increase min volume, add grace period
- **No launches?** Check Enable Launch Detection = TRUE and launch window days

---

**Questions? Contact:** Platform Solutions Team (bkaufman@horizonmedia.com)
