import { notFound } from 'next/navigation';
import { DocPage } from '@/components/DocPage';
import { DocsSidebar } from '@/components/DocsSidebar';
import { docs, getDocBySlug } from '@/lib/docs';

export function generateStaticParams() {
  return docs
    .filter((doc) => doc.slug !== 'overview')
    .map((doc) => ({ slug: doc.slug }));
}

export default async function DynamicDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  if (!doc) {
    notFound();
  }

  return (
    <main className="content-width docs-shell">
      <DocsSidebar activeSlug={doc.slug} />
      <section className="docs-main">
        <DocPage doc={doc} />
      </section>
    </main>
  );
}