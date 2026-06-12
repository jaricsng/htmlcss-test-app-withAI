import { JSDOM } from 'jsdom';
import * as csstree from 'css-tree';

export interface Criterion {
  id: number;
  type: 'dom' | 'style' | 'mcq';
  label: string;
  selector?: string;
  attribute?: string;
  expected_value?: string;
  css_property?: string;
  points: number;
}

export interface GradingResult {
  criterionId: number;
  label: string;
  passed: boolean;
  points: number;
  earned: number;
  feedback: string;
}

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
    return { ...base, passed: false, earned: 0, feedback: `Invalid selector: ${criterion.selector}` };
  }

  if (!element) {
    return {
      ...base, passed: false, earned: 0,
      feedback: `No element found matching "${criterion.selector}"`,
    };
  }

  if (criterion.attribute && criterion.expected_value != null) {
    const attr = element.getAttribute(criterion.attribute) ?? element.textContent ?? '';
    const pass = normalizeString(attr) === normalizeString(criterion.expected_value);
    return {
      ...base, passed: pass,
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
      ...base, passed: pass,
      earned: pass ? criterion.points : 0,
      feedback: pass
        ? `✓ Element contains "${criterion.expected_value}"`
        : `✗ Expected text to contain "${criterion.expected_value}"`,
    };
  }

  return {
    ...base, passed: true, earned: criterion.points,
    feedback: `✓ Element "${criterion.selector}" exists`,
  };
}

type CssRuleMap = Map<string, Map<string, string>>;

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
    return { ...base, passed: false, earned: 0, feedback: `Invalid selector: ${criterion.selector}` };
  }

  if (element) {
    const inlineStyle = (element as HTMLElement).style?.[prop as any];
    if (inlineStyle && normalizeColor(inlineStyle) === normalizeColor(expectedRaw)) {
      return { ...base, passed: true, earned: criterion.points, feedback: `✓ ${prop} matches "${expectedRaw}"` };
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
      ...base, passed: false, earned: 0,
      feedback: `✗ Property "${prop}" not set on "${criterion.selector}"`,
    };
  }

  const pass = normalizeColor(found) === normalizeColor(expectedRaw);
  return {
    ...base, passed: pass,
    earned: pass ? criterion.points : 0,
    feedback: pass
      ? `✓ ${prop}: ${found} matches "${expectedRaw}"`
      : `✗ Expected ${prop} to be "${expectedRaw}", got "${found}"`,
  };
}

function selectorMatches(ruleSelector: string, targetSelector: string, document: Document): boolean {
  if (ruleSelector === targetSelector) return true;
  try {
    const elements = document.querySelectorAll(ruleSelector);
    const target = document.querySelector(targetSelector);
    if (!target) return false;
    return Array.from(elements).some(el => el === target || el.contains(target) || target.contains(el));
  } catch {
    return false;
  }
}

function normalizeString(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeColor(val: string): string {
  // Normalize common color representations for comparison
  const v = val.trim().toLowerCase().replace(/\s/g, '');
  const colorNames: Record<string, string> = {
    red: '#ff0000', blue: '#0000ff', green: '#008000', black: '#000000',
    white: '#ffffff', yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
  };
  return colorNames[v] ?? v;
}

export function gradeMcq(answerIndex: number, correctIndex: number, points: number): number {
  return answerIndex === correctIndex ? points : 0;
}
