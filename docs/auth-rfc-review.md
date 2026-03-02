# Authentication RFC Review Report

Date: 2026-02-27  
Scope: `docs/rfc/rfc-authentication.md` vs current implementation in `apps/server` and `apps/web`

---

## Executive Summary

The auth implementation is functional for basic login/register, but it diverges from the RFC in several security-critical areas:

- Refresh token is handled in client `localStorage` and API body, not HTTP-only cookie as RFC specifies.
- Refresh token rotation/reuse detection is not implemented.
- Logout behavior is inconsistent and can fail to revoke tokens server-side.
- Token blacklist is in-memory only (not Redis/distributed), which breaks revocation in multi-instance/restart scenarios.
- WebSocket auth flow does not perform token refresh/reconnect behavior described in RFC, causing avoidable session drops.

Overall: **Medium-to-High risk** for production hardening.  
Primary risks are token theft blast radius (XSS), inconsistent session revocation, and architecture mismatch vs documented security model.

---

## Findings (Ordered by Severity)

## 1) Critical: Refresh token exposed to JavaScript and sent in request body

**RFC expectation**
- Refresh token in **HTTP-only cookie** (`sameSite`, `secure`, scoped path), not accessible to JS.
- Refresh flow uses cookie credentials (`credentials: include`), not token in JSON body.

**Current implementation**
- Frontend stores refresh token in `localStorage` in `apps/web/src/lib/api.ts` (`setAuthToken`).
- Axios refresh call sends `{ refreshToken }` in request body (`apps/web/src/lib/api.ts`).
- Backend `POST /auth/refresh` expects body `{ refreshToken }` (`apps/server/src/auth/auth.controller.ts`).

**Impact**
- XSS can exfiltrate long-lived refresh token, enabling persistent account takeover until expiry/revocation.
- Violates RFC’s core defense model for token handling.

**Recommendation**
- Move refresh token to HTTP-only cookie immediately.
- Remove refresh token from response body and frontend storage.
- Use `withCredentials`/cookie-based refresh only.

---

## 2) Critical: Logout revocation path is semantically broken/inconsistent

**RFC expectation**
- Logout revokes active session token(s) reliably.

**Current implementation**
- `logout` endpoint is JWT-protected and reads `Authorization` header as if it contains **refresh token**.
- Frontend sends `Authorization: Bearer <accessToken>` by default via interceptor.
- Service verifies logout token with refresh secret; if invalid, it silently swallows error and does nothing.

Files:
- `apps/server/src/auth/auth.controller.ts`
- `apps/server/src/auth/auth.service.ts`
- `apps/web/src/lib/api.ts`

**Impact**
- Server-side revocation may not occur on logout.
- User thinks session is ended, but token(s) may remain valid until expiration.

**Recommendation**
- Redesign logout contract:
  - If cookie-based refresh: revoke cookie-bound refresh token family server-side.
  - Also revoke presented access token `jti` from auth guard context.
- Do not rely on parsing refresh token from `Authorization` header.

---

## 3) High: No refresh rotation/reuse detection despite RFC design

**RFC expectation**
- Refresh token family tracking, rotation count, and reuse detection with Redis-backed state.

**Current implementation**
- `refreshTokens(userId, email)` issues new tokens without validating token family history.
- No family, no reuse detection, no max rotations.
- Old refresh tokens remain valid unless blacklisted manually.

File:
- `apps/server/src/auth/auth.service.ts`

**Impact**
- Stolen refresh tokens can be replayed repeatedly.
- No breach signal when old token reused.

**Recommendation**
- Implement dedicated token service for:
  - `family` claim
  - per-family state in Redis
  - one-time refresh rotation
  - reuse detection => invalidate family + force re-auth

---

## 4) High: Blacklist is in-memory only (not durable/distributed)

**RFC expectation**
- Redis-backed blacklist/revocation checks across nodes.

**Current implementation**
- `TokenBlacklistService` uses process memory `Map`.

File:
- `apps/server/src/auth/token-blacklist.service.ts`

**Impact**
- Revocations lost on restart.
- Multi-instance deployments have inconsistent revocation behavior.
- WebSocket/API token revocation checks become node-dependent.

**Recommendation**
- Replace in-memory blacklist with Redis TTL keys (`blacklist:{jti}`).
- Keep optional in-memory fallback only for local dev.

---

## 5) Medium-High: WebSocket auth UX/security flow diverges from RFC

**RFC expectation**
- On token expiry/auth error, client should refresh token then reconnect.

**Current implementation**
- Socket `auth:error` with `AUTH_FAILED` clears both tokens and hard-redirects to login.
- No socket-specific refresh retry path.

File:
- `apps/web/src/lib/socket.ts`

