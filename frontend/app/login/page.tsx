import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="login-v2">
      <section className="login-v2-shell content-width">
        <div className="login-v2-grid">
          <section className="login-v2-copy">
            <p className="login-v2-kicker">Early access</p>

            <h1 className="login-v2-title">Access opSentry</h1>

            <p className="login-v2-subtitle">
              Opsentry is currently available through early access and guided onboarding.
              Existing users can sign in. New teams can request access and start with the
              live demo or sandbox workflow.
            </p>

            <div className="login-v2-proof">
              <span className="login-v2-proof-pill">Private beta</span>
              <span className="login-v2-proof-pill">Guided onboarding</span>
              <span className="login-v2-proof-pill">Built for operationally sensitive teams</span>
            </div>

            <div className="login-v2-value-list">
              <div className="login-v2-value-item">
                <strong>Sign in if you already have access</strong>
                <p>Continue into the dashboard and review your current workflows.</p>
              </div>

              <div className="login-v2-value-item">
                <strong>Request access if your team is evaluating</strong>
                <p>Start with a guided rollout instead of a confusing self-serve setup.</p>
              </div>

              <div className="login-v2-value-item">
                <strong>Use sandbox and docs first</strong>
                <p>Explore how the workflow behaves before moving into production usage.</p>
              </div>
            </div>
          </section>

          <section className="login-v2-card">
            <div className="login-v2-card-inner">
              <div className="login-v2-card-header">
                <p className="login-v2-card-label">Existing customer sign in</p>
                <h2 className="login-v2-card-title">Enter your workspace</h2>
                <p className="login-v2-card-copy">
                  Sign in if your team already has access. New teams should request access first.
                </p>
              </div>

              <div className="login-v2-auth-stack">
              <button className="login-v2-google-button">
                <span className="login-v2-google-icon">G</span>
                Continue with Google
              </button>

              <div className="login-v2-divider">
                <span>or continue with email</span>
              </div>

              <form className="login-v2-form">
                <div className="form-field">
                  <label htmlFor="email">Work email</label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    placeholder="you@company.com"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    className="input"
                    type="password"
                    placeholder="••••••••"
                  />
                </div>

                <button className="button home-v2-button-primary login-v2-submit" type="button">
                  Sign in
                </button>
              </form>
            </div>

              <div className="login-v2-divider">
                <span>or</span>
              </div>

              <div className="login-v2-secondary-actions">
                <Link href="/docs" className="button-ghost login-v2-secondary-button">
                  View live demo
                </Link>

                <Link href="/pricing" className="button-ghost login-v2-secondary-button">
                  Request access
                </Link>
              </div>

              <p className="login-v2-note">
                In this phase, access is intentionally controlled while onboarding, alerts,
                partner workflows, and dashboard behavior continue to mature.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}