# Architecture Diagrams

---

## 1. Architecture Context Diagram

Shows the major system components and how they communicate.

```mermaid
C4Context
    title HTML/CSS Tester — System Context

    Person(lecturer, "Lecturer", "Creates tests, reviews student results")
    Person(student, "Student", "Sits tests, receives instant feedback")

    System_Boundary(spa, "React SPA  ·  Vite  ·  port 5173") {
        Component(ui_auth, "Auth Pages", "Login / Register")
        Component(ui_lecturer, "Lecturer UI", "Dashboard · TestBuilder · TestResults")
        Component(ui_student, "Student UI", "Dashboard · TestRoom · ResultsPage")
        Component(monaco, "Monaco Editor", "HTML & CSS code editor")
        Component(preview, "LivePreview", "Sandboxed <iframe> renderer")
    }

    System_Boundary(api, "Express API  ·  Node.js 22  ·  port 3001") {
        Component(routes_auth, "/api/auth", "Register · Login")
        Component(routes_tests, "/api/tests", "Test CRUD · discovery")
        Component(routes_questions, "/api/questions", "Question & criteria CRUD")
        Component(routes_attempts, "/api/attempts", "Attempt lifecycle · grading")
        Component(middleware, "JWT Middleware", "requireAuth · requireRole")
        Component(grader, "Grading Engine", "JSDOM + css-tree · DOM & style checks")
    }

    SystemDb(db, "SQLite", "node:sqlite  ·  WAL mode  ·  data/app.db")

    Rel(lecturer, ui_lecturer, "Uses")
    Rel(student, ui_student, "Uses")
    Rel(ui_auth, routes_auth, "POST /api/auth/*", "JSON / HTTPS")
    Rel(ui_lecturer, routes_tests, "GET·POST·PUT·DELETE /api/tests/*", "JSON")
    Rel(ui_lecturer, routes_questions, "POST·PUT·DELETE /api/questions/*", "JSON")
    Rel(ui_lecturer, routes_attempts, "GET /api/attempts/test/:id/results", "JSON")
    Rel(ui_student, routes_tests, "GET /api/tests/available  ·  /:id", "JSON")
    Rel(ui_student, routes_attempts, "POST·PUT·GET /api/attempts/*", "JSON")
    Rel(routes_auth, middleware, "verifies token")
    Rel(routes_tests, middleware, "verifies token")
    Rel(routes_questions, middleware, "verifies token")
    Rel(routes_attempts, middleware, "verifies token")
    Rel(routes_attempts, grader, "calls on submit")
    Rel(routes_auth, db, "reads / writes")
    Rel(routes_tests, db, "reads / writes")
    Rel(routes_questions, db, "reads / writes")
    Rel(routes_attempts, db, "reads / writes")
    Rel(monaco, preview, "html + css props")
```

---

## 2. Entity Relationship Diagram

Database schema managed by `server/src/db/sql.ts`. All timestamps are Unix epoch integers.

```mermaid
erDiagram
    users {
        INTEGER id PK
        TEXT    email      "UNIQUE NOT NULL"
        TEXT    name       "NOT NULL"
        TEXT    password_hash "bcrypt hash"
        TEXT    role       "lecturer | student"
        INTEGER created_at "unixepoch()"
    }

    tests {
        INTEGER id PK
        INTEGER lecturer_id FK
        TEXT    title       "NOT NULL"
        TEXT    description
        INTEGER time_limit_minutes "NULL = no limit"
        TEXT    status      "draft | published | closed"
        INTEGER created_at
        INTEGER published_at "NULL until published"
    }

    questions {
        INTEGER id PK
        INTEGER test_id FK
        TEXT    type        "code-from-scratch | fix-the-bug | match-output | mcq"
        INTEGER order_index "display order"
        TEXT    title       "NOT NULL"
        TEXT    description "NOT NULL"
        TEXT    starter_html
        TEXT    starter_css
        TEXT    reference_html
        TEXT    reference_css
        TEXT    mcq_options "JSON array string"
        INTEGER mcq_correct_index "zero-based"
        INTEGER total_points "default 10"
    }

    criteria {
        INTEGER id PK
        INTEGER question_id FK
        TEXT    type        "dom | style"
        TEXT    label       "shown to student"
        TEXT    selector    "CSS selector"
        TEXT    attribute   "HTML attribute (dom)"
        TEXT    expected_value
        TEXT    css_property "style criteria only"
        INTEGER points      "default 1"
    }

    attempts {
        INTEGER id PK
        INTEGER test_id    FK
        INTEGER student_id FK
        TEXT    status      "in_progress | submitted"
        INTEGER started_at
        INTEGER submitted_at "NULL until submit"
    }

    submissions {
        INTEGER id PK
        INTEGER attempt_id  FK
        INTEGER question_id FK
        TEXT    html_code
        TEXT    css_code
        INTEGER mcq_answer_index "zero-based; NULL for code Qs"
        INTEGER score
        INTEGER max_score
        TEXT    grading_results "JSON GradingResult[]"
        INTEGER submitted_at
    }

    users      ||--o{ tests      : "lecturer creates"
    users      ||--o{ attempts   : "student sits"
    tests      ||--o{ questions  : "contains"
    tests      ||--o{ attempts   : "tracked by"
    questions  ||--o{ criteria   : "graded by"
    attempts   ||--o{ submissions : "records answers in"
    questions  ||--o{ submissions : "answered in"
```

