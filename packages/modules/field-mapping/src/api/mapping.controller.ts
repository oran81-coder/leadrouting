import type { Request, Response } from "express";
import { PrismaFieldMappingConfigRepo } from "../infrastructure/mappingConfig.repo";
import { ValidationError } from "../../../../core/src/shared/errors";

const repo = new PrismaFieldMappingConfigRepo();
const ORG_ID = "org_1"; // TODO: Replace with JWT-derived orgId in Phase 2

export async function getMapping(_req: Request, res: Response) {
  const config = await repo.getLatest(ORG_ID);
  return res.json({ config });
}

export async function saveMapping(req: Request, res: Response) {
  if (!req.body?.config) throw new ValidationError("Missing body.config");
  const result = await repo.saveNewVersion(ORG_ID, req.body.config);
  return res.json({ ok: true, version: result.version });
}
