'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type CodeExample = {
  label: string;
  language: string;
  code: string;
};

type Token = {
  text: string;
  className?: string;
};

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function highlightJson(code: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|\b-?\d+(?:\.\d+)?\b/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index) });
    }

    const [full] = match;
    const isString = Boolean(match[1]);
    const isKey = Boolean(match[2]);
    const isBooleanOrNull = Boolean(match[3]);
    const isNumber = !isString && !isBooleanOrNull;

    if (isString && isKey) {
      tokens.push({ text: full, className: 'token-key' });
    } else if (isString) {
      tokens.push({ text: full, className: 'token-string' });
    } else if (isBooleanOrNull) {
      tokens.push({ text: full, className: 'token-boolean' });
    } else if (isNumber) {
      tokens.push({ text: full, className: 'token-number' });
    } else {
      tokens.push({ text: full });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex) });
  }

  return tokens;
}

function highlightBash(code: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /"[^"]*"|'[^']*'|\b(curl)\b|(^|\s)(-\w+|--[\w-]+)|https?:\/\/[^\s\\]+/gm;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index) });
    }

    const full = match[0];

    if (/^https?:\/\//.test(full.trim())) {
      tokens.push({ text: full, className: 'token-url' });
    } else if (/^["']/.test(full.trim())) {
      tokens.push({ text: full, className: 'token-string' });
    } else if (/\b(curl)\b/.test(full)) {
      tokens.push({ text: full, className: 'token-keyword' });
    } else if (/(^|\s)(-\w+|--[\w-]+)/.test(full)) {
      tokens.push({ text: full, className: 'token-flag' });
    } else {
      tokens.push({ text: full });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex) });
  }

  return tokens;
}

function highlightPython(code: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /"[^"]*"|'[^']*'|\b(import|from|print|return|if|else|for|in|None|True|False)\b|\b(requests|post|json|headers|payload|response)\b/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index) });
    }

    const full = match[0];

    if (/^["']/.test(full)) {
      tokens.push({ text: full, className: 'token-string' });
    } else if (
      /\b(import|from|print|return|if|else|for|in|None|True|False)\b/.test(full)
    ) {
      tokens.push({ text: full, className: 'token-keyword' });
    } else if (/\b(requests|post|json|headers|payload|response)\b/.test(full)) {
      tokens.push({ text: full, className: 'token-function' });
    } else {
      tokens.push({ text: full });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex) });
  }

  return tokens;
}

function highlightJavaScript(code: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /"[^"]*"|'[^']*'|`[^`]*`|\b(import|from|const|let|await|async|return|if|else|true|false|null)\b|\b(fetch|JSON|stringify|console|log)\b/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index) });
    }

    const full = match[0];

    if (/^["'`]/.test(full)) {
      tokens.push({ text: full, className: 'token-string' });
    } else if (
      /\b(import|from|const|let|await|async|return|if|else|true|false|null)\b/.test(full)
    ) {
      tokens.push({ text: full, className: 'token-keyword' });
    } else if (/\b(fetch|JSON|stringify|console|log)\b/.test(full)) {
      tokens.push({ text: full, className: 'token-function' });
    } else {
      tokens.push({ text: full });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex) });
  }

  return tokens;
}

function highlightCSharp(code: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /"[^"]*"|\b(using|var|new|await|async|return|true|false|null)\b|\b(HttpClient|StringContent|Console|WriteLine|SendAsync|ReadAsStringAsync)\b/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index) });
    }

    const full = match[0];

    if (/^"/.test(full)) {
      tokens.push({ text: full, className: 'token-string' });
    } else if (/\b(using|var|new|await|async|return|true|false|null)\b/.test(full)) {
      tokens.push({ text: full, className: 'token-keyword' });
    } else if (
      /\b(HttpClient|StringContent|Console|WriteLine|SendAsync|ReadAsStringAsync)\b/.test(full)
    ) {
      tokens.push({ text: full, className: 'token-function' });
    } else {
      tokens.push({ text: full });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex) });
  }

  return tokens;
}