**Key constraints**

| Table                                           | Constraint                                                       |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| `users.email`                                   | `UNIQUE`                                                         |
| `attempts`                                      | `UNIQUE(test_id, student_id)` — one attempt per student per test |
| `submissions`                                   | `UNIQUE(attempt_id, question_id)` — upserted on each auto-save   |
| `tests`, `questions`, `criteria`, `submissions` | `ON DELETE CASCADE` on FK to parent                              |

---

## 3. Sequence Diagrams

### 3a. User Registration

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Express as Express API
    participant DB as SQLite

    User->>Browser: Fill name/email/password/role, click "Create Account"
    Browser->>Express: POST /api/auth/register {email, name, password, role}
    Express->>DB: SELECT id FROM users WHERE email = ?
    alt email taken
        DB-->>Express: row found
        Express-->>Browser: 409 { error: "Email already registered" }
        Browser-->>User: Show error banner
    else email free
        DB-->>Express: null
        Express->>Express: bcrypt.hash(password, 10)
        Express->>DB: INSERT INTO users (...)
        DB-->>Express: lastInsertRowid
        Express->>Express: jwt.sign({userId, role, name}, secret, 24h)
        Express-->>Browser: 200 { token, user }
        Browser->>Browser: localStorage.setItem(token, user)
        Browser-->>User: Redirect → /lecturer or /student
    end
```

---

### 3b. User Login

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Express as Express API
    participant DB as SQLite

    User->>Browser: Enter email + password, click "Sign In"
    Browser->>Express: POST /api/auth/login {email, password}
    Express->>DB: SELECT * FROM users WHERE email = ?
    alt user not found
        DB-->>Express: null
        Express-->>Browser: 401 { error: "Invalid credentials" }
    else user found
        DB-->>Express: user row
        Express->>Express: bcrypt.compare(password, password_hash)
        alt password wrong
            Express-->>Browser: 401 { error: "Invalid credentials" }
        else password correct
            Express->>Express: jwt.sign({userId, role, name})
            Express-->>Browser: 200 { token, user }
            Browser->>Browser: localStorage.setItem(token, user)
            Browser-->>User: Redirect → dashboard
        end
    end
```

---

### 3c. Lecturer Creates and Publishes a Test

```mermaid
sequenceDiagram
    actor Lecturer
    participant Browser
    participant Express as Express API
    participant DB as SQLite

    Lecturer->>Browser: Click "+ New Test"
    Browser->>Express: POST /api/tests {title: "Untitled Test"}
    Note over Express: requireAuth + requireRole("lecturer")
    Express->>DB: INSERT INTO tests (lecturer_id, title, ...)
    DB-->>Express: { id: 42 }
    Express-->>Browser: { id: 42 }
    Browser-->>Lecturer: Navigate → /lecturer/tests/42/edit

    Lecturer->>Browser: Edit title (on blur)
    Browser->>Express: PUT /api/tests/42 {title: "Week 3 Quiz"}
    Express->>DB: UPDATE tests SET title = ? WHERE id = 42
    Express-->>Browser: { ok: true }

    Lecturer->>Browser: Click "+ Add" question
    Browser->>Express: POST /api/questions {test_id:42, type:"mcq", ...}
    Express->>DB: INSERT INTO questions (...)
    DB-->>Express: { id: 7 }
    Express-->>Browser: { id: 7 }

    Lecturer->>Browser: Fill MCQ options + mark correct, blur each field
    Browser->>Express: PUT /api/questions/7 {mcq_options:[...], mcq_correct_index:0}
    Express->>DB: UPDATE questions SET mcq_options=?, mcq_correct_index=? WHERE id=7
    Express-->>Browser: { ok: true }

    Lecturer->>Browser: Click "Publish Test"
    Browser->>Express: PUT /api/tests/42 {status: "published"}
    Express->>DB: UPDATE tests SET status='published', published_at=unixepoch() WHERE id=42
    Express-->>Browser: { ok: true }
    Browser-->>Lecturer: Badge changes to "published"
```

