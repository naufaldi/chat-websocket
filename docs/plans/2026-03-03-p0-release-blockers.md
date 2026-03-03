# P0 Council Audit Release Blockers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve all P0 Linear release blockers (PER-52, PER-53, PER-54, PER-55) so deployment, health checks, migrations, and token revocation are production-safe.

**Architecture:** Apply minimal, targeted fixes across deployment config, API path wiring, DB migration strategy, and auth revocation storage. Keep behavior backward-compatible where practical while aligning runtime behavior, DB schema, and API documentation to the same contract.

**Tech Stack:** Bun, NestJS 11, Docker Compose, Drizzle ORM, PostgreSQL, Redis, Vitest

---

## Scope and Linear Mapping

- PER-52: Fix Docker Compose build path
- PER-53: Align health and metrics probe/scrape paths with global `/api` prefix
- PER-54: Safe enum migration from `friends` to `contacts`
- PER-55: Replace in-memory token blacklist with shared Redis-backed store

---

### Task 1: PER-52 - Fix Docker Compose Build Path

**Files:**
- Modify: `docker-compose.yml`
- Verify reference: `apps/server/Dockerfile`
- Test: `apps/server/src/deployment.test.ts`

**Step 1: Write the failing test/assertion**

Add or update a deployment config unit test to assert app service build points to the existing Dockerfile path.

```ts
expect(compose.services.app.build.context).toBe('.')
expect(compose.services.app.build.dockerfile).toBe('apps/server/Dockerfile')
```

**Step 2: Run test to verify it fails**

Run: `bun run test --filter @chat/server`
Expected: FAIL where dockerfile path is currently `Dockerfile`.

**Step 3: Write minimal implementation**

Update `docker-compose.yml` app build section:

```yaml
build:
  context: .
  dockerfile: apps/server/Dockerfile
```

**Step 4: Run test to verify it passes**

Run: `bun run test --filter @chat/server`
Expected: PASS for updated deployment assertion.

**Step 5: Validate compose config rendering**

Run: `docker compose config`
Expected: resolved build config references `apps/server/Dockerfile`.

**Step 6: Commit**

```bash
git add docker-compose.yml apps/server/src/deployment.test.ts
git commit -m "fix(deploy): point compose build to apps/server Dockerfile"
```

---

### Task 2: PER-53 - Align Health and Metrics Paths with `/api` Prefix

**Files:**
- Modify: `docker-compose.yml`
- Modify: `prometheus.yml`
- Verify: `apps/server/src/main.ts`
- Verify: `apps/server/src/health/health.controller.ts`
- Verify: `apps/server/src/metrics/metrics.controller.ts`
- Test: `apps/server/src/deployment.test.ts`
- Test: `apps/server/src/metrics/metrics.controller.test.ts`

**Step 1: Write failing tests for prefixed paths**

Add/update tests asserting probes and metrics scraping use prefixed routes:

```ts
expect(healthProbe).toContain('/api/health/live')
expect(metricsPath).toBe('/api/metrics')
```

**Step 2: Run tests to verify they fail**

Run: `bun run test --filter @chat/server`
Expected: FAIL on old unprefixed `/health/live` and `/metrics` expectations/config.

**Step 3: Write minimal implementation**

- Change compose healthcheck URL to `http://localhost:3000/api/health/live`
- Update Prometheus scrape target path to `/api/metrics`
- Keep controller routes as-is (`health`, `metrics`) so global prefix in `main.ts` produces final `/api/*` paths.

**Step 4: Run tests to verify they pass**

Run: `bun run test --filter @chat/server`
Expected: PASS on deployment and metrics path tests.

**Step 5: Smoke verify locally**

Run: `curl -fsS http://localhost:3000/api/health/live && curl -fsS http://localhost:3000/api/metrics`
Expected: liveness JSON and Prometheus text payload returned.

**Step 6: Commit**

```bash
git add docker-compose.yml prometheus.yml apps/server/src/deployment.test.ts apps/server/src/metrics/metrics.controller.test.ts
git commit -m "fix(observability): align probes and scrape paths with api prefix"
```

---

### Task 3: PER-54 - Safe Enum Migration `friends` -> `contacts`

**Files:**
- Modify: `packages/db/migrations/0006_panoramic_excalibur.sql`
- Verify: `packages/db/src/schema/index.ts`
- Modify: `apps/server/src/users/users.controller.ts`
- Modify: `apps/server/src/settings/settings.controller.ts`
- Modify: `apps/server/src/presence/presence.service.ts`
- Modify tests: `apps/server/src/presence.test.ts`
- Modify tests: any server tests asserting `'friends'` enum values

**Step 1: Write failing migration safety and enum consistency tests**

Add/update tests to enforce API/contracts only expose `everyone | contacts | nobody`.

```ts
expect(allowedValues).toEqual(['everyone', 'contacts', 'nobody'])
```

Also add a migration verification note/script asserting no residual `friends` values exist before enum cast.

**Step 2: Run tests to verify failure**

Run: `bun run test --filter @chat/server`
Expected: FAIL where `'friends'` is still present in controller docs/tests.