**Impact**
- Poor UX: users get kicked to login on transient token expiry.
- Inconsistent behavior: HTTP may refresh silently; WebSocket does not.

**Recommendation**
- On socket auth failure due expiry:
  - attempt one refresh via cookie endpoint
  - reconnect socket with new access token
  - fallback to login only if refresh fails

---

## 6) Medium: Secret separation is optional fallback, not enforced

**RFC expectation**
- Distinct access and refresh secrets.

**Current implementation**
- Refresh signing/verification falls back to `JWT_SECRET` when `JWT_REFRESH_SECRET` missing.

File:
- `apps/server/src/auth/auth.service.ts`
- `apps/server/src/auth/auth.controller.ts`

**Impact**
- Misconfiguration can silently collapse access/refresh trust boundaries.

**Recommendation**
- Fail fast at startup if `JWT_SECRET` or `JWT_REFRESH_SECRET` missing.
- Enforce non-equal values in config validation.

---

## 7) Medium: Validation strategy drift (shared Zod vs backend DTOs)

**RFC + workspace guidance expectation**
- Single source of truth schemas (Zod in shared package) preferred.

**Current implementation**
- Frontend enforces stronger password policy via shared Zod.
- Backend `RegisterDto` currently only enforces min length and class-validator rules.

Files:
- `packages/shared/src/schemas/auth.ts`
- `apps/server/src/auth/dto/register.dto.ts`

**Impact**
- API can accept weaker passwords than frontend policy if called directly.
- Maintainability drift between FE and BE validation rules.

**Recommendation**
- Align backend validation with shared Zod schema (or equivalent strict DTO rules).
- Add contract tests asserting backend rejects weak passwords.

---

## 8) Medium: API contract inconsistency in refresh response shape

**Issue**
- Controller `RefreshResponse` interface documents only `accessToken`.
- Service currently returns both `accessToken` and `refreshToken`.
- Frontend interceptor only uses `accessToken`.

Files:
- `apps/server/src/auth/auth.controller.ts`
- `apps/server/src/auth/auth.service.ts`

**Impact**
- Confusing contract; accidental regressions likely.

**Recommendation**
- Define one canonical refresh response shape and enforce with shared schema + tests.

---

## 9) Low-Medium: Security headers in RFC not reflected in runtime bootstrap

**RFC expectation**
- Helmet CSP/HSTS and explicit security header strategy.

**Current implementation**
- `main.ts` enables CORS and validation but does not configure Helmet as shown in RFC.

File:
- `apps/server/src/main.ts`

**Impact**
- Reduced baseline hardening (depends on upstream infra for headers).

**Recommendation**
- Add Helmet with environment-tuned CSP/HSTS, or document infra-level equivalent and remove mismatch from RFC.

---

## UI/UX Review Notes

- Login/Register forms are user-friendly and include rate-limit messaging (`Retry-After` support).
- Session-expired notice exists on login page (`?unauthorized=true` flow), good baseline.
- Main UX gap: WebSocket auth failure causes hard logout instead of silent refresh/reconnect.
- Consider preserving post-login return path for protected redirects (currently always route to `/login`/`/`).

---

## Maintainability Review Notes

- Auth logic is fragmented between interceptor logic, auth hooks, context event listeners, and socket auth handling.
- Refresh path behavior differs between `authApi.refresh()` and interceptor refresh code (different request shape assumptions).
- RFC and implementation have substantial drift; this will mislead future contributors.

Recommended maintainability actions:
- Create one `AuthSessionService` contract (FE + BE) for refresh/logout semantics.
- Use shared schema types for all auth responses.
- Add integration tests for:
  - login -> refresh -> websocket reconnect
  - logout revocation verification
  - refresh-token reuse detection

---

## RFC-to-Implementation Alignment Status

- **Aligned**: Argon2 password hashing, 15m/7d token lifetimes, basic throttling on login/register.
- **Partially aligned**: JWT blacklist concept exists but storage architecture differs.
- **Not aligned**: cookie-based refresh model, rotation/reuse detection, websocket refresh flow, security header posture.

---

## Suggested Remediation Priority

1. Migrate refresh token to HTTP-only cookie and remove localStorage refresh token.
2. Fix logout to revoke both access `jti` and refresh token family reliably.
3. Implement refresh token family rotation + reuse detection in Redis.
4. Replace in-memory blacklist with Redis-backed revocation.
5. Add websocket refresh/reconnect flow to match HTTP session continuity.
6. Align backend validation with shared auth schema and harden config checks.
7. Update RFC to reflect reality where intentional, or implement missing RFC behavior where required.

---

## Final Assessment

Auth is usable for development, but production security posture is currently below the RFC design intent.  
The biggest improvement comes from fixing token lifecycle architecture (storage, rotation, revocation) and unifying behavior across REST and WebSocket flows.

