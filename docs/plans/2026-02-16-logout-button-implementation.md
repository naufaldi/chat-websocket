# Logout Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the logout button redirect to login page after clearing auth tokens.

**Architecture:** Update the useLogout hook to redirect to /login after clearing tokens. Add logout API call to the frontend (endpoint can be a no-op or return 404 if backend not ready).

**Tech Stack:** React, React Router, TanStack Query

---

### Task 1: Add logout API endpoint to frontend

**Files:**
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Add logout function to authApi**

Open `apps/web/src/lib/api.ts` and add logout to the authApi object:

```typescript
// Add after refresh line (line 103)
logout: () => api.post('/auth/logout'),
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/api.ts
git commit -m "feat(auth): add logout API endpoint"
```

---

### Task 2: Update useLogout hook to call API and redirect

**Files:**
- Modify: `apps/web/src/hooks/useAuth.ts:52-60`

**Step 1: Read current useLogout implementation**

The current implementation just clears tokens:

```typescript
// Hook for logout
export function useLogout() {
  const queryClient = useQueryClient();

  return () => {
    clearAuthToken();
    queryClient.clear();
  };
}
```

**Step 2: Update useLogout to use useNavigate and call API**

Replace the useLogout function with:

```typescript
// Hook for logout
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useCallback(async () => {
    try {
      // Call logout endpoint (may fail if backend not implemented)
      await authApi.logout();
    } catch {
      // Ignore errors - logout should work even if endpoint fails
    } finally {
      // Always clear tokens and redirect
      clearAuthToken();
      queryClient.clear();
      navigate('/login', { replace: true });
    }
  }, [navigate, queryClient]);
}
```

**Step 3: Add useNavigate import**

Add to the imports at the top of the file:

```typescript
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
```

**Step 4: Run build to check for errors**

```bash
cd apps/web && bun run build
```

Expected: Build completes without errors

**Step 5: Commit**

```bash
git add apps/web/src/hooks/useAuth.ts
git commit -m "feat(auth): update useLogout to redirect to login"
```

---

### Task 3: Verify logout works end-to-end

**Step 1: Start the dev server**

```bash
cd apps/web && bun run dev
```

**Step 2: Login with test credentials**
- Navigate to http://localhost:5173/login
- Login with valid credentials

**Step 3: Click logout button**
- Verify button is visible in the header
- Click the Logout button

**Expected:**
- User is redirected to /login
- localStorage is cleared (check DevTools > Application > Local Storage)
- No errors in console

**Step 4: Commit verification**

```bash
git commit --allow-empty -m "test: verify logout button redirects to login"
```

---

### Summary

| Task | Description |
|------|-------------|
| 1 | Add logout API call to frontend |
| 2 | Update useLogout hook to redirect to /login |
| 3 | Verify logout works end-to-end |

**Notes:**
- The backend logout endpoint doesn't exist yet (per TASKS.md it should blacklist tokens), but frontend will work regardless by catching the error
- When backend implements `/api/auth/logout`, it will also invalidate the refresh token
