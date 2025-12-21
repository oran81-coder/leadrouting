import type { MondayColumnType, MondayColumnValue } from "../contracts/monday.types";

export function safeJsonParse(value: string | null | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Extract a "raw" value from Monday column_value, based on the column type.
 * This returns the most useful primitive/object for Phase 1 normalization,
 * without doing heavy inference.
 *
 * Notes:
 * - We prefer `text` when it is present and sufficient.
 * - For some types, `value` (JSON) is more reliable.
 */
export function extractRawFromColumnValue(columnType: MondayColumnType | undefined, cv: MondayColumnValue): unknown {
  const json = safeJsonParse(cv.value);

  switch (columnType) {
    case "numbers": {
      // Prefer JSON: {"number":"123"} OR {"number":123}
      if (json && typeof json === "object" && "number" in (json as any)) {
        const n = (json as any).number;
        return typeof n === "string" || typeof n === "number" ? n : cv.text ?? null;
      }
      return cv.text ?? null;
    }

    case "date": {
      // Prefer JSON: {"date":"YYYY-MM-DD","time":"HH:mm:ss"}; fallback to text
      if (json && typeof json === "object" && ("date" in (json as any) || "time" in (json as any))) {
        return json;
      }
      return cv.text ?? null;
    }

    case "status": {
      // Prefer JSON for label/index; fallback to text
      if (json && typeof json === "object") return json;
      return cv.text ?? null;
    }

    case "dropdown":
    case "tags": {
      // Usually JSON contains ids/labels; keep JSON if present; fallback to text
      if (json) return json;
      return cv.text ?? null;
    }

    case "people": {
      // Keep JSON if present (often contains personsAndTeams); fallback to text
      if (json) return json;
      return cv.text ?? null;
    }

    case "link": {
      // JSON may contain url/text; keep JSON if present; fallback to text
      if (json) return json;
      return cv.text ?? null;
    }

    case "text":
    default:
      return cv.text ?? (json ?? null);
  }
}
