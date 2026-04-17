'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Route } from 'next';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type StoredUser = {
  user_id: number;
  email: string;
  full_name: string;
  workspace_id: number;
  workspace_name: string;
};

type NavLink = {
  href: Route;
  label: string;
};

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function getLoginHandle(user: StoredUser | null): string {
  if (!user) return '';

  const emailPrefix = user.email?.split('@')[0]?.trim();
  if (emailPrefix) return emailPrefix;

  const fullName = user.full_name?.trim();
  if (fullName) return fullName;

  return 'Account';
}

function isAppRoute(pathname: string): boolean {
  return pathname === '/app' || pathname.startsWith('/app/');
}

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

  const loggedIn = Boolean(user);
  const onAppRoute = isAppRoute(pathname);
  const accountLabel = getLoginHandle(user);

  const navLinks = useMemo<NavLink[]>(() => {
    if (!loggedIn) {
      return [
        { href: '/docs', label: 'Docs' },
        { href: '/pricing', label: 'Pricing' },
      ];
    }

    if (onAppRoute) {
      return [];
    }

    return [
      { href: '/app', label: 'Dashboard' },
      { href: '/docs', label: 'Docs' },
      { href: '/pricing', label: 'Pricing' },
    ];
  }, [loggedIn, onAppRoute]);

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
          {navLinks.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={isActive ? 'nav-link active' : 'nav-link'}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="nav-right">
          {!loggedIn ? (
            <Link href="/login" className="button-ghost">
              Log in
            </Link>
          ) : (
            <div className="header-account-cluster">
              {onAppRoute ? (
                <span className="header-account-pill header-account-pill-static">
                  <span className="header-account-name">{accountLabel}</span>
                </span>
              ) : (
                <Link
                  href="/app"
                  className="header-account-pill"
                  aria-label="Go to dashboard"
                  title="Go to dashboard"
                >
                  <span className="header-account-name">{accountLabel}</span>
                </Link>
              )}

              <button
                type="button"
                className="header-logout-button"
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
              >
                <LogoutIcon />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}