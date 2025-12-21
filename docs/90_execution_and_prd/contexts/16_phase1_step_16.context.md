# Phase 1 — Step 16: Security & Access Control

## Goal
Implement authentication and role-based authorization.

## Roles
- System Admin
- Org Manager
- (Optional) Read-only Manager/Analyst
- Regular Agent (restricted)

## Permissions (Minimum)
- Wizard access: Admin/Org Manager only
- Field registry changes: Admin only (or Admin+Org Manager if desired)
- Rule changes + weights: Admin only (or Admin+Org Manager if desired)
- Approve/override: Manager/Admin
- Audit log view: Admin/Org Manager

## Inputs
- Auth method (JWT)
- User-role mapping (single org)

## Outputs
- Auth middleware / guards
- Permission matrix enforced server-side

## Acceptance Criteria
- Unauthorized users cannot access wizard/admin endpoints
- All privileged actions require auth and are logged

## Cursor Instructions
- Do not implement multi-tenant security; single org only
