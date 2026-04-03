'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const mainLinks: Array<{ href: Route; label: string }> = [
  { href: '/docs', label: 'Docs' },
  { href: '/pricing', label: 'Pricing' },
];

type StoredUser = {
  user_id: number;
  email: string;
  full_name: string;
  workspace_id: number;
  workspace_name: string;
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('opsentry_user');

    if (!raw) {
      setUser(null);
      return;
    }

    try {
      setUser(JSON.parse(raw) as StoredUser);
    } catch {
      localStorage.removeItem('opsentry_user');
      setUser(null);
    }
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem('opsentry_user');
    setUser(null);
    router.push('/login');
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="site-brand" aria-label="Opsentry home">
          <Image
            src="/images/opsentry_icon_512.png"
            alt="Opsentry"
            width={36}
            height={36}
            priority
            className="site-brand-icon"
          />
          <span className="site-brand-wordmark">opSentry</span>
        </Link>

        <nav className="nav" aria-label="Main navigation">
          {mainLinks.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="nav-right">
          {!user ? (
            <Link href="/login" className="button-ghost">
              Log in
            </Link>
          ) : (
            <>
              <span className="nav-link">{user.full_name}</span>
              <button type="button" className="nav-link logout-button" onClick={handleLogout}>
                Log out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}