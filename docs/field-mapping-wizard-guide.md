# Field Mapping Wizard - User Guide (Phase 2)

## Overview

The Field Mapping Wizard is a multi-step UI component that enables administrators to map internal system fields to Monday.com board columns. **Phase 2 introduces a Single Board Architecture**: all leads are managed in one primary board, simplifying configuration and improving performance.

## What's New in Phase 2

- **Single Board Architecture**: Select one primary board for all leads
- **Smart Automation**:
  - **Availability**: Auto-calculated based on agent workload
  - **Close Date**: Auto-resolved from status changes or dedicated column
  - **Agent Domain**: Auto-learned from historical performance by Industry
- **Status Configuration**: Define which statuses indicate "in treatment" and "closed won"
- **Daily Lead Threshold**: Admin can set max leads per agent per day (affects availability)
- **Simplified Mapping**: No need to select board for each field separately

## Features

- **5-Step Wizard**: Select Board → Review Fields → Map Columns → Configure Statuses → Preview & Save
- **Visual Field Indicators**: Auto/Manual indicators show which fields require mapping
- **Status Configuration UI**: Multi-select dropdowns for status values
- **Real-time Validation**: Ensures all required manual fields are mapped
- **Preview**: Test mappings with sample data before saving
- **Dark Mode Support**: Full support for dark/light themes

## How to Access

1. Start the application: `http://localhost:5173/`
2. Click on the **Field Mapping** button in the top navigation
3. Or press keyboard shortcut: **4**

## Step-by-Step Guide

### Step 1: Select Primary Board

- **Purpose**: Choose the single Monday.com board that contains all your leads
- **What Happens**: All internal fields will map to columns in this board
- **Action**:
  1. Select your leads board from the dropdown
  2. System displays board info (name, column count)
  3. Click **Next: Review Fields** to proceed

### Step 2: Review Internal Fields

- **Purpose**: Understand which fields need manual mapping vs. auto-computed
- **Field Groups**:
  - **Lead Fields**: Lead Source, Industry, Deal Size, Created At
  - **Agent Fields**: Availability (auto), Agent Domain (auto-learned)
  - **Deal Fields**: Deal Status, Close Date (auto), Deal Amount
- **Indicators**:
  - 🤖 **Auto** = Computed by system (no mapping needed)
  - 📝 **Manual** = Requires mapping to Monday column
  - ✅ Required | ⭕ Optional
- **Changes from Phase 1**:
  - **Availability**: Now auto-calculated from workload
  - **Agent Domain**: Now auto-learned from historical Industry performance (tracks which agents excel in which domains)
  - **Close Date**: Auto-resolved from status or dedicated column
  - **Workload**: Manually set per agent in Outcomes screen (not mapped here)
- **Action**: Click **Next: Map Columns** to proceed

### Step 3: Map to Monday.com Columns

- **Purpose**: Link each manual field to a specific column in your primary board
- **Process**:
  1. For each **manual** field, select a **Column** from the dropdown
  2. Columns are auto-filtered for your primary board
  3. Column type is displayed for reference (status, text, number, date)
- **Field-Specific Behaviors**:
  - **Lead Source**: Campaign/source identifier (can change frequently)
  - **Industry**: System uses for intelligent agent matching
  - **Deal Size/Amount**: System extracts numeric values automatically
  - **Created At**: Auto-detected from Monday item creation time
  - **Deal Status**: Select column + configure specific status values in Step 4
  - **Close Date**: Optional mapping; if not mapped, derived from Deal Status change
- **Writeback Configuration** (Required):
  - **Assigned Agent Column**: People column where routing results will be written
- **Validation**:
  - All required manual fields must be mapped
  - Writeback target must be configured
  - Invalid mappings are highlighted with error messages
- **Action**: Click **Next: Configure Statuses** to proceed (button is disabled until all required fields are mapped)

### Step 4: Configure Statuses (New in Phase 2)

- **Purpose**: Define status values for smart automation
- **Configuration Options**:
  
  1. **In Treatment Statuses** (Required):
     - Select all statuses that indicate a lead is actively being worked on
     - Examples: "Relevant", "In Treatment", "No Answer", "Follow-up"
     - Used by system to calculate agent availability
     - Agents with many leads in these statuses become "less available"
  
  2. **Closed Won Status** (Required):
     - Select the status value that indicates a successful sale
     - Example: "Sale Completed", "Closed Won", "Deal Made"
     - Used to auto-detect close date if no dedicated column is mapped
  
