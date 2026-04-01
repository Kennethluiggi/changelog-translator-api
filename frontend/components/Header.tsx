import Link from 'next/link';

const mainLinks = [
  { href: '/docs', label: 'Docs' },
  { href: '/pricing', label: 'Pricing' }
];

export function Header() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand brand-mark">
          <span className="brand-dot" />
          <span>Change Intelligence</span>
        </Link>

        <nav className="nav" aria-label="Main navigation">
          {mainLinks.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="nav-right">
          <Link href="/login" className="nav-link">
            Dashboard
          </Link>
          <Link href="/login" className="button-ghost">
            Log in
          </Link>
        </div>
      </div>
    </header>
  );
}
