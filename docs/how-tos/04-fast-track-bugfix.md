# How-To: Fast-Track Bugfix Protocol (Zero-Contamination)

When a regression, runtime panic, or dogfood defect is discovered, this guide details how to resolve it with zero branch contamination.

---

## Hard Rules

- **NEVER** edit production code directly on `main` or `master`.
- **NEVER** fix a bug inside an uncommitted, dirty feature branch.
- **NEVER** apply a fix without a failing test reproducing the defect first.

---

## Step 1: Gate B1 — Log Bug Report & Root Cause

1. Copy the bug report template:
   ```bash
   date_str=$(date +%Y-%m-%d)
   cp openspec/spec-rails/bug-report.md "docs/bug-reports/${date_str}-token-expiry-panic.md"
   ```
2. Document:
   - Component affected
   - Exact reproduction steps
   - Expected vs Actual behavior
   - Root cause analysis
   - Remediation plan
3. Obtain Gate B1 human approval before touching code.

---

## Step 2: Spawn Isolated Bugfix Worktree

Branch directly off the target base branch (`main` or `master`):

```bash
git worktree add .worktrees/fix-token-expiry -b fix/token-expiry main
```

Navigate to the worktree:

```bash
cd .worktrees/fix-token-expiry
```

---

## Step 3: Gate B2 — Mandatory Red-First Reproduction

1. Write a targeted regression test recreating the defect *before modifying production code*.
2. Run the test:
   ```bash
   # Test MUST fail (Red)
   cargo test test_token_expiry_panic
   # or: pytest tests/test_token.py -k test_token_expiry_panic
   ```
3. Verify test failure matches the reported defect and show the output to the human. Keep the Red test **uncommitted** (pre-commit would reject it).

---

## Step 4: Minimal Surgical Fix (Green)

1. Apply the minimal code change to turn the test passing (`Green`).
2. Run the full test suite to guarantee zero regressions.
3. Check mutation resistance if applicable.
4. If the defect came from or affects living specs or docs, fix them in this branch.
5. Commit the regression test and fix together.

---

## Step 5: Gate B3 — Integration Sign-off & Pruning

1. Rebase onto the latest `main` and re-run the full suite (`--ff-only` fails if `main` moved):
   ```bash
   git rebase main
   ```
2. Return to the main repository and fast-forward merge:
   ```bash
   cd ../..
   git checkout main
   git merge --ff-only fix/token-expiry
   ```
3. Prune the worktree and delete the fix branch:
   ```bash
   git worktree remove .worktrees/fix-token-expiry
   git branch -d fix/token-expiry
   git worktree prune
   ```
4. Mark the bug report as `Resolved` in `docs/bug-reports/` with the commit hash.
5. If active feature streams or worktrees need the fix, rebase them on updated `main`.
