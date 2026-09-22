import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { FlatInputText } from '../../components/flat-form/FlatInputText';
import { FlatInputPassword } from '../../components/flat-form/FlatInputPassword';
import { FlatButton } from '../../components/flat-form/FlatButton';
import { useAuth, useTheme } from '../../context';
import { getApiError } from '../../api-client';
import { treksApi, type PortalSession } from '../../api-client/treks';
import toast from 'react-hot-toast';

interface LoginFormValues {

  email: string;
  password: string;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [loginTab, setLoginTab] = useState<'admin' | 'trekking'>('admin');
  const [trekNumber, setTrekNumber] = useState('TRK-');
  const [trekSession, setTrekSession] = useState<PortalSession | null>(null);
  const [trekError, setTrekError] = useState<string | null>(null);
  const [trekLoading, setTrekLoading] = useState(false);
  const cardContentRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState<number | null>(null);

  const rawCallback =
    searchParams.get('callbackUrl') ||
    searchParams.get('returnUrl') ||
    (location.state as { from?: { pathname?: string; search?: string } })?.from?.pathname;

  // Safe internal path resolution (prevents open redirect vulnerabilities)
  const destination =
    rawCallback && rawCallback.startsWith('/') && !rawCallback.startsWith('//')
      ? rawCallback
      : '/portal/dashboard';

  // If already authenticated, immediately navigate to destination
  useEffect(() => {
    if (isAuthenticated) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, destination, navigate]);

  useEffect(() => {
    if (isAuthenticated || trekSession) return;
    try {
      const cached = JSON.parse(localStorage.getItem('portalSession') || 'null') as PortalSession | null;
      if (cached?.driverToken) navigate(`/treks/driver/treks?token=${encodeURIComponent(cached.driverToken)}`, { replace: true });
    } catch {
      localStorage.removeItem('portalSession');
    }
  }, [isAuthenticated, navigate, trekSession]);

  useLayoutEffect(() => {
    const content = cardContentRef.current;
    if (!content) return;
    const updateHeight = () => setCardHeight(content.getBoundingClientRect().height);
    updateHeight();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateHeight) : null;
    observer?.observe(content);
    return () => observer?.disconnect();
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const isBusy = isSubmitting;


  const onSubmit = async (values: LoginFormValues) => {
    setAuthError(null);
    setAuthSuccess(null);

    try {
      await login({
        email: values.email,
        password: values.password,
      });

      setAuthSuccess('Authentication successful! Redirecting...');
      toast.success('Authentication successful! Redirecting...');
      setTimeout(() => {
        navigate(destination, { replace: true });
      }, 700);
    } catch (error: unknown) {
      const apiErr = getApiError(error);
      const message = apiErr?.message || 'Invalid email or password.';
      console.error('[LoginPage] Sign in failed:', error, 'Extracted message:', message);
      setAuthError(message);
      toast.error(message);
    }
  };

  const onTrekNumberChange = (value: string) => {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const digits = (normalized.startsWith('TRK') ? normalized.slice(3) : normalized).replace(/\D/g, '').slice(0, 8);
    setTrekNumber(`TRK-${digits}`);
  };

  const onTrekkingSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTrekError(null);
    const normalized = trekNumber.trim().toUpperCase();
    if (!/^TRK-\d+$/.test(normalized)) {
      setTrekError('Enter a valid trek number, for example TRK-00001.');
      return;
    }
    setTrekLoading(true);
    try {
      setTrekSession(await treksApi.portalAuth(normalized));
    } catch (error: unknown) {
      const apiErr = getApiError(error);
      setTrekError(apiErr?.message || 'That trek could not be found or is not available.');
    } finally {
      setTrekLoading(false);
    }
  };

  const confirmTrek = () => {
    if (!trekSession) return;
    localStorage.setItem('portalSession', JSON.stringify(trekSession));
    navigate(`/treks/driver/treks?token=${encodeURIComponent(trekSession.driverToken)}`, { replace: true });
  };

