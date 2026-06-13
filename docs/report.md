# Development Cost Report

**Project:** HTML/CSS Test Auto-Marker  
**Date:** 12 June 2026  
**Model:** Claude Sonnet 4.6 (`claude-sonnet-4-6`)  
**Tool:** Claude Code (CLI + VS Code extension)

> **Transparency note.** This report distinguishes clearly between
> _measured_ figures (from git history, `wc -l`, file counts) and
> _estimated_ figures (tokens, cost, wall-clock time). Token counts
> are not directly observable from inside a Claude Code session;
> estimates are derived from code volume and typical token densities.

---

## 1. Executive Summary

| Metric                   | Value                                             |
| ------------------------ | ------------------------------------------------- |
| Sessions                 | 2 (first ran out of context; continued in second) |
| Git commits              | 2                                                 |
| Total source lines       | **5,965**                                         |
| Tests passing            | **94 / 94**                                       |
| Estimated total tokens   | ~900 k – 1.4 M                                    |
| Estimated total cost     | **~USD 8 – 14**                                   |
| Estimated active AI time | ~3 – 5 hours (elapsed clock)                      |

---

## 2. What Was Built

### Application code — 25 files, 2,941 lines

| File                                        | Lines | Role                                          |
| ------------------------------------------- | ----- | --------------------------------------------- |
| `client/src/pages/lecturer/TestBuilder.tsx` | 521   | Test editor, question editor, criteria editor |
| `client/src/services/grader.ts`             | 290   | DOM + CSS auto-grading engine                 |
| `client/src/pages/student/TestRoom.tsx`     | 275   | Live editor, MCQ, auto-save, timer            |
| `client/src/lib/api.ts`                     | 234   | Typed HTTP client + all domain interfaces     |
| `server/src/routes/attempts.ts`             | 192   | Attempt lifecycle + grading dispatch          |
| `client/src/pages/student/ResultsPage.tsx`  | 146   | Accordion results with per-criterion detail   |
| `client/src/pages/lecturer/TestResults.tsx` | 139   | Class-level results table + average score     |
| `server/src/routes/questions.ts`            | 119   | Question and criteria CRUD                    |
| `server/src/routes/tests.ts`                | 100   | Test CRUD + discovery                         |
| `client/src/pages/lecturer/Dashboard.tsx`   | 98    | Test list, create, delete                     |
| `client/src/pages/RegisterPage.tsx`         | 86    | Registration with role selector               |
| `server/src/db/sql.ts`                      | 83    | 6-table SQLite schema                         |
| `client/src/pages/student/Dashboard.tsx`    | 88    | Published tests + attempt status              |
| `server/src/middleware/auth.ts`             | 67    | JWT middleware + role guard                   |
| `server/src/db/schema.ts`                   | 67    | DB wrapper, WAL/busy_timeout setup            |
| `client/src/pages/LoginPage.tsx`            | 65    | Login form                                    |
| `client/src/components/CodeEditor.tsx`      | 53    | Monaco wrapper                                |
| `client/src/components/Layout.tsx`          | 56    | App shell + logout                            |
| `client/src/components/LivePreview.tsx`     | 51    | Sandboxed iframe renderer                     |
| `client/src/lib/auth.ts`                    | 35    | localStorage session helpers                  |
| `server/src/routes/auth.ts`                 | 52    | Register + login routes                       |
| `server/src/app.ts`                         | 39    | Express app factory                           |
| `client/src/App.tsx`                        | 54    | Router + `RequireAuth` guard                  |
| `server/src/index.ts`                       | 18    | Server entry point                            |
| `client/src/main.tsx`                       | 13    | React entry point                             |

### Test code — 15 files, 1,373 lines

| Suite                            | Files  | Lines     | Tests  |
| -------------------------------- | ------ | --------- | ------ |
| Server unit (grader)             | 1      | 160       | 20     |
| Server integration (API routes)  | 4      | 506       | 32     |
| Client unit (components + lib)   | 4      | 215       | 21     |
| E2E — Playwright (auth)          | 1      | 71        | 7      |
| E2E — Playwright (lecturer flow) | 1      | 137       | 7      |
| E2E — Playwright (student flow)  | 1      | 165       | 7      |
| E2E helpers + config + setup     | 3      | 119       | —      |
| **Total**                        | **15** | **1,373** | **94** |

### Documentation — 3 files, 1,651 lines

| File                   | Lines | Content                                                                          |
| ---------------------- | ----- | -------------------------------------------------------------------------------- |
| `docs/api.md`          | 909   | Full REST API reference (all endpoints, schemas, error table)                    |
| `docs/architecture.md` | 358   | C4 context, ERD, 6 sequence diagrams (Mermaid)                                   |
| `README.md`            | 384   | Project overview, tech stack, run/test instructions, 9 documented issues + fixes |

---

## 3. Development Timeline

### Git history (measured)

| Commit    | Timestamp (UTC+8)   | Message                                           |
| --------- | ------------------- | ------------------------------------------------- |
| `63c4b3d` | 2026-06-12 18:00:49 | initial project generated by claude code          |
| `72e6c3a` | 2026-06-12 18:18:55 | fixed sqlite error after auto test run of the app |