---

### 3d. Student Takes a Test

```mermaid
sequenceDiagram
    actor Student
    participant Browser
    participant Express as Express API
    participant DB as SQLite
    participant Grader as Grading Engine

    Student->>Browser: Click "Start Test" on dashboard
    Browser->>Express: POST /api/attempts/start {test_id: 42}
    Note over Express: requireAuth + requireRole("student")
    Express->>DB: SELECT * FROM tests WHERE id=42 AND status='published'
    DB-->>Express: test row
    Express->>DB: SELECT * FROM attempts WHERE test_id=42 AND student_id=?
    alt no existing attempt
        DB-->>Express: null
        Express->>DB: INSERT INTO attempts (test_id, student_id)
        DB-->>Express: attempt row
    else attempt exists
        DB-->>Express: existing attempt row
    end
    Express-->>Browser: { attempt, submissions: [] }
    Browser-->>Student: Render TestRoom with editors

    loop Every 800ms debounce after edit
        Student->>Browser: Type HTML / CSS or select MCQ option
        Browser->>Express: PUT /api/attempts/5/questions/7 {html_code, css_code}
        Express->>DB: INSERT OR UPDATE submissions (...) ON CONFLICT DO UPDATE
        Express-->>Browser: { ok: true }
    end

    Student->>Browser: Click "Submit Test" → confirm dialog
    Browser->>Express: POST /api/attempts/5/submit {}
    Express->>DB: SELECT questions WHERE test_id = 42

    loop For each question (in SQLite transaction)
        Express->>DB: SELECT submission WHERE attempt_id=5 AND question_id=?
        alt MCQ question
            Express->>Grader: gradeMcq(answerIndex, correctIndex, points)
            Grader-->>Express: score
        else code question with criteria
            Express->>DB: SELECT criteria WHERE question_id=?
            DB-->>Express: criteria[]
            Express->>Grader: gradeSubmission(html, css, criteria)
            Note over Grader: Parse HTML with JSDOM<br/>Parse CSS with css-tree<br/>Evaluate each criterion
            Grader-->>Express: { results, score, maxScore }
        end
        Express->>DB: UPDATE submissions SET score=?, grading_results=?
    end

    Express->>DB: UPDATE attempts SET status='submitted', submitted_at=unixepoch()
    Express-->>Browser: { ok:true, score:8, maxScore:10, submissions:[...] }
    Browser-->>Student: Redirect → /student/attempts/5/results
```

---

### 3e. Student Views Results

```mermaid
sequenceDiagram
    actor Student
    participant Browser
    participant Express as Express API
    participant DB as SQLite

    Browser->>Express: GET /api/attempts/5/results
    Note over Express: requireAuth (any role)<br/>checks attempt.student_id == req.user.userId
    Express->>DB: SELECT attempts WHERE id=5
    DB-->>Express: attempt row
    Express->>DB: SELECT submissions JOIN questions WHERE attempt_id=5
    DB-->>Express: submissions[] with question title + type
    Express->>Express: JSON.parse(grading_results) for each submission
    Express-->>Browser: { attempt, submissions: [{...grading_results:[]}] }
    Browser-->>Student: Render score summary + per-question accordion
    Student->>Browser: Click question card to expand
    Browser-->>Student: Show criterion pass/fail list + live preview iframe
```

---

### 3f. Lecturer Views All Student Results

