# Walkthrough: HubSpot Integration Planning

I have completed the technical planning for integrating HubSpot into the Lead Routing system. This walkthrough summarizes the research and the proposed strategy.

## 1. Research & Analysis
- **Existing System**: Analyzed the Monday.com integration in `apps/api/src/services/leadIntakePoller.ts` and `packages/modules/field-mapping`.
- **Generalization Needs**: Identified that the system needs a `CrmIntegrationFactory` and a generic `ICrmClient` interface to support HubSpot alongside Monday.
- **HubSpot Specifics**: Researched HubSpot's object model (Deals, Contacts, Tasks) and the OAuth 2.0 flow for secure, long-term connectivity.

## 2. Technical Plan Highlights
The approved plan includes:
- **Refactoring Stage**: Transitioning to a Provider-Based Architecture.
- **HubSpot Module**: Implementing a new package for HubSpot-specific logic.
- **Intake Strategy**: Supporting both Polling and Webhooks for HubSpot Leads.
- **Login & Onboarding**: A new "CRM Selection" screen at the start of the flow to choose between Monday and HubSpot.
![CRM Selection Mockup](file:///c:/Users/oran8/Desktop/leadrouting/lead-routing-phase1-FULL-latest-rebuilt-FIX3-smokefix/lead-routing-skeleton-node-ts/HUBSPOT/assets/crm_selection_mockup.png)
- **Admin UI**: Generalizing the Field Mapping Wizard for HubSpot Properties.

## 3. Professional Standards & Reliability
- **Observability**: Added **Distributed Tracing** and **Provider Health Dashboards** to track every lead's journey.
- **Resilience**: Implemented **Circuit Breakers** and **Exponential Backoff** to handle HubSpot API outages or rate limits gracefully.
- **Security**: Upgraded token encryption to **AES-256-GCM** with IV-per-record and added **Key Rotation** support.
- **DX**: Added **Sandbox Support** and a **Webhook Debugger** for easier development and troubleshooting.

## 4. Final Business Decisions
- **Primary Object**: **HubSpot Leads** (Sales Workspace).
- **Routing Trigger**: Immediate assignment upon entry to ensure reps are notified early.
- **Logic Continuity**: **100% Guaranteed**. The Rule Agent, KPI scoring, and Routing Engine remain identical and untouched. HubSpot is simply a new "Data Source" that feeds into the existing, proven engine.
- **Data Mapping**: Full parity with Monday.com fields (Source, Owner, Amount, Industry, Status).
- **Sales Workspace Support**: Routed leads will appear in the reps' Prospecting/Sales view as "Open leads".
- **Status Logic**: Full parity for "Won", "Lost", and "Excluded" leads via HubSpot Lead Status mapping.
- **Authentication**: Using **OAuth 2.0 with automated Token Refresh** logic for a seamless "Connect and Forget" user experience.
- **Backward Compatibility**: A dedicated [Monday Safety Plan](file:///c:/Users/oran8/Desktop/leadrouting/lead-routing-phase1-FULL-latest-rebuilt-FIX3-smokefix/lead-routing-skeleton-node-ts/HUBSPOT/monday_safety_plan.md) was created to ensure existing processes are untouched.

## 4. Risks & Mitigations
- **Rate Limits**: Implemented via request queuing and throttling.
- **Data Spread**: Addressed by cross-object fetching (Deals + Contacts).
- **Owner Conflicts**: Resolved via configurable "Route-If" filters.

---
The plan is fully reviewed, risk-assessed, and approved. Ready for execution.
