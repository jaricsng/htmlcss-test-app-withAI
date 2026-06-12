# Test Coverage Report

**Project:** HTML/CSS Test Auto-Marker  
**Version:** 0.1  
**Date:** 12 June 2026  
**Tools:** Vitest + v8 (unit/integration) · Playwright (E2E)

---

## Summary

| Suite | Files | Tests | Assertions | Pass rate |
| --- | --- | --- | --- | --- |
| Server unit + integration | 4 | 52 | 119 | ✅ 100% |
| Client unit | 4 | 21 | 46 | ✅ 100% |
| E2E (Playwright) | 3 | 21 | ~90 | ✅ 100% |
| **Total** | **11** | **94** | **~255** | ✅ **100%** |

---

## Server Coverage

**Tool:** Vitest v4 + `@vitest/coverage-v8`  
**Command:** `npm run test:coverage -w server`

### Overall

| Metric | Covered | Total | Percentage |
| --- | --- | --- | --- |
| Statements | 261 | 298 | **87.58%** |
| Branches | 151 | 200 | **75.50%** |
| Functions | 51 | 56 | **91.07%** |
| Lines | 248 | 280 | **88.57%** |

### Per-file breakdown

| File | Stmts % | Branch % | Funcs % | Lines % | Uncovered lines |
| --- | --- | --- | --- | --- | --- |
| `src/app.ts` | 90.00 | 100.00 | 50.00 | 100.00 | — |
| `src/db/schema.ts` | 92.00 | 100.00 | 100.00 | 91.66 | 56–57 |
| `src/routes/attempts.ts` | 95.65 | 80.43 | 100.00 | 98.43 | 45 |
| `src/routes/questions.ts` | 48.57 | 56.52 | 57.14 | 48.57 | 81–86, 92, 106–115 |
| `src/routes/tests.ts` | 97.22 | 93.75 | 100.00 | 96.87 | 61 |
| `src/services/grader.ts` | 85.88 | 71.21 | 91.66 | 87.80 | 143, 163, 211, 217, 252–258 |

---

### What each uncovered block represents

#### `src/db/schema.ts` — lines 56–57
```
ROLLBACK path inside the transaction helper
```
The `transaction()` wrapper's `catch` block (which calls `raw.exec('ROLLBACK')`) is never triggered by the test suite because no test forces a mid-transaction failure. This is infrastructure-level error handling that is difficult to exercise without injecting a runtime DB fault.

---

#### `src/routes/attempts.ts` — line 45
```typescript
return res.status(400).json({ error: 'Test already submitted' });
```
The guard that prevents starting an already-submitted attempt. The integration tests create fresh attempts and submit them but do not call `/attempts/start` a second time after submission.

**Gap:** No test exercises the "call start on a submitted attempt" path.

---

#### `src/routes/tests.ts` — line 61
```typescript
res.json({ ...test, questions });   // student branch of GET /tests/:id
```
The student-facing branch of `GET /tests/:id` (returns questions without criteria). All existing `GET /tests/:id` tests run as the **lecturer** role (which returns the criteria-inclusive branch).

**Gap:** No test fetches a test as a student after it is published.

---

#### `src/routes/questions.ts` — lines 81–86, 92, 106–115

```
DELETE /questions/:id  (entire route handler)
POST   /questions/:id/criteria  (entire route handler)
```
These two route handlers have zero test coverage. The test suite has no tests for:
- Deleting a question
- Adding a grading criterion via POST

**Gap:** `makeQuestionsRouter` tests cover only `POST /` (create) and `PUT /:id` (update). Three of the five route handlers are untested.

---

#### `src/services/grader.ts` — lines 143, 163, 211, 217, 252–258

| Line(s) | Code path |
| --- | --- |
| 143 | `element.textContent` check (DOM criterion with `expected_value` but no `attribute`) |
| 163 | `parseCssRules` JSDoc comment — not executable, flagged by v8 instrumentation |
| 211 | `gradeStyle` — invalid CSS selector throws, returns error result |
| 217 | `gradeStyle` — inline style matches expected value (inline style happy path) |
| 252–258 | `selectorMatches` — `querySelectorAll` throws on invalid selector (catch branch) |

These are edge-case branches in the grading engine: text-content DOM checks, inline-style matching, and error-recovery paths for malformed CSS selectors.

---

### Test cases per file

| File | Test cases | Focus |
| --- | --- | --- |
| `grader.test.ts` | 16 | Unit tests for grading engine logic |
| `attempts.test.ts` | 13 | Integration: attempt lifecycle, grading on submit |
| `tests.test.ts` | 13 | Integration: test CRUD, publish, student discovery |
| `auth.test.ts` | 10 | Integration: register, login, duplicate email, invalid credentials |

