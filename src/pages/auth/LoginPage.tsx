import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { FlatInputText } from '../../components/flat-form/FlatInputText';
import { FlatInputPassword } from '../../components/flat-form/FlatInputPassword';
import { FlatButton } from '../../components/flat-form/FlatButton';
import { useAuth } from '../../context';
import { getApiError } from '../../api-client';
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
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

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


  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#1b3d2b] overflow-hidden font-sans select-none">
      {/* Background Image: login_bg_alternate.png */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105"
        style={{ backgroundImage: "url('/images/login_bg_alternate.png')" }}
      />

      {/* Reduced subtle blur layer over the background */}
      <div className="absolute inset-0 backdrop-blur-[5px] bg-black/5" />

      {/* Main Login Card - Solid Deep Green (bg-portal-card / #333e38) */}
      <div className="relative z-10 w-full max-w-[390px] bg-portal-card shadow-2xl shadow-black/50 p-8 sm:p-10 text-white rounded">
        {/* Maintained ProH Pharmacy Logo & Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <img
            src="/images/prohpharmacy_icon_white.png"
            alt="ProH Pharmacy Logo"
            className="w-12 h-12 object-contain drop-shadow-md mb-2"
          />
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            User Login
          </h1>
          <p className="text-[11px] text-white/70 mt-1">
            ProH Pharmacy Trekking Operations
          </p>
        </div>

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

        {/* Form Inputs: Email & Password */}
        <form
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
        </form>

        {/* Bottom Assistance Section (Replaces Demo Fill) */}
        <div className="mt-8 pt-5 border-t border-white/10 text-center text-xs text-white/85">
          <span>Need assistance? </span>
          <a
            href="#forgot-password"
            onClick={(e) => {
              e.preventDefault();
              alert('Please contact your System Administrator to reset your credentials.');
            }}
            className="text-[#41cc84] font-semibold hover:underline cursor-pointer ml-1"
          >
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
