import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Route } from 'next';

const appNav: Array<{ href: Route; label: string; badge?: string }> = [
  { href: '/app', label: 'Dashboard' },
  { href: '/app/alerts', label: 'Alerts' },
  { href: '/app/partners', label: 'Partners' },
  { href: '/app/settings', label: 'Settings' },
  { href: '/docs', label: 'Docs', badge: 'Public' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell">
      <div className="content-width app-shell-frame">
        <aside className="app-sidebar">
          <div className="app-sidebar-top">
            <p className="app-sidebar-kicker">Private workspace</p>
            <h1 className="app-sidebar-title">Opsentry Console</h1>
            <p className="app-sidebar-copy">
              Manage apps, monitor partner-impact notifications, and prepare your team
              before customer-facing issues escalate.
            </p>
          </div>

          <nav className="app-nav" aria-label="App navigation">
            {appNav.map((item) => (
              <Link key={item.href} href={item.href} className="app-nav-link">
                <span>{item.label}</span>
                {item.badge ? <span className="app-nav-badge">{item.badge}</span> : null}
              </Link>
            ))}
          </nav>

          <div className="app-sidebar-card">
            <p className="app-sidebar-card-label">Workspace state</p>
            <strong>Sandbox enabled</strong>
            <p>
              Your team can create apps, test credentials, and preview partner-impact
              workflows before moving into production.
            </p>
            <Link href={'/pricing' as Route} className="button-ghost app-sidebar-card-button">
              Upgrade path
            </Link>
          </div>
        </aside>

        <section className="app-main">{children}</section>
      </div>
    </main>
  );
}