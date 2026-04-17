# test-002 — Register API

## Metadata
- **ID**: test-002
- **Type**: feature
- **Status**: planning
- **Complexity**: (filled at specification stage)
- **Created**: 2026-04-17
- **Quality Gates**: pending

---

## Planning

### Description
Add a `POST /auth/register` endpoint so new users can self-register without needing manual SQL inserts. The endpoint accepts email, phone, and password; hashes the password; generates a TOTP secret; and creates a user record. A confirmation is returned but no OTP is sent at registration time — the user then calls `/auth/login` to begin the OTP flow.

### Goal
Allow a user to create an account via the API, removing the requirement to seed users manually in PostgreSQL.

### Objectives
- Accept `email`, `phone`, `password` in request body
- Validate all three fields are present and email is valid format
- Check email uniqueness — return 409 if already registered
- Hash password with bcryptjs (salt rounds: 12)
- Generate TOTP secret via `totp.service.generateSecret()`
- Create `User` record in DB
- Return `201` with `{ success: true, message: "User registered successfully" }`

### Deliverables
- `src/services/auth.service.js` — new `register()` function
- `src/controllers/auth.controller.js` — new `register()` handler with input validation
- `src/routes/auth.routes.js` — new rate-limited `POST /auth/register` route
- `tests/unit/auth.service.test.js` — unit tests for register service
- `tests/functional/auth.routes.test.js` — functional tests for register endpoint
- `scripts/seed-user.js` — standalone Node script to seed a test user via CLI

---

## Specification

### Complexity Score: MEDIUM

### Complexity Rationale
Touches 3 existing files + 1 new script. No new migrations needed (User model already has all required fields). Moderate validation logic. Low risk.

### Code Changes Required
| File | Action | Description |
|------|--------|-------------|
| `src/services/auth.service.js` | modify | Add `register(email, phone, password)` function |
| `src/controllers/auth.controller.js` | modify | Add `register()` handler with field + email format validation |
| `src/routes/auth.routes.js` | modify | Add rate-limited `POST /auth/register` route |
| `tests/unit/auth.service.test.js` | modify | Add unit tests for register service |
| `tests/functional/auth.routes.test.js` | modify | Add functional tests for register route |
| `scripts/seed-user.js` | create | CLI script to seed a test user directly in DB |

### Implementation Notes
- `register()` in auth.service calls `User.findOne({ where: { email } })` first; if found throws `{ message: 'Email already registered', status: 409 }`
- Password hashed with `bcrypt.hash(password, 12)`
- TOTP secret generated with `totpService.generateSecret()`
- `User.create()` called with hashed password and secret
- Controller validates: email present, phone present, password present, email matches `/\S+@\S+\.\S+/`
- Rate limiter: 5 req / 60 min on `/auth/register` (stricter than login to prevent account farming)
- `totp_secret` and `password_hash` never returned in response

---

## Test Cases

### Unit Tests
| # | Test Name | Input / Condition | Expected Result | Status |
|---|-----------|-------------------|-----------------|--------|
| U10 | register — success | valid email/phone/password, User.findOne returns null, User.create resolves | returns `{ message: 'User registered successfully' }` | pending |
| U11 | register — duplicate email | User.findOne returns existing user | throws `{ message: 'Email already registered', status: 409 }` | pending |

### Functional Tests
| # | Test Name | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| F10 | register — 201 on valid input | POST /auth/register with email/phone/password | 201 + `{ success: true, message: 'User registered successfully' }` | pending |
| F11 | register — 409 on duplicate email | POST /auth/register with already-used email | 409 + `{ message: 'Email already registered' }` | pending |
| F12 | register — 400 missing email | POST /auth/register without email | 400 + `{ message: 'email is required' }` | pending |
| F13 | register — 400 missing phone | POST /auth/register without phone | 400 + `{ message: 'phone is required' }` | pending |
| F14 | register — 400 missing password | POST /auth/register without password | 400 + `{ message: 'password is required' }` | pending |
| F15 | register — 400 invalid email format | POST /auth/register with "notanemail" | 400 + `{ message: 'email is invalid' }` | pending |

