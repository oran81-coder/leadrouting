# Phase 1.7 - Outcomes Screen UI Manual Test Guide

## Overview

This document provides step-by-step instructions for manually testing the Outcomes Screen UI implementation.

## Prerequisites

- API server running on `http://localhost:3001`
- Frontend dev server configured
- Valid Monday.com connection configured
- Metrics configuration complete (leadBoardIds, assignedPeopleColumnId, etc.)
- At least some historical lead data available

## Test Environment Setup

### 1. Start API Server

```powershell
cd lead-routing-phase1-FULL-latest-rebuilt-FIX3-smokefix\lead-routing-skeleton-node-ts
npm run dev
```

Expected: Server starts on port 3001 without errors

### 2. Start Frontend Dev Server

```powershell
cd lead-routing-phase1-FULL-latest-rebuilt-FIX3-smokefix\lead-routing-skeleton-node-ts\frontend
npm run dev
```

Expected: Vite dev server starts (typically on `http://localhost:5173`)

### 3. Open Browser

Navigate to `http://localhost:5173` (or the port shown by Vite)

---

## Test Cases

### TC1: Navigation to Outcomes Screen

**Steps:**
1. Open the application
2. Verify you see three navigation buttons: "Admin", "Manager", "Outcomes"
3. Click the "Outcomes" button

**Expected Results:**
- ✅ "Outcomes" button becomes disabled (indicating active state)
- ✅ Outcomes Dashboard header is visible
- ✅ Three window filter buttons appear (7 Days, 30 Days, 90 Days)
- ✅ 30 Days button is selected by default (blue background)
- ✅ Refresh button is visible

---

### TC2: Initial Data Load

**Steps:**
1. Navigate to Outcomes screen (as in TC1)
2. Observe the loading state

**Expected Results:**
- ✅ Loading spinner appears briefly
- ✅ "Loading..." text displays near the Refresh button
- ✅ After loading completes, four KPI cards appear:
  - Conversion Rate (with percentage)
  - Revenue (with dollar amount or "N/A" badge)
  - Avg Deal (with dollar amount or "N/A" badge)
  - Median Time to Close (with days or "—")
- ✅ "Top 5 Performers by Conversion Rate" chart appears below KPI cards
- ✅ No console errors in browser DevTools

---

### TC3: KPI Cards Display

**Steps:**
1. Navigate to Outcomes screen with 30-day window
2. Examine each KPI card

**Expected Results:**

**Conversion Rate Card:**
- ✅ Green checkmark icon
- ✅ Percentage value (e.g., "25.5%")
- ✅ Subtext showing "X won / Y assigned"

**Revenue Card:**
- ✅ Blue dollar sign icon
- ✅ Dollar amount (e.g., "$125,000") OR "N/A" badge if dealAmountColumnId not configured
- ✅ Subtext: "Total revenue" or "Configure Deal Amount column"

**Avg Deal Card:**
- ✅ Purple chart icon
- ✅ Dollar amount (e.g., "$5,200") OR "N/A" badge if dealAmountColumnId not configured
- ✅ Subtext: "Average deal size" or "Configure Deal Amount column"

**Median Time to Close Card:**
- ✅ Orange clock icon
- ✅ Number with "days" label (e.g., "14 days") OR "—" if no closed deals
- ✅ Subtext: "Median days" or "No closed deals yet"

---

### TC4: Window Filter Switching

**Steps:**
1. Navigate to Outcomes screen (defaults to 30 days)
2. Click "7 Days" button
3. Wait for data to reload
4. Click "90 Days" button
5. Wait for data to reload
6. Click "30 Days" button

**Expected Results:**
- ✅ Each button click triggers loading state
- ✅ Selected button has blue background
- ✅ Non-selected buttons have white background with gray border
- ✅ KPI values update after each window change
- ✅ Chart updates to show different agent rankings
- ✅ Buttons are disabled during loading (opacity 50%)

---

### TC5: Top Performers Chart

**Steps:**
1. Navigate to Outcomes screen with 30-day window
2. Examine the "Top 5 Performers" bar chart

**Expected Results:**
- ✅ Chart displays up to 5 agents sorted by conversion rate (highest first)
- ✅ Each agent row shows:
  - Rank number (1-5) in blue circle
  - Agent name
  - "X/Y deals" text
  - Conversion rate percentage (e.g., "33.3%")
