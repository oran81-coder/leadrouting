# 🚀 Quick Start Guide - Lead Routing UI

## **Welcome to your modernized Lead Routing application!**

This guide will help you get started with all the new features across Manager, Admin, and Outcomes screens.

---

## 📋 **Table of Contents**

1. [Starting the Application](#starting-the-application)
2. [Manager Screen Guide](#manager-screen-guide)
3. [Admin Screen Guide](#admin-screen-guide)
4. [Outcomes Screen Guide](#outcomes-screen-guide)
5. [Dark Mode](#dark-mode)
6. [Tips & Tricks](#tips--tricks)
7. [Troubleshooting](#troubleshooting)

---

## 🏁 **Starting the Application**

### **1. Start the Backend**
```powershell
cd C:\Users\oran8\Desktop\leadrouting\lead-routing-phase1-FULL-latest-rebuilt-FIX3-smokefix\lead-routing-skeleton-node-ts
npm run dev
```
**Expected:** Server starts on `http://localhost:3000`

### **2. Start the Frontend (New Terminal)**
```powershell
cd C:\Users\oran8\Desktop\leadrouting\lead-routing-phase1-FULL-latest-rebuilt-FIX3-smokefix\lead-routing-skeleton-node-ts\frontend
npm run dev
```
**Expected:** Frontend starts on `http://localhost:5173`

### **3. Open in Browser**
Navigate to: `http://localhost:5173`

### **4. Set API Base (First Time Only)**
1. Click the gear icon (⚙️) in the top navigation
2. Enter: `http://localhost:3000`
3. Click Save

**You're ready!** 🎉

---

## 📊 **Manager Screen Guide**

### **What's New:**
- KPI Dashboard with metrics
- Bulk approve/reject
- Advanced search
- Status filters
- Proposal detail modal

### **How to Use:**

#### **View Overview**
- **Top cards** show: Total Proposals, Pending, Approved, Rejected
- Numbers update automatically when you take actions

#### **Search Proposals**
- Type in the search box to filter by:
  - Item name
  - Board name
  - Assignee name
  - Rule name

#### **Filter by Status**
- Use the dropdown to show:
  - **All** - Everything
  - **Pending** - Awaiting approval
  - **Approved** - Already approved
  - **Rejected** - Already rejected

#### **Approve/Reject Single Proposal**
- Click **Approve** (green) to approve one proposal
- Click **Reject** (red) to reject one proposal
- Click **Override** (blue) to manually assign to a different agent

#### **Bulk Actions** (POWERFUL!)
1. Check boxes next to multiple proposals
2. Or click "Select All" checkbox in header
3. Click **Approve Selected** or **Reject Selected**
4. Confirm action

**Note:** Only pending proposals can be selected

#### **View Proposal Details**
- Click the **Item ID** (blue text) in any row
- A modal opens with:
  - Full proposal information
  - Monday.com board details
  - Routing suggestion
  - Applied details (if approved)
  - Raw JSON data (expandable)
- Quick actions available in modal footer

---

## ⚙️ **Admin Screen Guide**

### **What's New:**
- Card-based layout
- Visual status indicators
- Smart column picker
- Progress tracking
- Missing fields warnings

### **How to Use:**

#### **Connect to Monday.com**
1. Enter your **Monday.com API Token**
2. (Optional) Enter custom endpoint
3. Click **Connect**
4. Wait for green "Connected ✓" badge

**Status Badge:**
- **Green ✓** = Connected
- **Red ✗** = Not connected

#### **Test Connection**
- Click **Test Connection** to verify API is working
- Shows sample data from your Monday.com workspace

#### **Configure Metrics**

##### **Progress Bar:**
- Shows % of configuration complete
- Fills up as you add required fields
- Must reach 100% to save

##### **Missing Fields Alert:**
- Yellow box shows what's still needed
- Updates in real-time
- Disappears when all fields filled

##### **Basic Configuration:**
1. **Lead Board IDs:**
   - Enter comma-separated board IDs
   - Example: `board_123,board_456`

2. **Assigned People Column:**
   - Enter column ID manually, OR
   - Click **Pick** to use smart picker

##### **Smart Column Picker:**
1. Click **Pick** button next to any field
2. Select a board from the list
3. Browse columns in that board
4. Click **Select** on the column you want
5. For status columns:
   - Select the column
   - Then select the status label
6. Done! Field is populated automatically

##### **Enable Metrics:**
- Check boxes to enable/disable metrics:
  - ☑️ Workload
  - ☑️ Conversion Rate
  - ☑️ Hot Streak
  - ☑️ Response Speed
  - ☑️ Avg Deal Size
  - ☑️ Industry Performance

**Note:** Enabling a metric may require additional fields

##### **Save Configuration:**
- **Save Configuration** (green) - Saves your settings
- **Recompute Metrics** (blue) - Recalculates all metrics
- Both disabled until configuration is 100% complete

---

## 📈 **Outcomes Screen Guide**

### **What's Already There:**
- KPI cards (Conversion Rate, Revenue, etc.)
- Bar chart of top agents
- Agents table with sorting
- Export to CSV
- Comparison mode
- Advanced charts
- Auto-refresh
- Dark mode

### **What's New in Phase 2.3:**
- **Advanced Filters**
- **Performance Insights Dashboard**

### **How to Use:**

#### **Basic Filters**
- **7 / 30 / 90 Days** - Select time window
- **Compare** - Toggle to show comparison badges
- **Show Charts** - Toggle advanced charts
- **Auto-refresh** - Enable 60-second auto-refresh
- **Export CSV** - Download data

#### **Advanced Filters (NEW!)**
1. Click **Advanced Filters** (purple button)
2. Panel expands with 3 filters:

##### **Industry Filter:**
- Dropdown to filter by industry:
  - Technology
  - Finance
  - Healthcare
  - Retail
  - Real Estate
  - All Industries (default)

##### **Revenue Range:**
- **Min Revenue:** Enter minimum revenue (e.g., 10000)
- **Max Revenue:** Enter maximum revenue (e.g., 50000)
- Filters agents whose revenue falls in this range

##### **Clear Filters:**
- Click **Clear All Filters** to reset

**All filters work together!** Try combining them:
- Example: "Technology agents with $10k-$50k revenue"

#### **Performance Insights (NEW!)**
Scroll to the bottom to see **4 insight cards**:

1. **🏆 Top Performer** (Green)
   - Agent with highest conversion rate
   - Great for recognition!

2. **💰 Top Revenue** (Blue)
   - Agent who brought in most money
   - Perfect for commissions

3. **⚡ Fastest Closer** (Purple)
   - Agent with quickest close time
   - Learn from their tactics

4. **🔥 Most Active** (Orange)
   - Agent handling most deals
   - Check if they're overloaded

**These update automatically** based on your filters!

#### **Agents Table**
- **Search:** Type agent name to filter
- **Sort:** Click column headers
- **View Details:** Click agent name
- **Pagination:** Use arrows to navigate pages

---

## 🌙 **Dark Mode**

### **How to Toggle:**
1. Look for the **moon/sun icon** in the top navigation (right side)
2. Click it to switch between light and dark mode
3. Your preference is saved automatically

### **Works Everywhere:**
- ✅ Outcomes screen
- ✅ Manager screen
- ✅ Admin screen
- ✅ All modals
- ✅ All components

**Smooth transitions everywhere!**

---

## 💡 **Tips & Tricks**

### **Manager Screen:**
- **Keyboard shortcut idea:** Select first proposal, then use Tab to navigate and Space to check/uncheck
- **Bulk workflows:** Filter to "Pending", select all, bulk approve - done in seconds!
- **Quick review:** Click item ID to open modal, review details, approve/reject from modal
- **Search tip:** Search for agent name to see all proposals for that agent

### **Admin Screen:**
- **Save configs often:** Don't lose your work!
- **Test after changes:** Use Test Connection after changing endpoint
- **Recompute regularly:** Run Recompute Metrics weekly to keep data fresh
- **Explore columns:** Use the smart picker to explore your Monday.com structure

### **Outcomes Screen:**
- **Comparison mode:** Great for weekly reviews - see what changed
- **Auto-refresh:** Perfect for dashboards on big screens
- **Advanced filters:** Combine filters for deep analysis
  - Example: "Show me Healthcare agents with $20k+ revenue in last 30 days"
- **Performance insights:** Use to identify trends and opportunities
- **Export CSV:** Pull data into Excel for custom analysis

---

## 🔧 **Troubleshooting**

### **"Failed to fetch" error:**
1. Check backend is running (`localhost:3000`)
2. Check API Base is set correctly (⚙️ icon)
3. Open browser console (F12) for more details

### **"Not connected" in Admin:**
1. Get your Monday.com API token:
   - Go to Monday.com
   - Profile → Admin → API
   - Generate token
2. Copy and paste into Admin screen
3. Click Connect

### **No data showing:**
1. Check if backend has demo data:
   ```powershell
   cd C:\Users\oran8\Desktop\leadrouting\lead-routing-phase1-FULL-latest-rebuilt-FIX3-smokefix\lead-routing-skeleton-node-ts
   npx tsx tools/seed-demo-data.ts
   ```
2. Refresh page

### **Dark mode not working:**
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check console for errors

### **Bulk actions not working:**
1. Make sure proposals are "Pending" status
2. Only pending proposals can be selected
3. Check if any are selected (count shows in buttons)

### **Column picker not loading:**
1. Verify Monday.com connection
2. Check API token is valid
3. Test connection first

---

## 📊 **Quick Reference**

### **Color Meanings:**
- **Blue** = Primary actions, info
- **Green** = Success, approve, positive
- **Red** = Danger, reject, negative
- **Yellow** = Warning, pending
- **Purple** = Advanced features
- **Orange** = Activity, hot items

### **Badge Colors:**
- **Green badge** = Approved / Connected / Success
- **Yellow badge** = Pending / In Progress
- **Red badge** = Rejected / Error / Failed
- **Blue badge** = Info / Override

### **Button States:**
- **Solid color** = Active, ready to click
- **Bordered** = Secondary action
- **Faded (50% opacity)** = Disabled
- **Hover effect** = Clickable, shows darker shade

---

## 🎯 **Common Workflows**

### **Morning Routine - Manager:**
1. Open Manager screen
2. Check pending count in KPI cards
3. Filter to "Pending"
4. Review each proposal:
   - Click Item ID to see details
   - Approve or Reject
5. Or bulk approve all if they look good!

### **Weekly Review - Outcomes:**
1. Set to 7 days
2. Enable Comparison mode
3. Check Performance Insights
4. Identify top performers
5. Note anyone who needs help
6. Export CSV for records

### **Monthly Setup - Admin:**
1. Review metrics configuration
2. Update Lead Board IDs if changed
3. Test Monday.com connection
4. Recompute Metrics
5. Verify all metrics enabled

---

## 🆘 **Need Help?**

### **Check These First:**
1. This guide
2. `PHASE_2_FULL_ENHANCEMENT_SUMMARY.md` (detailed technical docs)
3. Browser console (F12) for errors
4. Network tab to see API calls

### **Common Solutions:**
- **Restart backend** if API not responding
- **Restart frontend** if UI acting weird
- **Clear browser cache** if styles broken
- **Re-seed demo data** if no data showing

---

## 🎉 **You're All Set!**

You now have a **world-class Lead Routing application** with:
- ✅ Modern, professional design
- ✅ Advanced features
- ✅ Complete dark mode
- ✅ Responsive layout
- ✅ Great user experience

**Enjoy using your new UI!** 🚀

---

**Document Version:** 1.0  
**Last Updated:** December 23, 2025  
**For:** Lead Routing Application Users

**Questions?** Refer to the detailed documentation or check the browser console!

