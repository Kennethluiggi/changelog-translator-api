'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Route } from 'next';
import { useEffect, useState } from 'react';

const appNav: Array<{ href: Route; label: string; badge?: string }> = [
  { href: '/app', label: 'Dashboard' },
  { href: '/app/alerts', label: 'Alerts' },
  { href: '/app/partners', label: 'Partners' },
  { href: '/app/settings', label: 'Settings' },
  { href: '/docs', label: 'Docs', badge: 'Public' },
];

type StoredUser = {
  user_id: number;
  email: string;
  full_name: string;
  workspace_id: number;
  workspace_name: string;
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('opsentry_user');

    if (!raw) {
      router.replace('/login');
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredUser;
      setUser(parsed);
      setCheckedAuth(true);
    } catch {
      localStorage.removeItem('opsentry_user');
      router.replace('/login');
    }
  }, [router]);

  if (!checkedAuth) {
    return null;
  }

  return (
    <main className="app-shell">
      <div className="content-width app-shell-frame">
        <aside className="app-sidebar">
          <div className="app-sidebar-top">
            <p className="app-sidebar-kicker">Private workspace</p>
            <h1 className="app-sidebar-title">Opsentry Console</h1>
            <p className="app-sidebar-copy">
              {user?.workspace_name
                ? `Signed in to ${user.workspace_name}. Manage apps, monitor partner-impact notifications, and prepare your team before customer-facing issues escalate.`
                : 'Manage apps, monitor partner-impact notifications, and prepare your team before customer-facing issues escalate.'}
            </p>
          </div>

          <nav className="app-nav" aria-label="App navigation">
            {appNav.map((item) => {
              const isActive =
                item.href === '/app'
                  ? pathname === '/app'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive ? 'app-nav-link active' : 'app-nav-link'}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span>{item.label}</span>
                  {item.badge ? <span className="app-nav-badge">{item.badge}</span> : null}
                </Link>
              );
            })}
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