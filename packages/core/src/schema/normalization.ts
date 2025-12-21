import type { EntityType, FieldDefinition, InternalSchema, InternalValueType } from "./internalSchema";
import { getActiveFieldsByEntity, getRequiredActiveFields } from "./internalSchema";

export type NormalizedPrimitive = string | number | boolean | null;

export interface NormalizationError {
  fieldId: string;
  expectedType: InternalValueType;
  reason: string;
  rawValue: unknown;
}

export interface NormalizationResult {
  values: Record<string, NormalizedPrimitive>;
  errors: NormalizationError[];
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim().length === 0);
}

function toIsoDateString(input: unknown): string | null {
  // Accept:
  // - ISO string / YYYY-MM-DD
  // - Date object
  // - Monday-like objects: { date: "YYYY-MM-DD", time?: "HH:mm:ss" }
  // - timestamp number (ms)
  if (typeof input === "string") {
    // keep simple: accept YYYY-MM-DD or ISO
    const s = input.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return null;
  }
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return input.toISOString();
  }
  if (typeof input === "number") {
    const d = new Date(input);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return null;
  }
  if (typeof input === "object" && input) {
    const anyObj = input as Record<string, unknown>;
    if (typeof anyObj["date"] === "string") {
      const date = String(anyObj["date"]).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
      const time = typeof anyObj["time"] === "string" ? String(anyObj["time"]).trim() : "";
      return time ? `${date}T${time}Z` : date;
    }
    if (typeof anyObj["text"] === "string") {
      const d = new Date(String(anyObj["text"]));
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  return null;
}

function coerceValue(expected: InternalValueType, raw: unknown): { ok: true; value: NormalizedPrimitive } | { ok: false; reason: string } {
  if (isEmpty(raw)) return { ok: true, value: null };

  switch (expected) {
    case "text": {
  if (typeof raw === "string") return { ok: true, value: raw };
  if (typeof raw === "number" || typeof raw === "boolean") return { ok: true, value: String(raw) };
  // Support Monday status/dropdown objects if mapped incorrectly as text: extract label/text
  if (typeof raw === "object" && raw) {
    const anyObj = raw as Record<string, unknown>;
    if (typeof anyObj["label"] === "string") return { ok: true, value: String(anyObj["label"]) };
    if (typeof anyObj["text"] === "string") return { ok: true, value: String(anyObj["text"]) };
  }
  return { ok: false, reason: "Expected a text value (string/number/boolean), or object with label/text." };
}
case "number":
 {
      if (typeof raw === "number" && Number.isFinite(raw)) return { ok: true, value: raw };
      if (typeof raw === "string") {
        const n = Number(raw.replace(/,/g, "").trim());
        if (Number.isFinite(n)) return { ok: true, value: n };
      }
      return { ok: false, reason: "Expected a numeric value." };
    }
    case "boolean": {
      if (typeof raw === "boolean") return { ok: true, value: raw };
      if (typeof raw === "number") {
        if (raw === 1) return { ok: true, value: true };
        if (raw === 0) return { ok: true, value: false };
      }
      if (typeof raw === "string") {
        const s = raw.trim().toLowerCase();
        if (["true", "yes", "y", "1"].includes(s)) return { ok: true, value: true };
        if (["false", "no", "n", "0"].includes(s)) return { ok: true, value: false };
      }
      return { ok: false, reason: "Expected a boolean value." };
    }
    case "status": {
      // In Phase 1 we normalize status -> string label
      if (typeof raw === "string") return { ok: true, value: raw };
      if (typeof raw === "object" && raw) {
        const anyObj = raw as Record<string, unknown>;
        if (typeof anyObj["label"] === "string") return { ok: true, value: String(anyObj["label"]) };
        if (typeof anyObj["text"] === "string") return { ok: true, value: String(anyObj["text"]) };
      }
      return { ok: false, reason: "Expected a status label (string or object with label/text)." };
    }
    case "date": {
      const iso = toIsoDateString(raw);
      if (!iso) return { ok: false, reason: "Expected a date (ISO string / YYYY-MM-DD / Date / object with {date})." };
      return { ok: true, value: iso };
    }
    default:
      return { ok: false, reason: "Unsupported type." };
  }
}

/**
 * Normalize an entity record based on current active schema fields.
 *
 * This is used in:
 * - Mapping wizard preview (sample normalization must pass)
 * - Ingestion pipeline (normalized snapshot stored/used by rule engine)
 *
 * Phase 1 behavior:
 * - Required+active fields MUST be present (and coercible) for the entity.
 * - Optional fields: if missing/empty => null, no error.
 */
export function normalizeEntityRecord(schema: InternalSchema, entity: EntityType, rawByInternalFieldId: Record<string, unknown>): NormalizationResult {
  const fields = getActiveFieldsByEntity(schema, entity);

  const out: Record<string, NormalizedPrimitive> = {};
  const errors: NormalizationError[] = [];

  for (const field of fields) {
    const raw = rawByInternalFieldId[field.id];

    if (isEmpty(raw)) {
      out[field.id] = null;
      if (field.required) {
        errors.push({
          fieldId: field.id,
          expectedType: field.type,
          reason: "Required field is missing/empty.",
          rawValue: raw,
        });
      }
      continue;
    }

    const coerced = coerceValue(field.type, raw);
    if (coerced.ok) {
      out[field.id] = coerced.value;
    } else {
      out[field.id] = null;
      errors.push({
        fieldId: field.id,
        expectedType: field.type,
        reason: coerced.reason,
        rawValue: raw,
      });
    }
  }

  return { values: out, errors };
}

/**
 * Utility: validate that schema itself has at least one active field per entity.
 * (Since admin can remove core fields in Option B.)
 */
export function validateSchemaMinimums(schema: InternalSchema): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const entities: EntityType[] = ["lead", "agent", "deal"];

  for (const e of entities) {
    const active = getActiveFieldsByEntity(schema, e);
    if (active.length === 0) errors.push(`No active fields defined for entity '${e}'.`);
  }

  // If admin removes all required fields, mapping wizard can't enforce completion; we still allow schema,
  // but Phase 1 routing should remain blocked until at least ONE required+active field exists per Lead/Agent.
  const requiredActive = getRequiredActiveFields(schema);
  if (requiredActive.length === 0) errors.push("No required+active fields exist in schema. Routing should remain disabled.");

  return errors.length ? { ok: false, errors } : { ok: true };
}
