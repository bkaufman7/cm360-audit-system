# CM360 Audit Flags Reference Guide

Complete reference for all flag types that can appear in CM360 audit emails and reports.

---

## Table of Contents

1. [Flag Overview](#flag-overview)
2. [Standard Audit Flags](#standard-audit-flags)
   - [Clicks Greater Than Impressions](#1-clicks-greater-than-impressions)
   - [Out of Flight Dates](#2-out-of-flight-dates)
   - [Pixel Size Mismatch](#3-pixel-size-mismatch)
   - [Default Ad Serving](#4-default-ad-serving)
3. [Performance Monitoring Flags](#performance-monitoring-flags)
   - [Performance Drop](#5-performance-drop)
   - [Launch Detection](#6-launch-detection)
4. [Understanding Email Sections](#understanding-email-sections)
5. [Threshold Configuration](#threshold-configuration)
6. [Exclusions](#exclusions)

---

## Flag Overview

The CM360 audit system checks daily delivery reports and flags placements that meet specific error conditions. Flagged rows appear at the top of your audit emails with color-coded sections for easy identification.

**How Flags Work:**
- Each row in your daily report is checked against multiple flag conditions
- A placement can have multiple flags at once
- Flags respect thresholds (minimum impressions/clicks) to avoid noise
- Exclusions can suppress specific placements from being flagged

**Email Color Coding:**
- 🔴 **Red Section** = Standard audit flags (errors requiring immediate attention)
- 🟡 **Yellow Section** = Performance drops (delivery issues to investigate)
- 🟢 **Green Section** = New launches (recent placements for awareness)

---

## Standard Audit Flags

These flags appear in the **red section** at the top of audit emails and indicate data quality or configuration issues that need immediate attention.

### 1. Clicks Greater Than Impressions

**Flag Type:** `clicks_greater_than_impressions`

**What It Means:** A placement shows more clicks than impressions, which is mathematically impossible. This indicates a tracking or reporting error.

**Visual Example:**
```
┌──────────────┬──────────┬──────────┬─────────────┬─────────┬────────┬─────────┐
│ Advertiser   │ Campaign │ Site     │ Placement   │ Start   │ Impr.  │ Clicks  │
├──────────────┼──────────┼──────────┼─────────────┼─────────┼────────┼─────────┤
│ ABC Corp     │ Q1 Sale  │ Google   │ Banner 300  │ 2026-01 │ 45     │ 128     │ ← FLAGGED
│              │          │          │ 300x250     │ -15     │        │         │
└──────────────┴──────────┴──────────┴─────────────┴─────────┴────────┴─────────┘
```

**Why This Matters:**
- Indicates broken tracking pixels or tag implementation issues
- Can cause incorrect billing or performance reporting
- May signal bot traffic or fraudulent activity

**Common Causes:**
- Click tracking pixel fires but impression pixel doesn't
- Tags implemented in wrong order
- Ad server misconfiguration
- Cache issues preventing impression tracking

**What To Do:**
1. Check tag implementation on the placement
2. Verify impression and click pixels are both firing
3. Review recent creative changes or site updates
4. If volume is low (<10 events), may be transient; monitor for pattern

**Threshold Configuration:**
Set in `Audit Thresholds` sheet per config:
- **Min Impressions:** Only flag if placement has this many impressions
- **Min Clicks:** Only flag if placement has this many clicks

---

### 2. Out of Flight Dates

**Flag Type:** `out_of_flight_dates`

**What It Means:** A placement is showing impressions or clicks outside its scheduled start/end dates. The placement is delivering when it shouldn't be.

**Visual Example:**
```
┌──────────────┬──────────┬──────────┬─────────────┬─────────┬─────────┬────────┬────────┐
│ Advertiser   │ Campaign │ Site     │ Placement   │ Start   │ End     │ Impr.  │ Clicks │
├──────────────┼──────────┼──────────┼─────────────┼─────────┼─────────┼────────┼────────┤
│ XYZ Brand    │ Holiday  │ Facebook │ Video 640   │ 2025-12 │ 2026-01 │ 8,234  │ 156    │ ← FLAGGED
│              │ 2025     │          │ 640x480     │ -01     │ -10     │        │        │
└──────────────┴──────────┴──────────┴─────────────┴─────────┴─────────┴────────┴────────┘
```
*(Today is 2026-01-22, but placement ended on 2026-01-10)*

**Why This Matters:**
- Wasting budget on expired campaigns
- Showing outdated creative or messaging
- Can cause billing disputes
- Indicates campaign management oversight

**Common Causes:**
- Placement wasn't paused when flight ended
- Always-on campaign with incorrect end date
- Timezone issues between CM360 and delivery system
- Auto-renewal settings not updated

**What To Do:**
1. **If still in flight:** Update CM360 end date to match actual delivery schedule
2. **If should be ended:** Pause or archive the placement immediately
3. Review other placements in same campaign for similar issues
4. Check if this is intentional (some campaigns extend delivery)

**Threshold Configuration:**
Set in `Audit Thresholds` sheet per config:
- **Min Impressions:** Only flag if placement has this many impressions out of flight
- **Min Clicks:** Only flag if placement has this many clicks out of flight

**Special Notes:**
- System adds 3-day buffer after end date (allows for reporting delays)
- Excludes placements that ended in the last 3 days
- If today's data is within flight dates, won't flag

---

### 3. Pixel Size Mismatch

**Flag Type:** `pixel_size_mismatch`

**What It Means:** The creative file dimensions don't match the placement's specified size. Wrong-sized creatives can cause rendering issues or ads not showing.

**Visual Example:**
```
┌──────────────┬──────────┬──────────┬─────────────┬─────────┬────────┬───────────────┐
│ Advertiser   │ Campaign │ Site     │ Placement   │ Creative│ Impr.  │ Placement     │
│              │          │          │             │         │        │ Size          │
├──────────────┼──────────┼──────────┼─────────────┼─────────┼────────┼───────────────┤
│ Acme Inc     │ Spring   │ CNN      │ Billboard   │ Spring_ │ 12,456 │ 970x250       │ ← FLAGGED
│              │ Launch   │          │ 970x250     │ 728x90  │        │ (creative is  │
│              │          │          │             │         │        │ 728x90)       │
└──────────────┴──────────┴──────────┴─────────────┴─────────┴────────┴───────────────┘
```

**Why This Matters:**
- Ads may not display correctly (clipped, stretched, or rejected)
- Poor user experience damages brand
- Can violate publisher specs and get ads rejected
- Wastes impressions on broken ad rendering

**Common Causes:**
- Wrong creative assigned to placement
- Creative naming confusion (728x90 creative with 970x250 in filename)
- Responsive placements assigned fixed-size creative
- Copy/paste errors when setting up campaigns

**What To Do:**
1. Verify the placement size in CM360
2. Check the actual creative file dimensions
3. Assign correct-sized creative or update placement size
4. If intentional (responsive), add to exclusions list

**Threshold Configuration:**
Set in `Audit Thresholds` sheet per config:
- **Min Impressions:** Only flag if placement has this many impressions
- **Min Clicks:** Only flag if placement has this many clicks

**Special Notes:**
- System normalizes size formats: "728x90", "728 x 90", "728×90" all match
- Common responsive sizes (1x1, 2x2) are handled specially
- Excludes placements with 0x0 or invalid sizes

---

### 4. Default Ad Serving

**Flag Type:** `default_ad_serving`

**What It Means:** The placement is showing a "default" creative instead of the intended campaign creative. Default ads are fallback/placeholder ads that appear when no eligible creative is available.

**Visual Example:**
```
┌──────────────┬──────────┬──────────┬─────────────┬─────────────────┬────────┐
│ Advertiser   │ Campaign │ Site     │ Placement   │ Creative        │ Impr.  │
├──────────────┼──────────┼──────────┼─────────────┼─────────────────┼────────┤
│ Tech Co      │ Product  │ Yahoo    │ Rect 300    │ Default_300x250 │ 45,678 │ ← FLAGGED
│              │ Launch   │          │ 300x250     │                 │        │
└──────────────┴──────────┴──────────┴─────────────┴─────────────────┴────────┘
```

**Why This Matters:**
- Wasting impressions on placeholder ads instead of campaign creative
- Not delivering your marketing message
- Indicates targeting, creative, or setup issues
- Budget spent on ineffective impressions

**Common Causes:**
- Campaign creative not trafficked or approved
- Targeting too restrictive (no eligible impressions)
- Creative rotation settings wrong
- Frequency caps blocking primary creative
- Date range issues with creative assignment

**What To Do:**
1. Check if primary creative is active and approved
2. Review targeting settings (may be too narrow)
3. Verify creative assignment and rotation settings
4. Check frequency caps aren't exhausted
5. If defaults are intentional, add to exclusions

**Threshold Configuration:**
Set in `Audit Thresholds` sheet per config:
- **Min Impressions:** Only flag if placement has this many impressions
- **Min Clicks:** Only flag if placement has this many clicks

**Detection Method:**
System flags creatives containing any of these in the name:
- "default"
- "default_"
- "backup"
- "fallback"
- "placeholder"

---

## Performance Monitoring Flags

These flags appear in **yellow (performance drops)** and **green (launches)** sections and provide operational insights about campaign delivery.

### 5. Performance Drop

**Flag Type:** `performance_drop`

**What It Means:** A placement's impressions or clicks dropped significantly compared to recent performance (rolling 3-day average). Indicates potential delivery issues.

**Visual Example:**
```
┌──────────────┬──────────┬──────────┬─────────────┬─────────┬────────┬───────────────┐
│ Advertiser   │ Campaign │ Site     │ Placement   │ Today's │ 3-Day  │ Drop %        │
│              │          │          │             │ Impr.   │ Avg    │               │
├──────────────┼──────────┼──────────┼─────────────┼─────────┼────────┼───────────────┤
│ Retail Co    │ Summer   │ ESPN     │ Banner 728  │ 1,234   │ 8,456  │ -85%          │ ← FLAGGED
│              │ Sale     │          │ 728x90      │         │        │ (Impressions) │
└──────────────┴──────────┴──────────┴─────────────┴─────────┴────────┴───────────────┘
```

**Why This Matters:**
- Early warning of delivery problems
- Can catch issues before budget is wasted
- Helps maintain campaign pacing
- Indicates competitive or inventory issues

**Common Causes:**
- Budget exhaustion (daily/campaign caps hit)
- Targeting restrictions tightened
- Bid/CPM too low for competitive environment
- Inventory availability decreased
- Site/publisher issues
- Frequency caps causing reach saturation

**What To Do:**
1. Check daily budget hasn't been exhausted
2. Verify bid levels are competitive
3. Review recent targeting changes
4. Check publisher for site-wide issues
5. Evaluate frequency cap settings
6. If intentional (planned reduction), adjust thresholds or add exclusion

**Threshold Configuration:**
Set in `Performance Drop Thresholds` sheet per config:
- **Drop Percentage Threshold:** % drop to flag (e.g., 50 = 50% drop)
- **Min Volume Threshold:** Only flag if placement had at least this many impressions/clicks in baseline
- **Grace Period Days:** Skip first N days of flight (avoid new placement volatility)
- **Active:** Must be TRUE to enable performance drop detection

**How It's Calculated:**
1. System saves daily placement data to performance cache
2. Compares today's volume to 3-day rolling average
3. Flags if drop exceeds threshold AND volume exceeds minimum
4. Rolling average: (Day-1 + Day-2 + Day-3) / 3

**Special Notes:**
- Requires 24 hours of data before first detection
- Day 1-2 of flight use shorter averages (1-day, 2-day)
- Excludes placements outside flight dates
- Cache files stored in `Performance Drop Cache/[Config]/` folder

---

### 6. Launch Detection

**Flag Type:** `launch`

**What It Means:** A placement recently started delivering (within configured launch window from start date). This is informational, not an error—helps track new placements.

**Visual Example (Small List - Table in Email):**
```
┌──────────────┬──────────┬──────────┬─────────────┬─────────┬────────┬────────┬───────────┐
│ Advertiser   │ Campaign │ Site     │ Placement   │ Start   │ Days   │ Impr.  │ Clicks    │
│              │          │          │             │ Date    │ Old    │        │           │
├──────────────┼──────────┼──────────┼─────────────┼─────────┼────────┼────────┼───────────┤
│ Fashion Co   │ Fall     │ Vogue    │ Video 640   │ 2026-01 │ 2      │ 8,456  │ 234       │ ← NEW
│              │ 2026     │          │ 640x480     │ -20     │        │        │           │
├──────────────┼──────────┼──────────┼─────────────┼─────────┼────────┼────────┼───────────┤
│ Fashion Co   │ Fall     │ Instagram│ Carousel    │ 2026-01 │ 1      │ 12,345 │ 567       │ ← NEW
│              │ 2026     │          │ 1080x1080   │ -21     │        │        │           │
└──────────────┴──────────┴──────────┴─────────────┴─────────┴────────┴────────┴───────────┘
```

**Visual Example (Large List - Summary + Excel):**
```
🚀 Launch Detection Summary

The following criteria triggered these launch alerts:
• Launch window: Within 3 days of start date
• Minimum volume: 100+ impressions
• Grace period: 0 days (immediate detection)

┌──────────────────────┬─────────────┬──────────────┬─────────────────┐
│ Campaign             │ Site        │ Date Launched│ # of Placements │
├──────────────────────┼─────────────┼──────────────┼─────────────────┤
│ Spring Sale          │ Google Ads  │ 2026-01-20   │ 8               │
├──────────────────────┼─────────────┼──────────────┼─────────────────┤
│ Spring Sale          │ Facebook    │ 2026-01-21   │ 12              │
├──────────────────────┼─────────────┼──────────────┼─────────────────┤
│ Brand Awareness      │ YouTube     │ 2026-01-22   │ 5               │
└──────────────────────┴─────────────┴──────────────┴─────────────────┘

Total: 29 placements launched across 2 campaigns

📎 See attached Excel file for complete launch details: CM360_Launches_CONFIG_2026-01-22.xlsx
```

**Why This Matters:**
- Quick visibility into new placements going live
- Early detection of launch issues
- Helps track campaign rollout progress
- Awareness of what's new without digging through reports

**Common Uses:**
- Verify new placements started on correct date
- Confirm creative is serving on new placements
- Monitor initial delivery volume
- Track multi-phase campaign launches

**What To Do:**
- **Review launches for accuracy:** Confirm expected placements are listed
- **Check initial performance:** Verify volume meets expectations
- **Monitor for issues:** Watch for low/no delivery on new placements
- **No action needed if expected:** This is informational, not an error

**Threshold Configuration:**
Set in `Performance Drop Thresholds` sheet per config:
- **Enable Launch Detection:** Must be TRUE to enable
- **Launch Window Days:** Days from start date to flag as launch (e.g., 3 = within 3 days)
- **Launch Min Volume:** Minimum impressions OR clicks to qualify (e.g., 100)
- **Include Launch Attachment:** Controls email format:
  - **Blank or "none":** No launch section in email
  - **"table only":** HTML table in email body only
  - **"attachment only":** Excel file attached, no table in body
  - **"both":** HTML table + Excel attachment

**Email Format:**
- **< 25 launches:** Detailed 10-column table in email body
- **≥ 25 launches:** Compact 4-column summary table + Excel attachment
- **Excel file includes:** All 11 columns for every launch (Advertiser, Campaign, Site, Placement ID, Placement, Start, End, Creative, Impressions, Clicks, Days From Start)

**Special Notes:**
- No cache required (reads directly from daily report)
- Works immediately when enabled
- Grace period applies (won't flag placements in their first N days if configured)
- Respects exclusions (can exclude specific sites or placements)

---

## Understanding Email Sections

Your daily audit emails are organized into color-coded sections based on flag types:

### Red Section: Standard Audit Flags (Critical)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CM360 Audit Report – CONFIG – 2026-01-22
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 FLAGGED ROWS: 4 placements need attention

[Red background table with all standard flags]
• Clicks > Impressions
• Out of Flight
• Pixel Mismatch
• Default Ad Serving
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Yellow Section: Performance Drops (Warnings)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ PERFORMANCE DROPS: 3 placements

[Yellow background table]
Placements with significant delivery drops
compared to recent 3-day average
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Green Section: New Launches (Informational)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 LAUNCH DETECTION: 12 new placements

[Green background table or summary]
Recently launched placements within the
configured detection window
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Section Priority:
1. **Red (Critical)** – Address these first
2. **Yellow (Warnings)** – Investigate delivery issues
3. **Green (Informational)** – Awareness, no action usually needed

---

## Threshold Configuration

Each flag type respects configurable thresholds to prevent noise and focus on significant issues.

### Standard Audit Flags Configuration

**Location:** `Audit Thresholds` sheet in admin spreadsheet

**Structure:**
```
┌─────────────┬─────────────────────────────────┬──────────────────┬────────────┬────────┐
│ Config Name │ Flag Type                       │ Min Impressions  │ Min Clicks │ Active │
├─────────────┼─────────────────────────────────┼──────────────────┼────────────┼────────┤
│ TEAM01      │ clicks_greater_than_impressions │ 10               │ 5          │ TRUE   │
│ TEAM01      │ out_of_flight_dates             │ 100              │ 10         │ TRUE   │
│ TEAM01      │ pixel_size_mismatch             │ 50               │ 5          │ TRUE   │
│ TEAM01      │ default_ad_serving              │ 100              │ 10         │ TRUE   │
└─────────────┴─────────────────────────────────┴──────────────────┴────────────┴────────┘
```

**Rules:**
- Flag only triggers if **EITHER** Min Impressions **OR** Min Clicks is met
- Set to 0 to always flag (not recommended)
- Set Active = FALSE to disable flag type entirely
- Each config can have different thresholds

### Performance Drop Configuration

**Location:** `Performance Drop Thresholds` sheet in admin spreadsheet

**Structure:**
```
┌────────┬─────────┬────────┬────────┬───────┬─────────┬────────┬────────┬──────────┬────────┐
│ Config │ Enable  │ Drop % │ Min    │ Grace │ Enable  │ Launch │ Launch │ Include  │ Active │
│ Name   │ Perf    │ Thresh │ Volume │ Days  │ Launch  │ Window │ Min    │ Launch   │        │
│        │ Drop    │        │        │       │         │ Days   │ Volume │ Attach   │        │
├────────┼─────────┼────────┼────────┼───────┼─────────┼────────┼────────┼──────────┼────────┤
│ TEAM01 │ TRUE    │ 50     │ 200    │ 0     │ TRUE    │ 3      │ 100    │ both     │ TRUE   │
└────────┴─────────┴────────┴────────┴───────┴─────────┴────────┴────────┴──────────┴────────┘
```

**Column Explanations:**

| Column | Purpose | Example Values |
|--------|---------|----------------|
| **Enable Performance Drop** | Turn performance drop detection on/off | TRUE, FALSE |
| **Drop % Threshold** | Minimum % drop to flag | 50 (= 50% drop), 30 (aggressive), 70 (conservative) |
| **Min Volume Threshold** | Minimum baseline impressions/clicks | 200 (standard), 100 (sensitive), 500 (high-volume) |
| **Grace Period Days** | Skip first N days of flight | 0 (check from Day 1), 3, 7 (skip first week) |
| **Enable Launch Detection** | Turn launch detection on/off | TRUE, FALSE |
| **Launch Window Days** | Days from start to flag as launch | 3 (last 3 days), 1 (yesterday only), 5 (last 5 days) |
| **Launch Min Volume** | Minimum impressions/clicks to qualify | 100 (standard), 50 (sensitive), 200 (established) |
| **Include Launch Attachment** | Email format for launches | blank/none, table only, attachment only, both |
| **Active** | Master on/off switch | TRUE (enable), FALSE (disable) |

**Preset Patterns:**

```
Standard Monitoring:     50% | 200 vol | 3 grace | 3 launch
Aggressive Monitoring:   30% | 100 vol | 0 grace | 5 launch
Conservative Monitoring: 70% | 500 vol | 7 grace | 1 launch
```

---

## Exclusions

Suppress specific placements from being flagged while still monitoring the rest of your campaign.

### When to Use Exclusions

**Good Uses:**
- Known issues that won't be fixed (legacy placements)
- Intentional configurations (responsive placements with pixel mismatch)
- Test placements that should ignore certain rules
- Specific sites with expected behavior differences

**Bad Uses:**
- Hiding problems instead of fixing them
- Disabling entire features for one-off issues
- Avoiding "too many alerts" without addressing root cause

### Exclusion Configuration

**Location:** `Audit Exclusions` sheet in admin spreadsheet

**Structure:**
```
┌─────────────┬──────────────┬───────────────┬──────────────┬───────────────────┬────────┐
│ Config Name │ Flag Type    │ Placement ID  │ Site Name    │ Name Fragment     │ Active │
├─────────────┼──────────────┼───────────────┼──────────────┼───────────────────┼────────┤
│ TEAM01      │ pixel_size   │ 123456789     │              │                   │ TRUE   │
│ TEAM01      │ ALL          │               │ Test Site    │                   │ TRUE   │
│ TEAM01      │ performance  │               │              │ _backup_          │ TRUE   │
└─────────────┴──────────────┴───────────────┴──────────────┴───────────────────┴────────┘
```

**Exclusion Methods:**

1. **By Placement ID** (most specific)
   - Excludes exact placement by ID
   - Example: `123456789`

2. **By Site Name** (all placements on site)
   - Excludes all placements on specified site
   - Example: `Google Display Network`

3. **By Name Fragment** (pattern matching)
   - Excludes placements with text in name
   - Example: `_test_` excludes "Banner_test_300x250"

**Flag Type Options:**
- `clicks_greater_than_impressions` – Only this flag
- `out_of_flight_dates` – Only this flag
- `pixel_size_mismatch` – Only this flag
- `default_ad_serving` – Only this flag
- `performance_drop` – Only this flag
- `launch` – Only this flag
- `ALL` – Exclude from all flags

**Examples:**

```
Exclude specific placement from pixel checks:
Config: TEAM01 | Flag: pixel_size_mismatch | Placement ID: 123456789 | Active: TRUE

Exclude test site from all flags:
Config: TEAM01 | Flag: ALL | Site Name: Test Site | Active: TRUE

Exclude backup creatives from performance drops:
Config: TEAM01 | Flag: performance_drop | Name Fragment: _backup_ | Active: TRUE
```

---

## Quick Reference Table

| Flag Type | Section | Severity | Typical Cause | Fix Priority |
|-----------|---------|----------|---------------|--------------|
| Clicks > Impressions | Red | 🔴 Critical | Broken tracking | Immediate |
| Out of Flight | Red | 🔴 Critical | Campaign not paused | Immediate |
| Pixel Mismatch | Red | 🟠 High | Wrong creative size | High |
| Default Ad Serving | Red | 🟠 High | Targeting/creative issue | High |
| Performance Drop | Yellow | 🟡 Warning | Delivery problem | Investigate |
| Launch Detection | Green | 🟢 Info | New placement | Awareness |

---

## Troubleshooting Common Issues

### "Why am I not seeing any flags?"

**Check:**
1. ✅ Active = TRUE in Thresholds/Performance Drop sheets
2. ✅ Thresholds aren't too high (try Min Impressions = 10)
3. ✅ Config name matches exactly between sheets
4. ✅ Daily reports are being delivered to correct Gmail label
5. ✅ No exclusions suppressing all flags

### "Too many performance drop alerts"

**Solutions:**
- Increase Drop % Threshold (50 → 70)
- Increase Min Volume Threshold (200 → 500)
- Add Grace Period (0 → 3 days)
- Exclude low-volume placements by name fragment
- Review if campaigns are intentionally winding down

### "Missing launch alerts"

**Check:**
1. Enable Launch Detection = TRUE
2. Launch Window Days is appropriate (3+ recommended)
3. Launch Min Volume isn't too high (100 is standard)
4. Include Launch Attachment isn't blank or "none"
5. Placements have sufficient volume to meet minimum

### "False positives on pixel mismatch"

**Common Causes:**
- Responsive placements (use 1x1 size or add exclusion)
- Native ads (sizes often don't match)
- AMP/dynamic creatives

**Solutions:**
- Add specific placements to exclusions
- Use Name Fragment to exclude responsive types
- Increase threshold to reduce noise

---

## Getting Help

**Questions about flags or thresholds?**  
Contact: Platform Solutions Team (bkaufman@horizonmedia.com)

**Documentation:**
- [Performance Drop Thresholds Guide](PERFORMANCE_DROP_THRESHOLDS_README.md)
- [Main README](README.md)
- [Contributing Guide](CONTRIBUTING.md)

**Need to adjust settings?**
1. Open admin spreadsheet
2. Navigate to `Audit Thresholds` or `Performance Drop Thresholds` sheet
3. Update values for your config
4. Changes take effect on next audit run (usually next morning)

---

**Last Updated:** January 22, 2026  
**Version:** 2.0