```mermaid
sequenceDiagram
    actor Lecturer
    participant Browser
    participant Express as Express API
    participant DB as SQLite

    Browser->>Express: GET /api/attempts/test/42/results
    Note over Express: requireAuth + requireRole("lecturer")<br/>checks tests.lecturer_id == req.user.userId
    Express->>DB: SELECT tests WHERE id=42 AND lecturer_id=?
    DB-->>Express: test row
    Express->>DB: SELECT attempts JOIN users LEFT JOIN submissions<br/>WHERE test_id=42 GROUP BY attempt.id<br/>ORDER BY submitted_at DESC
    DB-->>Express: attempts[] with student_name, total_score, total_max
    Express-->>Browser: attempts[]
    Browser-->>Lecturer: Render table with progress bars and "Details" links
```

---

## 4. Use Case Diagram

Shows every user-visible capability grouped by actor and feature area.
`<<include>>` means the base use case always triggers the included one.
`<<extend>>` means the extension is conditionally triggered.

```mermaid
flowchart TB
    %% ── Actors ────────────────────────────────────────────────────
    Lecturer(["👤 Lecturer"])
    Student(["👤 Student"])

    %% ── System boundary ───────────────────────────────────────────
    subgraph SYS["System — HTML/CSS Tester"]

        subgraph AUTH["Authentication"]
            direction TB
            UC_REG(["Register account"])
            UC_LOG(["Login"])
            UC_OUT(["Logout"])
        end

        subgraph TM["Test Management  〔Lecturer〕"]
            direction TB
            UC_CT(["Create test"])
            UC_ET(["Edit test metadata\n(title · description · time limit)"])
            UC_PUB(["Publish test"])
            UC_CLO(["Close test"])
            UC_DT(["Delete test"])
        end

        subgraph QM["Question Management  〔Lecturer〕"]
            direction TB
            UC_AQ(["Add question"])
            UC_EQ(["Edit question"])
            UC_MCQ(["Configure MCQ options\n& correct answer"])
            UC_AC(["Add grading criterion\n(DOM / CSS style)"])
            UC_DC(["Delete criterion"])
            UC_DQ(["Delete question"])
        end

        subgraph RP["Reporting  〔Lecturer〕"]
            direction TB
            UC_VR(["View class results"])
            UC_VA(["View student\nattempt detail"])
        end

        subgraph TT["Test Taking  〔Student〕"]
            direction TB
            UC_BR(["Browse available tests"])
            UC_ST(["Start test"])
            UC_RS(["Resume in-progress test"])
            UC_AN(["Answer MCQ question"])
            UC_CD(["Write HTML / CSS code"])
            UC_LP(["View live preview"])
            UC_SB(["Submit test"])
            UC_VW(["View own results"])
        end

        subgraph AUTO["Automated Behaviours"]
            direction TB
            UC_AS(["Auto-save answers"])
            UC_GR(["Grade submission"])
            UC_TL(["Enforce time limit\n& auto-submit"])
        end

    end

    %% ── Lecturer associations ──────────────────────────────────────
    Lecturer --- UC_REG
    Lecturer --- UC_LOG
    Lecturer --- UC_OUT
    Lecturer --- UC_CT
    Lecturer --- UC_ET
    Lecturer --- UC_PUB
    Lecturer --- UC_CLO
    Lecturer --- UC_DT
    Lecturer --- UC_AQ
    Lecturer --- UC_EQ
    Lecturer --- UC_MCQ
    Lecturer --- UC_AC
    Lecturer --- UC_DC
    Lecturer --- UC_DQ
    Lecturer --- UC_VR
    Lecturer --- UC_VA

    %% ── Student associations ───────────────────────────────────────
    Student --- UC_REG
    Student --- UC_LOG
    Student --- UC_OUT
    Student --- UC_BR
    Student --- UC_ST
    Student --- UC_RS
    Student --- UC_AN
    Student --- UC_CD
    Student --- UC_LP
    Student --- UC_SB
    Student --- UC_VW

    %% ── <<include>> relationships ──────────────────────────────────
    UC_ST    -. "<<include>>" .-> UC_AS
    UC_RS    -. "<<include>>" .-> UC_AS
    UC_AN    -. "<<include>>" .-> UC_AS
    UC_CD    -. "<<include>>" .-> UC_AS
    UC_SB    -. "<<include>>" .-> UC_GR
    UC_MCQ   -. "<<include>>" .-> UC_AQ
    UC_VA    -. "<<include>>" .-> UC_VR

    %% ── <<extend>> relationships ───────────────────────────────────
    UC_LP    -. "<<extend>>" .-> UC_CD
    UC_AC    -. "<<extend>>" .-> UC_AQ
    UC_TL    -. "<<extend>>" .-> UC_ST

    %% ── Styling ────────────────────────────────────────────────────
    classDef actor    fill:#dbeafe,stroke:#2563eb,color:#1e3a5f,font-weight:bold
    classDef usecase  fill:#f0fdf4,stroke:#16a34a,color:#14532d
    classDef auto     fill:#fef9c3,stroke:#ca8a04,color:#713f12

    class Lecturer,Student actor
    class UC_REG,UC_LOG,UC_OUT,UC_CT,UC_ET,UC_PUB,UC_CLO,UC_DT usecase
    class UC_AQ,UC_EQ,UC_MCQ,UC_AC,UC_DC,UC_DQ,UC_VR,UC_VA usecase
    class UC_BR,UC_ST,UC_RS,UC_AN,UC_CD,UC_LP,UC_SB,UC_VW usecase
    class UC_AS,UC_GR,UC_TL auto
```