### Edge Cases
| # | Scenario | Expected Behaviour | Status |
|---|----------|--------------------|--------|
| E7 | Password with only spaces | Treat as invalid — return 400 `password is required` (trim check) | pending |
| E8 | Email with leading/trailing spaces | Trim before validation and storage — should succeed if otherwise valid | pending |
| E9 | Concurrent duplicate registration (race) | One request gets 201, second gets 409 — DB unique constraint on email is the final guard | pending |

### Test Plan for QA Team
**Scope**: `POST /auth/register` endpoint — input validation, duplicate detection, successful user creation.

**Pre-conditions**:
- Server running locally
- PostgreSQL connected with migrations applied

**QA Steps**:
1. POST `/auth/register` with `{ "email": "new@example.com", "phone": "+911234567890", "password": "Test@1234" }` — expect 201
2. Repeat same request — expect 409 `Email already registered`
3. POST without `email` field — expect 400
4. POST without `phone` field — expect 400
5. POST without `password` field — expect 400
6. POST with `email: "notanemail"` — expect 400 `email is invalid`
7. POST with `password: "   "` (spaces only) — expect 400
8. Verify the created user exists in DB and `password_hash` is a bcrypt hash, not plaintext
9. Verify `totp_secret` is set and `password` is not returned in response

**Expected Outcomes**:
- 201 for first valid registration
- 409 for duplicate email
- 400 for all missing/invalid field scenarios
- No sensitive fields (`password_hash`, `totp_secret`) in any response

**Out of Scope**:
- Email verification flow
- Phone number format validation

---

## Quality Gates

### Gate 1 — Senior Developer Review
**Date**: 2026-04-17 | **Status**: approved

| # | Severity | Finding | Location in Spec | Resolution |
|---|----------|---------|-----------------|------------|
| 1 | MEDIUM | `totp_secret` must never appear in API response | Implementation Notes | Confirmed — `User.create()` result is not returned; only `{ message }` sent |
| — | — | No HIGH/CRITICAL findings | — | — |

**Verdict**: Approved — no HIGH/CRITICAL component sync issues. MEDIUM finding confirmed resolved.

---

### Gate 2 — Security & Performance Consultant Review
**Date**: 2026-04-17 | **Status**: approved

| # | Severity | Category | Finding | Location in Spec | Mitigation |
|---|----------|----------|---------|-----------------|------------|
| 1 | HIGH | Credential Leak | `password_hash` and `totp_secret` must not appear in response | Implementation Notes | Only `{ message }` returned — model instance never serialised to response |
| 2 | MEDIUM | Rate Limiting | Registration endpoint could be used for account farming | Routes | Stricter limiter: 5 req / 60 min on `/auth/register` — added to spec |
| — | — | — | No CRITICAL findings | — | — |

**Verdict**: Approved — HIGH finding mitigated in spec. MEDIUM addressed with stricter rate limit.

---

### Gate 3 — Pre-Development Sweep
**Date**: 2026-04-17 | **Status**: approved

**Part A — Gate 1 & 2 Resolution Confirmation**
| Finding | Status in Spec | Notes |
|---------|---------------|-------|
| G1-1: totp_secret in response | Resolved — only message returned | Implementation Notes updated |
| G2-1: password_hash in response | Resolved — only message returned | Same mitigation |
| G2-2: account farming rate limit | Resolved — 5 req / 60 min added | Routes section updated |

**Part B — Predicted Implementation Bugs**
| # | Severity | Predicted Bug | Spec Location | Action Taken |
|---|----------|--------------|---------------|--------------|
| 1 | HIGH | Race condition — two concurrent identical emails both pass `findOne` check before either `create` runs | Edge Cases | Added E9 — DB unique constraint as final guard |
| 2 | MEDIUM | Password with only whitespace passes presence check | Edge Cases | Added E7 — trim check before validation |
| 3 | LOW | Email with leading/trailing spaces fails uniqueness check inconsistently | Edge Cases | Added E8 — trim before validate and store |

**Verdict**: Approved — 3 edge cases added; spec is implementation-ready.

---

## Done

### Test Results
(filled after implementation)

### Summary
(filled after implementation)

### Commit / PR
(filled after implementation)
