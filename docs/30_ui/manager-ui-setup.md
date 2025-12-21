# Manager UI Setup (Phase 1)

Frontend is a minimal Vite+React app under `/frontend`.

## Run
- API: `npm run dev:api`
- UI: `npm run dev:ui` (or `cd frontend && npm run dev`)

## Endpoints used
- GET /manager/proposals
- POST /manager/proposals/:id/approve
- POST /manager/proposals/:id/reject
- POST /manager/proposals/:id/override (applyNow=true)
- POST /manager/proposals/approve-all