function highlightJava(code: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /"[^"]*"|\b(import|class|public|static|void|var|new|return|throws)\b|\b(HttpClient|HttpRequest|HttpResponse|BodyPublishers|BodyHandlers|send|println)\b/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index) });
    }

    const full = match[0];

    if (/^"/.test(full)) {
      tokens.push({ text: full, className: 'token-string' });
    } else if (/\b(import|class|public|static|void|var|new|return|throws)\b/.test(full)) {
      tokens.push({ text: full, className: 'token-keyword' });
    } else if (
      /\b(HttpClient|HttpRequest|HttpResponse|BodyPublishers|BodyHandlers|send|println)\b/.test(
        full
      )
    ) {
      tokens.push({ text: full, className: 'token-function' });
    } else {
      tokens.push({ text: full });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex) });
  }

  return tokens;
}

function highlightGo(code: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /"[^"]*"|`[^`]*`|\b(import|func|var|if|return|nil)\b|\b(http|NewRequest|Do|NewReader|Marshal|Println|Client|ReadAll)\b/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index) });
    }

    const full = match[0];

    if (/^["`]/.test(full)) {
      tokens.push({ text: full, className: 'token-string' });
    } else if (/\b(import|func|var|if|return|nil)\b/.test(full)) {
      tokens.push({ text: full, className: 'token-keyword' });
    } else if (/\b(http|NewRequest|Do|NewReader|Marshal|Println|Client|ReadAll)\b/.test(full)) {
      tokens.push({ text: full, className: 'token-function' });
    } else {
      tokens.push({ text: full });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex) });
  }

  return tokens;
}

function getHighlightedTokens(language: string, code: string) {
  if (language === 'json') return highlightJson(code);
  if (language === 'bash' || language === 'shell' || language === 'curl') return highlightBash(code);
  if (language === 'python') return highlightPython(code);
  if (language === 'javascript' || language === 'js') return highlightJavaScript(code);
  if (language === 'csharp' || language === 'cs') return highlightCSharp(code);
  if (language === 'java') return highlightJava(code);
  if (language === 'go') return highlightGo(code);

  return [{ text: code }];
}

function renderCode(language: string, code: string) {
  const lines = code.split('\n');
  const highlighted = getHighlightedTokens(language, code);
  const tokenLines: Token[][] = [[]];

  highlighted.forEach((token) => {
    const parts = token.text.split('\n');

    parts.forEach((part, index) => {
      if (index > 0) tokenLines.push([]);

      if (part.length > 0) {
        tokenLines[tokenLines.length - 1].push({
          text: part,
          className: token.className
        });
      }
    });
  });

  while (tokenLines.length < lines.length) {
    tokenLines.push([]);
  }

  return (
    <div className="code-scroll">
      <div className="code-block-body">
        <div className="code-line-numbers" aria-hidden="true">
          {lines.map((_, index) => (
            <span key={index}>{index + 1}</span>
          ))}
        </div>

        <pre className="code-pre">
          <code>
            {tokenLines.map((lineTokens, lineIndex) => (
              <div key={lineIndex} className="code-line">
                {lineTokens.length === 0 ? (
                  <span>&nbsp;</span>
                ) : (
                  lineTokens.map((token, tokenIndex) => (
                    <span
                      key={`${lineIndex}-${tokenIndex}`}
                      className={token.className}
                      dangerouslySetInnerHTML={{ __html: escapeHtml(token.text) }}
                    />
                  ))
                )}
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

export function CodeTabs({
  title,
  examples
}: {
  title: string;
  examples: CodeExample[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const active = useMemo(() => examples[activeIndex] ?? examples[0], [examples, activeIndex]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(active.code);
    } catch (error) {
      console.error('Failed to copy code', error);
    }
  }

  return (
    <div className="code-card compact">
      <div className="code-card-header compact">
        <div className="code-card-title">{title}</div>

        <div className="code-card-controls">
          {examples.length > 1 && (
            <div className="code-menu" ref={menuRef}>
              <button
                type="button"
                className="code-menu-trigger"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={open}
              >
                <span>{active.label.toLowerCase()}</span>
                <span className={open ? 'code-menu-chevron open' : 'code-menu-chevron'}>⌄</span>
              </button>

              {open && (
                <div className="code-menu-popover" role="menu">
                  {examples.map((example, index) => (
                    <button
                      key={`${example.label}-${index}`}
                      type="button"
                      className={index === activeIndex ? 'code-menu-item active' : 'code-menu-item'}
                      onClick={() => {
                        setActiveIndex(index);
                        setOpen(false);
                      }}
                    >
                      {example.label.toLowerCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button type="button" className="copy-icon-button" onClick={handleCopy}>
            Copy
          </button>
        </div>
      </div>

      {renderCode(active.language, active.code)}
    </div>
  );
}