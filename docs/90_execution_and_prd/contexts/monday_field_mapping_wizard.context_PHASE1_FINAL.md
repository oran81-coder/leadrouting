# Context — Monday.com Field Mapping (Phase 1 — Minimal & Explicit)

## Purpose
This document defines the **minimal, explicit Monday.com field mapping assumptions**
required for **Phase 1** of the rule-based lead routing system to function correctly.

This is **not** a full Wizard implementation.
It describes a **manual, deterministic mapping configuration** that is required
for routing and writeback logic to execute safely.

---

## Phase 1 Positioning
- Mapping is a **prerequisite conceptually**, not a fully enforced UI flow
- There is **no autonomous wizard state machine**
- The system assumes that required Monday fields are mapped correctly by an admin
- Responsibility for correctness lies with the human operator

---

## Scope (Phase 1 — Included)

- Explicit mapping of **critical Monday columns** used by routing and writeback
- Deterministic configuration (single active mapping at a time)
- Manual admin configuration (no inference, no guessing)
- Mapping is **consumed by routing, preview, and writeback logic**
- Supports a **single primary board** (multi-board allowed conceptually but not validated)

---

## Scope (Not Implemented in Phase 1)

The following are **explicitly out of scope** for Phase 1:

- Wizard-style guided UI flow
- Automatic invocation or re-invocation of mapping
- Multi-board semantic validation
- Cross-board relational correctness
- Field type compatibility engine
- Sample normalization or preview
- Versioned configurations
- Audit log
- Automatic routing lock/unlock on mapping change
- Automatic detection of schema drift (column rename/type change)

These belong to **future phases only**.

---

## Internal Fields (Phase 1)

- Internal fields are **statically defined** in Phase 1
- There is **no CRUD** for internal fields
- Admin cannot add, remove, or reclassify internal fields
- Required vs optional behavior is **implicit and enforced by code assumptions**
- Field weights are **not** part of mapping and belong exclusively to the Rule Engine

---

## Mapping Model (Conceptual)

Each internal field maps to **one explicit Monday column**.

Conceptually:

```
InternalField → (Board ID → Column ID)
```

For Phase 1:
- The system assumes a **single primary board**
- Multi-board mapping is allowed conceptually but **not validated**
- Correctness of board/column choice is the admin’s responsibility

---

## Required Monday Columns (Phase 1 — Critical)

At minimum, Phase 1 assumes explicit mapping for:

- **People / Assignee column**
  - Required for:
    - detecting unassigned leads
    - routing execution
    - writeback to Monday

Other mapped fields may exist but are not enforced at runtime.

---

## Validation Behavior (Phase 1)

Validation in Phase 1 is **minimal and defensive**:

- Ensure required columns are explicitly configured
- Ensure referenced board and column IDs exist
- Prevent routing execution if critical mapping is missing

There is **no**:
- Type compatibility validation
- Sample record validation
- Data normalization preview

---

## Persistence (Phase 1)

- Mapping configuration is stored as a **single active configuration**
- There is **no versioning**
- There is **no audit log**
- Overwriting a mapping replaces the previous configuration

---

## Runtime Usage

Mapping configuration is used by:

- Lead intake (to read relevant Monday fields)
- Routing preview
- Routing execution
- Writeback (People column assignment)

The mapping is assumed to be **correct and stable** at runtime.

---

## Security & Permissions (Phase 1)

- Mapping configuration is assumed to be modified only by
  **system admins / org managers**
- There is no granular permission model in Phase 1
- No public or agent-level access is supported

---

## Completion Definition (Phase 1)

Mapping is considered complete when:

- Required Monday columns are explicitly configured
- Routing and writeback can execute deterministically
- No runtime assumptions depend on missing or inferred fields

There is **no explicit “unlock” mechanism** in Phase 1.

---

## Cursor / AI Usage Rules

- Do not assume wizard UI exists
- Do not infer mappings automatically
- Do not implement future-phase features
- Treat mapping as **explicit configuration only**
- Stop and request human input for business decisions
