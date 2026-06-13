const BASE = '/api';

/** Retrieves the JWT stored by {@link setSession}. Returns an empty string when not logged in. */
function getToken() {
  return localStorage.getItem('token') ?? '';
}

/**
 * Core HTTP helper used by all API modules.
 * Attaches the `Authorization: Bearer <token>` header automatically and parses
 * the JSON response body. Throws an `Error` whose `message` is the server's
 * `error` field on any non-2xx response.
 *
 * @param method - HTTP method (`"GET"`, `"POST"`, `"PUT"`, `"DELETE"`).
 * @param path   - API path relative to `/api` (e.g. `"/auth/login"`).
 * @param body   - Optional request body; serialised to JSON if provided.
 * @returns Parsed JSON response cast to `T`.
 */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }

  return res.json();
}

/** Low-level HTTP verbs. Use the domain-specific modules (`authApi`, `testsApi`, etc.) in application code. */
export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

/** Authentication operations — register and log in. Both return a JWT and user object. */
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }),
  register: (email: string, name: string, password: string, role: 'lecturer' | 'student') =>
    api.post<{ token: string; user: User }>('/auth/register', { email, name, password, role }),
};

/** Test discovery and management. Lecturers use `myTests`/`createTest`/`updateTest`/`deleteTest`; students use `availableTests`/`getTest`. */
export const testsApi = {
  myTests: () => api.get<Test[]>('/tests/my'),
  availableTests: () => api.get<Test[]>('/tests/available'),
  getTest: (id: number) => api.get<TestWithQuestions>(`/tests/${id}`),
  createTest: (data: Partial<Test>) => api.post<{ id: number }>('/tests', data),
  updateTest: (id: number, data: Partial<Test>) => api.put<{ ok: boolean }>(`/tests/${id}`, data),
  deleteTest: (id: number) => api.delete<{ ok: boolean }>(`/tests/${id}`),
};

/** Question and grading-criteria management (lecturer-only operations). */
export const questionsApi = {
  createQuestion: (data: Partial<Question>) => api.post<{ id: number }>('/questions', data),
  updateQuestion: (id: number, data: Partial<Question>) =>
    api.put<{ ok: boolean }>(`/questions/${id}`, data),
  deleteQuestion: (id: number) => api.delete<{ ok: boolean }>(`/questions/${id}`),
  addCriterion: (questionId: number, data: Partial<Criterion>) =>
    api.post<{ id: number }>(`/questions/${questionId}/criteria`, data),
  deleteCriterion: (criterionId: number) =>
    api.delete<{ ok: boolean }>(`/questions/criteria/${criterionId}`),
};

/**
 * Student attempt lifecycle.
 * - `start`       — creates or resumes an attempt, returns existing submissions.
 * - `saveProgress`— debounced upsert called on every keypress in the TestRoom.
 * - `submit`      — locks the attempt and triggers server-side grading.
 * - `getResults`  — retrieves graded submissions for the results page.
 * - `testResults` — aggregated per-student results for the lecturer view.
 */
export const attemptsApi = {
  start: (testId: number) =>
    api.post<{ attempt: Attempt; submissions: Submission[] }>('/attempts/start', {
      test_id: testId,
    }),
  saveProgress: (attemptId: number, questionId: number, data: Partial<Submission>) =>
    api.put<{ ok: boolean }>(`/attempts/${attemptId}/questions/${questionId}`, data),
  submit: (attemptId: number) =>
    api.post<{ ok: boolean; score: number; maxScore: number; submissions: Submission[] }>(
      `/attempts/${attemptId}/submit`,
      {}
    ),
  getResults: (attemptId: number) =>
    api.get<{ attempt: Attempt; submissions: Submission[] }>(`/attempts/${attemptId}/results`),
  testResults: (testId: number) => api.get<Attempt[]>(`/attempts/test/${testId}/results`),
};

// ─── Domain types ────────────────────────────────────────────────────────────

/** Authenticated user returned by login / register and stored in localStorage. */
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'lecturer' | 'student';
}

/**
 * A test record as returned by the API.
 * `lecturer_name`, `attempt_id`, and `attempt_status` are only present in
 * the `/tests/available` response (student dashboard).
 */
