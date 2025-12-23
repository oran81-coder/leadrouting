# Lead Routing System — Phase 1 (Skeleton Repo)

Stack: Node.js + TypeScript (Modular Monolith)  
Scope: Single org, deterministic rules, Monday.com only, no ML/NLP/telephony.

## Quick Start

**For detailed smoke test with validation:** See [`docs/90_execution_and_prd/smoke-test.md`](docs/90_execution_and_prd/smoke-test.md)

**Quick commands:**
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env:
   ```bash
   cp .env.example .env
   ```
3. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
4. Run migrations:
   ```bash
   npm run prisma:migrate
   ```
5. Run API (dev):
   ```bash
   npm run dev
   ```
6. Health check:
   - GET http://localhost:3000/health -> {"ok": true}

## Repo Structure
- `apps/api` — HTTP API (Express) + routing + middleware
- `packages/core` — shared types/errors/utils
- `packages/modules/*` — feature modules (field-mapping, rule-engine, etc.)
- `frontend/` — placeholder (create later; can be React/Vite/Next)

## Notes
- This is a skeleton only: no business logic implemented.
- Field weights live in `rule-engine` (NOT in the mapping wizard).
- Multi-board mapping is supported via (boardId + columnId) per internal field.


## Metrics data scope (Phase 1)
Phase 1 metrics are computed only from Lead Boards (`leadBoardIds`). If Deal Amount lives on another board, mirror/copy it into the Lead Board. See `docs/metrics-data-scope.md`.

## Routing Preview (Admin only)
The system includes a simulation-only Routing Preview mode.
Admins can preview agent scoring and explainability before activating real routing.
See `docs/routing-preview.md`.

## Outcomes Screen (Phase 1.6)
The system includes an Outcomes API for observing business KPIs.
- **GET /outcomes/summary** - Returns conversion, revenue, time-to-close metrics
- Supports 7/30/90 day windows
- Per-agent breakdown with final assignee attribution
- Revenue/avgDeal optional (requires dealAmountColumnId mapping)
- See `docs/40_metrics/success-metrics.md` and `docs/30_ui/outcomes-screen-spec.md`
- Smoke test: `smoke-phase1_6-outcomes.ps1`
