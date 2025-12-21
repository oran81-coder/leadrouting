# Wizard / Mapping Lock (Phase 1)

Mapping wizard endpoints are blocked until Monday is connected.

Protected routes:
- `/mapping/*`
- `/mapping/preview`

Behavior:
- If Monday credentials are missing, API returns 400:
  "Monday not connected. Go to Admin Connect and save a token first."
