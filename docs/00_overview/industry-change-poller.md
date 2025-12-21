# Industry Change Poller (Phase 1)

Goal: If the admin changes the Industry column directly in Monday, the system will automatically create a NEW manager proposal.

## How it works
- A poller runs every `POLL_INTERVAL_SECONDS` and fetches the latest N items per board.
- It compares the current Industry value to the last seen value in DB (`IndustryWatchState`).
- On change:
  - calls `POST /routing/execute` with:
    - `triggerReason=INDUSTRY_CHANGED`
    - `forceManual=true`
  - This forces a **new proposal** even if org is in AUTO mode.

## Env
- `POLL_BOARD_IDS` (comma-separated)
- `POLL_INDUSTRY_COLUMN_ID` (the Monday column id)
- `POLL_LIMIT_PER_BOARD`
- `POLL_INTERVAL_SECONDS`

## Notes
- First time an item is seen -> stored without triggering.
- If admin changes Industry multiple times -> multiple proposals will be created over time.