- ✅ Horizontal bar width corresponds to conversion rate
- ✅ Color coding:
  - 1st place: Green bar
  - 2nd place: Blue bar
  - 3rd place: Purple bar
  - 4th-5th: Gray bars
- ✅ If no agents exist, shows "No agent data available"

---

### TC6: Manual Refresh

**Steps:**
1. Navigate to Outcomes screen
2. Click the "Refresh" button

**Expected Results:**
- ✅ Loading spinner appears
- ✅ Button text changes to "Refreshing..."
- ✅ Button is disabled during refresh
- ✅ Data reloads successfully
- ✅ KPI cards and chart update

---

### TC7: Error Handling - API Server Down

**Steps:**
1. Navigate to Outcomes screen
2. Stop the API server (Ctrl+C in terminal)
3. Click "Refresh" button

**Expected Results:**
- ✅ Red error box appears at top of screen
- ✅ Error icon (red X in circle) is visible
- ✅ Error message displays: "Error loading data"
- ✅ Technical error details shown (e.g., "HTTP 500" or "fetch failed")
- ✅ KPI cards and chart remain from previous successful load (or empty state if first load)

---

### TC8: Error Handling - Invalid API Key

**Steps:**
1. In the top navigation, change "API Key" to an invalid value
2. Click "Save"
3. Navigate to Outcomes screen

**Expected Results:**
- ✅ Error box appears with appropriate error message
- ✅ No KPI cards or chart displayed
- ✅ Error is user-friendly (mentions authentication or permissions)

---

### TC9: Empty State - No Data

**Steps:**
1. Configure metrics for a board with no leads or no closed deals
2. Navigate to Outcomes screen

**Expected Results:**
- ✅ KPI cards still render
- ✅ Conversion Rate shows "0.0%" with "0 won / 0 assigned"
- ✅ Revenue and Avg Deal show "N/A" badges (if not configured) or "$0"
- ✅ Median Time to Close shows "—" with "No closed deals yet"
- ✅ Chart shows "No agent data available"

---

### TC10: Responsive Design - Desktop

**Steps:**
1. Open Outcomes screen in a desktop browser (1920x1080)

**Expected Results:**
- ✅ KPI cards display in 4 columns (grid-cols-4)
- ✅ Cards have consistent width and spacing
- ✅ Chart is full width below cards
- ✅ All text is readable without wrapping unnecessarily

---

### TC11: Responsive Design - Tablet

**Steps:**
1. Open Outcomes screen and resize browser to tablet width (~768px)
2. Or use Chrome DevTools Device Toolbar

**Expected Results:**
- ✅ KPI cards display in 2 columns (grid-cols-2)
- ✅ Cards stack properly without overlap
- ✅ Chart remains full width and readable
- ✅ Filter buttons wrap to multiple rows if needed

---

### TC12: Responsive Design - Mobile

**Steps:**
1. Open Outcomes screen and resize browser to mobile width (~375px)
2. Or use Chrome DevTools Device Toolbar (iPhone 12)

**Expected Results:**
- ✅ KPI cards display in 1 column (grid-cols-1)
- ✅ Cards stack vertically
- ✅ Chart bars remain horizontal and readable
- ✅ Filter buttons stack or wrap appropriately
- ✅ No horizontal scrolling required

---

### TC13: Backward Compatibility - Admin Tab

**Steps:**
1. Navigate to Outcomes screen
2. Click "Admin" button
3. Verify all Admin functionality works

**Expected Results:**
- ✅ Admin tab displays as before
- ✅ Monday connection UI unchanged
- ✅ Metrics setup wizard unchanged
- ✅ No style regressions (inline styles preserved)
- ✅ No console errors

---

### TC14: Backward Compatibility - Manager Tab

**Steps:**
1. Navigate to Outcomes screen
2. Click "Manager" button
3. Verify all Manager functionality works

**Expected Results:**
- ✅ Manager approvals UI displays as before
- ✅ Proposal list loads correctly
- ✅ Approve/Reject/Override actions work
- ✅ No style regressions
- ✅ No console errors

---

### TC15: Performance - Initial Load Time

**Steps:**
1. Open Chrome DevTools Network tab
2. Navigate to Outcomes screen
3. Measure time from clicking "Outcomes" to full render

**Expected Results:**
- ✅ Initial load completes in < 500ms (with cached API)
- ✅ `/outcomes/summary?windowDays=30` API call completes quickly
- ✅ No unnecessary re-renders

---

### TC16: Performance - Window Switch Time

