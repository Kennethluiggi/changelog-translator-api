import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="content-width section">
      <div className="login-shell panel">
        <span className="eyebrow">Private beta</span>
        <h1 className="page-title">Log in to the Change Intelligence dashboard</h1>
        <p className="lead">
          This is the Phase 1 login shell. Existing users can sign in. New teams can request access
          through a pilot or pricing conversation.
        </p>

        <div className="form-field">
          <label htmlFor="email">Work email</label>
          <input id="email" className="input" type="email" placeholder="you@company.com" />
        </div>

        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input id="password" className="input" type="password" placeholder="••••••••" />
        </div>

        <div className="actions">
          <button className="button" type="button">
            Sign in
          </button>
          <Link href="/pricing" className="button-ghost">
            Need access?
          </Link>
        </div>

        <p className="small" style={{ marginTop: 18 }}>
          In Phase 2, this route will connect to the real authenticated dashboard shell.
        </p>
      </div>
    </main>
  );
}