- **Multi-Select Interface**:
  - Select/deselect multiple statuses
  - Visual chips show selected values
  - Can clear all selections and start over
  
- **Action**: Click **Next: Preview** to proceed

### Step 5: Preview & Save Configuration

- **Purpose**: Validate mappings and test with sample data
- **Validation Summary**:
  - ✅ All required fields mapped (green banner)
  - ⚠️ Issues found (red banner with error list)
- **Configuration Preview**:
  - **Primary Board**: Display board name and column count
  - **Mapped Fields**: List all manual fields with their target columns
  - **Auto-Computed Fields**: List fields that don't need mapping
  - **Status Configuration**: Show selected in-treatment and closed-won statuses
  - **Writeback Targets**: Display where routing results will be written
- **Test with Sample Data** (Coming Soon):
  - Click **🔍 Test with Sample Data** button
  - System fetches sample data from Monday.com
  - Normalizes the data using your mappings
  - Displays results with any errors
- **Action**: Click **💾 Save Configuration** to persist the mapping

## Configuration Persistence

- **Storage**: Mapping configuration is saved to the database (`FieldMappingConfigVersion` table)
- **Versioning**: Each save creates a new version (v1, v2, etc.)
- **Retrieval**: Next time you open the wizard, your previous configuration is loaded
- **Migration**: Phase 1 configs are automatically migrated to Phase 2 format

## Mock Mode (Development)

The system supports a **Mock Mode** for development without a real Monday.com connection:

- **Enable**: Set `MONDAY_USE_MOCK=true` in `.env`
- **Mock Data**: Pre-defined boards, columns, items, and users
- **Boards Available**:
  - `Leads Board` (board_1): Name, Email, Phone, Assigned To, Lead Status, Country, Budget, Industry, Created Date
  - `Deals Board` (board_2): Deal Name, Owner, Deal Stage, Deal Amount, Close Date

## Routing Settings (Admin Screen)

In addition to field mapping, configure routing behavior in the Admin screen:

### Daily Lead Threshold

- **Location**: Admin > Routing Settings > Daily Lead Threshold per Agent
- **Purpose**: Set maximum leads an agent can receive in one day
- **Default**: 20 leads/day
- **Impact**:
  - Agents exceeding threshold become "less available"
  - Affects automatic routing decisions
  - Works with status configuration to calculate real-time availability

### How Availability Works (Phase 2)

1. **Automatic Calculation**: System counts leads in "in treatment" statuses per agent
2. **Daily Quota**: Compares today's assignments to daily threshold
3. **Availability Score**: Computed as 0-100 (higher = more available)
4. **Routing Impact**: Low-availability agents receive fewer new leads

### How Agent Domain Learning Works (Phase 2)

**Agent Domain** is one of the most critical modules in the system. It automatically learns which agents excel in which industries (domains) based on historical performance.

#### What It Tracks

For each agent, the system analyzes:
- **Industries handled**: Which industries has this agent worked with?
- **Conversion rates**: What % of leads did they convert in each industry?
- **Deal volume**: How many deals have they closed per industry?
- **Deal sizes**: What's the average deal value per industry?

#### Expertise Score Calculation

The system calculates an **Expertise Score (0-100)** for each agent-industry pair:

- **60% Conversion Rate**: Can they close deals in this domain?
- **25% Volume**: Do they have enough experience?
- **15% Deal Size**: Do they close high-value deals?

**Confidence Levels:**
- 🔴 **Low** (< 10 leads): Not enough data
- 🟡 **Medium** (10-30 leads): Moderate confidence
- 🟢 **High** (30+ leads): Strong confidence

#### Example

**Agent: Sarah**
- **SaaS Industry**: 85/100 expertise (40 leads, 65% conversion, $75k avg)
- **Retail Industry**: 52/100 expertise (15 leads, 40% conversion, $30k avg)
- **Finance Industry**: Too few leads (only 3) - not tracked

**Routing Decision**: New SaaS lead → Sarah is prioritized (high expertise)

#### Why It Matters

1. **Better Matches**: Leads go to agents with proven success in that domain
2. **Higher Conversion**: Right agent = better results
3. **Dynamic Learning**: As agents gain experience, their profile evolves
4. **Transparent**: You can see exactly why the system chose an agent

#### Viewing Agent Domains

Agent domain profiles will be visible in:
- **Outcomes Screen**: See each agent's top 3 domains
- **Agent Details**: Full domain breakdown with scores
- **Routing Proposals**: See domain expertise as a routing factor

