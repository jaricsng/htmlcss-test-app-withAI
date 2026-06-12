const BASE = '/api';

function getToken() {
  return localStorage.getItem('token') ?? '';
}

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

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }),
  register: (email: string, name: string, password: string, role: 'lecturer' | 'student') =>
    api.post<{ token: string; user: User }>('/auth/register', { email, name, password, role }),
};

// Tests
export const testsApi = {
  myTests: () => api.get<Test[]>('/tests/my'),
  availableTests: () => api.get<Test[]>('/tests/available'),
  getTest: (id: number) => api.get<TestWithQuestions>(`/tests/${id}`),
  createTest: (data: Partial<Test>) => api.post<{ id: number }>('/tests', data),
  updateTest: (id: number, data: Partial<Test>) => api.put<{ ok: boolean }>(`/tests/${id}`, data),
  deleteTest: (id: number) => api.delete<{ ok: boolean }>(`/tests/${id}`),
};

// Questions
export const questionsApi = {
  createQuestion: (data: Partial<Question>) => api.post<{ id: number }>('/questions', data),
  updateQuestion: (id: number, data: Partial<Question>) => api.put<{ ok: boolean }>(`/questions/${id}`, data),
  deleteQuestion: (id: number) => api.delete<{ ok: boolean }>(`/questions/${id}`),
  addCriterion: (questionId: number, data: Partial<Criterion>) =>
    api.post<{ id: number }>(`/questions/${questionId}/criteria`, data),
  deleteCriterion: (criterionId: number) =>
    api.delete<{ ok: boolean }>(`/questions/criteria/${criterionId}`),
};

// Attempts
export const attemptsApi = {
  start: (testId: number) =>
    api.post<{ attempt: Attempt; submissions: Submission[] }>('/attempts/start', { test_id: testId }),
  saveProgress: (attemptId: number, questionId: number, data: Partial<Submission>) =>
    api.put<{ ok: boolean }>(`/attempts/${attemptId}/questions/${questionId}`, data),
  submit: (attemptId: number) =>
    api.post<{ ok: boolean; score: number; maxScore: number; submissions: Submission[] }>(
      `/attempts/${attemptId}/submit`, {}
    ),
  getResults: (attemptId: number) =>
    api.get<{ attempt: Attempt; submissions: Submission[] }>(`/attempts/${attemptId}/results`),
  testResults: (testId: number) => api.get<Attempt[]>(`/attempts/test/${testId}/results`),
};

// Types
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'lecturer' | 'student';
}

export interface Test {
  id: number;
  title: string;
  description?: string;
  time_limit_minutes?: number;
  status: 'draft' | 'published' | 'closed';
  created_at: number;
  published_at?: number;
  lecturer_name?: string;
  attempt_id?: number;
  attempt_status?: string;
}

export interface Question {
  id: number;
  test_id: number;
  type: 'code-from-scratch' | 'fix-the-bug' | 'match-output' | 'mcq';
  order_index: number;
  title: string;
  description: string;
  starter_html: string;
  starter_css: string;
  reference_html: string;
  reference_css: string;
  mcq_options?: string;
  mcq_correct_index?: number;
  total_points: number;
  criteria?: Criterion[];
}

export interface TestWithQuestions extends Test {
  questions: Question[];
}

export interface Criterion {
  id: number;
  question_id: number;
  type: 'dom' | 'style' | 'mcq';
  label: string;
  selector?: string;
  attribute?: string;
  expected_value?: string;
  css_property?: string;
  points: number;
}

export interface Attempt {
  id: number;
  test_id: number;
  student_id: number;
  status: 'in_progress' | 'submitted';
  started_at: number;
  submitted_at?: number;
  student_name?: string;
  student_email?: string;
  total_score?: number;
  total_max?: number;
}

export interface Submission {
  id: number;
  attempt_id: number;
  question_id: number;
  html_code: string;
  css_code: string;
  mcq_answer_index?: number;
  score: number;
  max_score: number;
  grading_results: GradingResult[];
  title?: string;
  type?: string;
}

export interface GradingResult {
  criterionId: number;
  label: string;
  passed: boolean;
  points: number;
  earned: number;
  feedback: string;
}
