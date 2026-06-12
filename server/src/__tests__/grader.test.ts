import { describe, it, expect } from 'vitest';
import { gradeSubmission, gradeMcq } from '../services/grader.js';

// ─── gradeMcq ────────────────────────────────────────────────────────────────

describe('gradeMcq', () => {
  it('awards full points for correct answer', () => {
    expect(gradeMcq(2, 2, 5)).toBe(5);
  });

  it('awards zero for wrong answer', () => {
    expect(gradeMcq(1, 2, 5)).toBe(0);
  });

  it('awards zero when answer is null (unanswered)', () => {
    expect(gradeMcq(null as any, 0, 10)).toBe(0);
  });
});

// ─── DOM checks ──────────────────────────────────────────────────────────────

describe('gradeSubmission – DOM checks', () => {
  it('passes when element exists', () => {
    const { results, score, maxScore } = gradeSubmission(
      '<nav class="navbar"><a href="#">Home</a></nav>',
      '',
      [{ id: 1, type: 'dom', label: 'Has nav.navbar', selector: 'nav.navbar', points: 5 }]
    );
    expect(score).toBe(5);
    expect(maxScore).toBe(5);
    expect(results[0].passed).toBe(true);
  });

  it('fails when element is missing', () => {
    const { results, score } = gradeSubmission(
      '<div>no nav here</div>',
      '',
      [{ id: 1, type: 'dom', label: 'Has nav.navbar', selector: 'nav.navbar', points: 5 }]
    );
    expect(score).toBe(0);
    expect(results[0].passed).toBe(false);
    expect(results[0].feedback).toMatch(/No element found/);
  });

  it('passes attribute check when value matches', () => {
    const { results, score } = gradeSubmission(
      '<a href="https://example.com">Link</a>',
      '',
      [{ id: 1, type: 'dom', label: 'Link href correct', selector: 'a', attribute: 'href', expected_value: 'https://example.com', points: 3 }]
    );
    expect(score).toBe(3);
    expect(results[0].passed).toBe(true);
  });

  it('fails attribute check when value is wrong', () => {
    const { results, score } = gradeSubmission(
      '<a href="/wrong">Link</a>',
      '',
      [{ id: 1, type: 'dom', label: 'Link href correct', selector: 'a', attribute: 'href', expected_value: 'https://example.com', points: 3 }]
    );
    expect(score).toBe(0);
    expect(results[0].passed).toBe(false);
  });

  it('passes text content check', () => {
    const { results, score } = gradeSubmission(
      '<h1>Hello World</h1>',
      '',
      [{ id: 1, type: 'dom', label: 'H1 contains Hello', selector: 'h1', expected_value: 'hello world', points: 2 }]
    );
    expect(score).toBe(2);
    expect(results[0].passed).toBe(true);
  });

  it('handles invalid CSS selector gracefully', () => {
    const { results, score } = gradeSubmission(
      '<div></div>',
      '',
      [{ id: 1, type: 'dom', label: 'Bad selector', selector: ':::invalid:::', points: 4 }]
    );
    expect(score).toBe(0);
    expect(results[0].passed).toBe(false);
  });

  it('scores partial marks when only some criteria pass', () => {
    const { score, maxScore } = gradeSubmission(
      '<nav class="navbar"></nav>',
      '',
      [
        { id: 1, type: 'dom', label: 'Has nav.navbar', selector: 'nav.navbar', points: 5 },
        { id: 2, type: 'dom', label: 'Has link inside nav', selector: 'nav a', points: 5 },
      ]
    );
    expect(score).toBe(5);   // first passes, second fails
    expect(maxScore).toBe(10);
  });
});

// ─── CSS style checks ─────────────────────────────────────────────────────────

describe('gradeSubmission – CSS style checks', () => {
  it('passes when CSS property matches in stylesheet', () => {
    const { results, score } = gradeSubmission(
      '<h1>Title</h1>',
      'h1 { color: red; }',
      [{ id: 1, type: 'style', label: 'h1 is red', selector: 'h1', css_property: 'color', expected_value: 'red', points: 4 }]
    );
    expect(score).toBe(4);
    expect(results[0].passed).toBe(true);
  });

  it('normalises colour names when comparing', () => {
    const { results } = gradeSubmission(
      '<p>text</p>',
      'p { color: #ff0000; }',
      [{ id: 1, type: 'style', label: 'p is red', selector: 'p', css_property: 'color', expected_value: 'red', points: 2 }]
    );
    expect(results[0].passed).toBe(true);
  });

  it('fails when CSS property is not set', () => {
    const { results, score } = gradeSubmission(
      '<h1>Title</h1>',
      'h1 { font-size: 24px; }',
      [{ id: 1, type: 'style', label: 'h1 is blue', selector: 'h1', css_property: 'color', expected_value: 'blue', points: 3 }]
    );
    expect(score).toBe(0);
    expect(results[0].passed).toBe(false);
    expect(results[0].feedback).toMatch(/not set/);
  });

  it('fails when CSS value does not match', () => {
    const { results, score } = gradeSubmission(
      '<h1>Title</h1>',
      'h1 { color: blue; }',
      [{ id: 1, type: 'style', label: 'h1 is red', selector: 'h1', css_property: 'color', expected_value: 'red', points: 3 }]
    );
    expect(score).toBe(0);
    expect(results[0].passed).toBe(false);
  });

  it('fails gracefully when selector or property missing', () => {
    const { results } = gradeSubmission(
      '<h1>Title</h1>',
      'h1 { color: red; }',
      [{ id: 1, type: 'style', label: 'no property', selector: 'h1', points: 2 }]
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].feedback).toMatch(/Missing/);
  });

  it('scores zero for empty submission against criteria', () => {
    const { score, maxScore } = gradeSubmission('', '', [
      { id: 1, type: 'dom', label: 'Has h1', selector: 'h1', points: 5 },
      { id: 2, type: 'style', label: 'h1 red', selector: 'h1', css_property: 'color', expected_value: 'red', points: 5 },
    ]);
    expect(score).toBe(0);
    expect(maxScore).toBe(10);
  });
});
