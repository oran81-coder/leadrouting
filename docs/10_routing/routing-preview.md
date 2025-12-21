# Routing Preview (Simulation Mode)

## Purpose
Routing Preview allows an **Admin / System Manager** to validate routing logic **before activating real assignments**.

This is a simulation-only mode.

## Who can see it
- ✅ Admin / System Manager
- ❌ Sales agents
- ❌ Regular managers

## When it is used
After configuration:
- Field mapping
- Metrics selection
- Weights
- Rules and limits

Before:
- Automatic routing
- Manual approval flow

## What Preview does
- Selects N recent leads (default: 10)
- Runs the routing engine against them
- Computes agent scores
- Shows explainability

## What Preview does NOT do
- ❌ No write-back to Monday
- ❌ No assignment
- ❌ No approval
- ❌ No persistence

## Output per lead
For each lead, the admin sees:
- Lead summary (name, industry, board)
- Ranked list of agents
- Final score per agent
- Score breakdown per metric
- Which agent would be selected

## Safety note
Preview is **read-only** and has zero side effects.


## Fallback behavior (Auto mode)

When operating in **automatic routing mode**, the system guarantees assignment and never blocks a lead.

### No clear winner
If no clear winner is identified (tie scores or low confidence across agents),
the system assigns the lead **randomly among eligible active agents**.

### Lead does not match any agent
If a lead does not sufficiently match any agent profile (e.g. unknown industry, no historical data),
the system assigns the lead **randomly among eligible active agents**.

### Notes
- Random selection is performed **only** among agents that passed gating (active, availability, caps).
- This fallback applies **only in Auto mode**.
- In Manual / Approval mode, the manager always decides.


### Explainability tag: Random fallback

If a lead is assigned via fallback randomization, the explainability output includes:

- `assignmentMode: "random_fallback"`
- Reason: "No clear winner" or "No matching agent"

This allows managers to clearly distinguish between
score-based assignments and fallback assignments.