export interface Test {
  id: number;
  title: string;
  description?: string;
  /** `null` / absent means no time limit. */
  time_limit_minutes?: number;
  status: 'draft' | 'published' | 'closed';
  /** Unix timestamp (seconds). */
  created_at: number;
  /** Unix timestamp (seconds); absent for drafts. */
  published_at?: number;
  /** Joined from the `users` table — only present in student list view. */
  lecturer_name?: string;
  /** The calling student's attempt ID for this test, if any. */
  attempt_id?: number;
  /** `"in_progress"` or `"submitted"` — only present if `attempt_id` is set. */
  attempt_status?: string;
}

/** A question belonging to a test. `criteria` is populated in the lecturer view only. */
export interface Question {
  id: number;
  test_id: number;
  type: 'code-from-scratch' | 'fix-the-bug' | 'match-output' | 'mcq';
  /** Zero-based display order within the test. */
  order_index: number;
  title: string;
  description: string;
  /** Pre-filled HTML shown in the editor when the student first opens the question. */
  starter_html: string;
  /** Pre-filled CSS shown in the editor when the student first opens the question. */
  starter_css: string;
  /** Reference HTML (used for `match-output` questions and auto-grading). */
  reference_html: string;
  /** Reference CSS (used for `match-output` questions and auto-grading). */
  reference_css: string;
  /** JSON-serialised string array of option labels — parse with `JSON.parse` before rendering. */
  mcq_options?: string;
  /** Zero-based index of the correct MCQ option. */
  mcq_correct_index?: number;
  total_points: number;
  /** Present in lecturer view only (`GET /tests/:id`). */
  criteria?: Criterion[];
}

/** {@link Test} with its questions eagerly loaded — returned by `GET /tests/:id`. */
export interface TestWithQuestions extends Test {
  questions: Question[];
}

/** A grading rule attached to a code question. */
export interface Criterion {
  id: number;
  question_id: number;
  /** `dom` — checks element/attribute; `style` — checks a CSS property value. */
  type: 'dom' | 'style' | 'mcq';
  /** Displayed to the student on the results page. */
  label: string;
  /** CSS selector targeting the element to check. */
  selector?: string;
  /** HTML attribute name (dom criteria with attribute check). */
  attribute?: string;
  /** Expected attribute value, text content, or CSS property value. */
  expected_value?: string;
  /** CSS property name to check (style criteria only). */
  css_property?: string;
  points: number;
}

/**
 * One student's attempt at a test.
 * `student_name`, `student_email`, `total_score`, and `total_max` are only
 * present in the lecturer aggregated results response.
 */
export interface Attempt {
  id: number;
  test_id: number;
  student_id: number;
  status: 'in_progress' | 'submitted';
  /** Unix timestamp when the attempt was created. */
  started_at: number;
  /** Unix timestamp when the student submitted; absent while in progress. */
  submitted_at?: number;
  student_name?: string;
  student_email?: string;
  total_score?: number;
  total_max?: number;
}

/**
 * One question's answer within an attempt.
 * `grading_results` is a parsed array on the results page; a raw JSON string
 * in the submit response — always parse before rendering.
 * `title` and `type` are joined from the questions table in the results view.
 */
export interface Submission {
  id: number;
  attempt_id: number;
  question_id: number;
  html_code: string;
  css_code: string;
  /** Zero-based index of the selected MCQ option; absent for code questions. */
  mcq_answer_index?: number;
  score: number;
  max_score: number;
  grading_results: GradingResult[];
  /** Joined question title — present in the results view. */
  title?: string;
  /** Joined question type — present in the results view. */
  type?: string;
}

/** The outcome of evaluating one grading criterion, as returned inside {@link Submission.grading_results}. */
export interface GradingResult {
  criterionId: number;
  label: string;
  passed: boolean;
  /** Maximum points available for this criterion. */
  points: number;
  /** Points awarded — either `points` (pass) or `0` (fail). */
  earned: number;
  /** Human-readable explanation, e.g. `"✓ Element nav exists"`. */
  feedback: string;
}
