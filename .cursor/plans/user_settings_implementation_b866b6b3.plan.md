---
name: User Settings Implementation (Parallel 3-Agent Plan)
overview: Execute FEAT-013 with 3 parallel agents. Agent-1 owns shared Zod contracts as single source of truth (foundation). Agent-2 owns backend implementation against frozen contracts. Agent-3 owns frontend implementation against the same frozen contracts. Plan includes requirement traceability, sync checkpoints, and explicit risk controls.
todos:
  - id: "0"
    content: "Preflight: run current-state audit vs docs/TASKS.md + existing code to avoid duplicate work. Produce keep/replace/reuse list before coding."
    status: pending
  - id: "1"
    content: "Agent-1 (Foundation): implement shared Zod schemas and exported TS types as canonical API contracts. Publish contract version/tag and changelog for Agent-2 and Agent-3."
    status: pending
  - id: "2"
    content: "Agent-2 (Backend): implement/align settings + auth password endpoints, repository updates, migration, push subscription API, and behavior effects using Agent-1 contracts."
    status: pending
  - id: "3"
    content: "Agent-3 (Frontend): implement settings UI/hooks/API client/push UX against Agent-1 contracts with optimistic updates, debounce, rollback, and section-level error handling."
    status: pending
  - id: "4"
    content: "Cross-stream integration: run contract compatibility checks, integration tests, and E2E workflows including behavior outcomes (not only CRUD save)."
    status: pending
  - id: "5"
    content: "Final verification: lint/typecheck/tests pass in all packages; update docs/TASKS.md reality status and capture unresolved decisions."
    status: pending
isProject: false
---

# User Settings Implementation Plan (Combined Navigation, Parallel 3-Agent)

> For execution: keep this as the single source plan. Each agent uses only its own playbook section plus shared checkpoints.

## Quick Navigation

- `A. Shared Context`: goal, user stories, acceptance criteria, constraints
- `B. Parallel Model`: dependency gates, handoff checkpoints, drift policy
- `C. Agent-1 Playbook`: Zod contracts foundation
- `D. Agent-2 Playbook`: backend
- `E. Agent-3 Playbook`: frontend
- `F. Integration + Done`: cross-stream verification and completion

---

## A) Shared Context

### Goal

Deliver settings/profile behavior from `docs/prd-profile.md` and `docs/rfc/rfc-user-settings.md` with three parallel workstreams and zero contract drift.

### User Stories (Combined)

- **US-P1** update display name
- **US-P2** update avatar/profile photo
- **US-P3** control profile photo visibility
- **US-P4** change password securely
- **US-V1** control who can see online status
- **US-V2** disable presence entirely
- **US-V3** disable read receipts
- **US-N1/N2/N3** push preference + meaningful notification content/click behavior
- **US-A1/A2** view account identity + logout safely

### Acceptance Criteria (Combined, execution-facing)

1. Auto-save for settings changes (except password submit flow).
2. Debounce settings writes at 500ms.
3. Optimistic UI with rollback and user-visible error feedback.
4. Password flow validates current/new/confirm and enforces rate limit.
5. Push flow handles granted/denied/unsupported states correctly.
6. Persisted settings remain correct after reload and across devices.
7. Behavior impact is validated (presence/read receipts/photo visibility), not only data persistence.

### Non-Negotiable Constraints

- Shared Zod contracts are canonical for FE + BE.
- No local payload type redefinition in backend/frontend.
- Contract changes after freeze require version bump and ack from all streams.

---

## B) Parallel Model

### Stage Gate

1. **Gate-0 (Preflight):** current-state audit against `docs/TASKS.md` and existing code.
2. **Gate-1 (Freeze):** Agent-1 publishes Contract Freeze v1.
3. **Gate-2 (Parallel):** Agent-2 and Agent-3 execute in parallel on v1.
4. **Gate-3 (Reconcile):** contract compatibility and integration tests.
5. **Gate-4 (Finish):** monorepo verification and docs updates.

### Required Checkpoints

- **CP-1:** Contract Freeze v1 published.
- **CP-2:** Midpoint sync: known API/UX decisions resolved.
- **CP-3:** Integration sync: FE parsers match BE responses exactly.
- **CP-4:** Final sync: all required tests pass.

### Drift Policy

- Version tags: `v1`, `v1.1`, `v1.2`.
- Any drift issue must reference exact contract field and owner.

---

## C) Agent-1 Playbook (Foundation: Shared Zod Contracts)

### Ownership

Single source of truth for settings/auth payload schemas and error schema.

### Files

- `packages/shared/src/schemas/settings.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/schemas/settings.test.ts`

### User Stories Covered

- US-P1, US-P2, US-P3, US-P4, US-V1, US-V2, US-V3, US-N1, US-A1 (contract layer)

### TDD Execution (Required)

1. Write failing schema tests for all request/response contracts.
2. Run tests to confirm failures.
3. Implement minimal schema definitions to pass.
4. Re-run tests + typecheck.
5. Refactor schema naming/exports while keeping tests green.

### Tasks

1. Define:
  - `profileSettingsSchema`
  - `privacySettingsSchema`
  - `notificationSettingsSchema`
  - `settingsResponseSchema`
  - `changePasswordSchema`
  - `pushSubscriptionSchema`
  - `apiFieldErrorSchema`
  - `apiErrorResponseSchema`
2. Encode edge validation:
  - trim-aware display name (not spaces-only), max 100
  - avatar URL max 500 with explicit nullable/optional semantics
  - password confirm refinement
3. Export inferred types from shared index.
4. Publish **Contract Freeze v1** note:
  - field table
  - nullability/optionality
  - endpoint payload mapping
  - error payload shape