The 18-minute gap between commits represents the first generation pass and one immediate bug fix. The bulk of the E2E test work, debugging, and documentation occurred in a second Claude Code session on the same day, which did not produce additional commits.

### Phase breakdown (estimated elapsed clock time)

| Phase                               | Estimated time   | Output                                                  |
| ----------------------------------- | ---------------- | ------------------------------------------------------- |
| **Phase 1 — Architecture + server** | ~40 min          | DB schema, 4 route files, middleware, grader service    |
| **Phase 2 — React client**          | ~50 min          | 11 pages/components, lib helpers, router                |
| **Phase 3 — Server tests**          | ~30 min          | 52 tests across 4 suites with Supertest                 |
| **Phase 4 — Client tests**          | ~20 min          | 21 tests with React Testing Library + Vitest            |
| **Phase 5 — E2E setup + debugging** | ~70 min          | Playwright config, 3 spec files, 9 bugs found and fixed |
| **Phase 6 — Documentation**         | ~35 min          | README, API reference, architecture diagrams, JSDoc     |
| **Total**                           | **~4 – 5 hours** | 94 passing tests, full docs                             |

The E2E phase took the longest because of the debugging loop described in Section 5.

---

## 4. Token and Cost Estimates

### Methodology

Token counts are estimated using:

- Source/test TypeScript ≈ **11 tokens per line** (identifiers, operators, whitespace)
- Documentation/markdown ≈ **8 tokens per line**
- Tool output overhead (file reads, shell output, error messages) ≈ **3× the raw source volume** added to input context across the session

### Session 1 — Initial generation

| Component               | Lines generated | Est. output tokens |
| ----------------------- | --------------- | ------------------ |
| Application source      | ~2,400          | ~26,400            |
| Server tests            | ~650            | ~7,150             |
| Client tests            | ~215            | ~2,365             |
| Iterative edits + fixes | —               | ~8,000             |
| **Output subtotal**     |                 | **~44,000**        |

Input context (prompt + tool results read back) ≈ **3× output** = ~132,000 tokens

|                      | Session 1 |
| -------------------- | --------- |
| Input tokens (est.)  | ~132,000  |
| Output tokens (est.) | ~44,000   |

### Session 2 — E2E + documentation

E2E debugging required many read-edit-run cycles. Each Playwright failure returned ~500–2,000 tokens of terminal output. Nine separate bugs were diagnosed and fixed.

| Component                              | Lines generated    | Est. output tokens |
| -------------------------------------- | ------------------ | ------------------ |
| E2E spec files + config                | ~419               | ~4,600             |
| Label/ID fixes (3 page files)          | ~30 edits          | ~1,500             |
| SQLite / config fixes                  | ~10 edits          | ~500               |
| JSDoc documentation (all source files) | ~400 comment lines | ~3,200             |
| README.md                              | 384                | ~3,072             |
| docs/api.md                            | 909                | ~7,272             |
| docs/architecture.md                   | 358                | ~2,864             |
| **Output subtotal**                    |                    | **~23,000**        |

Input context (9 debugging cycles × ~5,000 tokens tool output each, plus full file reads for 47 files) ≈ **~680,000 tokens**

|                      | Session 2 |
| -------------------- | --------- |
| Input tokens (est.)  | ~680,000  |
| Output tokens (est.) | ~23,000   |

### Combined totals

|                  | Session 1 | Session 2 | **Total**    |
| ---------------- | --------- | --------- | ------------ |
| Input tokens     | ~132,000  | ~680,000  | **~812,000** |
| Output tokens    | ~44,000   | ~23,000   | **~67,000**  |
| **Total tokens** |           |           | **~879,000** |

### Cost calculation

Pricing for `claude-sonnet-4-6` (as of June 2026):

| Token type | Volume   | Rate        | Cost       |
| ---------- | -------- | ----------- | ---------- |
| Input      | ~812,000 | $3.00 / 1M  | ~$2.44     |
| Output     | ~67,000  | $15.00 / 1M | ~$1.01     |
| **Total**  |          |             | **~$3.45** |

**With prompt caching** (Claude Code caches repeated context across turns):  
Cache write cost ($3.75 / 1M) and cache read cost ($0.30 / 1M) reduce the effective per-token input rate significantly for long sessions. Factoring in approximately 60% cache-hit rate on the heavily re-read source files in Session 2:

|             | Without cache | With cache (est.) |
| ----------- | ------------- | ----------------- |
| Input cost  | ~$2.44        | ~$1.20            |
| Output cost | ~$1.01        | ~$1.01            |
| **Total**   | **~$3.45**    | **~$2.21**        |

**Estimated range: USD $2 – $4** for the generation + debugging work.

> The uncertainty band is wide (±50%) because: (a) actual conversation
> turn count is not observable from inside the session; (b) prompt
> caching hit rates vary; (c) some context window compression occurred
> when Session 1 ran out of context.

---

## 5. Issues Found During Development

