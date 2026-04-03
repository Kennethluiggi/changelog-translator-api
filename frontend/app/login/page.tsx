'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

type AccountType = 'individual' | 'business';

type StoredUser = {
  user_id: number;
  email: string;
  full_name: string;
  workspace_id: number;
  workspace_name: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [signupOpen, setSignupOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const [signupFullName, setSignupFullName] = useState('');
  const [signupAccountType, setSignupAccountType] = useState<AccountType>('individual');
  const [signupBusinessName, setSignupBusinessName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  function resetSignUpState() {
    setSignupFullName('');
    setSignupAccountType('individual');
    setSignupBusinessName('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupError('');
    setSignupSuccess('');
    setIsSigningUp(false);
  }

  function resetForgotState() {
    setForgotEmail('');
    setForgotError('');
    setForgotSuccess('');
    setIsSendingReset(false);
  }

  function openSignupModal() {
    resetSignUpState();
    setSignupOpen(true);
  }

  function closeSignupModal() {
    setSignupOpen(false);
    resetSignUpState();
  }

  function openForgotModal() {
    resetForgotState();
    setForgotEmail(signInEmail);
    setForgotOpen(true);
  }

  function closeForgotModal() {
    setForgotOpen(false);
    resetForgotState();
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignInError('');
    setIsSigningIn(true);

    try {
      const res = await fetch(`${API_BASE}/app-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signInEmail,
          password: signInPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSignInError(data.detail || 'Login failed');
        return;
      }

      localStorage.setItem('opsentry_user', JSON.stringify(data.user as StoredUser));
      router.push('/app');
    } catch {
      setSignInError('Unable to reach the server.');
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupError('');
    setSignupSuccess('');
    setIsSigningUp(true);

    try {
      const res = await fetch(`${API_BASE}/app-auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          full_name: signupFullName,
          type: signupAccountType,
          business_name: signupAccountType === 'business' ? signupBusinessName : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSignupError(data.detail || 'Create account failed.');
        return;
      }

      setSignupSuccess('Account created successfully. Please sign in.');
      setSignInEmail(signupEmail);
      setSignInPassword(signupPassword);

      setTimeout(() => {
        closeSignupModal();
      }, 700);
    } catch {
      setSignupError('Unable to reach the server.');
    } finally {
      setIsSigningUp(false);
    }
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setIsSendingReset(true);

    try {
      const res = await fetch(`${API_BASE}/app-auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setForgotError(data.detail || 'Unable to process request.');
        return;
      }

      setForgotSuccess(
        data.message || 'If an account exists for that email, reset instructions will be sent.'
      );
    } catch {
      setForgotError('Unable to reach the server.');
    } finally {
      setIsSendingReset(false);
    }
  }

  function handleGoogleClick() {
    setSignInError('Google auth is not wired yet.');
  }

  return (
    <main className="login-v2">
      <section className="login-v2-shell content-width">
        <div className="login-v2-grid">
          <section className="login-v2-copy">
            <p className="login-v2-kicker">Early access</p>

            <h1 className="login-v2-title">Access opSentry</h1>

            <p className="login-v2-subtitle">
              Opsentry is currently available through early access and guided onboarding.
              Existing users can sign in. New teams can create an account and begin with the
              dashboard workflow.
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
                <strong>Create an account if you are new</strong>
                <p>Set up your workspace and start building your operational workflow.</p>
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
                  Sign in if your team already has access. New teams can create an account first.
                </p>
              </div>

              <div className="login-v2-auth-stack">
                <button
                  className="login-v2-google-button"
                  type="button"
                  onClick={handleGoogleClick}
                >
                  <span className="login-v2-google-icon">G</span>
                  Continue with Google
                </button>

                <div className="login-v2-divider">
                  <span>or continue with email</span>
                </div>

                <form className="login-v2-form" onSubmit={handleSignIn}>
                  <div className="form-field">
                    <label htmlFor="signin-email">Work email</label>
                    <input
                      id="signin-email"
                      className="input"
                      type="email"
                      placeholder="you@company.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="signin-password">Password</label>
                    <input
                      id="signin-password"
                      className="input"
                      type="password"
                      placeholder="••••••••"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                    />
                  </div>

                  {signInError && (
                    <p className="login-v2-feedback login-v2-feedback-error">{signInError}</p>
                  )}

                  <button
                    className="button home-v2-button-primary login-v2-submit"
                    type="submit"
                    disabled={isSigningIn}
                  >
                    {isSigningIn ? 'Please wait...' : 'Sign in'}
                  </button>
                </form>
              </div>

              <div className="login-v2-divider">
                <span>or</span>
              </div>

              <div className="login-v2-secondary-actions">
                <button
                  type="button"
                  className="button-ghost login-v2-secondary-button"
                  onClick={openSignupModal}
                >
                  Create account
                </button>

                <button
                  type="button"
                  className="button-ghost login-v2-secondary-button"
                  onClick={openForgotModal}
                >
                  Forgot password
                </button>
              </div>

              <div className="login-v2-legal-links">
                <Link href="/docs">Terms of Service</Link>
                <span> {' • '} </span>
                <Link href="/docs">Privacy Policy</Link>
              </div>

              <p className="login-v2-note">
                In this phase, access is intentionally controlled while onboarding, alerts,
                partner workflows, and dashboard behavior continue to mature.
              </p>
            </div>
          </section>
        </div>
      </section>

      {signupOpen && (
        <div className="login-v2-modal-overlay" onClick={closeSignupModal}>
          <div className="login-v2-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="login-v2-modal-header">
              <div>
                <p className="login-v2-card-label">Create account</p>
                <h2 className="login-v2-modal-title">Create your account</h2>
                <p className="login-v2-card-copy">
                  Set up your workspace and start using Opsentry.
                </p>
              </div>

              <button
                type="button"
                className="login-v2-modal-close"
                onClick={closeSignupModal}
                aria-label="Close create account modal"
              >
                ✕
              </button>
            </div>

            <button
              className="login-v2-google-button"
              type="button"
              onClick={handleGoogleClick}
            >
              <span className="login-v2-google-icon">G</span>
              Sign up with Google
            </button>

            <div className="login-v2-divider">
              <span>or continue with email</span>
            </div>

            <form className="login-v2-form" onSubmit={handleSignUp}>
              <div className="form-field">
                <label htmlFor="signup-full-name">Full name</label>
                <input
                  id="signup-full-name"
                  className="input"
                  type="text"
                  placeholder="Your full name"
                  value={signupFullName}
                  onChange={(e) => setSignupFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="signup-account-type">Account type</label>
                <div className="login-v2-select-wrap">
                  <select
                    id="signup-account-type"
                    className="input login-v2-select"
                    value={signupAccountType}
                    onChange={(e) => setSignupAccountType(e.target.value as AccountType)}
                  >
                    <option value="individual">Individual</option>
                    <option value="business">Business</option>
                  </select>
                  <span className="login-v2-select-chevron">⌄</span>
                </div>
              </div>

              {signupAccountType === 'business' && (
                <div className="form-field">
                  <label htmlFor="signup-business-name">Business name</label>
                  <input
                    id="signup-business-name"
                    className="input"
                    type="text"
                    placeholder="Your business name"
                    value={signupBusinessName}
                    onChange={(e) => setSignupBusinessName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-field">
                <label htmlFor="signup-email">Work email</label>
                <input
                  id="signup-email"
                  className="input"
                  type="email"
                  placeholder="you@company.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                />
              </div>

              {signupError && (
                <p className="login-v2-feedback login-v2-feedback-error">{signupError}</p>
              )}

              {signupSuccess && (
                <p className="login-v2-feedback login-v2-feedback-success">{signupSuccess}</p>
              )}

              <button
                className="button home-v2-button-primary login-v2-submit"
                type="submit"
                disabled={isSigningUp}
              >
                {isSigningUp ? 'Please wait...' : 'Create account'}
              </button>
            </form>

            <div className="login-v2-modal-footer">
              <span>Already have an account?</span>
              <button
                type="button"
                className="login-v2-inline-action"
                onClick={closeSignupModal}
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      )}

      {forgotOpen && (
        <div className="login-v2-modal-overlay" onClick={closeForgotModal}>
          <div className="login-v2-modal-card login-v2-modal-card-compact" onClick={(e) => e.stopPropagation()}>
            <div className="login-v2-modal-header">
              <div>
                <p className="login-v2-card-label">Forgot password</p>
                <h2 className="login-v2-modal-title">Reset your password</h2>
                <p className="login-v2-card-copy">
                  Enter your work email and we’ll send reset instructions when that flow is fully wired.
                </p>
              </div>

              <button
                type="button"
                className="login-v2-modal-close"
                onClick={closeForgotModal}
                aria-label="Close forgot password modal"
              >
                ✕
              </button>
            </div>

            <form className="login-v2-form" onSubmit={handleForgotPassword}>
              <div className="form-field">
                <label htmlFor="forgot-email">Work email</label>
                <input
                  id="forgot-email"
                  className="input"
                  type="email"
                  placeholder="you@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>

              {forgotError && (
                <p className="login-v2-feedback login-v2-feedback-error">{forgotError}</p>
              )}

              {forgotSuccess && (
                <p className="login-v2-feedback login-v2-feedback-success">{forgotSuccess}</p>
              )}

              <button
                className="button home-v2-button-primary login-v2-submit"
                type="submit"
                disabled={isSendingReset}
              >
                {isSendingReset ? 'Please wait...' : 'Send reset instructions'}
              </button>
            </form>

            <div className="login-v2-modal-footer">
              <button
                type="button"
                className="login-v2-inline-action"
                onClick={closeForgotModal}
              >
                Back to sign in
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}