import { useMemo } from 'react';

interface Props {
  html: string;
  css: string;
  title?: string;
  className?: string;
}

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