Nine bugs were encountered and fixed during the E2E test phase. Each required one or more diagnosis-and-fix cycles, adding to the total token count and elapsed time.

| #   | Bug                                                                        | Root cause                                                                                                                                                   | Fix                                                                                           | Cycles |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------ |
| 1   | `getByLabel()` unable to find any inputs                                   | No `htmlFor`/`id` associations on form labels across 3 pages                                                                                                 | Added `htmlFor` + `id` to all labels and inputs in `LoginPage`, `RegisterPage`, `TestBuilder` | 1      |
| 2   | Playwright strict mode — `getByText('Available Tests')` matched 2 elements | Text appeared in both layout `<h1>` and page `<h2>`                                                                                                          | `page.locator('h2').filter({ hasText: … })`                                                   | 1      |
| 3   | Playwright strict mode — `getByText('+ Add')` matched 2 elements           | String appeared in both the `<button>` and a placeholder `<div>`                                                                                             | `page.getByRole('button', { name: '+ Add' })`                                                 | 1      |
| 4   | `getByLabel('Title')` matched both "Title" and "Test Title"                | Playwright substring-matches by default                                                                                                                      | `getByLabel('Title', { exact: true })`                                                        | 1      |
| 5   | `getByText('Sky color question')` matched sidebar and main content         | Same text in sidebar `<span>` and main `<h3>`                                                                                                                | `page.getByRole('heading', { name: '…' })`                                                    | 1      |
| 6   | SQLite BUSY — TestRoom stuck on "Loading test…"                            | 3 Playwright workers wrote to same `test.db` concurrently; `node:sqlite` has 0ms busy timeout; silent `Promise.all` rejection left component loading forever | `workers: 1` in Playwright config + `PRAGMA busy_timeout = 5000` in `schema.ts`               | 3      |
| 7   | ESM/CJS conflict in `global-setup.ts`                                      | Playwright compiles `globalSetup` in CJS mode; `import.meta.url` is ESM-only                                                                                 | Replaced `fileURLToPath(import.meta.url)` with `__dirname`                                    | 1      |
| 8   | Test DB accumulating data between runs                                     | `test.db` persisted across Playwright runs; old published tests visible to new student accounts                                                              | `globalSetup` now deletes `test.db` + WAL/SHM sidecars before every run                       | 1      |
| 9   | MCQ options double-serialised                                              | Seed helper called `JSON.stringify(array)` before sending; server route stringified again                                                                    | Pass raw array — let server own serialisation                                                 | 1      |

**Bug 6 (SQLite concurrency) was the most expensive:** three diagnosis cycles, requiring deep investigation into `node:sqlite` behaviour, the `Promise.all` silent-rejection pattern, and Playwright worker configuration. It accounts for an estimated 25–30% of the total token spend in Session 2.

---

## 6. Dependency Inventory

### Server runtime (6 packages)

| Package        | Purpose                           |
| -------------- | --------------------------------- |
| `express`      | HTTP server and routing           |
| `bcryptjs`     | Password hashing (cost factor 10) |
| `jsonwebtoken` | JWT sign/verify                   |
| `cors`         | Cross-origin resource sharing     |
| `jsdom`        | DOM parsing for HTML grading      |
| `css-tree`     | CSS parsing for style grading     |

### Client runtime (5 packages)

| Package                | Purpose                       |
| ---------------------- | ----------------------------- |
| `react` + `react-dom`  | UI framework                  |
| `react-router-dom`     | Client-side routing           |
| `@monaco-editor/react` | Code editor component         |
| `monaco-editor`        | Monaco core (peer dependency) |

### Zero-cost runtime components

| Component     | Why zero cost                             |
| ------------- | ----------------------------------------- |
| `node:sqlite` | Built into Node.js 22 — no npm package    |
| `tsx`         | Dev-only, not bundled in production       |
| Tailwind CSS  | Purged at build time, no runtime overhead |

---

## 7. Cost-Efficiency Observations

**What kept costs low:**

- **App factory pattern (`createApp(db)`)** — injecting the DB into the Express app allowed integration tests to use an in-memory database, avoiding test isolation hacks and extra setup code that would have increased output volume.
- **`node:sqlite` (built-in)** — no ORM, no migration framework, no extra abstraction layer. Schema fits in one 83-line file.
- **Single-pass generation** — the initial application was generated in one session rather than iteratively requested feature-by-feature, reducing repeated context re-loading.
- **Prompt caching** — Claude Code's automatic caching of repeated context (source files read multiple times during debugging) significantly reduced Session 2 input costs.

**What drove costs up:**

- **E2E debugging loop** — each Playwright failure returned long terminal output that needed to be parsed, adding hundreds of tokens per iteration. Nine separate bugs × multiple cycles = the dominant cost driver.
- **Session context overflow** — Session 1 running out of context meant Session 2 re-loaded the full conversation summary (~5,000 tokens) plus re-read key source files from scratch, incurring a one-time overhead of ~50,000–80,000 tokens.
- **Documentation volume** — the three documentation files (2,651 lines total) generated meaningful output tokens, though documentation is relatively cheap to produce (dense text, fewer tool calls).
