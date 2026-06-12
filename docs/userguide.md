# User Guide

**HTML/CSS Test Auto-Marker** — version 0.1

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Installation](#2-installation)
3. [Starting the Application](#3-starting-the-application)
4. [Stopping the Application](#4-stopping-the-application)
5. [Registering an Account](#5-registering-an-account)
6. [Logging In and Out](#6-logging-in-and-out)
7. [Lecturer Guide](#7-lecturer-guide)
   - 7.1 [Dashboard](#71-lecturer-dashboard)
   - 7.2 [Creating a Test](#72-creating-a-test)
   - 7.3 [Editing Test Settings](#73-editing-test-settings)
   - 7.4 [Adding Questions](#74-adding-questions)
   - 7.5 [Configuring MCQ Questions](#75-configuring-mcq-questions)
   - 7.6 [Configuring Code Questions](#76-configuring-code-questions)
   - 7.7 [Adding Grading Criteria](#77-adding-grading-criteria)
   - 7.8 [Previewing a Question](#78-previewing-a-question)
   - 7.9 [Publishing and Closing a Test](#79-publishing-and-closing-a-test)
   - 7.10 [Viewing Student Results](#710-viewing-student-results)
   - 7.11 [Deleting a Test](#711-deleting-a-test)
8. [Student Guide](#8-student-guide)
   - 8.1 [Dashboard](#81-student-dashboard)
   - 8.2 [Starting a Test](#82-starting-a-test)
   - 8.3 [Answering MCQ Questions](#83-answering-mcq-questions)
   - 8.4 [Answering Code Questions](#84-answering-code-questions)
   - 8.5 [Navigating Between Questions](#85-navigating-between-questions)
   - 8.6 [Submitting a Test](#86-submitting-a-test)
   - 8.7 [Viewing Your Results](#87-viewing-your-results)
   - 8.8 [Resuming an Unfinished Test](#88-resuming-an-unfinished-test)
9. [Running Tests](#9-running-tests)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Requirement | Minimum version | Notes |
| --- | --- | --- |
| Node.js | **22.0** | Required for the built-in `node:sqlite` module |
| npm | **10.0** | Bundled with Node.js 22+ |
| A modern browser | Chrome 110+ / Firefox 115+ / Edge 110+ | Safari is untested |

Check your versions:

```bash
node --version   # must be v22.x.x or higher
npm --version    # must be 10.x or higher
```

---

## 2. Installation

Clone the repository and install all workspace dependencies in one step:

```bash
git clone <repository-url>
cd htmlcss-tester
npm install
```

`npm install` at the root resolves dependencies for all three workspaces (`client`, `server`, `e2e`) simultaneously. No separate `npm install` calls are needed inside subdirectories.

---

## 3. Starting the Application

### Development mode (recommended)

Run both the API server and the client dev server together:

```bash
npm run dev
```

This starts:

| Process | URL | Notes |
| --- | --- | --- |
| Express API server | `http://localhost:3001` | Reads/writes `data/app.db` (auto-created) |
| Vite client dev server | `http://localhost:5173` | Proxies `/api/*` requests to port 3001 |

Open **`http://localhost:5173`** in your browser to use the application.

### Starting each process separately

If you need to run them independently (e.g. for debugging):

```bash
# Terminal 1 — API server
npm run dev -w server

# Terminal 2 — Client
npm run dev -w client
```

### Production build

```bash
npm run build          # compiles server TypeScript + bundles client
node --experimental-sqlite dist/index.js   # from the server/ directory
```

---

## 4. Stopping the Application

Press **`Ctrl + C`** in the terminal where `npm run dev` is running.

Both the Express server and the Vite dev server will shut down. The SQLite database file (`data/app.db`) persists between restarts — all accounts, tests, and student attempts are preserved.

To start completely fresh (wipe all data):

```bash
rm data/app.db
npm run dev
```

---

## 5. Registering an Account

1. Open `http://localhost:5173` in your browser. You are redirected to `/register`.
2. Fill in **Full Name**, **Email**, and **Password** (minimum 6 characters).
3. Select your role by clicking either the **Student** or **Lecturer** button.
4. Click **Create Account**.

You are immediately logged in and redirected to your dashboard. There is no email verification step.

> Each email address can only be registered once. Attempting to register with a duplicate email shows an error message.

---

## 6. Logging In and Out

### Login

1. Navigate to `http://localhost:5173/login`.
2. Enter your registered **Email** and **Password**.
3. Click **Sign In**.

You are redirected to `/lecturer` or `/student` depending on your role.

### Logout

Click the **Logout** button in the top-right corner of any page. Your session is cleared and you are redirected to `/login`.

> Sessions are stored in `localStorage` and survive page refreshes but not a browser data clear. They expire after 24 hours.

---

## 7. Lecturer Guide

### 7.1 Lecturer Dashboard

After logging in you land on the **My Tests** dashboard (`/lecturer`).

Each test card displays:
- Test title and optional description
- Status badge — `draft`, `published`, or `closed`
- Creation date and time limit (if set)
- **Results**, **Edit**, and **Delete** buttons

If you have no tests yet, a prompt to **Create your first test** is shown.

---

### 7.2 Creating a Test

1. Click **+ New Test** in the top-right corner.
2. An untitled draft test is created immediately and you are taken to the **Test Builder**.

---

### 7.3 Editing Test Settings

The **left sidebar** of the Test Builder contains the test-level settings:

| Field | Description |
| --- | --- |
| **Test Title** | The name students see on their dashboard. Saved automatically when you click away from the field. |
| **Description** | Optional summary shown on the student dashboard card. |
| **Time Limit (minutes)** | Leave blank for no limit. When set, students see a countdown timer that auto-submits when it reaches zero. |

All fields save on **blur** (when you click out of the field). A small "Saving…" indicator appears briefly.

---

### 7.4 Adding Questions

1. Click the **+ Add** button in the Questions panel (left sidebar).
2. A new question is created with default values and the **Question** tab opens on the right.
3. Set the question **Type** using the dropdown:

| Type | Description |
| --- | --- |
| **Code from Scratch** | Student writes HTML/CSS from nothing. |
| **Fix the Bug** | Student is given broken starter code to repair. |
| **Match the Output** | Student reproduces a reference screenshot using HTML/CSS. |
| **Multiple Choice** | Student selects one option from a list. |

4. Fill in the **Title** (the question heading students see) and **Description / Instructions** (the full question text).
5. Set **Total Points** for this question.
6. Fields save automatically on blur.

---

### 7.5 Configuring MCQ Questions

When the question type is **Multiple Choice**, the editor shows an **Answer Options** section:

1. Type the text for each option in the **Option 1**, **Option 2**, … fields. You can leave unused option slots blank — blank options are hidden from students.
2. Click the **radio button** to the left of an option to mark it as the correct answer.
3. Option text saves on blur; the correct-answer selection saves immediately on click.

> You must mark a correct answer before publishing — otherwise all MCQ submissions score 0.

---

### 7.6 Configuring Code Questions

For code-type questions the editor shows four **Monaco editor** panels:

| Panel | Purpose |
| --- | --- |
| **Starter HTML** | HTML pre-loaded into the student's editor when they open the question. Leave blank for code-from-scratch questions. |
| **Starter CSS** | CSS pre-loaded alongside the starter HTML. |
| **Reference HTML** | The correct/expected HTML answer. Used by grading criteria and shown as the "Target Output" in match-output questions. |
| **Reference CSS** | The correct/expected CSS answer. |

All panels save on blur (when you click out of the editor).

---

### 7.7 Adding Grading Criteria

Switch to the **Criteria** tab to add auto-grading rules for code questions.

Each criterion is evaluated independently when a student submits. Two criterion types are available:

#### DOM Check

Checks the structure of the student's submitted HTML.

| Field | Description | Example |
| --- | --- | --- |
| **Label** | What the student sees in their results. | `Has a navigation bar` |
| **CSS Selector** | Targets the element to check. | `nav`, `h1.title`, `#main` |
| **Attribute** *(optional)* | An HTML attribute to compare. Leave blank to check element existence only. | `class`, `href`, `alt` |
| **Expected Value** *(optional)* | The expected attribute value or text content. | `navbar`, `Contact Us` |
| **Points** | Points awarded when this criterion passes. | `3` |

#### CSS Style Check

Checks a CSS property value in the student's submitted stylesheet.

| Field | Description | Example |
| --- | --- | --- |
| **Label** | What the student sees in their results. | `Body background is white` |
| **CSS Selector** | The element whose style to check. | `body`, `.card`, `#header` |
| **CSS Property** | The property to inspect. | `background-color`, `font-size` |
| **Expected Value** | The expected value. | `#ffffff`, `white`, `16px` |
| **Points** | Points awarded when this criterion passes. | `2` |

**To add a criterion:**
1. Fill in the form fields.
2. Click **Add Criterion**.
3. The criterion appears in the "Existing Criteria" list above the form.

**To delete a criterion:** click the **✕** button on the right of any criterion row.

---

### 7.8 Previewing a Question

Switch to the **Preview** tab to see a live rendered preview of the question's code:

- **Left panel** — renders the starter HTML + CSS (what the student sees when they begin).
- **Right panel** — renders the reference HTML + CSS (the expected output).

This is useful for verifying that match-output questions render correctly before publishing.

---

### 7.9 Publishing and Closing a Test

| Action | Button | Effect |
| --- | --- | --- |
| **Publish** | `Publish Test` (header, draft tests only) | Makes the test visible to all students. Records the publish timestamp. |
| **Close** | `Close Test` (header, published tests only) | Hides the test from students. Students who already started can no longer submit. |

> Published tests cannot have questions or criteria added or removed. Close and re-draft if structural changes are needed.

To return to the dashboard click **Back** in the header.

---

### 7.10 Viewing Student Results

From the dashboard, click **Results** on any test card. The Results page shows:

**Summary row:**
- Total attempts (started + submitted)
- Number of submitted attempts
- Class average percentage

**Attempts table:**

| Column | Description |
| --- | --- |
| Student | Name and email |
| Status | `in_progress` or `submitted` |
| Score | Points earned / total points |
| % | Colour-coded progress bar (green ≥ 70%, yellow ≥ 40%, red < 40%) |
| Submitted | Timestamp |
| Details | Link to the student's full per-criterion breakdown |

---

### 7.11 Deleting a Test

From the dashboard, click **Delete** on a test card. A confirmation dialog appears. Confirming permanently deletes the test and **all associated questions, grading criteria, student attempts, and submissions**.

This action cannot be undone.

---

## 8. Student Guide

### 8.1 Student Dashboard

After logging in you land on the **Available Tests** dashboard (`/student`).

Each test card shows:
- Test title, description, and the lecturer's name
- Time limit (if any)
- Your attempt status:

| Status shown | Meaning |
| --- | --- |
| *(no badge)* | You have not started this test yet |
| **In Progress** | You have started but not submitted |
| **Submitted** | You have submitted — your score is final |

---

### 8.2 Starting a Test

1. Find the test on your dashboard.
2. Click **Start Test**.
3. You are taken to the **Test Room** for that test.

If the test has a time limit, the countdown timer starts the moment you open the Test Room for the first time.

---

### 8.3 Answering MCQ Questions

MCQ questions show a list of large clickable answer cards:

1. Click the card for your chosen answer. It highlights in blue.
2. Your selection is saved automatically within one second — you do not need to click a save button.
3. You can change your answer at any time before submitting.

---

### 8.4 Answering Code Questions

Code questions open a split-screen workspace:

```
┌─────────────────────────┬──────────────────────┐
│  HTML editor            │  Your Output         │
│  (Monaco)               │  (live preview)      │
├─────────────────────────┤                      │
│  CSS editor             │                      │
│  (Monaco)               │                      │
└─────────────────────────┴──────────────────────┘
```

- **Left side** — Monaco code editors for HTML (top) and CSS (bottom).
- **Right side** — A live preview that updates instantly as you type, showing exactly what your code produces in a browser.

For **Match the Output** questions, a second preview panel appears below the live preview showing the **Target Output** you need to reproduce.

**Tips:**
- The editor supports syntax highlighting, auto-indent, and bracket matching.
- Tab size is 2 spaces.
- Word-wrap is on — long lines wrap rather than scroll.
- Your code is saved to the server automatically every 800 ms after you stop typing.

---

### 8.5 Navigating Between Questions

The **left sidebar** lists all questions with numbered circles:

- A **green** circle means you have entered at least one character of code or selected an MCQ option for that question.
- A **grey** circle means you have not answered that question yet.

Click any question number to switch to it. Your current answer is auto-saved before switching.

---

### 8.6 Submitting a Test

1. Click **Submit Test** in the top-right corner.
2. A confirmation dialog appears: *"Submit this test? You cannot make changes after submitting."*
3. Click **OK** to confirm.

After submission:
- All questions are graded instantly by the server.
- You are redirected to the Results page.
- The test is locked — you cannot re-open the editor or change any answers.

> If a **time limit** is set and the countdown reaches zero, the test is submitted automatically without a confirmation dialog.

---

### 8.7 Viewing Your Results

After submitting you are taken to the Results page (`/student/attempts/:id/results`).

**Score summary card:**
- Total points earned and total possible
- Percentage score with a colour-coded bar
- Submission timestamp

**Per-question accordion:**

Click any question card to expand it:

- **Grading Breakdown** — each criterion is listed with:
  - ✓ (pass) or ✗ (fail) icon
  - Criterion label
  - Feedback message (e.g. `✓ Element "nav" exists` or `✗ No element found matching "nav"`)
  - Points earned / points available

- **Your Submission** (code questions) — a live preview of the HTML/CSS you submitted.

- **Correct / Incorrect** label (MCQ questions).

You can return to the dashboard at any time via the **← Back to Tests** link.

---

### 8.8 Resuming an Unfinished Test

If you started a test but did not submit:

1. Go back to your dashboard.
2. The test card shows an **In Progress** badge and a **Continue** button.
3. Click **Continue** — your previously saved answers are loaded automatically.

You can resume as many times as you like until you submit or the time limit expires.

---

## 9. Running Tests

### All test suites

```bash
# Server unit + integration tests
npm test -w server

# Client unit tests
npm test -w client

# End-to-end tests (Playwright, Chromium headless)
# Starts a fresh server + client automatically
npm run test:e2e
```

### Watching for changes

```bash
npm run test:watch -w server
npm run test:watch -w client
```

### Coverage reports

```bash
npm run test:coverage -w server
npm run test:coverage -w client
```

### E2E test notes

- The E2E suite creates a temporary database at `e2e/test.db` (deleted before each run).
- Requires port **3001** and **5173** to be free when starting.
- If port 3001 is already in use from a previous run: `lsof -ti:3001 | xargs kill -9`

---

## 10. Troubleshooting

### Application won't start — "node:sqlite not found" or "ExperimentalWarning"

Your Node.js version is below 22. The built-in `node:sqlite` module requires Node.js 22+.

```bash
node --version   # must show v22.x.x or higher
```

Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to install Node.js 22:

```bash
nvm install 22 && nvm use 22
```

---

### Browser shows a blank page or "Cannot GET /"

The Vite dev server may not have started. Check the terminal for errors. Make sure both processes are running:

```bash
npm run dev   # should show "VITE ready" and "Server running on http://localhost:3001"
```

---

### API calls fail with "Network Error" or 401

- Confirm the API server is running on port 3001: `curl http://localhost:3001/api/health`
- If your session expired (after 24 hours), log out and log back in.

---

### "Email already registered" on the register page

That email address has already been used. Use a different email or log in with the existing account.

---

### MCQ question shows no options

The lecturer has not filled in the MCQ option fields. Contact your lecturer to update the question before the test is published.

---

### Code question starter code is empty

The lecturer may have left the Starter HTML/CSS fields blank intentionally (code-from-scratch question). Start writing your own HTML from the `<body>` content down.

---

### Test results show 0 points for a code question even though my code looks correct

Possible reasons:
- The question has no grading criteria attached. Ask your lecturer.
- Your element is present but uses a different selector than expected (e.g. `<div class="nav">` instead of `<nav>`). The grading breakdown feedback message will explain exactly what was checked and what was found.

---

### E2E tests hang or fail with "SQLITE_BUSY"

This can happen if a previous test run left the server running. Kill any lingering process on port 3001 before re-running:

```bash
lsof -ti:3001 | xargs kill -9
npm run test:e2e
```

---

### Data directory not created on first run

The `data/` directory is created automatically when the server starts. If you see a permissions error, ensure the project directory is writable:

```bash
mkdir -p data
npm run dev
```
