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
The API uses `x-api-key` header authentication.

**Development (localhost):**
- ✅ **Auto-configured!** Uses `dev_key_123` by default
- No setup needed - just open the app and it works!

**Production:**
- Set your API key via the Settings UI (top bar)
- Click "Save" to persist
- The key is stored in localStorage

**Custom API Key (optional):**
- Change via Settings UI if using a different backend configuration
- Useful for testing different environments


## Gating
If Monday is not connected, Queue is disabled until you connect via Admin Connect.