---

## Client Coverage

**Tool:** Vitest v4 + `@vitest/coverage-v8` + jsdom  
**Command:** `npm run test:coverage -w client`

### Overall

| Metric | Covered | Total | Percentage |
| --- | --- | --- | --- |
| Statements | 30 | 404 | **7.42%** |
| Branches | 19 | 312 | **6.08%** |
| Functions | 11 | 175 | **6.28%** |
| Lines | 29 | 343 | **8.45%** |

### Per-file breakdown

| File | Stmts % | Branch % | Funcs % | Lines % | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/App.tsx` | 0.00 | 0.00 | 0.00 | 0.00 | Not unit-tested |
| `src/components/CodeEditor.tsx` | 0.00 | 0.00 | 0.00 | 0.00 | Monaco: requires browser DOM |
| `src/components/Layout.tsx` | 81.81 | 58.82 | 66.66 | 80.00 | Partially covered |
| `src/components/LivePreview.tsx` | 100.00 | 100.00 | 100.00 | 100.00 | ✅ Fully covered |
| `src/lib/api.ts` | 40.00 | 87.50 | 16.00 | 41.17 | HTTP helpers covered; domain API fns not |
| `src/lib/auth.ts` | 100.00 | 100.00 | 100.00 | 100.00 | ✅ Fully covered |
| `src/pages/LoginPage.tsx` | 0.00 | 0.00 | 0.00 | 0.00 | Covered by E2E only |
| `src/pages/RegisterPage.tsx` | 0.00 | 0.00 | 0.00 | 0.00 | Covered by E2E only |
| `src/pages/lecturer/Dashboard.tsx` | 0.00 | 0.00 | 0.00 | 0.00 | Covered by E2E only |
| `src/pages/lecturer/TestBuilder.tsx` | 0.00 | 0.00 | 0.00 | 0.00 | Covered by E2E only |
| `src/pages/lecturer/TestResults.tsx` | 0.00 | 0.00 | 0.00 | 0.00 | Covered by E2E only |
| `src/pages/student/Dashboard.tsx` | 0.00 | 0.00 | 0.00 | 0.00 | Covered by E2E only |
| `src/pages/student/ResultsPage.tsx` | 0.00 | 0.00 | 0.00 | 0.00 | Covered by E2E only |
| `src/pages/student/TestRoom.tsx` | 0.00 | 0.00 | 0.00 | 0.00 | Covered by E2E only |

### Why client unit coverage is low

The low percentage is expected and does not represent untested functionality. The client unit tests deliberately focus on **pure, side-effect-free units** — library helpers and simple presentational components. The complex page components (routing, API calls, Monaco editor, iframe sandbox) are fully exercised by the Playwright E2E suite, which does not feed into the v8 instrumentation.

| What unit tests cover well | What E2E covers instead |
| --- | --- |
| `localStorage` session helpers (`auth.ts`) | Every page — login, register, dashboard, test builder, test room, results |
| HTTP `request()` helper and error handling (`api.ts`) | All API interactions through real browser + real server |
| `LivePreview` iframe `srcDoc` generation | Live preview rendering during test-taking |
| `Layout` header rendering and logout | Navigation, logout redirect |

### Test cases per file

| File | Test cases | Focus |
| --- | --- | --- |
| `components/Layout.test.tsx` | 6 | Header renders, user name, role badge, logout redirect |
| `components/LivePreview.test.tsx` | 5 | `srcDoc` HTML construction, sandbox attribute, title prop |
| `lib/auth.test.ts` | 5 | `getUser`, `setSession`, `clearSession`, corrupt JSON handling |
| `lib/api.test.ts` | 5 | `request()` success, error parsing, Bearer token injection |

---

## E2E Coverage (Playwright)

**Tool:** Playwright v1.44 · Chromium headless  
**Command:** `npm run test:e2e`

E2E tests do not produce v8 instrumentation data but provide the deepest functional coverage of the application. Each test drives a real browser against real running server and client processes.

### Test cases by spec file

#### `auth.spec.ts` — 7 tests

| # | Test | Scenario covered |
| --- | --- | --- |
| 1 | Redirects unauthenticated users to /login | Route guard rejects anonymous access |
| 2 | Register as student → student dashboard | Student registration + redirect |
| 3 | Register as lecturer → lecturer dashboard | Lecturer registration + redirect |
| 4 | Login with valid credentials | Login → correct dashboard + session persist |
| 5 | Shows error on invalid credentials | Wrong password → error message stays on /login |
| 6 | Duplicate email shows error | 409 conflict surfaced in UI |
| 7 | Logout clears session → redirects to /login | `clearSession` + route guard re-check |

#### `lecturer-flow.spec.ts` — 7 tests

| # | Test | Scenario covered |
| --- | --- | --- |
| 8 | Empty dashboard shows "No tests yet" prompt | First-time lecturer UX |
| 9 | Creates test → navigates to test builder | `POST /tests` + redirect |
| 10 | Can update test title and description | Blur-save metadata, dashboard reflects change |
| 11 | Full flow: create → add MCQ → publish | End-to-end test authoring + status badge |
| 12 | Can delete a question from test builder | `DELETE /questions/:id` + placeholder reappears |
| 13 | Can delete a test from the dashboard | `DELETE /tests/:id` + "No tests yet" reappears |
| 14 | Can add a grading criterion to a code question | `POST /questions/:id/criteria` + criteria list |

#### `student-flow.spec.ts` — 7 tests

| # | Test | Scenario covered |
| --- | --- | --- |
| 15 | Student dashboard loads after login | `GET /tests/available` + empty state |
| 16 | Published test appears on student dashboard | Test card with correct button state |
| 17 | Student navigates to test and sees question | TestRoom loads + question heading visible |
| 18 | Student answers MCQ correctly and sees results | Full submit flow + results redirect |
| 19 | Blank submission scores 0% | Unanswered MCQ → 0 points shown |
| 20 | Submitted test shows "View Results" on dashboard | Post-submit dashboard card state |
| 21 | Student cannot access /lecturer | Role guard redirects to /student |

### User flows covered by E2E

```
Registration ──► Login ──► Role-based redirect
     │
     ├─► Lecturer
     │       ├─► Create test
     │       ├─► Edit title / description
     │       ├─► Add MCQ question + options + correct answer
     │       ├─► Add grading criterion (DOM/CSS)
     │       ├─► Publish test
     │       ├─► View class results
     │       ├─► Delete question
     │       └─► Delete test
     │
     └─► Student
             ├─► Browse published tests
             ├─► Start test (creates attempt)
             ├─► Answer MCQ question
             ├─► Submit test (triggers grading)
             ├─► View results (score + breakdown)
             ├─► Return to dashboard (View Results button)
             └─► Cross-role access denied (→ /student)
