# Merge Conflict Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve outstanding merge conflicts and prevent TypeScript build artifacts from reappearing in commits.

**Architecture:** Update documentation to a single, consistent status for TASK-002; remove generated build artifacts from version control; add ignore rule for `.tsbuildinfo` files to avoid future conflicts.

**Tech Stack:** Git, Markdown, TypeScript build artifacts

---

### Task 1: Resolve TASK-002 Conflict in Documentation

**Files:**
- Modify: `docs/TASKS.md:387-407`

**Step 1: Identify conflicting block**

Run: `rg -n "<<<<<<<|=======|>>>>>>>" docs/TASKS.md`
Expected: conflict markers around TASK-002 Definition of Done.

**Step 2: Choose the correct completion status**

Replace the conflicted block with a single, consistent status list that matches the current project state.

**Step 3: Verify conflict markers removed**

Run: `rg -n "<<<<<<<|=======|>>>>>>>" docs/TASKS.md`
Expected: no matches.

**Step 4: Commit**

```bash
git add docs/TASKS.md
git commit -m "docs: resolve TASK-002 status conflict"
```

### Task 2: Remove TypeScript Build Artifact Conflicts

**Files:**
- Delete: `apps/server/tsconfig.tsbuildinfo`
- Modify: `.gitignore`

**Step 1: Remove the committed build artifact**

Delete `apps/server/tsconfig.tsbuildinfo` from version control.

**Step 2: Ignore future build artifacts**

Add `*.tsbuildinfo` to `.gitignore`.

**Step 3: Verify no conflict markers**

Run: `rg -n "<<<<<<<|=======|>>>>>>>" apps/server/tsconfig.tsbuildinfo .gitignore`
Expected: no matches (file removed).

**Step 4: Commit**

```bash
git add .gitignore
git rm apps/server/tsconfig.tsbuildinfo
git commit -m "chore: ignore tsbuildinfo artifacts"
```

---

### Task 3: Final Verification

**Files:**
- Verify: `docs/TASKS.md`, `.gitignore`

**Step 1: Re-scan for conflict markers**

Run: `rg -n "<<<<<<<|=======|>>>>>>>" docs/TASKS.md .gitignore`
Expected: no matches.

**Step 2: Commit summary (optional)**

If you prefer a single commit, squash the previous commits into one.
