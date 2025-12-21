import { Router } from "express";

export function healthRoutes() {
  const r = Router();
  r.get("/", (_req, res) => res.json({ ok: true }));
  return r;
}