## Technical Details

### API Endpoints

- `GET /mapping`: Retrieve current mapping configuration
- `POST /mapping`: Save new mapping configuration
- `GET /monday/boards`: List all Monday.com boards with columns
- `GET /monday/boards/:boardId/columns`: List columns for a specific board
- `GET /monday/boards/:boardId/status/:columnId/labels`: List status labels for a status column
- `POST /mapping/preview`: Test mapping with sample data (coming soon)

### Data Structure (Phase 2)

```typescript
interface FieldMappingConfig {
  version: number;
  updatedAt: string;
  primaryBoardId: string; // NEW: Single board for all fields
  mappings: Record<string, ColumnRef>; // Simplified: no boardId per mapping
  fields: InternalFieldDefinition[];
  statusConfig: StatusConfig; // NEW: Status automation config
  writebackTargets: WritebackTargets;
}

interface ColumnRef {
  columnId: string;
  columnType?: string;
  // boardId removed: all columns from primaryBoardId
}

interface StatusConfig {
  inTreatmentStatuses: string[]; // e.g., ["Relevant", "In Treatment"]
  closedWonStatus: string; // e.g., "Sale Completed"
}

interface InternalFieldDefinition {
  id: string;
  label: string;
  type: "text" | "number" | "status" | "date" | "boolean" | "computed"; // NEW: computed
  required: boolean;
  isCore: boolean;
  isEnabled: boolean;
  description?: string;
  group?: string;
}
```

### Components

- `FieldMappingWizard.tsx`: Main 5-step wizard component
- `MultiSelectDropdown.tsx`: Multi-select UI for status configuration (NEW)
- Integrated with global `useToast` and `useTheme` hooks

### Backend Services

- `availability.calculator.ts`: Auto-calculate agent availability (NEW)
- `closeDate.resolver.ts`: Smart close date detection (NEW)
- `agentDomain.learner.ts`: Agent domain expertise learning engine (NEW - Critical Module)
- `mapping.validation.ts`: Validate Phase 2 config format
- `migrate-configs.ts`: Migrate Phase 1 → Phase 2 configs

## Keyboard Shortcuts

- **4**: Navigate to Field Mapping screen
- **1**: Navigate to Admin screen
- **2**: Navigate to Manager screen
- **3**: Navigate to Outcomes screen

## Troubleshooting

### "No Monday.com Boards Found"

- **Cause**: Monday.com is not connected or Mock mode is disabled
- **Solution**:
  - Go to Admin screen and connect Monday.com
  - OR enable Mock mode: `MONDAY_USE_MOCK=true` in `.env`

### "Primary Board ID must be set" error

- **Cause**: No primary board selected in Step 1
- **Solution**: Go back to Step 1 and select a board

### "At least one 'in treatment' status must be configured" error

- **Cause**: No statuses selected in Step 4 for "In Treatment"
- **Solution**: Go to Step 4 and select at least one status

### "Required field is unmapped" error

- **Cause**: A required manual field is not mapped to a Monday.com column
- **Solution**: Go to Step 3 and map the missing field

### "Writeback target for 'Assigned Agent' must be configured" error

- **Cause**: No writeback target specified for routing results
- **Solution**: In Step 3, scroll to "Writeback Configuration" and select a People column

### Migrating from Phase 1

- **Automatic Migration**: Old configs are detected and migrated on load
- **Manual Migration**: Run `npx tsx packages/modules/field-mapping/src/scripts/migrate-configs.ts`
- **What Changes**:
  - Extracts `primaryBoardId` from existing mappings
  - Removes `boardId` from each mapping
  - Adds default `statusConfig`
  - Removes deprecated field: `workload` only (agent_domain stays as computed)
  - Updates field types: `availability` and `agent_domain` → `computed`

## Next Steps

After successfully saving the mapping configuration:

1. **Admin Screen**: Configure daily lead threshold and metrics
2. **Manager Screen**: Review and approve routing proposals
3. **Outcomes Screen**: Monitor agent performance and set manual workload overrides
4. **Rule Engine** (Future): Define custom routing rules

## Related Documentation

- [Phase 2 Development Plan](../docs/field-mapping-phase2-plan.md)
- [Internal Schema](../packages/core/src/schema/internalSchema.ts)
- [Field Mapping Types](../packages/modules/field-mapping/src/contracts/mapping.types.ts)
- [Monday Integration](../packages/modules/monday-integration/)
