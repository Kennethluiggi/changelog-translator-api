import Link from 'next/link';
import {
  apiEndpointSlugs,
  apiReferenceParentSlug,
  docs,
  type DocItem,
  defaultDocSlug
} from '@/lib/docs';

const endpointDocs = docs.filter((doc) => apiEndpointSlugs.includes(doc.slug));
const mainDocs = docs.filter((doc) => !apiEndpointSlugs.includes(doc.slug));

function getHref(doc: DocItem) {
  return doc.slug === defaultDocSlug ? '/docs' : `/docs/${doc.slug}`;
}

export function DocsSidebar({ activeSlug }: { activeSlug?: string }) {
  const slug = activeSlug ?? defaultDocSlug;
  const apiOpen = slug === apiReferenceParentSlug || apiEndpointSlugs.includes(slug);

  return (
    <aside className="docs-sidebar">
      <p className="docs-group-title">Documentation</p>
      <ul className="docs-list">
        {mainDocs.map((doc) => {
          const isApiParent = doc.slug === apiReferenceParentSlug;

          if (!isApiParent) {
            return (
              <li key={doc.slug}>
                <Link href={getHref(doc)} className={slug === doc.slug ? 'active' : ''}>
                  {doc.title}
                </Link>
              </li>
            );
          }

          return (
            <li key={doc.slug}>
              <Link href={getHref(doc)} className={slug === doc.slug ? 'active' : ''}>
                {doc.title}
              </Link>

              {apiOpen && (
                <ul className="docs-sublist">
                  {endpointDocs.map((endpoint) => (
                    <li key={endpoint.slug}>
                      <Link
                        href={getHref(endpoint)}
                        className={slug === endpoint.slug ? 'active sub-active' : 'sub-link'}
                      >
                        {endpoint.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <p className="docs-group-title">Product</p>
      <ul className="docs-list">
        <li>
          <Link href="/pricing">Pricing</Link>
        </li>
        <li>
          <Link href="/login">Login / Dashboard</Link>
        </li>
      </ul>
    </aside>
  );
}