**Step 3: Write minimal implementation (safe migration pattern)**

In migration SQL:
1. Convert enum columns to text.
2. `UPDATE users SET presence_sharing = 'contacts' WHERE presence_sharing = 'friends';`
3. `UPDATE users SET profile_photo_visibility = 'contacts' WHERE profile_photo_visibility = 'friends';`
4. Recreate enum with `contacts`.
5. Cast text columns back to enum.

In server code and Swagger schemas:
- Replace `'friends'` with `'contacts'` in all enum declarations and descriptions.
- Update presence service comments/logic naming to `contacts`.

**Step 4: Run tests to verify pass**

Run: `bun run test --filter @chat/server`
Expected: PASS with enum expectations aligned to `contacts`.

**Step 5: Validate migration dry run**

Run: `bun run migrate --filter @chat/db`
Expected: migration applies without enum cast failures on existing data.

**Step 6: Commit**

```bash
git add packages/db/migrations/0006_panoramic_excalibur.sql packages/db/src/schema/index.ts apps/server/src/users/users.controller.ts apps/server/src/settings/settings.controller.ts apps/server/src/presence/presence.service.ts apps/server/src/presence.test.ts
git commit -m "fix(db): make presence enum migration safe from friends to contacts"
```

---

### Task 4: PER-55 - Shared Redis-Backed Token Blacklist

**Files:**
- Modify: `apps/server/src/auth/token-blacklist.service.ts`
- Modify: `apps/server/src/auth/auth.module.ts`
- Modify: `apps/server/src/auth/auth.service.ts`
- Modify: `apps/server/src/auth/strategies/jwt.strategy.ts`
- Create/Modify test: `apps/server/src/auth/token-blacklist.service.test.ts`
- Modify test: `apps/server/src/auth/auth.service.test.ts`

**Step 1: Write failing tests for distributed revocation behavior**

Add tests that assert:
- blacklist writes use Redis key with TTL based on JWT expiry
- blacklisted token lookup reads shared store
- service degrades gracefully if Redis unavailable (documented behavior)

```ts
expect(redisSetCalledWith).toMatchObject({ key: `blacklist:${jti}`, ttlSeconds: expect.any(Number) })
expect(await service.isBlacklisted(jti)).toBe(true)
```

**Step 2: Run tests to verify failure**

Run: `bun run test --filter @chat/server`
Expected: FAIL because current implementation is in-process `Map`.

**Step 3: Write minimal implementation**

- Replace `Map` storage with Redis client usage (`REDIS_URL`) using existing server Redis conventions.
- Store revocation keys as `token_blacklist:{jti}` with EX ttl.
- Keep a bounded in-memory fallback only when Redis is not configured/available, with explicit logs.
- Preserve current `add(tokenId, expiresAt)` and `isBlacklisted(tokenId)` API to minimize call-site churn.

**Step 4: Run tests to verify pass**

Run: `bun run test --filter @chat/server`
Expected: PASS for new blacklist unit tests and existing auth tests.

**Step 5: Integration sanity check**

Run:
- `curl -X POST /api/auth/logout` with refresh token
- `curl -X POST /api/auth/refresh` with same revoked token

Expected: refresh attempt rejected with token revoked response.

**Step 6: Commit**

```bash
git add apps/server/src/auth/token-blacklist.service.ts apps/server/src/auth/auth.module.ts apps/server/src/auth/auth.service.ts apps/server/src/auth/strategies/jwt.strategy.ts apps/server/src/auth/token-blacklist.service.test.ts apps/server/src/auth/auth.service.test.ts
git commit -m "fix(auth): move token blacklist to shared redis store"
```

---

## Cross-Task Verification Gate (Required Before Merge)

Run from repo root:

```bash
bun run lint
bun run typecheck
bun run test
docker compose config
```

Run runtime smoke checks:

```bash
curl -fsS http://localhost:3000/api/health/live
curl -fsS http://localhost:3000/api/health/ready
curl -fsS http://localhost:3000/api/metrics
```

Expected:
- Monorepo lint/typecheck/tests pass
- Compose config valid
- Health and metrics endpoints accessible at prefixed paths
- No `friends` enum value remains in API contracts or DB migration path
- Logout revocation is enforced across process boundaries via Redis

---

## Risks and Mitigations

- Migration risk (PER-54): legacy rows containing `friends` can fail enum cast -> mitigate with explicit SQL data rewrite before cast.
- Auth availability risk (PER-55): Redis outage could affect logout semantics -> mitigate with clear fallback policy and logs, plus readiness visibility.
- Deployment drift risk (PER-52/PER-53): config and tests can diverge -> mitigate by asserting exact compose/probe paths in tests.

---

## Definition of Done (P0 Bundle)

- All four Linear P0 issues resolved with merged code and passing verification gate.
- Docker build and health checks succeed in Compose deployment.
- Prometheus scrapes `/api/metrics` successfully.
- Presence/privacy enum contract is consistently `everyone|contacts|nobody` across DB, API, and tests.
- Token revocation persists in shared Redis storage and remains effective across replicas/restarts.