  const denyTrek = () => {
    setTrekSession(null);
    setTrekNumber('TRK-');
    setTrekError(null);
  };


  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center gap-0 p-4 bg-portal-canvas overflow-hidden font-sans select-none">
      {/* Background Image: login_bg_alternate.png */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 opacity-40 dark:opacity-100 transition-opacity"
        style={{ backgroundImage: "url('/images/login_bg_alternate.png')" }}
      />

      {/* Reduced subtle blur layer over the background */}
      <div className="absolute inset-0 backdrop-blur-[5px] bg-black/5 dark:bg-black/20" />

      {/* Theme Switcher in Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded border border-portal-border bg-portal-surface/80 backdrop-blur text-portal-muted hover:text-portal-heading transition-colors shadow-sm cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          <i className={`pi ${theme === 'dark' ? 'pi-sun' : 'pi-moon'} text-sm`} />
        </button>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-[390px] overflow-hidden bg-portal-surface border border-portal-border shadow-2xl shadow-black/20 text-portal-text rounded transition-[height] duration-500 ease-in-out" style={cardHeight ? { height: `${cardHeight}px` } : undefined}>
        <div ref={cardContentRef} className="p-8 sm:p-10">
        <div className="relative -mx-8 -mt-8 mb-7 grid grid-cols-2 border-b border-portal-border px-1 sm:-mx-10 sm:-mt-10">
          <span className={`absolute bottom-0 left-0 h-0.5 w-1/2 !rounded-none bg-portal-accent transition-transform duration-500 ease-in-out ${loginTab === 'trekking' ? 'translate-x-full' : 'translate-x-0'}`} aria-hidden="true" />
          <button type="button" onClick={() => { setLoginTab('admin'); setTrekError(null); }} className={`relative z-10 px-3 py-4 text-xs font-semibold transition-colors cursor-pointer ${loginTab === 'admin' ? 'text-portal-accent' : 'text-portal-muted hover:text-portal-heading'}`}>Admin</button>
          <button type="button" onClick={() => { setLoginTab('trekking'); setAuthError(null); }} className={`relative z-10 px-3 py-4 text-xs font-semibold transition-colors cursor-pointer ${loginTab === 'trekking' ? 'text-portal-accent' : 'text-portal-muted hover:text-portal-heading'}`}>Trekking</button>
        </div>
        {/* Maintained ProH Pharmacy Logo & Header */}
        {!trekSession && (
          <div className="flex flex-col items-center text-center mb-7">
            <img
              src={theme === 'dark' ? '/images/prohpharmacy_icon_white.png' : '/images/prohpharmacy_icon.png'}
              alt="ProH Pharmacy Logo"
              className="w-12 h-12 object-contain drop-shadow-md mb-2"
            />
            <h1 className="text-2xl font-semibold tracking-tight text-portal-heading font-sans">
              {loginTab === 'admin' ? 'User Login' : 'Trekking Login'}
            </h1>
            <p className="text-xs text-portal-muted mt-1.5 font-normal tracking-wide">
              ProH Pharmacy Trekking Operations
            </p>
          </div>
        )}

        {/* Global Error Banner */}
        {authError && (
          <div
            role="alert"
            className="mb-5 p-3.5 text-xs flex items-start gap-2.5 rounded shadow-sm animate-fadeIn"
            style={{
              backgroundColor: 'rgba(222, 37, 18, 0.2)',
              border: '1px solid #DE2512',
              color: '#ffffff',
            }}
          >
            <i className="pi pi-exclamation-triangle text-sm shrink-0 mt-0.5" style={{ color: '#ff6b5b' }} />
            <div className="flex-1 font-medium leading-relaxed">{authError}</div>
          </div>
        )}

        {/* Global Success Banner */}
        {authSuccess && (
          <div
            role="status"
            className="mb-5 p-3.5 text-xs flex items-start gap-2.5 rounded shadow-sm animate-fadeIn"
            style={{
              backgroundColor: 'rgba(1, 164, 47, 0.2)',
              border: '1px solid #01A42F',
              color: '#ffffff',
            }}
          >
            <i className="pi pi-check-circle text-sm shrink-0 mt-0.5" style={{ color: '#41cc84' }} />
            <div className="flex-1 font-medium leading-relaxed">{authSuccess}</div>
          </div>
        )}

        {loginTab === 'trekking' && trekSession ? (
          <div className="space-y-4 rounded border border-portal-border bg-portal-canvas/60 p-4 text-sm">
            <div><p className="text-[11px] uppercase tracking-wide text-portal-muted">Trek</p><p className="font-semibold text-portal-heading">{trekSession.trekNumber}</p></div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-portal-muted">Region</p><p className="text-portal-heading">{trekSession.regionName}</p></div>
              <div><p className="text-portal-muted">Scheduled</p><p className="text-portal-heading">{trekSession.scheduledDate}</p></div>
              <div><p className="text-portal-muted">Driver</p><p className="text-portal-heading">{trekSession.driver.name}<br />{trekSession.driver.phone}</p></div>
              {trekSession.salesRep && <div><p className="text-portal-muted">Sales rep</p><p className="text-portal-heading">{trekSession.salesRep.name}<br />{trekSession.salesRep.phone}</p></div>}
            </div>
            <p className="text-xs text-portal-muted">Is this your trek?</p>
            <div className="flex gap-2"><FlatButton fullWidth onClick={confirmTrek}>Yes, that&apos;s me</FlatButton><FlatButton fullWidth variant="outline" onClick={denyTrek}>Not my trek</FlatButton></div>
          </div>
        ) : loginTab === 'trekking' ? (
          <form onSubmit={onTrekkingSubmit} noValidate className="space-y-4">
            <FlatInputText id="trek-number" label="Trek number" size="md" variant="dark" value={trekNumber} onChange={(event) => onTrekNumberChange(event.target.value)} placeholder="TRK-00001" maxLength={12} />
            {trekError && <p role="alert" className="text-xs text-red-500">{trekError}</p>}
            <FlatButton type="submit" fullWidth loading={trekLoading} disabled={trekLoading}>{trekLoading ? 'Checking trek...' : 'Continue'}</FlatButton>
          </form>
        ) : <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit(onSubmit)(e);
          }}
          noValidate
          className="space-y-4"
        >

