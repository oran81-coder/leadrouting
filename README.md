# Lead Routing System — Phase 1 (Skeleton Repo)

Stack: Node.js + TypeScript (Modular Monolith)  
Scope: Single org, deterministic rules, Monday.com only, no ML/NLP/telephony.

## Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env:
   ```bash
   cp .env.example .env
   ```
3. Run API (dev):
   ```bash
   npm run dev
   ```
4. Health check:
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

## Outcomes (Layer C)
A lightweight Outcomes screen spec (conversion, time-to-close, optional revenue/avg deal) is defined in:
- `docs/success-metrics.md`
- `docs/outcomes-screen-spec.md`

This is designed as **Phase 1.5**: minimal API + UI, no BI/dashboard heavy lifting.
