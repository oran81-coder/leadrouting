# Manager UI (Vite + React)

## Run
1) Start API (from repo root):
   - `npm install`
   - `npm run dev:api` (or whatever script exists)
2) Start UI:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

Default API base: `http://localhost:3001`
You can change it in the UI top bar.

## Features
- List proposals with paging
- Approve / Reject
- Override + Apply (prompts for value)
- Approve all (filtered) (server-side)


## Auth
If API uses `ROUTING_API_KEY`, set the API key in the UI header (stored in localStorage) and it will be sent as `x-api-key`.


## Gating
If Monday is not connected, Queue is disabled until you connect via Admin Connect.
