import Link from 'next/link';
import { DocItem } from '@/lib/docs';
import { CodeTabs } from '@/components/CodeTabs';

function formatInline(text: string) {
  const parts = text.split(/(`[^`]+`)/g);

  return parts.map((part, index) => {
    if (/^`[^`]+`$/.test(part)) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    return part;
  });
}

function renderBody(body: string) {
  const lines = body.split('\n');
  const elements: React.ReactNode[] = [];

  let paragraphBuffer: string[] = [];
  let ulBuffer: string[] = [];
  let olBuffer: string[] = [];
  let codeBuffer: string[] = [];
  let inCodeBlock = false;

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;

    elements.push(
      <p key={`p-${elements.length}`}>
        {formatInline(paragraphBuffer.join(' '))}
      </p>
    );
    paragraphBuffer = [];
  };

  const flushUl = () => {
    if (!ulBuffer.length) return;

    elements.push(
      <ul key={`ul-${elements.length}`}>
        {ulBuffer.map((item, index) => (
          <li key={`${item}-${index}`}>{formatInline(item)}</li>
        ))}
      </ul>
    );
    ulBuffer = [];
  };

  const flushOl = () => {
    if (!olBuffer.length) return;

    elements.push(
      <ol key={`ol-${elements.length}`}>
        {olBuffer.map((item, index) => (
          <li key={`${item}-${index}`}>{formatInline(item)}</li>
        ))}
      </ol>
    );
    olBuffer = [];
  };

  const flushCode = () => {
    if (!codeBuffer.length) return;

    elements.push(
      <pre key={`pre-${elements.length}`}>
        <code>{codeBuffer.join('\n')}</code>
      </pre>
    );
    codeBuffer = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushUl();
    flushOl();
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      flushAll();

      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }

      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (!trimmed) {
      flushAll();
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushAll();
      elements.push(
        <h3 key={`h3-${elements.length}`}>{formatInline(trimmed.slice(4))}</h3>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushAll();
      elements.push(
        <h2 key={`h2-${elements.length}`}>{formatInline(trimmed.slice(3))}</h2>
      );
      continue;
    }

    if (trimmed.startsWith('- ')) {
      flushParagraph();
      flushOl();
      ulBuffer.push(trimmed.slice(2).trim());
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      flushUl();
      olBuffer.push(trimmed.replace(/^\d+\.\s+/, '').trim());
      continue;
    }

    flushUl();
    flushOl();
    paragraphBuffer.push(trimmed);
  }

  flushAll();
  flushCode();

  return elements;
}

export function DocPage({ doc }: { doc: DocItem }) {
  return (
    <article className="doc-prose">
      <p className="eyebrow">Public docs</p>
      <h1 className="page-title">{doc.title}</h1>
      <p className="lead">{doc.description}</p>
      <div className="notice">
        Phase 1 shell: this docs surface is wired to the existing backend and repo documentation,
        and will be expanded as the private dashboard comes online.
      </div>
      <div style={{ marginTop: 24 }}>
        {renderBody(doc.body)}

        {doc.codeExamples?.map((group) => (
          <CodeTabs key={group.title} title={group.title} examples={group.examples} />
        ))}
      </div>
      <div className="footer-callout panel">
        <h2>Next step</h2>
        <p className="text-muted">
          Use this public docs surface to explain the product now, then connect it to the private
          dashboard, partner uploads, and alerts in later phases.
        </p>
        <div className="actions">
          <Link href="/pricing" className="button">
            View pricing
          </Link>
          <Link href="/login" className="button-ghost">
            Log in
          </Link>
        </div>
      </div>
    </article>
  );
}