**Steps:**
1. Navigate to Outcomes screen (30 days)
2. Open Chrome DevTools Performance tab
3. Click "7 Days" button and measure render time

**Expected Results:**
- ✅ Window switch completes in < 200ms
- ✅ Only one API call is made
- ✅ Smooth transition without flicker

---

### TC17: Tailwind CSS Styling

**Steps:**
1. Navigate to Outcomes screen
2. Inspect elements in Chrome DevTools

**Expected Results:**
- ✅ KPI cards use Tailwind classes (e.g., `bg-white`, `rounded-lg`, `shadow-md`)
- ✅ Hover effects work (cards show `hover:shadow-lg`)
- ✅ Button states use Tailwind (disabled opacity, color transitions)
- ✅ No inline styles in OutcomesScreen component (Tailwind only)
- ✅ Typography uses Tailwind text sizes and weights

---

### TC18: Accessibility - Keyboard Navigation

**Steps:**
1. Navigate to Outcomes screen
2. Use Tab key to navigate through interactive elements
3. Use Enter/Space to activate buttons

**Expected Results:**
- ✅ All buttons are keyboard accessible
- ✅ Focus indicators are visible
- ✅ Tab order is logical (filters → refresh → chart)
- ✅ Disabled buttons skip focus

---

### TC19: Browser Compatibility

**Test in multiple browsers:**
- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (if available)

**Expected Results:**
- ✅ UI renders correctly in all browsers
- ✅ Tailwind styles apply consistently
- ✅ API calls work in all browsers
- ✅ No browser-specific console errors

---

### TC20: Integration - Multiple Window Switches

**Steps:**
1. Navigate to Outcomes screen
2. Rapidly click between window filters: 7 → 30 → 90 → 7 → 30
3. Observe behavior

**Expected Results:**
- ✅ No race conditions (data matches selected window)
- ✅ Loading states handle concurrent requests gracefully
- ✅ Final displayed data is correct for last selected window
- ✅ No stale data displayed

---

## Test Data Scenarios

### Scenario A: Fresh Installation (No Data)
- Expected: All KPIs show zero or N/A, chart is empty

### Scenario B: Partial Data (Some Leads, No Closed Deals)
- Expected: Conversion Rate 0%, Revenue/Avg Deal N/A or $0, Time to Close "—"

### Scenario C: Full Data (Leads + Closed Deals)
- Expected: All KPIs populated with real numbers, chart shows ranked agents

### Scenario D: No dealAmountColumnId Configured
- Expected: Revenue and Avg Deal show "N/A" badge, other KPIs work

### Scenario E: Single Agent
- Expected: Chart shows one agent, ranked #1 with full bar width

---

## Debugging Tips

### If Outcomes Screen is Blank:
1. Check browser console for errors
2. Verify API server is running (`http://localhost:3001`)
3. Test API manually: `GET http://localhost:3001/outcomes/summary?windowDays=30`
4. Verify metrics config is complete (Admin tab)

### If "N/A" Badges Appear for Revenue:
1. Go to Admin tab
2. Check that "Deal Amount Column ID" is configured
3. Enable "Avg Deal" metric if disabled
4. Click "Recalculate now"

### If Chart Shows "No agent data available":
1. Verify leads are assigned to agents (check assignedPeopleColumnId)
2. Verify agents have Monday.com user IDs cached
3. Check API response: `/outcomes/summary` should have `perAgent` array

---

## Success Criteria

Phase 1.7 is **COMPLETE** when:
- ✅ All 20 test cases pass
- ✅ No console errors in normal operation
- ✅ Responsive design works on mobile/tablet/desktop
- ✅ Backward compatibility confirmed (Admin/Manager tabs unchanged)
- ✅ Performance targets met (<500ms initial load, <200ms window switch)
- ✅ Error handling is graceful and user-friendly

---

## Known Limitations (Phase 1)

- No per-agent drill-down (planned for Phase 2)
- No export to CSV (planned for Phase 2)
- No auto-refresh (manual only)
- No dark mode
- No custom date range picker (7/30/90 only)
- Mode filter accepted but not used (backend limitation)

---

## Reporting Issues

If any test case fails, document:
1. Test case number (e.g., TC7)
2. Steps to reproduce
3. Expected vs. actual result
4. Browser/OS version
5. Console errors (if any)
6. Screenshot (if visual issue)

---

**Test Date:** _______________  
**Tester Name:** _______________  
**Browser/OS:** _______________  
**All Tests Passed:** ☐ Yes  ☐ No (see notes)  

**Notes:**

