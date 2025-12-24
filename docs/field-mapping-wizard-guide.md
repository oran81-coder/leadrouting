# Field Mapping Wizard - User Guide

## Overview

The Field Mapping Wizard is a multi-step UI component that enables administrators to map internal system fields to Monday.com board columns. This is a critical prerequisite for the routing system to function correctly.

## Features

- **Multi-Step Wizard**: Clean 3-step flow (Select Fields → Map Columns → Preview & Save)
- **Visual Field Selection**: Browse internal fields grouped by entity type (Lead, Agent, Deal)
- **Required/Optional Indicators**: Clear visual indicators for required vs. optional fields
- **Board/Column Picker**: Select Monday.com boards and columns from dropdown menus
- **Writeback Configuration**: Specify where routing results should be written back to Monday.com
- **Validation**: Real-time validation ensures all required fields are mapped
- **Preview**: Test mappings with sample data before saving
- **Dark Mode Support**: Full support for dark/light themes

## How to Access

1. Start the application: `http://localhost:5173/`
2. Click on the **Field Mapping** button in the top navigation
3. Or press keyboard shortcut: **4**

## Step-by-Step Guide

### Step 1: Select Internal Fields

- **Purpose**: Review the internal fields that need to be mapped
- **Fields Displayed**:
  - **Lead Fields**: Lead Source, Industry, Deal Size, Created At
  - **Agent Fields**: Domain, Availability, Workload
  - **Deal Fields**: Deal Status, Close Date, Deal Amount
- **Indicators**:
  - ✅ = Required field (must be mapped)
  - ⭕ = Optional field (can be skipped)
- **Action**: Click **Next: Map Columns** to proceed

### Step 2: Map to Monday.com Columns

- **Purpose**: Link each internal field to a specific Monday.com board column
- **Process**:
  1. For each internal field, select a **Board** from the dropdown
  2. After selecting a board, select a **Column** from that board
  3. The column type is displayed for reference (e.g., status, text, number, date)
- **Writeback Configuration** (Required):
  - **Assigned Agent Column**: Specify the People column where routing results will be written
- **Validation**:
  - All required fields must be mapped
  - Writeback target must be configured
  - Invalid mappings are highlighted with error messages
- **Action**: Click **Next: Preview** to proceed (button is disabled until all required fields are mapped)

### Step 3: Preview & Save Configuration

- **Purpose**: Validate mappings and test with sample data
- **Validation Summary**:
  - ✅ All required fields mapped (green banner)
  - ⚠️ Issues found (red banner with error list)
- **Test with Sample Data**:
  - Click **🔍 Test with Sample Data** button
  - System fetches sample data from Monday.com
  - Normalizes the data using your mappings
  - Displays results:
    - Number of samples read
    - Number of records normalized successfully
    - List of errors (if any)
- **Action**: Click **💾 Save Configuration** to persist the mapping

## Configuration Persistence

- **Storage**: Mapping configuration is saved to the database
- **Versioning**: Each save creates a new version (v1, v2, etc.)
- **Retrieval**: Next time you open the wizard, your previous configuration is loaded

## Mock Mode (Development)

The system supports a **Mock Mode** for development without a real Monday.com connection:

- **Enable**: Set `MONDAY_USE_MOCK=true` in `.env`
- **Mock Data**: Pre-defined boards, columns, items, and users
- **Boards Available**:
  - `Leads Board` (board_123): Name, Assigned To, Status, Country, Budget, Industry
  - `Deals Board` (board_456): Deal Name, Owner, Stage, Deal Amount

## Technical Details

### API Endpoints

- `GET /mapping`: Retrieve current mapping configuration
- `POST /mapping`: Save new mapping configuration
- `GET /monday/boards`: List all Monday.com boards with columns
- `POST /mapping/preview`: Test mapping with sample data

### Data Structure

```typescript
interface FieldMappingConfig {
  version: number;
  updatedAt: string;
  mappings: Record<string, BoardColumnRef>;
  fields: InternalFieldDefinition[];
  writebackTargets: WritebackTargets;
}

interface BoardColumnRef {
  boardId: string;
  columnId: string;
  columnType?: string;
}

interface WritebackTargets {
  assignedAgent: BoardColumnRef; // Required
  routingStatus?: BoardColumnRef; // Optional
  routingReason?: BoardColumnRef; // Optional
}
```

### Components

- `FieldMappingWizard.tsx`: Main wizard component
- `FieldMappingRow`: Reusable row component for board/column selection
- Integrated with global `useToast` and `useTheme` hooks

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

### "Required field must be mapped" error

- **Cause**: A required internal field is not mapped to a Monday.com column
- **Solution**: Go back to Step 2 and map the missing field

### "Writeback target for 'Assigned Agent' must be configured" error

- **Cause**: No writeback target specified for routing results
- **Solution**: In Step 2, scroll to "Writeback Configuration" and select a People column

### Preview shows normalization errors

- **Cause**: Sample data from Monday.com cannot be normalized with current mappings
- **Solution**:
  - Check field type compatibility (e.g., number field mapped to text column)
  - Verify column IDs are correct
  - Check Monday.com data format

## Next Steps

After successfully saving the mapping configuration:

1. **Admin Screen**: Configure metrics and routing rules
2. **Manager Screen**: Review and approve routing proposals
3. **Outcomes Screen**: Monitor agent performance and routing results

## Related Documentation

- [Phase 1 - Step 6: Field Mapping Wizard](../docs/90_execution_and_prd/contexts/06_phase1_step_6.context.md)
- [Monday.com Field Mapping Context](../docs/90_execution_and_prd/contexts/monday_field_mapping_wizard.context_PHASE1_FINAL.md)
- [Internal Schema](../packages/core/src/schema/internalSchema.ts)

