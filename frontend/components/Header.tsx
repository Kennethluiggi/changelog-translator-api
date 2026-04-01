import Link from 'next/link';
import Image from 'next/image';



const mainLinks = [
  { href: '/docs', label: 'Docs' },
  { href: '/pricing', label: 'Pricing' }
];

export function Header() {
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
