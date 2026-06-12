# HTML/CSS Test Auto-Marker

A full-stack web application that allows lecturers to create and publish HTML/CSS coding tests and MCQ quizzes, and students to sit those tests and receive instant automated grading.

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Running the App](#running-the-app)
6. [Running Tests](#running-tests)
7. [Issues Found and Fixes Applied](#issues-found-and-fixes-applied)

---

## Application Overview

**Lecturers** can:
- Create, edit, and delete tests
- Add MCQ questions (with configurable options and correct answer) and HTML/CSS code questions
- Define DOM and CSS grading criteria for code questions
- Publish tests to make them available to students

**Students** can:
- Browse published tests on their dashboard
- Sit a test in a sandboxed test room with a live HTML/CSS preview panel
- Submit answers and receive instant results with per-criterion feedback
- Review past attempt results

Authentication uses JWT tokens with role-based routing — lecturers and students land on separate dashboards and cannot access each other's routes.

---

## Architecture

```
htmlcss-tester/
├── client/          # React SPA (Vite)
├── server/          # Express REST API (Node.js + node:sqlite)
├── e2e/             # Playwright end-to-end tests
└── package.json     # npm workspaces root
```

The application is a monorepo managed with **npm workspaces**. The server and client run independently; the client communicates with the server over a local REST API.

### Data flow

```
Browser (React)
  └─► Vite dev server (port 5173) — proxies /api/* to Express
        └─► Express (port 3001)
              └─► node:sqlite (SQLite file)
```

### Grading engine

HTML/CSS submissions are graded server-side by:
1. Parsing the submitted HTML via **JSDOM** to build a DOM tree
2. Parsing submitted CSS via **css-tree** into a rule map
3. Evaluating each criterion — `dom` (element existence / attribute / text content) or `style` (CSS property value on a selector)
4. Returning per-criterion pass/fail results and an aggregate score

MCQ answers are graded by direct index comparison.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, TypeScript, Tailwind CSS |
| Code editor | Monaco Editor (`@monaco-editor/react`) |
| Backend | Express 4, TypeScript, `tsx` (dev), `node:sqlite` (built-in Node.js 22+) |
| Grading | JSDOM, css-tree |
| Auth | bcryptjs (password hashing), jsonwebtoken (JWT) |
| Server tests | Vitest + Supertest |
| Client tests | Vitest + React Testing Library |
| E2E tests | Playwright (Chromium) |

---

## Project Structure

```
server/src/
  index.ts          — Express app entry, wires up routes
  app.ts            — Express app factory (used by tests)
  db/
    schema.ts       — createDbWrapper(), SQLite PRAGMA setup
    sql.ts          — CREATE TABLE statements
  routes/
    auth.ts         — POST /api/auth/register, /login
    tests.ts        — CRUD for tests
    questions.ts    — CRUD for questions + grading criteria
    attempts.ts     — Start/submit attempts, results
  services/
    grader.ts       — DOM + CSS grading engine
  __tests__/
    grader.test.ts  — Unit tests for grading logic
    auth.test.ts    — Integration tests for auth routes
    tests.test.ts   — Integration tests for test/question routes
    attempts.test.ts — Integration tests for attempt routes

client/src/
  pages/
    LoginPage.tsx
    RegisterPage.tsx
    lecturer/
      Dashboard.tsx   — Test list, create/delete
      TestBuilder.tsx — Test editor + question editor + criteria editor
      TestResults.tsx — Per-student result view
    student/
      Dashboard.tsx   — Available tests + attempt status
      TestRoom.tsx    — Live code editor + MCQ renderer + submit
      ResultsPage.tsx — Per-attempt result breakdown

e2e/
  playwright.config.ts  — Playwright config: webServer, workers, globalSetup
  global-setup.ts       — Deletes test.db before each run
  tests/
    helpers.ts              — uniqueUser(), register(), login() helpers
    auth.spec.ts            — 7 auth flow tests
    lecturer-flow.spec.ts   — 7 lecturer workflow tests
    student-flow.spec.ts    — 7 student workflow tests
```

---

## Running the App

### Prerequisites

- Node.js 22+ (required for `node:sqlite`)
- npm 10+

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts both the Express server (port 3001) and the Vite dev client (port 5173) concurrently.

### Production build

```bash
npm run build
```

---

## Running Tests

```bash
# Server unit + integration tests (Vitest + Supertest)
npm test -w server

# Client unit tests (Vitest + React Testing Library)
npm test -w client

# E2E tests (Playwright, Chromium headless)
npm run test:e2e
```

The E2E runner starts both the Express server (with a fresh `e2e/test.db`) and the Vite dev server automatically. The Playwright global setup deletes `e2e/test.db` before each run for a clean slate.

**Test counts (all passing):**

| Suite | Tests |
|---|---|
| Server | 52 |
| Client | 21 |
| E2E | 21 |
| **Total** | **94** |

---

## Issues Found and Fixes Applied

The following problems were encountered during development and testing, along with the root cause and the fix applied.

---

### 1. `getByLabel()` always timing out in E2E tests

**Symptom:** Playwright's `getByLabel('Email')`, `getByLabel('Password')`, `getByLabel('Full Name')` could not locate any elements. 20 out of 21 E2E tests failed on the first full run.

**Root cause:** Playwright's `getByLabel` locator works by ARIA association — it needs either:
- A `<label>` with a matching `htmlFor` attribute wired to an `<input id="...">`, or
- The input wrapped inside the label element, or
- An `aria-labelledby` / `aria-label` attribute on the input.

The existing form labels in `LoginPage.tsx`, `RegisterPage.tsx`, and `TestBuilder.tsx` had no `htmlFor` or `id` attributes — they were visual-only labels with no ARIA wiring.

**Fix:** Added matching `htmlFor`/`id` pairs to all form labels and inputs across all three pages. This also improved native browser accessibility (clicking a label focuses the input).

```tsx
// Before
<label className="label">Email</label>
<input className="input" type="email" ... />

// After
<label className="label" htmlFor="login-email">Email</label>
<input id="login-email" className="input" type="email" ... />
```

---

### 2. Playwright strict mode violations

**Symptom:** Tests failed with `strict mode violation: locator ... resolved to N elements` when trying to `.click()` or `.toBeVisible()` on a locator that matched multiple DOM nodes.

**Root cause:** Playwright's strict mode requires every action locator to resolve to exactly one element. Several cases triggered this:

- `getByText('Available Tests')` — the text appeared in both a layout `<h1>` (sidebar/header) and the page body `<h2>`.
- `getByText('+ Add')` — matched both the `<button>+ Add</button>` and a placeholder div that contained the same substring: `"Select a question or click "+ Add" to create one"`.
- `getByLabel('Title')` — Playwright does substring matching by default, so it matched both the "Title" label on the question editor and the "Test Title" label in the sidebar.
- `getByText('Sky color question')` — the question title appeared in both the sidebar navigation `<span>` and the main content `<h3>`.

**Fixes:**

| Problem locator | Fix |
|---|---|
| `getByText('Available Tests')` | `page.locator('h2').filter({ hasText: 'Available Tests' })` |
| `getByText('+ Add')` | `page.getByRole('button', { name: '+ Add' })` |
| `getByLabel('Title')` | `page.getByLabel('Title', { exact: true })` |
| `getByText('Sky color question')` | `page.getByRole('heading', { name: 'Sky color question' })` |

---

### 3. SQLite BUSY errors under parallel E2E workers

**Symptom:** E2E tests that involved the student `TestRoom` component would get stuck on "Loading test…" indefinitely. The component never rendered question content. No visible error in the test output.

**Root cause:** Playwright runs tests with 3 workers by default. Each worker was writing to the same `e2e/test.db` file concurrently. Node.js's built-in `node:sqlite` module uses a default busy timeout of 0ms — meaning any write that finds the database locked fails immediately with `SQLITE_BUSY`. The `TestRoom` component's `useEffect` called `Promise.all([fetchTest(), fetchAttempt()])` with no `.catch()` handler; a rejected promise left the component in an eternal loading state with no error surfaced in the UI or the test runner.

**Fixes applied:**
- Set `workers: 1` in `playwright.config.ts` — tests run serially, eliminating concurrent DB access.
- Added `PRAGMA busy_timeout = 5000` in `server/src/db/schema.ts` — gives SQLite 5 seconds to retry a locked write before failing, as a safety net.

```typescript
// server/src/db/schema.ts
raw.exec('PRAGMA journal_mode = WAL');
raw.exec('PRAGMA busy_timeout = 5000');  // added
raw.exec('PRAGMA foreign_keys = ON');
```

```typescript
// playwright.config.ts
export default defineConfig({
  workers: 1,   // added — prevents concurrent SQLite writes
  ...
});
```

---

### 4. ESM/CJS conflict in Playwright global setup

**Symptom:** After creating `e2e/global-setup.ts`, Playwright threw `ReferenceError: exports is not defined in ES module scope` when running tests.

**Root cause:** Playwright loads `globalSetup` files in a CommonJS (CJS) compilation context, even in a TypeScript project. The original file used the ESM pattern `fileURLToPath(import.meta.url)` to resolve `__dirname`, which is not valid in a CJS context.

**Fix:** Replaced the ESM idiom with the CJS-native `__dirname`, which TypeScript compiles correctly in CJS mode:

```typescript
// Before (ESM — breaks in Playwright's CJS globalSetup context)
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// After (CJS — correct for Playwright globalSetup)
import path from 'path';
const dbPath = path.join(__dirname, 'test.db');
```

---

### 5. Test database accumulating state between runs

**Symptom:** Student E2E tests saw more published tests on the dashboard than expected (tests from previous runs were still visible), causing assertion failures like `strict mode violation` when locating a specific test card.

**Root cause:** The SQLite database file (`e2e/test.db`) persisted between Playwright runs. Each run added more rows without clearing previous data.

**Fix:** Added a `globalSetup` file that deletes `test.db` (and its WAL/SHM sidecar files) before each run:

```typescript
// e2e/global-setup.ts
import { rm } from 'fs/promises';
import path from 'path';

export default async function globalSetup() {
  const dbPath = path.join(__dirname, 'test.db');
  await rm(dbPath, { force: true });
  await rm(dbPath + '-wal', { force: true });
  await rm(dbPath + '-shm', { force: true });
}
```

Combined with `reuseExistingServer: false` for the Express `webServer` entry, this guarantees the server always starts with a clean database.

---

### 6. Student TestRoom flaky load timing

**Symptom:** Tests that clicked "Start Test" on the student dashboard and then asserted question content were intermittently flaky. The navigation from dashboard → TestRoom → question render had a variable delay that sometimes exceeded the assertion timeout.

**Root cause:** The flow relied on: (1) UI click on "Start Test" → (2) API call to create an attempt → (3) navigation to `/student/tests/:id` → (4) React component mounting and calling `Promise.all([fetchTest(), fetchAttempt()])` → (5) state update and render. Each step added latency, and step 2 (attempt creation) was happening in the UI layer rather than being pre-done.

**Fix:** Pre-seed the attempt via direct API calls in the test setup function (`seedPublishedMcqTest`), then navigate directly to the TestRoom URL. A dedicated `openTestRoom` helper waits for the "Loading test…" spinner to disappear before any assertions proceed:

```typescript
async function openTestRoom(page, testId: number) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`/student/tests/${testId}`);
  // Wait up to 15s for the loading state to clear
  await expect(page.getByText('Loading test…')).toBeHidden({ timeout: 15000 });
  if (errors.length) throw new Error(`Browser JS error: ${errors.join('; ')}`);
}
```

The `page.on('pageerror', ...)` listener surfaces silent JavaScript exceptions that would otherwise leave the component stuck without any visible error.

---

### 7. MCQ options double-serialised to the database

**Symptom:** MCQ options were being stored as the string `"\"[\\\"Blue\\\",\\\"Green\\\"]\""`  in the database (a JSON-stringified string inside another JSON-stringified string), causing the student TestRoom to fail to render options.

**Root cause:** The seed helper in `student-flow.spec.ts` was passing `mcq_options: JSON.stringify(['Blue', 'Green', 'Red', 'Yellow'])` to the API. The server-side question route then called `JSON.stringify(mcq_options)` again before writing to SQLite, resulting in double serialisation.

**Fix:** Pass the raw array from the test — let the server own the serialisation responsibility:

```typescript
// Before
mcq_options: JSON.stringify(['Blue', 'Green', 'Red', 'Yellow']),

// After
mcq_options: ['Blue', 'Green', 'Red', 'Yellow'],
```

---

### 8. `e2e` workspace not recognised by npm

**Symptom:** Running `npm run test:e2e` from the repo root failed because `e2e` was not in the `workspaces` array of the root `package.json`.

**Fix:** Added `"e2e"` to the `workspaces` array and added the `test:e2e` script:

```json
{
  "workspaces": ["client", "server", "e2e"],
  "scripts": {
    "dev": "concurrently \"npm run dev -w server\" \"npm run dev -w client\"",
    "test:e2e": "npm run test -w e2e"
  }
}
```

---

### 9. Port 3001 already in use between test runs

**Symptom:** After changing `reuseExistingServer: false`, re-running Playwright immediately after a previous run failed with `EADDRINUSE: address already in use :::3001` because the previous Express server process had not yet terminated.

**Root cause:** `reuseExistingServer: false` tells Playwright to always start a new server — but it does not kill any server left over from a prior run.

**Workaround:** Kill any lingering process on port 3001 before re-running tests:

```bash
lsof -ti:3001 | xargs kill -9
npm run test:e2e
```

For CI pipelines, `reuseExistingServer: false` combined with guaranteed clean runner environments (fresh containers) avoids this issue entirely.
