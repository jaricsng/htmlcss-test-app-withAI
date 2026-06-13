# API Reference

Base URL: `http://localhost:3001/api`

All protected endpoints require a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are issued by `/auth/register` and `/auth/login`. They expire after **24 hours** and carry the authenticated user's `userId`, `role`, and `name`.

---

## Table of Contents

- [Authentication](#authentication)
  - [POST /auth/register](#post-authregister)
  - [POST /auth/login](#post-authlogin)
- [Tests](#tests)
  - [GET /tests/my](#get-testsmy)
  - [GET /tests/available](#get-testsavailable)
  - [GET /tests/:id](#get-testsid)
  - [POST /tests](#post-tests)
  - [PUT /tests/:id](#put-testsid)
  - [DELETE /tests/:id](#delete-testsid)
- [Questions](#questions)
  - [POST /questions](#post-questions)
  - [PUT /questions/:id](#put-questionsid)
  - [DELETE /questions/:id](#delete-questionsid)
  - [POST /questions/:id/criteria](#post-questionsidcriteria)
  - [DELETE /questions/criteria/:criterionId](#delete-questionscriteriaCriterionId)
- [Attempts](#attempts)
  - [POST /attempts/start](#post-attemptsstart)
  - [PUT /attempts/:attemptId/questions/:questionId](#put-attemptsattemptidquestionsquestionid)
  - [POST /attempts/:attemptId/submit](#post-attemptsattemptidsubmit)
  - [GET /attempts/:attemptId/results](#get-attemptsattemptidresults)
  - [GET /attempts/test/:testId/results](#get-attemptstesttestidresults)
- [Health](#health)
- [Error Responses](#error-responses)
- [Data Models](#data-models)

---

## Authentication

### POST /auth/register

Creates a new user account and returns a JWT.

**Auth required:** No

**Request body:**

| Field      | Type                        | Required | Description                                       |
| ---------- | --------------------------- | -------- | ------------------------------------------------- |
| `email`    | string                      | Yes      | Unique email address                              |
| `name`     | string                      | Yes      | Display name                                      |
| `password` | string                      | Yes      | Plain-text password (hashed with bcrypt, cost 10) |
| `role`     | `"lecturer"` \| `"student"` | Yes      | Account role                                      |

```json
{
  "email": "dr.smith@uni.edu",
  "name": "Dr Smith",
  "password": "secretpass",
  "role": "lecturer"
}
```

**Response `200 OK`:**

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "email": "dr.smith@uni.edu",
    "name": "Dr Smith",
    "role": "lecturer"
  }
}
```

**Error responses:**

| Status | Condition                                                      |
| ------ | -------------------------------------------------------------- |
| `400`  | Any required field missing or role is not `lecturer`/`student` |
| `409`  | Email already registered                                       |

---

### POST /auth/login

Authenticates an existing user and returns a JWT.

**Auth required:** No

**Request body:**

| Field      | Type   | Required | Description      |
| ---------- | ------ | -------- | ---------------- |
| `email`    | string | Yes      | Registered email |
| `password` | string | Yes      | Account password |

```json
{
  "email": "dr.smith@uni.edu",
  "password": "secretpass"
}
```

**Response `200 OK`:**

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "email": "dr.smith@uni.edu",
    "name": "Dr Smith",
    "role": "lecturer"
  }
}
```

**Error responses:**

| Status | Condition                             |
| ------ | ------------------------------------- |
| `401`  | Email not found or password incorrect |

---

## Tests

### GET /tests/my

Returns all tests created by the authenticated lecturer, newest first.

**Auth required:** Yes — `lecturer`

**Response `200 OK`:**

```json
[
  {
    "id": 1,
    "lecturer_id": 1,
    "title": "Week 3 CSS Quiz",
    "description": "Flexbox and Grid basics",
    "time_limit_minutes": 30,
    "status": "published",
    "created_at": 1718000000,
    "published_at": 1718010000
  }
]
```

---

### GET /tests/available

Returns all published tests visible to the authenticated student, including the student's attempt status for each test.

**Auth required:** Yes — `student`

**Response `200 OK`:**

```json
[
  {
    "id": 1,
    "title": "Week 3 CSS Quiz",
    "description": "Flexbox and Grid basics",
    "status": "published",
    "lecturer_name": "Dr Smith",
    "published_at": 1718010000,
    "attempt_id": 5,
    "attempt_status": "in_progress"
  }
]
```

`attempt_id` and `attempt_status` are `null` if the student has not started the test yet.

---

### GET /tests/:id

Returns a single test with its questions. Lecturers also receive grading criteria for each question.

**Auth required:** Yes — any role

**Path parameters:**

| Parameter | Type    | Description |
| --------- | ------- | ----------- |
| `id`      | integer | Test ID     |

**Response `200 OK` (student view):**

```json
{
  "id": 1,
  "title": "Week 3 CSS Quiz",
  "status": "published",
  "time_limit_minutes": 30,
  "questions": [
    {
      "id": 10,
      "test_id": 1,
      "type": "mcq",
      "order_index": 0,
      "title": "What does CSS stand for?",
      "description": "Choose the correct expansion.",
      "mcq_options": "[\"Cascading Style Sheets\",\"Colorful Style Sheets\",\"Creative Style System\"]",
      "mcq_correct_index": 0,
      "total_points": 5
    }
  ]
}
```

**Response `200 OK` (lecturer view)** — questions additionally include a `criteria` array:

```json
{
  "questions": [
    {
      "id": 11,
      "type": "code-from-scratch",
      "criteria": [
        {
          "id": 3,
          "question_id": 11,
          "type": "dom",
          "label": "Has an h1 element",
          "selector": "h1",
          "attribute": null,
          "expected_value": null,
          "css_property": null,
          "points": 5
        }
      ]
    }
  ]
}
```

**Error responses:**

| Status | Condition                             |
| ------ | ------------------------------------- |
| `403`  | Student requests a non-published test |
| `404`  | Test not found                        |

---

### POST /tests

Creates a new draft test owned by the authenticated lecturer.

**Auth required:** Yes — `lecturer`

**Request body:**

| Field                | Type    | Required | Description                       |
| -------------------- | ------- | -------- | --------------------------------- |
| `title`              | string  | Yes      | Test title                        |
| `description`        | string  | No       | Freetext description              |
| `time_limit_minutes` | integer | No       | Time limit; `null` means no limit |

```json
{
  "title": "Week 3 CSS Quiz",
  "description": "Flexbox and Grid basics",
  "time_limit_minutes": 30
}
```

**Response `200 OK`:**

```json
{ "id": 1 }
```

**Error responses:**

| Status | Condition          |
| ------ | ------------------ |
| `400`  | `title` is missing |

---

### PUT /tests/:id

Partially updates a test. Only the owning lecturer may update their own test. All body fields are optional; omitted fields are left unchanged.

**Auth required:** Yes — `lecturer`

**Path parameters:**

| Parameter | Type    | Description |
| --------- | ------- | ----------- |
| `id`      | integer | Test ID     |

**Request body (all fields optional):**

| Field                | Type                                     | Description                                                   |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `title`              | string                                   | New title                                                     |
| `description`        | string                                   | New description                                               |
| `time_limit_minutes` | integer                                  | New time limit                                                |
| `status`             | `"draft"` \| `"published"` \| `"closed"` | New status; setting `"published"` also records `published_at` |

```json
{ "status": "published" }
```

**Response `200 OK`:**

```json
{ "ok": true }
```

**Error responses:**

| Status | Condition                                    |
| ------ | -------------------------------------------- |
| `404`  | Test not found or not owned by the requester |

---

### DELETE /tests/:id

Deletes a test and all its questions, criteria, attempts, and submissions (cascade).

**Auth required:** Yes — `lecturer`

**Path parameters:**

| Parameter | Type    | Description |
| --------- | ------- | ----------- |
| `id`      | integer | Test ID     |

**Response `200 OK`:**

```json
{ "ok": true }
```

---

## Questions

### POST /questions

Creates a new question on a test owned by the authenticated lecturer.

**Auth required:** Yes — `lecturer`

**Request body:**

| Field               | Type     | Required | Description                                                          |
| ------------------- | -------- | -------- | -------------------------------------------------------------------- |
| `test_id`           | integer  | Yes      | ID of the owning test                                                |
| `type`              | string   | Yes      | `"code-from-scratch"`, `"fix-the-bug"`, `"match-output"`, or `"mcq"` |
| `title`             | string   | Yes      | Question title                                                       |
| `description`       | string   | Yes      | Question instructions / prompt                                       |
| `order_index`       | integer  | No       | Position in the question list (default `0`)                          |
| `starter_html`      | string   | No       | Pre-filled HTML for code questions                                   |
| `starter_css`       | string   | No       | Pre-filled CSS for code questions                                    |
| `reference_html`    | string   | No       | Reference HTML used in `match-output` questions                      |
| `reference_css`     | string   | No       | Reference CSS used in `match-output` questions                       |
| `mcq_options`       | string[] | No       | Array of option strings for MCQ questions                            |
| `mcq_correct_index` | integer  | No       | Zero-based index of the correct MCQ option                           |
| `total_points`      | integer  | No       | Maximum points for this question (default `10`)                      |

```json
{
  "test_id": 1,
  "type": "mcq",
  "title": "What does CSS stand for?",
  "description": "Choose the correct answer.",
  "mcq_options": ["Cascading Style Sheets", "Colorful Style Sheets"],
  "mcq_correct_index": 0,
  "total_points": 5
}
```

> `mcq_options` must be a raw JSON array — the server serialises it to a JSON string before storage. Sending an already-stringified value will result in double-encoding.

**Response `200 OK`:**

```json
{ "id": 10 }
```

**Error responses:**

| Status | Condition                                                 |
| ------ | --------------------------------------------------------- |
| `403`  | `test_id` does not exist or is not owned by the requester |

---

### PUT /questions/:id

Partially updates a question. Only the owning lecturer may update it. All body fields are optional.

**Auth required:** Yes — `lecturer`

**Path parameters:**

| Parameter | Type    | Description |
| --------- | ------- | ----------- |
| `id`      | integer | Question ID |

**Request body:** Same shape as [POST /questions](#post-questions) minus `test_id`; all fields optional.

**Response `200 OK`:**

```json
{ "ok": true }
```

**Error responses:**

| Status | Condition                                         |
| ------ | ------------------------------------------------- |
| `403`  | Question not found or test not owned by requester |

---

### DELETE /questions/:id

Deletes a question and its criteria (cascade).

**Auth required:** Yes — `lecturer`

**Path parameters:**

| Parameter | Type    | Description |
| --------- | ------- | ----------- |
| `id`      | integer | Question ID |

**Response `200 OK`:**

```json
{ "ok": true }
```

**Error responses:**

| Status | Condition                                         |
| ------ | ------------------------------------------------- |
| `403`  | Question not found or test not owned by requester |

---

### POST /questions/:id/criteria

Adds a grading criterion to a code question.

**Auth required:** Yes — `lecturer`

**Path parameters:**

| Parameter | Type    | Description |
| --------- | ------- | ----------- |
| `id`      | integer | Question ID |

**Request body:**

| Field            | Type                 | Required | Description                                                    |
| ---------------- | -------------------- | -------- | -------------------------------------------------------------- |
| `type`           | `"dom"` \| `"style"` | Yes      | Criterion type                                                 |
| `label`          | string               | Yes      | Human-readable description shown to students in results        |
| `selector`       | string               | No       | CSS selector to target the element being checked               |
| `attribute`      | string               | No       | HTML attribute name (for `dom` criteria with attribute checks) |
| `expected_value` | string               | No       | Expected attribute value or text content                       |
| `css_property`   | string               | No       | CSS property name to check (for `style` criteria)              |
| `points`         | integer              | No       | Points awarded when criterion passes (default `1`)             |

**`dom` criterion — element existence:**

```json
{
  "type": "dom",
  "label": "Has a nav element",
  "selector": "nav",
  "points": 3
}
```

**`dom` criterion — attribute value:**

```json
{
  "type": "dom",
  "label": "Image has alt text",
  "selector": "img",
  "attribute": "alt",
  "expected_value": "company logo",
  "points": 2
}
```

**`style` criterion — CSS property:**

```json
{
  "type": "style",
  "label": "Body background is white",
  "selector": "body",
  "css_property": "background-color",
  "expected_value": "#ffffff",
  "points": 1
}
```

**Response `200 OK`:**

```json
{ "id": 3 }
```

**Error responses:**

| Status | Condition                                         |
| ------ | ------------------------------------------------- |
| `403`  | Question not found or test not owned by requester |

---

### DELETE /questions/criteria/:criterionId

Deletes a grading criterion.

**Auth required:** Yes — `lecturer`

**Path parameters:**

| Parameter     | Type    | Description  |
| ------------- | ------- | ------------ |
| `criterionId` | integer | Criterion ID |

**Response `200 OK`:**

```json
{ "ok": true }
```

**Error responses:**

| Status | Condition                                          |
| ------ | -------------------------------------------------- |
| `403`  | Criterion not found or test not owned by requester |

---

## Attempts

### POST /attempts/start

Starts a test attempt for the authenticated student. If an attempt already exists for this student and test, the existing attempt is returned (idempotent). Prevents re-entry if already submitted.

**Auth required:** Yes — `student`

**Request body:**

| Field     | Type    | Required | Description                     |
| --------- | ------- | -------- | ------------------------------- |
| `test_id` | integer | Yes      | ID of the published test to sit |

```json
{ "test_id": 1 }
```

**Response `200 OK`:**

```json
{
  "attempt": {
    "id": 5,
    "test_id": 1,
    "student_id": 3,
    "status": "in_progress",
    "started_at": 1718010000,
    "submitted_at": null
  },
  "submissions": []
}
```

`submissions` contains any answers already saved (empty array on a fresh start).

**Error responses:**

| Status | Condition                       |
| ------ | ------------------------------- |
| `400`  | Attempt already submitted       |
| `404`  | Test not found or not published |

---

### PUT /attempts/:attemptId/questions/:questionId

Saves or updates the student's answer for one question in an active attempt. Uses upsert semantics — safe to call multiple times as the student edits.

**Auth required:** Yes — `student`

**Path parameters:**

| Parameter    | Type    | Description |
| ------------ | ------- | ----------- |
| `attemptId`  | integer | Attempt ID  |
| `questionId` | integer | Question ID |

**Request body (all fields optional):**

| Field              | Type    | Description                                      |
| ------------------ | ------- | ------------------------------------------------ |
| `html_code`        | string  | Student's HTML submission (code questions)       |
| `css_code`         | string  | Student's CSS submission (code questions)        |
| `mcq_answer_index` | integer | Zero-based selected option index (MCQ questions) |

```json
{ "mcq_answer_index": 2 }
```

**Response `200 OK`:**

```json
{ "ok": true }
```

**Error responses:**

| Status | Condition                                                           |
| ------ | ------------------------------------------------------------------- |
| `400`  | Attempt not found, belongs to another student, or already submitted |

---

### POST /attempts/:attemptId/submit

Finalises the attempt, grades all questions, and records scores. After submission the attempt is locked — answers can no longer be saved.

**Auth required:** Yes — `student`

**Path parameters:**

| Parameter   | Type    | Description |
| ----------- | ------- | ----------- |
| `attemptId` | integer | Attempt ID  |

**Request body:** Empty `{}`

**Grading behaviour:**

- **MCQ questions** — compares `mcq_answer_index` against `mcq_correct_index`; full points for a match, zero otherwise.
- **Code questions with criteria** — HTML/CSS is parsed server-side (JSDOM + css-tree); each criterion is evaluated independently. DOM criteria check element presence, attribute values, or text content. Style criteria check computed or declared CSS property values.
- **Code questions with no criteria** — score remains 0.
- **Unanswered questions** — inserted with score 0 so results are complete.

**Response `200 OK`:**

```json
{
  "ok": true,
  "score": 8,
  "maxScore": 10,
  "submissions": [
    {
      "id": 12,
      "attempt_id": 5,
      "question_id": 10,
      "html_code": "",
      "css_code": "",
      "mcq_answer_index": 0,
      "score": 5,
      "max_score": 5,
      "grading_results": "[{\"label\":\"Correct answer\",\"passed\":true,\"earned\":5,\"points\":5,\"feedback\":\"✓ Correct\"}]"
    }
  ]
}
```

**Error responses:**

| Status | Condition                                                           |
| ------ | ------------------------------------------------------------------- |
| `400`  | Attempt not found, belongs to another student, or already submitted |

---

### GET /attempts/:attemptId/results

Returns a completed attempt with per-question grading detail.

**Auth required:** Yes — any role

**Path parameters:**

| Parameter   | Type    | Description |
| ----------- | ------- | ----------- |
| `attemptId` | integer | Attempt ID  |

**Response `200 OK`:**

```json
{
  "attempt": {
    "id": 5,
    "test_id": 1,
    "student_id": 3,
    "status": "submitted",
    "started_at": 1718010000,
    "submitted_at": 1718013000
  },
  "submissions": [
    {
      "id": 12,
      "attempt_id": 5,
      "question_id": 10,
      "title": "What does CSS stand for?",
      "type": "mcq",
      "mcq_answer_index": 0,
      "score": 5,
      "max_score": 5,
      "grading_results": [
        {
          "label": "Correct answer",
          "passed": true,
          "earned": 5,
          "points": 5,
          "feedback": "✓ Correct"
        }
      ]
    }
  ]
}
```

`grading_results` is always a parsed array (never a raw JSON string) in this response.

**Error responses:**

| Status | Condition                                    |
| ------ | -------------------------------------------- |
| `403`  | Student requesting another student's results |
| `404`  | Attempt not found                            |

---

### GET /attempts/test/:testId/results

Returns all submitted attempts for a test, aggregated with total scores per student. Only the owning lecturer may call this.

**Auth required:** Yes — `lecturer`

**Path parameters:**

| Parameter | Type    | Description |
| --------- | ------- | ----------- |
| `testId`  | integer | Test ID     |

**Response `200 OK`:**

```json
[
  {
    "id": 5,
    "test_id": 1,
    "student_id": 3,
    "status": "submitted",
    "started_at": 1718010000,
    "submitted_at": 1718013000,
    "student_name": "Alice",
    "student_email": "alice@uni.edu",
    "total_score": 8,
    "total_max": 10
  }
]
```

**Error responses:**

| Status | Condition                                |
| ------ | ---------------------------------------- |
| `404`  | Test not found or not owned by requester |

---

## Health

### GET /api/health

Liveness check. Returns `200` with no body content when the server is running.

**Auth required:** No

**Response `200 OK`:** _(empty body)_

---

## Error Responses

All error responses follow a consistent shape:

```json
{ "error": "<human-readable message>" }
```

| HTTP Status        | Meaning                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| `400 Bad Request`  | Missing required field, invalid input, or operation not allowed in current state |
| `401 Unauthorized` | No token provided or token is invalid/expired                                    |
| `403 Forbidden`    | Authenticated but wrong role, or resource belongs to another user                |
| `404 Not Found`    | Resource does not exist (or does not belong to the requester)                    |
| `409 Conflict`     | Unique constraint violation (e.g. duplicate email)                               |

---

## Data Models

### User

| Field        | Type                        | Notes          |
| ------------ | --------------------------- | -------------- |
| `id`         | integer                     | Primary key    |
| `email`      | string                      | Unique         |
| `name`       | string                      | Display name   |
| `role`       | `"lecturer"` \| `"student"` |                |
| `created_at` | integer                     | Unix timestamp |

### Test

| Field                | Type                                     | Notes                                                 |
| -------------------- | ---------------------------------------- | ----------------------------------------------------- |
| `id`                 | integer                                  | Primary key                                           |
| `lecturer_id`        | integer                                  | FK → users.id                                         |
| `title`              | string                                   |                                                       |
| `description`        | string \| null                           |                                                       |
| `time_limit_minutes` | integer \| null                          | `null` = no limit                                     |
| `status`             | `"draft"` \| `"published"` \| `"closed"` |                                                       |
| `created_at`         | integer                                  | Unix timestamp                                        |
| `published_at`       | integer \| null                          | Unix timestamp; set when status becomes `"published"` |

### Question

| Field               | Type            | Notes                                                             |
| ------------------- | --------------- | ----------------------------------------------------------------- |
| `id`                | integer         | Primary key                                                       |
| `test_id`           | integer         | FK → tests.id, cascade delete                                     |
| `type`              | string          | `"code-from-scratch"`, `"fix-the-bug"`, `"match-output"`, `"mcq"` |
| `order_index`       | integer         | Display order                                                     |
| `title`             | string          |                                                                   |
| `description`       | string          | Question instructions                                             |
| `starter_html`      | string          | Pre-filled HTML (code questions)                                  |
| `starter_css`       | string          | Pre-filled CSS (code questions)                                   |
| `reference_html`    | string          | Reference HTML (match-output)                                     |
| `reference_css`     | string          | Reference CSS (match-output)                                      |
| `mcq_options`       | string \| null  | JSON-serialised array of option strings                           |
| `mcq_correct_index` | integer \| null | Zero-based correct option                                         |
| `total_points`      | integer         | Maximum marks                                                     |

### Criterion

| Field            | Type                 | Notes                             |
| ---------------- | -------------------- | --------------------------------- |
| `id`             | integer              | Primary key                       |
| `question_id`    | integer              | FK → questions.id, cascade delete |
| `type`           | `"dom"` \| `"style"` |                                   |
| `label`          | string               | Shown to students in results      |
| `selector`       | string \| null       | CSS selector                      |
| `attribute`      | string \| null       | HTML attribute to check           |
| `expected_value` | string \| null       | Expected value                    |
| `css_property`   | string \| null       | CSS property to check             |
| `points`         | integer              | Points awarded on pass            |

### Attempt

| Field          | Type                             | Notes                         |
| -------------- | -------------------------------- | ----------------------------- |
| `id`           | integer                          | Primary key                   |
| `test_id`      | integer                          | FK → tests.id                 |
| `student_id`   | integer                          | FK → users.id                 |
| `status`       | `"in_progress"` \| `"submitted"` |                               |
| `started_at`   | integer                          | Unix timestamp                |
| `submitted_at` | integer \| null                  | Unix timestamp; set on submit |

One attempt per student per test (enforced by UNIQUE constraint).

### Submission

| Field              | Type            | Notes                             |
| ------------------ | --------------- | --------------------------------- |
| `id`               | integer         | Primary key                       |
| `attempt_id`       | integer         | FK → attempts.id                  |
| `question_id`      | integer         | FK → questions.id                 |
| `html_code`        | string          | Student's HTML                    |
| `css_code`         | string          | Student's CSS                     |
| `mcq_answer_index` | integer \| null | Selected MCQ option               |
| `score`            | integer         | Earned points (set on submit)     |
| `max_score`        | integer         | Maximum points (set on submit)    |
| `grading_results`  | string \| null  | JSON-serialised `GradingResult[]` |
| `submitted_at`     | integer         | Unix timestamp of last save       |

One submission per question per attempt (enforced by UNIQUE constraint; upserted on each save).
