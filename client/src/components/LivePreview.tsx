import { useMemo } from 'react';

interface Props {
  /** HTML body content to render inside the iframe. */
  html: string;
  /** CSS rules to inject into the iframe's `<style>` block. */
  css: string;
  /** Header label displayed above the preview frame (default `"Preview"`). */
  title?: string;
  /** Additional Tailwind classes applied to the outer container. */
  className?: string;
}

/**
 * Renders an HTML/CSS snippet inside a sandboxed `<iframe>` for live preview.
 *
 * Builds a complete HTML document (`srcDoc`) from `html` and `css` each time
 * either prop changes (memoised). The iframe uses `sandbox="allow-same-origin"`
 * which permits DOM reads but blocks scripts and form submissions, preventing
 * student code from escaping the sandbox.
 */
export default function LivePreview({ html, css, title = 'Preview', className = '' }: Props) {
  const srcDoc = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          * { box-sizing: border-box; }
          body { margin: 8px; font-family: sans-serif; }
          ${css}
        </style>
      </head>
      <body>${html}</body>
    </html>
  `, [html, css]);

  return (
    <div className={`flex flex-col border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      <div className="bg-gray-100 border-b border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600">
        {title}
      </div>
      <iframe
        srcDoc={srcDoc}
        sandbox="allow-same-origin"
        className="flex-1 w-full bg-white"
        title={title}
      />
    </div>
  );
}
