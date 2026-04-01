import { DocPage } from '@/components/DocPage';
import { DocsSidebar } from '@/components/DocsSidebar';
import { getDocBySlug, defaultDocSlug } from '@/lib/docs';

export default function DocsIndexPage() {
  const doc = getDocBySlug(defaultDocSlug)!;

  return (
    <main className="content-width docs-shell">
      <DocsSidebar activeSlug={doc.slug} />
      <section className="docs-main">
        <DocPage doc={doc} />
      </section>
    </main>
  );
}
