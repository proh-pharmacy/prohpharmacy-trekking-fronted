import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast, { type ToastPosition } from 'react-hot-toast';
import { FlatButton } from '../../components/flat-form/FlatButton';
import { FlatInputText } from '../../components/flat-form/FlatInputText';

export const ToastShowcase: React.FC = () => {
  const [customMsg, setCustomMsg] = useState('Staff profile updated successfully.');
  const [currentPosition, setCurrentPosition] = useState<ToastPosition>('top-right');

  const showSuccess = () => {
    toast.success(customMsg || 'Action completed successfully!');
  };

  const showError = () => {
    toast.error('Invalid email or password. Please check your credentials.');
  };

  const showBackendError = () => {
    toast.error('Account is suspended or inactive. Contact administrator.');
  };

  const showLoading = () => {
    const toastId = toast.loading('Connecting to Trekking server...');
    setTimeout(() => {
      toast.success('Session authenticated successfully!', { id: toastId });
    }, 2000);
  };

  const showPromiseSuccess = () => {
    const asyncTask = new Promise<string>((resolve) => {
      setTimeout(() => resolve('Roster shifts allocated'), 2000);
    });

    toast.promise(asyncTask, {
      loading: 'Allocating duty roster slots...',
      success: (data) => `Success: ${data}!`,
      error: 'Failed to allocate duty roster slots.',
    });
  };

  const showPromiseError = () => {
    const asyncTask = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Branch database offline')), 1800);
    });

    toast.promise(asyncTask, {
      loading: 'Syncing offline trekking reports...',
      success: 'Offline reports synced!',
      error: (err) => `Sync Error: ${err.message}`,
    });
  };

  const showRichCustomToast = () => {
    toast.custom((t) => (
      <div
        className={`bg-white border border-light-border p-4 shadow-xl flex items-start gap-3 rounded transition-all duration-200 max-w-sm w-full ${
          t.visible ? 'animate-enter' : 'animate-leave'
        }`}
        style={{
          borderLeft: '4px solid #087A2D',
        }}
      >
        <div className="w-8 h-8 rounded bg-light-green flex items-center justify-center shrink-0">
          <i className="pi pi-shield text-primary-green text-sm" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-main-text uppercase tracking-wider">
            Security Notice
          </h4>
          <p className="text-xs text-muted-text mt-0.5 leading-relaxed">
            Your current session token will rotate automatically within 15 minutes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          className="text-slate-400 hover:text-slate-700 p-1 transition cursor-pointer"
          title="Dismiss"
        >
          <i className="pi pi-times text-xs" />
        </button>
      </div>
    ));
  };

  const showDarkToast = () => {
    toast.custom((t) => (
      <div
        className={`bg-[#102218] border border-white/10 text-white p-3.5 shadow-2xl flex items-center gap-3 rounded max-w-sm w-full ${
          t.visible ? 'animate-enter' : 'animate-leave'
        }`}
        style={{ borderLeft: '4px solid #41cc84' }}
      >
        <i className="pi pi-check-circle text-[#41cc84] text-base shrink-0" />
        <div className="flex-1 text-xs">
          <div className="font-semibold text-white">Dark Theme Notification</div>
          <div className="text-white/70 text-[11px] mt-0.5">Matching portal dark sidebar style</div>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          className="text-white/60 hover:text-white p-1 cursor-pointer"
        >
          <i className="pi pi-times text-xs" />
        </button>
      </div>
    ));
  };

  const positions: ToastPosition[] = [
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-300 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/images/prohpharmacy_icon.png"
              alt="ProH Pharmacy Logo"
              className="w-9 h-9 object-contain"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Toast Notification System
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-light-green text-primary-green border border-primary-green/30 rounded">
                  react-hot-toast
                </span>
              </div>
              <p className="text-xs text-muted-text">
                Dark Green Portal Theme • Top-Right Default • Subtle 4px Rounded Flat UI • Vibrant Left Accents
              </p>

            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            <Link
              to="/login"
              className="px-3 py-1.5 font-semibold uppercase tracking-wider bg-primary-green text-white hover:bg-deep-green transition rounded"
            >
              <i className="pi pi-sign-in mr-1.5 text-[10px]" />
              Login
            </Link>
            <Link
              to="/buttons"
              className="px-3 py-1.5 font-semibold uppercase tracking-wider border border-slate-300 text-slate-700 hover:bg-slate-100 transition rounded"
            >
              Buttons
            </Link>
            <Link
              to="/inputs"
              className="px-3 py-1.5 font-semibold uppercase tracking-wider border border-slate-300 text-slate-700 hover:bg-slate-100 transition rounded"
            >
              Inputs
            </Link>
            <Link
              to="/table"
              className="px-3 py-1.5 font-semibold uppercase tracking-wider border border-slate-300 text-slate-700 hover:bg-slate-100 transition rounded"
            >
              Table
            </Link>
            <div className="px-3 py-1.5 bg-slate-900 text-white font-semibold uppercase tracking-wider rounded">
              /toasts
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Banner */}
        <div className="p-4 bg-white border border-slate-300 border-l-4 border-l-primary-green shadow-xs rounded flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Interactive Toast Refinement</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Click any button below to trigger and evaluate the visual weight, padding, border radius (4px), and typography.
            </p>
          </div>
          <FlatButton
            variant="outline"
            size="sm"
            onClick={() => toast.dismiss()}
            leftIcon="pi pi-trash"
          >
            Dismiss All Toasts
          </FlatButton>
        </div>

        {/* Custom Message Field */}
        <section className="bg-white border border-slate-300 p-6 shadow-xs rounded space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <i className="pi pi-pencil text-primary-green" />
            1. Test Custom Message
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <FlatInputText
                id="custom-toast-message"
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                placeholder="Enter toast message text..."
              />
            </div>
            <FlatButton variant="primary" onClick={showSuccess} leftIcon="pi pi-check">
              Trigger Success
            </FlatButton>
            <FlatButton variant="danger" onClick={showError} leftIcon="pi pi-times">
              Trigger Error
            </FlatButton>
          </div>
        </section>

        {/* Standard Variant Grid */}
        <section className="bg-white border border-slate-300 p-6 shadow-xs rounded space-y-5">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <i className="pi pi-bell text-primary-green" />
              2. Core Notification Types
            </h3>
            <span className="text-[11px] font-mono text-slate-400">toast.success / toast.error / toast.loading</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 border border-slate-200 rounded hover:border-slate-300 transition space-y-3 bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-primary-green uppercase tracking-wider">
                <i className="pi pi-check-circle" />
                Success Toast
              </div>
              <p className="text-xs text-slate-500">
                Shows 4px primary green left-accent with subtle green badge icon. Auto-dismisses in 3.5s.
              </p>
              <FlatButton variant="primary" fullWidth size="sm" onClick={showSuccess}>
                Trigger Success
              </FlatButton>
            </div>

            <div className="p-4 border border-slate-200 rounded hover:border-slate-300 transition space-y-3 bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-red-accent uppercase tracking-wider">
                <i className="pi pi-times-circle" />
                Error Toast
              </div>
              <p className="text-xs text-slate-500">
                Shows 4px red accent left-accent with error symbol. Auto-dismisses in 5s.
              </p>
              <FlatButton variant="danger" fullWidth size="sm" onClick={showError}>
                Trigger Error
              </FlatButton>
            </div>

            <div className="p-4 border border-slate-200 rounded hover:border-slate-300 transition space-y-3 bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <i className="pi pi-spin pi-spinner" />
                Loading Toast
              </div>
              <p className="text-xs text-slate-500">
                Shows animated spinner; updates into success message once completed.
              </p>
              <FlatButton variant="secondary" fullWidth size="sm" onClick={showLoading}>
                Trigger Loading Flow
              </FlatButton>
            </div>
          </div>
        </section>

        {/* Async Promise Scenarios */}
        <section className="bg-white border border-slate-300 p-6 shadow-xs rounded space-y-5">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <i className="pi pi-sync text-primary-green" />
              3. Async Promise Transitions (toast.promise)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Loading ➔ Success / Error</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-200 rounded space-y-3 bg-slate-50/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Promise Resolve Flow
              </h4>
              <p className="text-xs text-slate-500">
                Simulates async background API dispatch that succeeds after 2 seconds.
              </p>
              <FlatButton variant="outline" fullWidth size="sm" onClick={showPromiseSuccess} leftIcon="pi pi-play">
                Simulate Successful API Request
              </FlatButton>
            </div>

            <div className="p-4 border border-slate-200 rounded space-y-3 bg-slate-50/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Promise Reject Flow
              </h4>
              <p className="text-xs text-slate-500">
                Simulates async background API dispatch that catches a server exception.
              </p>
              <FlatButton variant="outline" fullWidth size="sm" onClick={showPromiseError} leftIcon="pi pi-exclamation-circle">
                Simulate Failed API Request
              </FlatButton>
            </div>
          </div>
        </section>

        {/* Custom / Dark Theme Variants */}
        <section className="bg-white border border-slate-300 p-6 shadow-xs rounded space-y-5">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <i className="pi pi-sliders-h text-primary-green" />
              4. Custom Layouts & System Alerts
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Rich Cards & Dark Variants</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <FlatButton variant="outline" size="sm" onClick={showRichCustomToast} leftIcon="pi pi-info-circle">
              Rich Alert Card
            </FlatButton>
            <FlatButton variant="secondary" size="sm" onClick={showDarkToast} leftIcon="pi pi-moon">
              Dark Portal Toast
            </FlatButton>
            <FlatButton variant="danger" size="sm" onClick={showBackendError} leftIcon="pi pi-lock">
              Backend 422 Error Sample
            </FlatButton>
          </div>
        </section>

        {/* Position Preview Controls */}
        <section className="bg-white border border-slate-300 p-6 shadow-xs rounded space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <i className="pi pi-compass text-primary-green" />
              5. Position Placement
            </h3>
            <span className="text-xs font-mono text-slate-500">
              Current: <strong className="text-primary-green">{currentPosition}</strong>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {positions.map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => {
                  setCurrentPosition(pos);
                  toast.success(`Position set to: ${pos}`, { position: pos });
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded border transition cursor-pointer ${
                  currentPosition === pos
                    ? 'bg-primary-green text-white border-primary-green font-bold'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ToastShowcase;
