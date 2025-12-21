import type { Request, Response } from "express";
import { MappingRepository } from "../infrastructure/mapping.repo";
import { MappingService } from "../application/mapping.service";
import { Errors } from "../../../../core/src/shared/errors";

const repo = new MappingRepository();
const service = new MappingService(repo);

export async function getMapping(_req: Request, res: Response) {
  const config = await service.getConfig();
  return res.json({ config });
}

export async function saveMapping(req: Request, res: Response) {
  if (!req.body?.config) throw Errors.badRequest("Missing body.config");
  const version = await service.saveConfig(req.body.config);
  return res.json({ ok: true, version });
}