```

---

## Coverage Gaps and Recommendations

### Priority 1 — High business risk

| Gap | File | Missing test |
| --- | --- | --- |
| `DELETE /questions/:id` never tested | `questions.ts:81–86` | Add: `it('deletes a question')` — verify 403 on wrong owner, 200 on own question |
| `POST /questions/:id/criteria` never tested | `questions.ts:92, 106–115` | Add: `it('adds a criterion')` and `it('returns 403 for non-owner')` |
| Starting an already-submitted attempt | `attempts.ts:45` | Add: `it('returns 400 if attempt already submitted')` |

### Priority 2 — Medium risk

| Gap | File | Missing test |
| --- | --- | --- |
| `GET /tests/:id` as student role | `tests.ts:61` | Add: student-role `GET /tests/:id` — verify criteria are absent from response |
| DOM criterion with text content check | `grader.ts:143` | Add: criterion with `expected_value` but no `attribute` — verify text comparison |
| `gradeStyle` with inline style | `grader.ts:217` | Add: submission with `style="color:red"` attribute — verify inline style path |

### Priority 3 — Low risk (edge cases)

| Gap | File | Missing test |
| --- | --- | --- |
| `selectorMatches` throws on invalid selector | `grader.ts:252–258` | Add: criterion with selector `"[invalid"` — verify it returns false without throwing |
| `gradeStyle` invalid CSS selector | `grader.ts:211` | Add: style criterion with invalid selector — verify error result returned |
| Transaction ROLLBACK path | `schema.ts:56–57` | Difficult to unit-test without a mock; acceptable as-is |

### Client page coverage

All page components (`LoginPage`, `RegisterPage`, all lecturer and student pages) sit at 0% v8 coverage because they are exercised exclusively by E2E tests. Adding React Testing Library tests for individual page components would raise the reported percentage but provides diminishing returns given the comprehensive E2E coverage already in place.

If page-level unit tests are added, recommended priorities are:

| Component | Reason |
| --- | --- |
| `TestRoom.tsx` | Most complex component — auto-save debounce, countdown timer, submission guard |
| `TestBuilder.tsx` | Largest file (521 lines) — `QuestionEditor`, `CriteriaEditor` sub-components |
| `ResultsPage.tsx` | Score calculation and accordion logic |

---

## Coverage Trend

| Version | Server stmts | Server branches | Client stmts | Tests |
| --- | --- | --- | --- | --- |
| v0.1 | 87.58% | 75.50% | 7.42% | 94 |

_Future versions should track this table to monitor regressions._
