import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { forgotPasswordApi, getApiError, resetPasswordApi } from '../../api-client';
import { FlatButton } from '../../components/flat-form/FlatButton';
import { FlatInputPassword } from '../../components/flat-form/FlatInputPassword';
import { FlatInputText } from '../../components/flat-form/FlatInputText';
import { useTheme } from '../../context';

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const EXPIRED_LINK_MESSAGE = 'This link has expired or has already been used.';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);
  const [email, setEmail] = useState(() => searchParams.get('email')?.trim() || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isTokenStep = Boolean(token);

  const requestResetLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (requestSent || submitting) return;

    const normalizedEmail = email.trim();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await forgotPasswordApi({ email: normalizedEmail });
      setRequestSent(true);
    } catch (requestError: unknown) {
      setError(getApiError(requestError)?.message || 'Unable to send the reset link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const completeReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (!newPassword) {
      setError('Enter a new password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await resetPasswordApi({ token, newPassword, confirmNewPassword });
      toast.success('Password updated — please log in.');
      navigate('/login', { replace: true });
    } catch {
      setError(EXPIRED_LINK_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  };

  const requestNewLink = () => {
    setError(null);
    setNewPassword('');
    setConfirmNewPassword('');
    navigate('/auth/reset-password', { replace: true });
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-portal-canvas p-4 font-sans text-portal-text">
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat opacity-40 transition-opacity dark:opacity-100"
        style={{ backgroundImage: "url('/images/login_bg_alternate.png')" }}
      />
      <div className="absolute inset-0 bg-black/5 backdrop-blur-[5px] dark:bg-black/20" />

      <div className="absolute right-4 top-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-portal-border bg-portal-surface/80 text-portal-muted shadow-sm backdrop-blur transition-colors hover:text-portal-heading"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          <i className={`pi ${theme === 'dark' ? 'pi-sun' : 'pi-moon'} text-sm`} />
        </button>
      </div>

      <main className="relative z-10 w-full max-w-[390px] rounded border border-portal-border bg-portal-surface p-8 text-portal-text shadow-2xl shadow-black/20 sm:p-10">
          <div className="mb-7 flex flex-col items-center text-center">
            <img
              src={theme === 'dark' ? '/images/prohpharmacy_icon_white.png' : '/images/prohpharmacy_icon.png'}
              alt="ProH Pharmacy Logo"
              className="mb-2 h-12 w-12 object-contain drop-shadow-md"
            />
            <h1 className="text-xl font-semibold tracking-tight text-portal-heading">
              {isTokenStep ? 'Set a new password' : 'Reset your password'}
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-portal-muted">
              {isTokenStep
                ? 'Choose a new password for your account.'
                : 'Enter your email and we will send you a secure reset link.'}
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-5 flex items-start gap-2.5 rounded bg-red-accent/10 p-3.5 text-xs text-red-accent animate-fadeIn">
              <i className="pi pi-exclamation-triangle mt-0.5 shrink-0 text-sm" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {!isTokenStep && requestSent ? (
            <div className="space-y-5">
              <div role="status" className="flex items-start gap-3 rounded bg-portal-accent/10 p-4 text-left text-xs leading-relaxed text-portal-heading">
                <i className="pi pi-check-circle mt-0.5 shrink-0 text-base text-portal-accent" />
                <span className="font-medium">
                  If an account exists for{' '}
                  <strong className="break-all text-portal-heading">{email.trim()}</strong>, we’ve sent a password reset link.
                </span>
              </div>
              <FlatButton fullWidth size="sm" variant="outline" onClick={() => navigate('/login')}>
                Back to login
              </FlatButton>
            </div>
          ) : isTokenStep ? (
            <form className="space-y-4" onSubmit={completeReset} noValidate>
              <FlatInputPassword
                id="reset-new-password"
                label="New password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                size="sm"
                required
              />
              <FlatInputPassword
                id="reset-confirm-password"
                label="Confirm new password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                autoComplete="new-password"
                size="sm"
                required
              />
              <FlatButton type="submit" fullWidth size="sm" loading={submitting} disabled={submitting}>
                Update password
              </FlatButton>
              {error === EXPIRED_LINK_MESSAGE && (
                <FlatButton fullWidth size="sm" variant="outline" onClick={requestNewLink}>
                  Request a new link
                </FlatButton>
              )}
            </form>
          ) : (
            <form className="space-y-4" onSubmit={requestResetLink} noValidate>
              <FlatInputText
                id="reset-email"
                label="Email address"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                leftIcon="pi pi-envelope"
                placeholder="you@example.com"
                size="sm"
                required
              />
              <FlatButton type="submit" fullWidth size="sm" loading={submitting} disabled={submitting}>
                Send reset link
              </FlatButton>
            </form>
          )}

          {!requestSent && (
            <div className="mt-6 border-t border-portal-border pt-5 text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="cursor-pointer text-xs font-semibold text-portal-accent hover:underline"
              >
                <i className="pi pi-arrow-left mr-1.5 text-[11px]" />
                Back to login
              </button>
            </div>
          )}
      </main>
    </div>
  );
};

export default ResetPasswordPage;
