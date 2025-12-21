# MASTER CONTEXT — Phase 1 Rule-Based Lead Routing System

This file is the single source of truth for loading context into Cursor
when working on Phase 1 of the lead routing system.

Do not skip steps.
Always read the relevant context files before implementing or changing code.

---

## Phase 1 Context Files (Execution Order)

These context files define the system progressively and must be loaded in order.

## Phase 1 Context Files (Execution Order)

- [01_phase1_step_1.context.md](./contexts/01_phase1_step_1.context.md)
- [02_phase1_step_2.context.md](./contexts/02_phase1_step_2.context.md)
- [03_phase1_step_3.context.md](./contexts/03_phase1_step_3.context.md)
- [04_phase1_step_4.context.md](./contexts/04_phase1_step_4.context.md)
- [05_phase1_step_5.context.md](./contexts/05_phase1_step_5.context.md)
- [06_phase1_step_6.context.md](./contexts/06_phase1_step_6.context.md)
- [07_phase1_step_7.context.md](./contexts/07_phase1_step_7.context.md)
- [08_phase1_step_8.context.md](./contexts/08_phase1_step_8.context.md)
- [09_phase1_step_9.context.md](./contexts/09_phase1_step_9.context.md)
- [10_phase1_step_10.context.md](./contexts/10_phase1_step_10.context.md)
- [11_phase1_step_11.context.md](./contexts/11_phase1_step_11.context.md)
- [12_phase1_step_12.context.md](./contexts/12_phase1_step_12.context.md)
- [13_phase1_step_13.context.md](./contexts/13_phase1_step_13.context.md)
- [14_phase1_step_14.context.md](./contexts/14_phase1_step_14.context.md)
- [15_phase1_step_15.context.md](./contexts/15_phase1_step_15.context.md)
- [16_phase1_step_16.context.md](./contexts/16_phase1_step_16.context.md)
- [17_phase1_step_17.context.md](./contexts/17_phase1_step_17.context.md)

### Monday Mapping Wizard Context
- [monday_field_mapping_wizard.context_UPDATED.md](./contexts/monday_field_mapping_wizard.context_PHASE1_FINAL.md)


### Monday Mapping Wizard Context
This context augments the routing system with explicit Monday field mapping rules.

- ./contexts/monday_field_mapping_wizard.context_UPDATED.md

---

## Supporting Documentation

- PRD: ./prd/
- Execution Docs: ./execution/

---

## Related Documentation (by topic)

- Overview: ../00_overview/
- Routing Engine: ../10_routing/
- Monday Integration: ../20_monday/
- Manager UI: ../30_ui/
- Metrics: ../40_metrics/
- Persistence & Data Model: ../50_persistence/

---

## Cursor Usage Rules

- Always load this file first when starting a new task.
- Load additional folders only when needed.
- Never assume behavior not explicitly documented.
- Stop and ask if something is unclear.
