import { optionalEnv } from "../config/env";
import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";
import { PrismaMetricsConfigRepo } from "../infrastructure/metricsConfig.repo";
import { PrismaLeadFactRepo } from "../infrastructure/leadFact.repo";
import { PrismaAgentMetricsRepo } from "../infrastructure/agentMetrics.repo";

const ORG_ID = "org_1";

function numEnv(name: string, def: number) {
  const v = optionalEnv(name, "");
  if (!v) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function parsePeopleUserId(col: any): string | null {
  try {
    const raw = col?.value;
    if (!raw) return null;
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;

    // Expected Monday people value:
    // { "personsAndTeams":[{"id":123456,"kind":"person"}], ... }
    const pts = obj?.personsAndTeams;
    if (Array.isArray(pts) && pts.length) {
      const id = pts[0]?.id ?? pts[0];
      return id != null ? String(id) : null;
    }

    // Fallback formats (defensive)
    const ids = obj?.personsAndTeamsIds;
    if (Array.isArray(ids) && ids.length) return String(ids[0]);

    return null;
  } catch {
    return null;
  }
}

function parseBoards(s: string): string[] {
  return (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return Math.round(sorted[mid]);
}

function hoursBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60)));
}

export async function recomputeMetricsNow() {
  const cfgRepo = new PrismaMetricsConfigRepo();
  const factRepo = new PrismaLeadFactRepo();
  const snapRepo = new PrismaAgentMetricsRepo();

  const cfg = await cfgRepo.getOrCreateDefaults();
  const boardIds = parseBoards(cfg.leadBoardIds);
  if (!boardIds.length) return { ok: false, message: "No leadBoardIds configured" };

  const client = await createMondayClientForOrg(ORG_ID);

  // Pull latest items per board (scoped). Phase 1: bounded fetch.
  const perBoardLimit = numEnv("METRICS_FETCH_LIMIT_PER_BOARD", 500);
  const samples = await (client as any).fetchBoardSamples(boardIds as any, perBoardLimit);

  const now = new Date();

  for (const b of samples) {
    const boardId = String(b.boardId);
    for (const item of b.items ?? []) {
      const itemId = String(item.id);
      const cvs = item.columnValues ?? [];

      const findText = (colId?: string | null) => {
        if (!colId) return null;
        const c = cvs.find((x: any) => String(x.id) === String(colId));
        const t = (c?.text ?? "").trim();
        return t || null;
      };

      // Values
      const industry = cfg.enableIndustryPerf === false ? null : findText(cfg.industryColumnId);
      const statusVal = findText(cfg.closedWonStatusColumnId) || findText(cfg.contactedStatusColumnId) || findText(cfg.intakeColumnId);

      const dealAmountText = cfg.enableAvgDealSize === false ? null : findText(cfg.dealAmountColumnId);
      const dealAmount = dealAmountText ? Number(String(dealAmountText).replace(/[^\d.]/g, "")) : null;
      const nextCallDate = cfg.enableResponseSpeed === false ? null : findText(cfg.nextCallDateColumnId);

      // Assigned user: we rely on routing system writeback; if there's a people target configured,
      // the monday item should have it. For Phase 1, we store it from our proposal/apply pipeline elsewhere.
      // Here we attempt to derive from a "people" column in mapping if user configured; we keep null if absent.
      // (This will be improved when People column id is part of mapping config.)
      let assignedUserId: string | null = null;
        if (cfg.assignedPeopleColumnId) {
          const pc = cvs.find((x: any) => String(x.id) === String(cfg.assignedPeopleColumnId));
          assignedUserId = parsePeopleUserId(pc);
        }

      const prev = await factRepo.get(boardId, itemId);

      // enteredAt: when first observed (we don't require intake status now)
      const enteredAt = prev?.enteredAt ?? now;

      // firstTouchAt: earliest of contacted status / next call date set (we detect transitions: null->value)
      let firstTouchAt = prev?.firstTouchAt ?? null;
      let lastActivityAt = prev?.lastActivityAt ?? null;

      const contactedNow = cfg.contactedStatusValue && findText(cfg.contactedStatusColumnId) === cfg.contactedStatusValue;
      const contactedPrev = false; // simplified: we don't store previous contacted flag separately in Phase 1

      const nextCallSetNow = !!nextCallDate;

      // If firstTouchAt not set, infer from presence of nextCallDate (first time we see it set)
      if (!firstTouchAt && nextCallSetNow && !(prev?.nextCallDate)) {
        firstTouchAt = now;
        lastActivityAt = now;
      }

      // lastActivityAt bump on nextCallDate change
      if (nextCallDate && nextCallDate !== (prev?.nextCallDate ?? null)) {
        lastActivityAt = now;
        if (!firstTouchAt) firstTouchAt = now;
      }

      // closedWonAt: if status equals closedWon value (first time)
      let closedWonAt = prev?.closedWonAt ?? null;
      const isClosedWon = cfg.closedWonStatusValue && findText(cfg.closedWonStatusColumnId) === cfg.closedWonStatusValue;
      if (isClosedWon && !closedWonAt) closedWonAt = now;

      await factRepo.upsert(boardId, itemId, {
        assignedUserId: assignedUserId ?? prev?.assignedUserId ?? null,
        industry,
        dealAmount,
        statusValue: statusVal,
        nextCallDate,
        enteredAt,
        firstTouchAt,
        lastActivityAt,
        closedWonAt,
      });
    }
  }

  // Aggregate per agent (from facts)
  const agents = await factRepo.listAgentsWithFacts();

  const windows = Array.from(new Set([cfg.conversionWindowDays, cfg.avgDealWindowDays, cfg.responseWindowDays].filter(Boolean)));

  for (const agentUserId of agents) {
    for (const w of windows) {
      const since = new Date(now.getTime() - w * 24 * 60 * 60 * 1000);
      const facts = await factRepo.listByAgentInWindow(agentUserId, since);

      const assignedCount = facts.filter((f) => f.enteredAt && f.enteredAt >= since).length;
      const closedFacts = facts.filter((f) => f.closedWonAt && f.closedWonAt >= since);
      const closedWonCount = closedFacts.length;
      const conversionRate = assignedCount > 0 ? closedWonCount / assignedCount : 0;

      const amounts = closedFacts.map((f) => Number(f.dealAmount ?? 0)).filter((n) => Number.isFinite(n) && n > 0);
      const dealsAmountSum = amounts.reduce((a, b) => a + b, 0);
      const avgDealSize = amounts.length ? dealsAmountSum / amounts.length : 0;

      const responseMins = facts
        .map((f) => (f.firstTouchAt && f.enteredAt ? Math.round((f.firstTouchAt.getTime() - f.enteredAt.getTime()) / (1000 * 60)) : null))
        .filter((n): n is number => n !== null && n >= 0);

      const medianResponseMinutes = median(responseMins);

      // hot streak (count deals in last hotStreakWindowHours)
      const hotSince = new Date(now.getTime() - cfg.hotStreakWindowHours * 60 * 60 * 1000);
      const hotDealsCount = facts.filter((f) => f.closedWonAt && f.closedWonAt >= hotSince).length;
      const isHot = hotDealsCount >= cfg.hotStreakMinDeals;

      // burnout
      const lastWin = facts
        .filter((f) => f.closedWonAt)
        .map((f) => f.closedWonAt as Date)
        .sort((a, b) => b.getTime() - a.getTime())[0];

      const lastActivity = facts
        .filter((f) => f.lastActivityAt)
        .map((f) => f.lastActivityAt as Date)
        .sort((a, b) => b.getTime() - a.getTime())[0];

      const hoursSinceLastWin = lastWin ? hoursBetween(lastWin, now) : 999999;
      const hoursSinceLastActivity = lastActivity ? hoursBetween(lastActivity, now) : 999999;

      const winScore = Math.max(0, 1 - hoursSinceLastWin / Math.max(1, cfg.burnoutWinDecayHours));
      const actScore = Math.max(0, 1 - hoursSinceLastActivity / Math.max(1, cfg.burnoutActivityDecayHours));
      const burnoutScore = (winScore + actScore) / 2;

      // industry performance json (basic: conversion per industry)
      const byInd: Record<string, { assigned: number; won: number }> = {};
      for (const f of facts) {
        const ind = (f.industry ?? "unknown").toLowerCase();
        if (!byInd[ind]) byInd[ind] = { assigned: 0, won: 0 };
        if (f.enteredAt && f.enteredAt >= since) byInd[ind].assigned += 1;
        if (f.closedWonAt && f.closedWonAt >= since) byInd[ind].won += 1;
      }
      const industryPerf: Record<string, { conversion: number }> = {};
      for (const [k, v] of Object.entries(byInd)) {
        industryPerf[k] = { conversion: v.assigned ? v.won / v.assigned : 0 };
      }

      const conversionRateEff = cfg.enableConversion === false ? 0 : conversionRate;
        const avgDealEff = cfg.enableAvgDealSize === false ? 0 : avgDealSize;
        const medianRespEff = cfg.enableResponseSpeed === false ? 0 : medianResponseMinutes;
        const hotDealsEff = cfg.enableHotStreak === false ? 0 : hotDealsCount;
        const isHotEff = cfg.enableHotStreak === false ? false : isHot;
        const burnoutEff = cfg.enableBurnout === false ? 0 : burnoutScore;
        const industryPerfEff = cfg.enableIndustryPerf === false ? {} : industryPerf;

        await snapRepo.upsert(agentUserId, w, {
        assignedCount,
        closedWonCount,
        conversionRate: conversionRateEff,
        avgDealSize: avgDealEff,
        dealsAmountSum,
        medianResponseMinutes: medianRespEff,
        hotDealsCount: hotDealsEff,
        isHot: isHotEff,
        hoursSinceLastWin,
        hoursSinceLastActivity,
        burnoutScore: burnoutEff,
        industryPerfJson: JSON.stringify(industryPerfEff),
      });
    }
  }

  return { ok: true, message: "Metrics recomputed", agents: agents.length, windows };
}

export function startMetricsJob() {
  const enabled = optionalEnv("METRICS_JOB_ENABLED", "true") !== "false";
  if (!enabled) return;

  const intervalSec = numEnv("METRICS_JOB_INTERVAL_SECONDS", 1800); // 30 min
  const run = () =>
    recomputeMetricsNow().catch((e: any) => {
      // Smoke-test safety: don't crash the process on missing creds/config
      // eslint-disable-next-line no-console
      console.error("[metrics-job] run failed", e?.message ?? e);
    });

  void run();
  setInterval(() => void run(), intervalSec * 1000);
}