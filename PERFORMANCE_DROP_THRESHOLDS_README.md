# Performance Drop Thresholds & Launch Detection Setup Guide

## Table of Contents

1. [Welcome to Advanced Campaign Monitoring](#welcome-to-advanced-campaign-monitoring-)
   - [What You'll Be Able to Do](#what-youll-be-able-to-do)
2. [Important: How Configuration Works](#important-how-configuration-works-)
   - [The Two-Spreadsheet System](#the-two-spreadsheet-system)
   - [Why This Matters for You](#why-this-matters-for-you)
3. [How Does This Work Behind the Scenes?](#how-does-this-work-behind-the-scenes)
   - [Performance Drop Detection: Your Campaign's Watchdog](#performance-drop-detection-your-campaigns-watchdog)
   - [Launch Detection: Your New Campaign Spotter](#launch-detection-your-new-campaign-spotter)
4. [Your Configuration Sheet: The Control Center](#your-configuration-sheet-the-control-center)
5. [Let's Set This Up (Follow Along!)](#lets-set-this-up-follow-along)
   - [Step 1: Find Your Configuration Sheet](#step-1-find-your-configuration-sheet-)
   - [Step 2: Add Your Config Name](#step-2-add-your-config-name-)
   - [Step 3: Set Up Performance Drop Detection](#step-3-set-up-performance-drop-detection-)
   - [Step 4: Set Up Launch Detection](#step-4-set-up-launch-detection-)
   - [Step 5: Activate It!](#step-5-activate-it-)
   - [Step 6: Test It](#step-6-test-it-)
   - [Step 7: Wait for Your First Email](#step-7-wait-for-your-first-email-)
6. [Real-World Setup Examples (Copy These!)](#real-world-setup-examples-copy-these)
   - [Example 1: "I Manage Large, Stable Campaigns"](#example-1-i-manage-large-stable-campaigns)
   - [Example 2: "I Need to Catch Issues Fast"](#example-2-i-need-to-catch-issues-fast)
   - [Example 3: "I Just Want Launch Notifications"](#example-3-i-just-want-launch-notifications)
7. [What Your Emails Will Look Like](#what-your-emails-will-look-like)
   - [When Performance Drops Are Detected](#when-performance-drops-are-detected)
   - [When New Launches Are Detected](#when-new-launches-are-detected)
   - [Where These Sections Appear](#where-these-sections-appear)
8. [Common Questions & Quick Fixes](#common-questions--quick-fixes)
   - ["I set it up but don't see any drops"](#i-set-it-up-but-dont-see-any-drops-)
   - ["Launch detection isn't showing anything"](#launch-detection-isnt-showing-anything-)
   - ["Getting too many alerts"](#getting-too-many-alerts-)
   - ["System seems slow / not working"](#system-seems-slow--not-working-)
9. [Pro Tips from the Ad Ops Team](#pro-tips-from-the-ad-ops-team)
10. [System Architecture (For Reference)](#system-architecture-for-reference)
    - [How Configuration Flows Through the System](#how-configuration-flows-through-the-system)
    - [Where Data Lives](#where-data-lives)
    - [Sync Frequency](#sync-frequency)
    - [Cache File Structure](#cache-file-structure)
    - [Rolling Average Calculation](#rolling-average-calculation)
    - [Exclusions Integration](#exclusions-integration)
11. [FAQ](#faq)
12. [TL;DR (Quick Start)](#tldr-quick-start)

---

## Welcome to Advanced Campaign Monitoring! 👋

This guide will help you set up two powerful monitoring features that work alongside your existing CM360 Daily Audits:

### What You'll Be Able to Do:

**1. Performance Drop Detection** 🚨
Automatically catch when your campaigns suddenly lose steam. The system watches your placements every day and alerts you when impressions or clicks drop significantly compared to recent performance—helping you spot delivery issues before they become major problems.

**2. Launch Detection** 🚀
Never miss when new campaigns go live. Get immediate visibility into placements that just launched, so you can monitor their initial performance and ensure they're delivering as expected.

Both features add color-coded sections directly into your daily audit emails—no extra systems to check, just enhanced information in the reports you're already receiving.

---

## Important: How Configuration Works 🔄

### The Two-Spreadsheet System

This system uses a **controlled configuration workflow** to prevent accidental tampering:

**📊 Step 1: External Helper Menu (Team Access)**
- **Your team edits here:** [CM360 Audit Configuration - Helper Menu](https://docs.google.com/spreadsheets/d/1-566gqkyZRNDeNtXWUjKDB_H8A9XbhCu8zL-uaZdGT8/edit?gid=6873511#gid=6873511)
- This is where ad ops team members add configs, set thresholds, manage exclusions
- Safe for the larger team to use—designed to minimize mistakes
- Changes here don't affect the system until synced

**⚙️ Step 2: Admin Spreadsheet (Automated Sync)**
- The admin spreadsheet receives updates from the Helper Menu via sync functions
- This is what the daily audit scripts actually read from
- Admins can manually sync: `Admin Controls → Sync FROM External Config`

**🔄 Step 3: Processing (Automatic)**
- Daily audits read configuration from the Admin spreadsheet
- Performance drop thresholds, launch detection settings, all configuration is processed here
- The system runs automatically based on these settings

### Why This Matters for You

**If you're on the ad ops team:**
- ✅ Use the [Helper Menu spreadsheet](https://docs.google.com/spreadsheets/d/1-566gqkyZRNDeNtXWUjKDB_H8A9XbhCu8zL-uaZdGT8/edit?gid=6873511#gid=6873511) to configure performance drops
- ✅ Changes are isolated until an admin syncs them
- ✅ Reduces risk of breaking production audits

**If you're an admin:**
- ✅ Review changes in Helper Menu before syncing
- ✅ Run sync when ready: `Admin Controls → Sync FROM External Config`
- ✅ Monitor sync logs for any issues

💡 **Throughout this guide, when we say "open the configuration sheet," we mean the Helper Menu spreadsheet linked above.**

---

## How Does This Work Behind the Scenes?

### Performance Drop Detection: Your Campaign's Watchdog

Think of this as having a smart assistant who:
1. **Takes daily snapshots** of every placement's performance (impressions & clicks)
2. **Remembers the last 3 days** to understand what's "normal" for each placement
3. **Compares yesterday** to that 3-day average
4. **Alerts you** only when drops exceed your threshold—not for normal day-to-day fluctuations

**Why 3 days?** It's the sweet spot—long enough to avoid false alarms from single-day blips, but short enough to catch real issues quickly.

**How the comparison builds day-by-day:**
- **Day 1** (placement start date): System saves this day's data but doesn't compare anything yet—no history exists
- **Day 2**: Compares Day 2 performance against Day 1 (using Day 1 as the baseline)
- **Day 3**: Compares Day 3 against the average of Day 1 and Day 2 (2-day average)
- **Day 4+**: Compares today against the rolling 3-day average (most recent 3 days)

This means your alerts get smarter each day as the system learns what's "normal" for each placement!

**Smart features you'll appreciate:**
- **Grace periods**: Skips the first few days of a campaign so you don't get alerts during normal ramp-up
- **Volume filters**: Ignores test placements and low-traffic items that naturally fluctuate
- **Automatic cleanup**: Old data files are removed after 7 days—no Drive clutter
- **First-time setup**: When you enable it, the system automatically backfills 4 days of history so you don't have to wait

### Launch Detection: Your New Campaign Spotter

This feature is simpler—it just watches for:
1. **Placements with recent start dates** (you choose how many days back to look)
2. **Enough volume to matter** (filters out test placements)
3. **Still in their first week** (after that, they're not "new" anymore)

**Perfect for:** Catching campaigns that launched but you didn't know about, or verifying planned launches actually went live on schedule.

---

## Your Configuration Sheet: The Control Center

**First, let's open it:**
1. Open the **[CM360 Audit Configuration - Helper Menu](https://docs.google.com/spreadsheets/d/1-566gqkyZRNDeNtXWUjKDB_H8A9XbhCu8zL-uaZdGT8/edit?gid=6873511#gid=6873511)** spreadsheet
2. Navigate to the **Performance Drop Thresholds** tab (look for it in the bottom tabs)
3. If the tab doesn't exist yet, ask an admin to create it via: `Admin Controls → Performance Drop Thresholds`

A sheet with 11 columns will be visible. Don't worry—you only need to fill in what matters to you. Here's what each column does:

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
Let's Set This Up (Follow Along!)

### Your First Setup: A 5-Minute Walkthrough

**What you'll need:**
- Your config name (the same one you see in Audit Recipients sheet)
- 5 minutes of focused time
- This guide open in another tab

---

#### **Step 1: Find Your Configuration Sheet** 📋

1. Open your CM360 Audit spreadsheet (the one you check every day)
2. Look at the **top menu bar** → find **Admin Controls**
3. Click **Admin Controls → Performance Drop Thresholds**
4. A new sheet pops up with a yellow header row and empty rows below

✅ **You should see:** Columns labeled "Config Name", "Enable Performance Drop", "Drop Percentage Threshold", etc.

---

#### **Step 2: Add Your Config Name** ✏️

1. Click on **cell A2** (first empty row under the header)
2. Type your config name **exactly** as it appears elsewhere (case matters!)
   - Examples: `LION01`, `PST01`, `NEXTSD01`
   - ⚠️ If you're not sure, check the **Audit Recipients** sheet—copy it from there

💡 **Pro tip:** If your name has a typo, the system won't find your config. When in doubt, copy-paste from Recipients sheet!

---

#### **Step 3: Set Up Performance Drop Detection** 🚨
*Skip this section if you only want launch detection*

**Follow this mini-questionnaire:**

**Question 1: Do you want performance drop alerts?**
- **YES** → Enter `TRUE` in **Column B**
- **NO** → Enter `FALSE` and skip to Step 4

**Question 2: How sensitive should alerts be?**
Choose one and enter in **Column C**:
- `30` = Very sensitive (catch small dips, more emails)
- `50` = Balanced (recommended for most campaigns)
- `70` = Less sensitive (only big problems, fewer emails)

**Question 3: What counts as "significant" volume?**
Choose one and enter in **Column D**:
- `100` = Include smaller placements (more comprehensive)
- `200` = Standard placements (recommended starting point)
- `500` = Only high-traffic placements (enterprise campaigns)

💬 **What this means:** If you choose 200, placements averaging 150 impressions per day won't trigger alerts even if they drop 100%. This filters out noise from low-volume placements.

**Question 4: Should we skip the first few days?**
Choose one and enter in **Column E**:
- `0` = Alert from Day 1 (use for time-sensitive campaigns)
- `3` = Skip first 3 days (recommended—gives campaigns time to ramp)
- `7` = Skip first week (use for slow-building campaigns)

💬 **Why this matters:** New campaigns often start slow and build up. A "grace period" prevents false alarms during normal ramp-up.

---

#### **Step 4: Set Up Launch Detection** 🚀
*Skip this section if you only want performance drops*

**Follow this mini-questionnaire:**

**Question 1: Do you want to know about new launches?**
- **YES** → Enter `TRUE` in **Column F**
- *Real-World Setup Examples (Copy These!)

Not sure what settings to use? Here are three proven configurations you can copy directly:

---

### Example 1: "I Manage Large, Stable Campaigns"
Choose one and enter in **Column G**:
- `1` = Only show placements that launched yesterday
- `3` = Show launches from last 3 days (recommended)
- `5` = Show launches from last 5 days (good for weekly reviews)

**Question 3: What's the minimum volume to care about?**
Choose one and enter in **Column H**:
- `50` = Include test placements (very comprehensive)
- `100` = Standard launches (recommended)
- `200` = Only significant launches (reduces noise)

💬 **What this means:** Placements with fewer impressions/clicks than this won't appear in launch reports—filters out tests and inactive placements.

---

#### **Step 5: Activate It!** ✅

1. In **Column I**, enter `TRUE`
2. Press **Enter**
3. Watch **Column J** auto-fill with today's date/time

🎉 **You're done with configuration!**

---

#### **Step 6: Test It (5 Minutes)** 🧪

Let's make sure it works:

1. Go back to the top menu → **Run Audit**
2. Click **→ Single Config**
3. Pick your config name from the list
4. Click **Select**

**While it runs**, watch for these log messages:
```
✅ "Loaded performance drop thresholds from sheet for 1 configs"
✅ "Running launch detection" (if you enabled it)
✅ "Saved performance cache for [date]" (if performance drops enabled)
✅ "🚩 Detected N performance drops" (if any found)
✅ "🚀 Detected N new launches" (if any found)
```

**Don't see these messages?**
- Check that Column I (Active) is `TRUE`
- Verify your config name in Column A matches exactly
- Make sure either Column B or Column F is `TRUE`

---

#### **Step 7: Wait for Your First Email** 📧

**For Performance Drops:**
- First audit run saves a snapshot but won't detect drops yet (no history to compare)
- Tomorrow's audit will have 1 day of history (limited detection)
- Day after that, you'll get full 3-day average comparisons

**For Launch Detection:**
- Works immediately—you'll see results in your next daily audit email (if any placements launched recently)

✨ **When it's working:** You'll see new colored sections in your daily emails (yellow for drops, green for launcheseet for 1 configs"`
   - `"Running launch detection"` (if enabled)
   - `"🚩 Detected N performance drops"` (if any found)
   - `"🚀 Detected N new launches"` (if any found)

---
You have:** Established campaigns with predictable traffic. You don't need every little blip—just the serious issues.

**Copy this setup:**
```
Column A: LION01              (your config name)
Column B: TRUE                (performance drops on)
Column C: 70                  (only major drops)
Column D: 500                 (high-volume placements only)
Column E: 3                   (skip 3-day ramp-up)
Column F: FALSE               (launches off)
Column G: 3                   (default)
Column H: 100                 (default)
Column I: TRUE                (active)
```

**What to expect:** 
- Quiet days when things run smoothly
- Alerts only when something is seriously wrong (70%+ drop)
- Focus on placements that really matter (500+ daily impressions/clicks)
**You have:** Critical campaigns or new client launches. You want to spot issues before they escalate.

**Copy this setup:**
```
Column A: PST01               (your config name)
Column B: TRUE                (performance drops on)
Column C: 30                  (sensitive to smaller drops)
Column D: 100                 (include most placements)
Column E: 0                   (alert from day 1)
Column F: TRUE                (launches on)
Column G: 5                   (5-day launch window)
Column H: 50                  (include smaller launches)
Column I: TRUE                (active)
```

**What to expect:**
- More frequent alerts (you'll catch issues faster)
- Visibility into smaller placements
- Immediate detection (no grace period)
- Full awareness of new launches
- More emails during campaign setup periods

💡 **Good for:** New clients, test campaigns, time-sensitive promotions, high-stakes launches
**You have:** Good monitoring elsewhere. You just need to know when campaigns go live.

**Copy this setup:**
```
Column A: NEXTSD01            (your config name)
Column B: FALSE               (performance drops off)
Column C: 50                  (not used)
Column D: 200                 (not used)
Column E: 0                   (not used)
Column F: TRUE                (launches on!)
Column G: 3                   (last 3 days)
Column H: 100                 (standard threshold)
Column I: TRUE                (active)
```

**What to expect:**
- Clean, simple launch notifications
- No performance drop alerts
- See what went live in the last 3 days
- Verify planned launches actually launched
- Catch unplanned or early launches

💡 What Your Emails Will Look Like

### When Performance Drops Are Detected

Here's what appears in your daily audit email—a **yellow-highlighted section** that stands out see. You can change settings anytime!
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

``Why you'll love this format:**
- **Yellow background** = impossible to miss
- **Side-by-side comparison** = see exactly what dropped (3-day avg → yesterday)
- **Percentage drops** = understand severity at a glance
- **Full context** = advertiser, campaign, site, placement ID all included
- **Smart display** = only shows metrics that actually dropped

💡 **Pro tip:** Forward these sections to your media buyers—they have everything needed to investigate!

---

### When New Launches Are Detected

Here's what appears—a **green-highlighted section** for positive visibility
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
🚀Why you'll love this format:**
- **Green background** = positive association (new = good!)
- **Launch timing** = see exactly when each went live
- **Current metrics** = verify they're actually delivering
- **Early awareness** = catch issues in first week when fixes are easiest
- **Planning verification** = confirm scheduled launches happened

💡 **Use case:** Client asks "Did the new campaign launch yesterday?" → Check your email, instant answer!

---

### Where These Sections Appear

Both features add sections **after** your regular audit flags, before the footer     │
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
┌─────────────────────────────────────────────────┐
│ [Your regular audit flags table]                │
│ (Threshold violations, pixel mismatches, etc.) │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ ⚠️ Performance Drops Detected (3)               │
│ [Yellow highlighted drop details]              │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 🚀 New Launches Detected (2)                    │
│ [Green highlighted launch details]             │
└─────────────────────────────────────────────────┘
                      ↓
— Platform Solutions Team
```Common Questions & Quick Fixes

### "I set it up but don't see any drops" 🤔

**Most likely reason:** You need 24 hours of history first.

**Here's what's happening:**
- Day 1 (today): System saves a snapshot but has nothing to compare against yet
- Day 2 (tomorrow): System compares against Day 1 data (limited history)
- Day 3+: Full 3-day rolling average kicks in

**Quick checks:**
1. Did you enable it today? **→** Be patient, check tomorrow's email
2. Grace Period set to 3+ days? **→** Placements in first 3 days won't be flagged
3. Min Volume too high? **→** Lower it to 100 and test
4. Drop % too high? **→** Try 50% to start
5. Config name typo? **→** Must match Recipients sheet exactly

---

### "Launch detection isn't showing anything" 🚀

**Most likely reason:** No placements launched recently within your window.

**Quick checks:**
1. Column F set to `TRUE`? **→** Must be enabled
2. Launch Window too narrow? **→** Try 5 days instead of 1
3. Launch Min Volume too high? **→** Try 50 to catch more
4. Placements older than 7 days? **→** Only works for first week
5. Check the actual placement start dates in your merged reports **→** Might be older than you think

---

### "Getting too many alerts" 📧

**Good news:** You can dial it down!

**Quick fixes:**
1. **Increase Drop %**: 50 → 70 (only severe drops)
2. **Increase Min Volume**: 200 → 500 (only major placements)
3. **Add Grace Period**: 0 → 3 days (skip ramp-up)
4. **Narrow Launch Window**: 5 → 3 days (fewer launches)

**Or exclude specific troublemakers:**
1. Go to the **[Helper Menu spreadsheet](https://docs.google.com/spreadsheets/d/1-566gqkyZRNDeNtXWUjKDB_H8A9XbhCu8zL-uaZdGT8/edit?gid=6873511#gid=6873511)**
2. Navigate to **Audit Exclusions** tab
3. Add row: `[Config Name] | [Placement ID] | performance_drop | TRUE`
4. Ask admin to sync changes
5. That placement won't trigger drop alerts anymore

---

### "System seems slow / not working" ⚙️

**Cache/backfill issues:**

**If backfill didn't auto-run:**
- Only triggers when you first enable AND have <3 cache files
- Manual trigger: Apps Script Editor → Run `performanceBackfillHistory`
- Look for log: `"Starting backfill for N configs"`

**If cache files are missing:**
- Check Drive: `Project Log Files/CM360 Daily Audits/Performance Drop Cache/YourConfig/`
- Should see files named `cache_2026-01-12.json`
- If missing, run one manual audit to create first file

---

###Pro Tips from the Ad Ops Team

### 🎯 Tip 1: Start Gentle, Adjust Based on Reality

**Week 1 setup (recommended):**
```
Drop %: 50
Min Volume: 200
Grace Period: 3
Launch Window: 3
```

**After 1-2 weeks:**
- Too many alerts? Dial up thresholds
- Missing real issues? Dial down thresholds
- You'll find your sweet spot quickly!

**Don't try to be perfect on Day 1**—it's easier to adjust after seeing actual results.

---

### 🎯 Tip 2: Different Configs = Different Needs

**Match settings to campaign reality:**

**For high-stakes launches (new clients, big budgets):**
```
Drop %: 30 (sensitive)
Min Volume: 100 (comprehensive)
Grace Period: 0 (immediate)
Launch Detection: ON (awareness++)
```

**For evergreen campaigns (been running 6+ months):**
```
Drop %: 70 (only serious issues)
Min Volume: 500 (major placements only)
Grace Period: 5 (skip slow starts)
Launch Detection: OFF (don't care about new)
```

**One size does NOT fit all!**

---

### 🎯 Tip 3: Use Exclusions for One-Off Problems

**Wrong approach:**
- Placement 12345 keeps alerting
- Turn off performance drops entirely
- Miss real issues on other placements

**Right approach:**
1. Add placement 12345 to Audit Exclusions in the [Helper Menu](https://docs.google.com/spreadsheets/d/1-566gqkyZRNDeNtXWUjKDB_H8A9XbhCu8zL-uaZdGT8/edit?gid=6873511#gid=6873511)
2. Set flag type: `performance_drop`
3. Request admin sync
4. Keep monitoring everything else
5. Remove exclusion when fixed

**Think surgical, not nuclear!**

---

### 🎯 Tip 4: Launch Detection is Your Campaign Calendar

**Cool use cases we've seen:**

✅ **Verify launch schedules**: "Campaign supposed to start Monday—did it?"
✅ **Catch early launches**: "This wasn't supposed to go live until Friday!"
✅ **Spot forgotten campaigns**: "Oh right, that test campaign from last week"
✅ **Client reporting**: "Here's what launched this week" (screenshot the green section)

**Set it to 5-7 days for weekly reviews, 1-3 days for daily monitoring.**

---

### 🎯 Tip 5: Involve Your Team (They'll Thank You)

**Share with media planners:**
- "Here's how the monitoring works"
- "Grace periods = your ramp-up isn't flagged"
- "You'll see yellow sections in emails when issues happen"

**Share with campaign managers:**
- "Green sections = launches you need to watch"
- "Yellow sections = delivery problems that need investigation"
- "Forward these sections when escalating to vendors"

**Share with analytics team:**
- "Check performance drops against external factors (holidays, news events)"
- "Help us tune thresholds based on normal variance"

**Everyone seeing the same data = faster problem resolution!**
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
System Architecture (For Reference)

### How Configuration Flows Through the System

```
┌─────────────────────────────────────────────────────────────┐
│  1. Helper Menu Spreadsheet (Team Access)                  │
│  https://docs.google.com/.../1-566gqkyZRNDeNtXWUjKDB...    │
│                                                             │
│  - Audit Recipients                                         │
│  - Audit Thresholds                                         │
│  - Audit Exclusions                                         │
│  - Performance Drop Thresholds  ← You edit here            │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Admin runs:
                       │ "Sync FROM External Config"
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Admin Spreadsheet (System Processing)                   │
│                                                             │
│  - Same sheets, synced from Helper Menu                     │
│  - Daily audits read configuration from here                │
│  - Admins can also "Sync TO External Config"                │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Daily audit runs
                       │ (triggered automatically)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  3. CM360 Audit Processing                                  │
│                                                             │
│  - Reads Performance Drop Thresholds settings               │
│  - Saves daily cache files to Drive                         │
│  - Detects drops by comparing to 3-day average              │
│  - Detects launches based on start dates                    │
│  - Adds colored sections to emails                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Where Data Lives

**Configuration:**
- **Helper Menu Spreadsheet**: ID `1-566gqkyZRNDeNtXWUjKDB_H8A9XbhCu8zL-uaZdGT8`
- **Admin Spreadsheet**: Bound to the main Apps Script project

**Performance Cache Files:**
- **Location**: `Project Log Files/CM360 Daily Audits/Performance Drop Cache/[ConfigName]/`
- **Format**: JSON files named `cache_YYYY-MM-DD.json`
- **Retention**: 7 days (auto-cleanup)
- **Size**: ~10-50KB per file depending on placement count

**Daily Reports:**
- **Temp Files**: `Project Log Files/CM360 Daily Audits/Temp Daily Reports/[ConfigName]/`
- **Merged Reports**: `Project Log Files/CM360 Daily Audits/Merged Reports/[ConfigName]/`

### Sync Frequency

**Configuration updates:**
- Manual sync: Admin runs `Sync FROM External Config` as needed
- Nightly sync: Automatic sync runs overnight (optional trigger)
- Changes take effect on next audit run after sync

**Audit runs:**
- Daily batches: Typically run early morning (e.g., 6 AM)
- Manual runs: Available via `Run Audit → Single Config` menu

**Cache cleanup:**
- Automatic: When saving new cache files
- Retention: 7 days of historical data kept
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

**Q: Can I change thresholds mid-campaign?**  
A: Yes. Changes take effect on next audit run (usually next morning).

**Q: What happens if a placement is paused?**  
A: Performance drops only check in-flight placements or placements that ended in the last 3 days.

**Q: Can I get hourly alerts instead of daily?**  
A: Not currently. The system is designed for daily batch processing aligned with CM360 data availability.

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