### Exit Criteria

- Schema tests pass.
- Shared typecheck passes.
- Freeze note published and acknowledged by Agent-2 and Agent-3.

---

## D) Agent-2 Playbook (Backend)

### Ownership

Backend persistence, API endpoints, security, and behavior enforcement.

### Files

- `packages/db/src/schema/index.ts`
- `packages/db/src/migrations/`*
- `apps/server/src/settings/settings.module.ts`
- `apps/server/src/settings/settings.controller.ts`
- `apps/server/src/settings/settings.service.ts`
- `apps/server/src/settings/settings.repository.ts`
- `apps/server/src/settings/*.spec.ts`
- `apps/server/src/auth/auth.controller.ts`
- `apps/server/src/auth/auth.service.ts`
- `apps/server/src/auth/dto/change-password.dto.ts`
- `apps/server/src/auth/*.spec.ts`
- Optional compatibility layer: `apps/server/src/users/`*

### User Stories Covered

- US-P1, US-P2, US-P3, US-P4, US-V1, US-V2, US-V3, US-N1/N2/N3, US-A2

### TDD Execution (Required)

1. Write failing controller/service tests for each endpoint + behavior rule.
2. Run tests and confirm failures.
3. Implement minimal endpoint/service/repository logic.
4. Add integration tests for behavior impacts.
5. Re-run tests + typecheck and refactor safely.

### Tasks

1. Migration updates:
  - `profilePhotoVisibility`
  - `pushNotificationsEnabled`
  - `push_subscriptions` table
2. Implement endpoints:
  - `GET /api/settings`
  - `PATCH /api/settings/profile`
  - `PATCH /api/settings/privacy`
  - `PATCH /api/settings/notifications`
  - `POST /api/settings/push-subscription`
  - `POST /api/auth/change-password`
3. Enforce security:
  - validate current password
  - hash new password
  - rate limit 5/15m
4. Behavior-impact requirements:
  - read receipts off affects future read behavior
  - presence policy enforcement on reads/visibility
  - photo visibility policy behavior
5. Error contract:
  - response shape aligned to shared error schema
6. Compatibility:
  - maintain or adapt `/api/users/me` consumers and document decision.

### Exit Criteria

- API tests pass.
- Security + rate-limit tests pass.
- Behavior-effect integration tests pass.
- No local contract duplication.

---

## E) Agent-3 Playbook (Frontend)

### Ownership

Settings UI/UX, hooks, optimistic state, debounce behavior, push permission flow, account/logout UX.

### Files

- `apps/web/src/lib/api.ts`
- `apps/web/src/hooks/useSettings.ts`
- `apps/web/src/hooks/useDebouncedMutation.ts`
- `apps/web/src/hooks/usePushNotifications.ts`
- `apps/web/src/components/settings/ProfileSection.tsx`
- `apps/web/src/components/settings/PrivacySection.tsx`
- `apps/web/src/components/settings/NotificationsSection.tsx`
- `apps/web/src/components/settings/AccountSection.tsx`
- `apps/web/src/components/settings/ChangePasswordModal.tsx`
- `apps/web/src/pages/SettingsPage.tsx`
- `apps/web/src/**/*.test.tsx`
- `apps/web/e2e/settings.spec.ts`

### User Stories Covered

- US-P1, US-P2, US-P3, US-P4, US-V1, US-V2, US-V3, US-N1/N2/N3, US-A1/A2

### TDD Execution (Required)

1. Write failing hook/component tests for each acceptance behavior.
2. Run tests and confirm failures.
3. Implement minimal UI/hooks/API integration on frozen contracts.
4. Add E2E coverage for core flows and edge cases.
5. Re-run tests + build and refactor while tests stay green.

### Tasks

1. Implement API client methods with shared Zod parsing.
2. Build hooks for fetch/update/password with optimistic rollback.
3. Apply 500ms debounce for settings updates.
4. Implement required UX behavior:
  - disable presence-sharing control when presence is OFF
  - avatar fallback for invalid/unset image
  - notification denied/unsupported states with proper revert and guidance
5. Push flow:
  - permission request
  - subscribe/register
  - persist preference/subscription state
6. Account/logout:
  - logout action
  - clear local session and query cache
  - clear local push-related state
7. Section-level loading/error retry behavior.

### Exit Criteria

- Hook/component tests pass.
- E2E workflow passes.
- UI behavior matches PRD edge cases.
- No contract drift from shared schemas.

---

## F) Integration, Verification, Done

### Requirement Traceability (Condensed)


| Req                                                        | Owner            | Test Type                     |
| ---------------------------------------------------------- | ---------------- | ----------------------------- |
| Auto-save + debounce                                       | FE + BE          | hook + API tests              |
| Password security + rate limit                             | BE + FE          | auth/controller + modal tests |
| Push permission/subscription flow                          | FE + BE          | hook/API + E2E                |
| Behavior effects (presence/read-receipts/photo visibility) | BE + FE          | integration + E2E             |
| Error shape parity                                         | Shared + BE + FE | contract + mapping tests      |


### Verification Commands

- `cd packages/shared && bun run typecheck && bun test`
- `cd apps/server && bun run typecheck && bun run test`
- `cd apps/web && bun run typecheck && bun run test && bun run build`
- `bun run typecheck && bun run lint && bun run test`

### Final Done Criteria

- All three agent exit criteria satisfied.
- Checkpoints CP-1..CP-4 completed.
- No contract drift issues open.
- `docs/TASKS.md` reality status updated with what was reused vs newly implemented.

