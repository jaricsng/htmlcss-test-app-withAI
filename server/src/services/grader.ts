import { JSDOM } from 'jsdom';
import * as csstree from 'css-tree';

/**
 * A single auto-grading rule attached to a code question.
 * `dom` criteria check element presence / attribute / text content via CSS selector.
 * `style` criteria check a CSS property value on a matched element.
 */
export interface Criterion {
  /** Database primary key. */
  id: number;
  /** Grading strategy to apply. */
  type: 'dom' | 'style' | 'mcq';
  /** Human-readable description shown to the student in results. */
  label: string;
  /** CSS selector identifying the target element. */
  selector?: string;
  /** HTML attribute name to compare against `expected_value` (dom criteria only). */
  attribute?: string;
  /** Expected attribute value, text content, or CSS value. */
  expected_value?: string;
  /** CSS property name to check (style criteria only). */
  css_property?: string;
  /** Points awarded when this criterion passes. */
  points: number;
}

/**
 * The outcome of evaluating one {@link Criterion} against a submission.
 * Returned as part of the array produced by {@link gradeSubmission}.
 */
export interface GradingResult {
  /** ID of the criterion that was evaluated. */
  criterionId: number;
  /** Human-readable criterion label, copied from the criterion. */
  label: string;
  /** Whether the criterion passed. */
  passed: boolean;
  /** Maximum points available for this criterion. */
  points: number;
  /** Points actually awarded (0 or `points`). */
  earned: number;
  /** One-line explanation of why the criterion passed or failed. */
  feedback: string;
}

/**
 * Grades a student's HTML/CSS code submission against a set of criteria.
 *
 * Builds a full HTML document from `htmlCode` and `cssCode`, parses it with
 * JSDOM and css-tree, then evaluates each criterion independently.
 *
 * @param htmlCode - The student's submitted HTML body content.
 * @param cssCode  - The student's submitted CSS.
 * @param criteria - Ordered list of criteria to evaluate.
 * @returns `results` (per-criterion outcomes), `score` (earned points), and `maxScore` (total possible).
 */
export function gradeSubmission(
  htmlCode: string,
  cssCode: string,
  criteria: Criterion[]
): { results: GradingResult[]; score: number; maxScore: number } {
  const fullHtml = `<!DOCTYPE html><html><head><style>${cssCode}</style></head><body>${htmlCode}</body></html>`;
  const dom = new JSDOM(fullHtml);
  const document = dom.window.document;

  const parsedCss = parseCssRules(cssCode);
  const results: GradingResult[] = [];
  let score = 0;
  let maxScore = 0;

  for (const criterion of criteria) {
    maxScore += criterion.points;
    const result = evaluateCriterion(criterion, document, parsedCss);
    score += result.earned;
    results.push(result);
  }

  return { results, score, maxScore };
}

/** Dispatches a single criterion to the appropriate grading function. */
function evaluateCriterion(
  criterion: Criterion,
  document: Document,
  parsedCss: CssRuleMap
): GradingResult {
  const base = {
    criterionId: criterion.id,
    label: criterion.label,
    points: criterion.points,
  };

  if (criterion.type === 'dom') {
    return gradeDom(criterion, document, base);
  } else if (criterion.type === 'style') {
    return gradeStyle(criterion, document, parsedCss, base);
  }

  return { ...base, passed: false, earned: 0, feedback: 'Unknown criterion type' };
}

/**
 * Evaluates a `dom` criterion: checks element existence, optional attribute value,
 * or optional text content against `criterion.selector`.
 */
function gradeDom(
  criterion: Criterion,
  document: Document,
  base: { criterionId: number; label: string; points: number }
): GradingResult {
  if (!criterion.selector) {
    return { ...base, passed: false, earned: 0, feedback: 'No selector specified' };
  }

  let element: Element | null = null;
  try {
    element = document.querySelector(criterion.selector);
  } catch {
    return {
      ...base,
      passed: false,
      earned: 0,
      feedback: `Invalid selector: ${criterion.selector}`,
    };
  }

  if (!element) {
    return {
      ...base,
      passed: false,
      earned: 0,
      feedback: `No element found matching "${criterion.selector}"`,
    };
  }

  if (criterion.attribute && criterion.expected_value != null) {
    const attr = element.getAttribute(criterion.attribute) ?? element.textContent ?? '';
    const pass = normalizeString(attr) === normalizeString(criterion.expected_value);
    return {
      ...base,
      passed: pass,
      earned: pass ? criterion.points : 0,
      feedback: pass
        ? `✓ ${criterion.attribute} matches "${criterion.expected_value}"`
        : `✗ Expected ${criterion.attribute} to be "${criterion.expected_value}", got "${attr}"`,
    };
  }

  if (criterion.expected_value != null) {
    const text = element.textContent ?? '';
    const pass = normalizeString(text).includes(normalizeString(criterion.expected_value));
    return {
      ...base,
      passed: pass,
      earned: pass ? criterion.points : 0,
      feedback: pass
        ? `✓ Element contains "${criterion.expected_value}"`
        : `✗ Expected text to contain "${criterion.expected_value}"`,
    };
  }

  return {
    ...base,
    passed: true,
    earned: criterion.points,
    feedback: `✓ Element "${criterion.selector}" exists`,
  };
}

