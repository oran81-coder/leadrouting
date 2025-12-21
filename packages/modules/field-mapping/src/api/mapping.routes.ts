import { Router } from "express";
import { getMapping, saveMapping } from "./mapping.controller";

/**
 * NOTE: Phase 1: only system_admin/org_manager should access.
 * enforce in auth middleware later.
 */
export function fieldMappingRoutes() {
  const r = Router();
  r.get("/", getMapping);
  r.post("/", saveMapping);
  return r;
}
