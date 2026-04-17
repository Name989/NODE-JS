# Quality Gate Process — NODE JS BACKEND

> This document explains the philosophy and process behind the three mandatory quality gates
> that every task specification must pass before implementation begins.

---

## Why Quality Gates?

Quality gates exist to catch design flaws, security risks, and implementation pitfalls
**before any code is written** — when fixes are cheap. A task that fails a gate in review
costs minutes to fix; the same flaw found in production costs days.

---

## Gate Overview

| Gate | Reviewer Role | Focus |
|------|--------------|-------|
| Gate 1 | Senior Developer | Component sync, API contracts, layer coupling, standards |
| Gate 2 | Security & Performance Consultant | Vulnerabilities, data leakage, N+1 queries, blocking ops |
| Gate 3 | Lead Developer (Pre-Dev Sweep) | Confirm Gates 1 & 2 resolved; predict critical bugs; add missing edge cases |

**Blocking threshold**: HIGH or CRITICAL findings block the gate.
MEDIUM and LOW are recorded as advisory but do not block.

---

## Gate Sequencing

1. Gate 1 must be **Approved** before Gate 2 runs.
2. Gate 2 must be **Approved** before Gate 3 runs.
3. When a gate is **BLOCKED**: update the Specification to resolve HIGH/CRITICAL findings, then re-run only the blocked gate.
4. Gate 3 always reads the **final** Specification text (after any Gate 1/2 fixes).
5. File moves to `backlog/specification/` **only** when all three gates show `Status: Approved`.
6. When a task is reopened from `done/` due to a bug: reset all gate statuses to `pending` — gates re-run on the updated spec.

---

## Gate 1 — Senior Developer Review

Claude reviews as a senior developer who did not write the spec.

**Checklist:**
- [ ] Controller routes match exactly what model/service methods return (field names, types, shape)
- [ ] Every field consumed by the frontend exists in the API response shape defined in the spec
- [ ] JS/TS component state variables match field names returned by the API
- [ ] Every async dependency has proper error handling defined
- [ ] Any new environment variable is documented and read from a config module (not hardcoded)
- [ ] New routes are registered in the router and listed in `__manifest__` or equivalent
- [ ] Business logic lives in the service layer, not the controller — controllers route only
- [ ] HIGH complexity: all files in Code Changes table match the Deliverables section in Planning

---

## Gate 2 — Security & Performance Consultant Review

Claude reviews as a third-party security and performance consultant.

**Security checklist:**
- [ ] No route accepts user-controlled input fed directly into a query string or shell command
- [ ] No route skips authentication/authorization middleware
- [ ] No sensitive fields (password, token, key, secret, ssn, bank_account) in any API response
- [ ] User-supplied text going to an LLM is wrapped in delimiters, not concatenated raw
- [ ] All download/export routes verify ownership before streaming data
- [ ] No API keys or tokens logged at any level
- [ ] Rate limiting applies to any route that triggers heavy computation or external calls

**Performance checklist:**
- [ ] No DB query inside a loop (N+1 pattern)
- [ ] No unbounded `findAll` / `SELECT *` without a `WHERE` clause that limits results
- [ ] No config/env value read inside a per-record loop — read once before the loop
- [ ] No blocking external HTTP call inside a batch job without error isolation per record
- [ ] Pagination applied to any list endpoint that could return large result sets

---

## Gate 3 — Pre-Development Sweep

Claude reviews as the lead developer about to implement the spec.

**Part A — Confirm Gates 1 & 2 resolved**: Re-read the Specification section and verify every
HIGH/CRITICAL finding from Gates 1 and 2 is addressed. If any is missing → Gate 3 is BLOCKED.

**Part B — Predict critical implementation bugs:**
- [ ] Wrong field type causing silent data corruption
- [ ] Missing `await` on async calls leading to unhandled promise rejections
- [ ] Race condition: two async operations updating the same resource simultaneously
- [ ] Missing input validation at the controller boundary
- [ ] Foreign key / relation not yet created at migration time
- [ ] Missing `try/catch` around external service calls causing unhandled exceptions
- [ ] JSON serialization of non-serializable types (Date, Buffer, circular reference)
- [ ] Middleware order issue (e.g., auth middleware registered after the route it should protect)

Any predicted bug NOT already covered by a test case → add as a new edge-case row in Test Cases.

---

## Changelog Entries for Gates

```
| YYYY-MM-DD HH:MM | {task-id} | {Name} | Gate 1 approved — no component sync issues |
| YYYY-MM-DD HH:MM | {task-id} | {Name} | Gate 2 approved — no HIGH/CRITICAL findings |
| YYYY-MM-DD HH:MM | {task-id} | {Name} | Gate 3 approved — N edge cases added; moved to specification/ |
```

If a gate was BLOCKED then resolved:
```
| YYYY-MM-DD HH:MM | {task-id} | {Name} | Gate 2 blocked — 1 CRITICAL finding; spec updated |
| YYYY-MM-DD HH:MM | {task-id} | {Name} | Gate 2 re-run — approved |
```
