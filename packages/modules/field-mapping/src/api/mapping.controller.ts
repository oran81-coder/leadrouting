import type { Request, Response } from "express";
import { PrismaFieldMappingConfigRepo } from "../infrastructure/mappingConfig.repo";
import { ValidationError } from "../../../../core/src/shared/errors";

const repo = new PrismaFieldMappingConfigRepo();

function getOrgId(req: Request): string {
  const orgId = (req.user as any)?.orgId;
  if (!orgId) {
    throw new ValidationError("Organization ID not found in request. Please ensure you are authenticated.");
  }
  return orgId;
}

export async function getMapping(req: Request, res: Response) {
  const orgId = getOrgId(req);
  const config = await repo.getLatest(orgId);
  return res.json({ config });
}

export async function saveMapping(req: Request, res: Response) {
  if (!req.body?.config) throw new ValidationError("Missing body.config");
  const orgId = getOrgId(req);
  console.log("[saveMapping] Saving mapping for orgId:", orgId);
  const result = await repo.saveNewVersion(orgId, req.body.config);
  return res.json({ ok: true, version: result.version });
}