          <Controller
            name="email"
            control={control}
            rules={{
              required: 'Email address is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Please enter a valid email address',
              },
            }}
            render={({ field }) => (
              <FlatInputText
                id="login-email"
                type="email"
                size="md"
                variant="dark"
                leftIcon="pi pi-envelope"
                iconClassName="text-[#4fb587]"
                placeholder="Email"
                errorMessage={errors.email?.message}
                {...field}
              />
            )}
          />

          <Controller
            name="password"
            control={control}
            rules={{
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              },
            }}
            render={({ field }) => (
              <FlatInputPassword
                id="login-password"
                size="md"
                variant="dark"
                leftIcon="pi pi-lock"
                iconClassName="text-[#4fb587]"
                placeholder="Password"
                feedback={false}
                errorMessage={errors.password?.message}
                {...field}
              />
            )}
          />

          {/* Full-width Sign In Button (#41cc84) */}
          <div className="pt-2">
            <FlatButton
              type="submit"
              fullWidth
              loading={isBusy}
              disabled={isBusy}
              className="!bg-[#41cc84] hover:!bg-[#36ba76] active:!bg-[#2fa367] !text-white !border-transparent py-3 text-sm font-bold shadow-sm tracking-wide"
            >
              {isBusy ? 'Signing In...' : 'Sign In'}
            </FlatButton>
          </div>
        </form>}

        {/* Bottom Assistance Section (Replaces Demo Fill) */}
        {loginTab === 'admin' && (
          <div className="mt-8 pt-5 border-t border-portal-border text-center text-xs text-portal-muted">
            <span>Need assistance? </span>
            <a
              href="#forgot-password"
              onClick={(e) => {
                e.preventDefault();
                alert('Please contact your System Administrator to reset your credentials.');
              }}
              className="text-portal-accent font-semibold hover:underline cursor-pointer ml-1"
            >
              Forgot password?
            </a>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
