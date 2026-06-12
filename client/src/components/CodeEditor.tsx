import Editor from '@monaco-editor/react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  language: 'html' | 'css';
  label?: string;
  height?: string;
  readOnly?: boolean;
}

export default function CodeEditor({ value, onChange, language, label, height = '200px', readOnly }: Props) {
  return (
    <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden">
      {label && (
        <div className="bg-gray-100 border-b border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 flex items-center gap-2">
          <span className={`badge ${language === 'html' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
            {language.toUpperCase()}
          </span>
          {label}
        </div>
      )}
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={v => onChange(v ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
          readOnly,
          padding: { top: 8 },
        }}
        theme="vs"
      />
    </div>
  );
}