### Use case index

| ID     | Use Case                               | Actor(s)          | Notes                                                                  |
| ------ | -------------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| UC_REG | Register account                       | Lecturer, Student | Role selected at registration                                          |
| UC_LOG | Login                                  | Lecturer, Student | Returns JWT; role-based redirect                                       |
| UC_OUT | Logout                                 | Lecturer, Student | Clears localStorage session                                            |
| UC_CT  | Create test                            | Lecturer          | Creates draft; navigates to editor                                     |
| UC_ET  | Edit test metadata                     | Lecturer          | Title, description, time limit — saved on blur                         |
| UC_PUB | Publish test                           | Lecturer          | Sets `status = "published"`; records `published_at`                    |
| UC_CLO | Close test                             | Lecturer          | Sets `status = "closed"`; hides from students                          |
| UC_DT  | Delete test                            | Lecturer          | Cascades to questions, attempts, submissions                           |
| UC_AQ  | Add question                           | Lecturer          | Types: code-from-scratch, fix-the-bug, match-output, mcq               |
| UC_EQ  | Edit question                          | Lecturer          | Fields saved on blur via PUT                                           |
| UC_MCQ | Configure MCQ options & correct answer | Lecturer          | `<<include>>` UC_AQ — shown only when type = mcq                       |
| UC_AC  | Add grading criterion                  | Lecturer          | `<<extend>>` UC_AQ — dom or style check                                |
| UC_DC  | Delete criterion                       | Lecturer          |                                                                        |
| UC_DQ  | Delete question                        | Lecturer          | Cascades to criteria and submissions                                   |
| UC_VR  | View class results                     | Lecturer          | Aggregated attempts table with avg score                               |
| UC_VA  | View student attempt detail            | Lecturer          | `<<include>>` UC_VR — per-criterion breakdown                          |
| UC_BR  | Browse available tests                 | Student           | Shows attempt status per test card                                     |
| UC_ST  | Start test                             | Student           | Creates attempt; `<<include>>` UC_AS                                   |
| UC_RS  | Resume in-progress test                | Student           | Reloads saved answers; `<<include>>` UC_AS                             |
| UC_AN  | Answer MCQ question                    | Student           | Selects option; `<<include>>` UC_AS                                    |
| UC_CD  | Write HTML / CSS code                  | Student           | Monaco editor; `<<include>>` UC_AS                                     |
| UC_LP  | View live preview                      | Student           | `<<extend>>` UC_CD — sandboxed iframe, always visible alongside editor |
| UC_SB  | Submit test                            | Student           | `<<include>>` UC_GR — locks attempt permanently                        |
| UC_VW  | View own results                       | Student           | Score summary + per-criterion accordion                                |
| UC_AS  | Auto-save answers                      | System            | Debounced 800 ms; upsert via PUT                                       |
| UC_GR  | Grade submission                       | System            | MCQ: index compare; code: JSDOM + css-tree per criterion               |
| UC_TL  | Enforce time limit & auto-submit       | System            | `<<extend>>` UC_ST — active only when `time_limit_minutes` is set      |
