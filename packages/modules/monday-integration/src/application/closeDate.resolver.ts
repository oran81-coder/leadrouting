/**
 * Close Date Resolver (Phase 2)
 * Smart logic to determine deal close date:
 * 1. Prefer explicit Close Date column if mapped
 * 2. Fallback to status change timestamp when status = "Deal Won"
 */

export interface MondayItem {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  column_values: Array<{
    id: string;
    text: string;
    value: string | null;
  }>;
}

/**
 * Resolve close date using hybrid strategy
 * 
 * @param dealItem - Monday item representing the deal
 * @param closeDateColumnId - Optional: ID of Close Date column (if mapped)
 * @param dealStatusColumnId - Required: ID of Deal Status column
 * @param closedWonStatus - Required: Status value indicating "deal won"
 * @returns Date if deal is closed, null otherwise
 */
export function resolveCloseDate(
  dealItem: MondayItem,
  closeDateColumnId: string | null,
  dealStatusColumnId: string,
  closedWonStatus: string
): Date | null {
  // Strategy 1: If Close Date column is mapped and has value, use it
  if (closeDateColumnId) {
    const closeDateCol = dealItem.column_values.find(c => c.id === closeDateColumnId);
    if (closeDateCol?.value) {
      const parsed = parseDate(closeDateCol.value);
      if (parsed) {
        return parsed;
      }
    }
  }
  
  // Strategy 2: Check if deal status is "Closed Won"
  const statusCol = dealItem.column_values.find(c => c.id === dealStatusColumnId);
  if (statusCol) {
    const statusValue = extractStatusLabel(statusCol.value);
    if (statusValue === closedWonStatus) {
      // Use the last update time of this item as close date
      // In real implementation, you'd track status change history
      // For Phase 2, we use item updated_at as approximation
      if (dealItem.updated_at) {
        return new Date(dealItem.updated_at);
      }
      if (dealItem.created_at) {
        return new Date(dealItem.created_at);
      }
    }
  }
  
  return null; // Deal not closed yet
}

/**
 * Parse date from Monday column value
 * Monday date columns can have various formats
 */
function parseDate(value: string): Date | null {
  try {
    // Monday date format: ISO string or JSON with date field
    if (value.startsWith("{")) {
      const parsed = JSON.parse(value);
      if (parsed.date) {
        return new Date(parsed.date);
      }
    }
    
    // Try direct ISO parsing
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    // Invalid date format
  }
  
  return null;
}

/**
 * Extract status label from Monday status column value
 * Monday status columns store value as JSON: {"label": "Status Name"}
 */
function extractStatusLabel(value: string | null): string | null {
  if (!value) return null;
  
  try {
    const parsed = JSON.parse(value);
    if (parsed.label) {
      return parsed.label;
    }
    // Some status columns use "text" instead of "label"
    if (parsed.text) {
      return parsed.text;
    }
  } catch (e) {
    // Not JSON, might be plain text
    return value;
  }
  
  return null;
}

/**
 * Batch resolve close dates for multiple items
 * Useful for metrics computation
 */
export function resolveBulkCloseDates(
  items: MondayItem[],
  closeDateColumnId: string | null,
  dealStatusColumnId: string,
  closedWonStatus: string
): Map<string, Date | null> {
  const results = new Map<string, Date | null>();
  
  for (const item of items) {
    const closeDate = resolveCloseDate(
      item,
      closeDateColumnId,
      dealStatusColumnId,
      closedWonStatus
    );
    results.set(item.id, closeDate);
  }
  
  return results;
}