/** Maps CSS selector strings to a map of property → value. Built by {@link parseCssRules}. */
type CssRuleMap = Map<string, Map<string, string>>;

/** Parses raw CSS text into a {@link CssRuleMap} using css-tree. Invalid CSS is silently ignored. */
function parseCssRules(css: string): CssRuleMap {
  const ruleMap: CssRuleMap = new Map();
  try {
    const ast = csstree.parse(css);
    csstree.walk(ast, (node: csstree.CssNode) => {
      if (node.type === 'Rule') {
        const selector = csstree.generate(node.prelude).trim();
        const props = new Map<string, string>();
        if (node.block?.children) {
          node.block.children.forEach((child: csstree.CssNode) => {
            if (child.type === 'Declaration') {
              props.set(child.property.toLowerCase(), csstree.generate(child.value).trim());
            }
          });
        }
        ruleMap.set(selector, props);
      }
    });
  } catch {
    // ignore CSS parse errors
  }
  return ruleMap;
}

/**
 * Evaluates a `style` criterion: checks that `criterion.css_property` on the matched
 * element equals `criterion.expected_value`. Checks inline styles first, then the
 * parsed stylesheet rule map.
 */
function gradeStyle(
  criterion: Criterion,
  document: Document,
  parsedCss: CssRuleMap,
  base: { criterionId: number; label: string; points: number }
): GradingResult {
  if (!criterion.selector || !criterion.css_property) {
    return { ...base, passed: false, earned: 0, feedback: 'Missing selector or CSS property' };
  }

  const prop = criterion.css_property.toLowerCase();
  const expectedRaw = criterion.expected_value ?? '';

  // Check inline styles first
  let element: Element | null = null;
  try {
    element = document.querySelector(criterion.selector);
  } catch {
    return {
      ...base,
      passed: false,
      earned: 0,
      feedback: `Invalid selector: ${criterion.selector}`,
    };
  }

  if (element) {
    const inlineStyle = (element as HTMLElement).style?.[prop as any];
    if (inlineStyle && normalizeColor(inlineStyle) === normalizeColor(expectedRaw)) {
      return {
        ...base,
        passed: true,
        earned: criterion.points,
        feedback: `✓ ${prop} matches "${expectedRaw}"`,
      };
    }
  }

  // Check stylesheet rules — find best matching selector
  let found: string | undefined;
  for (const [ruleSelector, props] of parsedCss) {
    if (selectorMatches(ruleSelector, criterion.selector, document)) {
      const val = props.get(prop);
      if (val !== undefined) {
        found = val;
      }
    }
  }

  if (found === undefined) {
    return {
      ...base,
      passed: false,
      earned: 0,
      feedback: `✗ Property "${prop}" not set on "${criterion.selector}"`,
    };
  }

  const pass = normalizeColor(found) === normalizeColor(expectedRaw);
  return {
    ...base,
    passed: pass,
    earned: pass ? criterion.points : 0,
    feedback: pass
      ? `✓ ${prop}: ${found} matches "${expectedRaw}"`
      : `✗ Expected ${prop} to be "${expectedRaw}", got "${found}"`,
  };
}

/** Returns true if `ruleSelector` targets the same element as `targetSelector` in the document. */
function selectorMatches(
  ruleSelector: string,
  targetSelector: string,
  document: Document
): boolean {
  if (ruleSelector === targetSelector) return true;
  try {
    const elements = document.querySelectorAll(ruleSelector);
    const target = document.querySelector(targetSelector);
    if (!target) return false;
    return Array.from(elements).some(
      el => el === target || el.contains(target) || target.contains(el)
    );
  } catch {
    return false;
  }
}

/** Trims, lowercases, and collapses internal whitespace for case-insensitive string comparison. */
function normalizeString(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalises color values for comparison — converts common named colors to hex
 * so `"red"` and `"#ff0000"` compare as equal.
 */
function normalizeColor(val: string): string {
  const v = val.trim().toLowerCase().replace(/\s/g, '');
  const colorNames: Record<string, string> = {
    red: '#ff0000',
    blue: '#0000ff',
    green: '#008000',
    black: '#000000',
    white: '#ffffff',
    yellow: '#ffff00',
    orange: '#ffa500',
    purple: '#800080',
  };
  return colorNames[v] ?? v;
}

/**
 * Grades a single MCQ answer by comparing the student's selection to the correct index.
 *
 * @param answerIndex  - Zero-based index of the option the student selected.
 * @param correctIndex - Zero-based index of the correct option.
 * @param points       - Points to award for a correct answer.
 * @returns `points` if the answer matches, otherwise `0`.
 */
export function gradeMcq(answerIndex: number, correctIndex: number, points: number): number {
  return answerIndex === correctIndex ? points : 0;
}
