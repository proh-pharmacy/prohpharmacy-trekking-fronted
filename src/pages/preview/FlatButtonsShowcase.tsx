import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlatButton } from '../../components/flat-form/FlatButton';

export const FlatButtonsShowcase: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const simulateAction = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setClickCount((c) => c + 1);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
      {/* Top Navbar */}
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
                  Flat Button Component Library
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-light-green text-primary-green border border-primary-green/30">
                  Pre-Login Component Review
                </span>
              </div>
              <p className="text-xs text-muted-text">
                Strict Flat UI (`0px` rounded edges) • Variants, states, and sizes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-primary-green text-white hover:bg-deep-green transition-colors"
            >
              <i className="pi pi-sign-in mr-1.5 text-[10px]" />
              Login Screen
            </Link>
            <Link
              to="/inputs"
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <i className="pi pi-sliders-h mr-1.5 text-[10px]" />
              Inputs Library
            </Link>
            <Link
              to="/table"
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <i className="pi pi-table mr-1.5 text-[10px]" />
              Data Table
            </Link>
            <Link
              to="/toasts"
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <i className="pi pi-bell mr-1.5 text-[10px]" />
              Toasts
            </Link>
            <div className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider">
              /buttons
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Banner */}
        <div className="p-4 bg-white border border-slate-300 border-l-4 border-l-primary-green shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Button Component Review</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Review all button variations and states before we build the authentication/login page inspired by your reference.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
            <span className="px-2 py-1 bg-slate-100 border border-slate-300">
              Clicks: <strong className="text-slate-900">{clickCount}</strong>
            </span>
          </div>
        </div>

        {/* 1. Color Variants */}
        <section className="bg-white border border-slate-300 p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <i className="pi pi-palette text-primary-green" />
                1. Brand Color Variants
              </h3>
              <p className="text-xs text-slate-500">Official ProH palette: Primary Green, Dark Slate, Red Accent, Outline, Ghost, Link</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">variant="primary | secondary | danger | outline | ghost | link"</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <FlatButton variant="primary" onClick={() => setClickCount((c) => c + 1)}>
              Primary Green (#087A2D)
            </FlatButton>

            <FlatButton variant="secondary" onClick={() => setClickCount((c) => c + 1)}>
              Secondary Slate
            </FlatButton>

            <FlatButton variant="danger" onClick={() => setClickCount((c) => c + 1)}>
              Red Accent (#DE2512)
            </FlatButton>

            <FlatButton variant="outline" onClick={() => setClickCount((c) => c + 1)}>
              Flat Outline
            </FlatButton>

            <FlatButton variant="ghost" onClick={() => setClickCount((c) => c + 1)}>
              Ghost Text
            </FlatButton>

            <FlatButton variant="link" onClick={() => setClickCount((c) => c + 1)}>
              Inline Link
            </FlatButton>
          </div>
        </section>

        {/* 2. Button Sizes */}
        <section className="bg-white border border-slate-300 p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <i className="pi pi-arrows-alt text-primary-green" />
                2. Button Sizes
              </h3>
              <p className="text-xs text-slate-500">Small (compact table actions), Medium (standard forms), Large (prominent call-to-actions)</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">size="sm | md | lg"</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <FlatButton variant="primary" size="sm">
              Small Button (size="sm")
            </FlatButton>

            <FlatButton variant="primary" size="md">
              Medium Standard (size="md")
            </FlatButton>

            <FlatButton variant="primary" size="lg">
              Large Button (size="lg")
            </FlatButton>
          </div>
        </section>

        {/* 3. Icons & Glyphs */}
        <section className="bg-white border border-slate-300 p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <i className="pi pi-tags text-primary-green" />
                3. Icon Support
              </h3>
              <p className="text-xs text-slate-500">Left icons, right icons, and icon-only buttons</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">leftIcon / rightIcon</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <FlatButton variant="primary" leftIcon="pi pi-sign-in">
              Login to Account
            </FlatButton>

            <FlatButton variant="secondary" leftIcon="pi pi-plus" uppercase>
              Add Staff Record
            </FlatButton>

            <FlatButton variant="outline" rightIcon="pi pi-arrow-right">
              Continue Trek
            </FlatButton>

            <FlatButton variant="danger" leftIcon="pi pi-trash" size="sm">
              Delete
            </FlatButton>

            <FlatButton variant="outline" leftIcon="pi pi-download">
              Export PDF
            </FlatButton>
          </div>
        </section>

        {/* 4. Interactive States (Loading, Disabled, Async) */}
        <section className="bg-white border border-slate-300 p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <i className="pi pi-spin pi-spinner text-primary-green" />
                4. Interactive States
              </h3>
              <p className="text-xs text-slate-500">Loading spinner state and disabled flat styling</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">loading={'{boolean}'} / disabled</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <FlatButton
              variant="primary"
              loading={isLoading}
              onClick={simulateAction}
            >
              {isLoading ? 'Authenticating...' : 'Click to Test 1.5s Loading'}
            </FlatButton>

            <FlatButton variant="primary" loading>
              Always Loading
            </FlatButton>

            <FlatButton variant="primary" disabled>
              Disabled Primary
            </FlatButton>

            <FlatButton variant="outline" disabled>
              Disabled Outline
            </FlatButton>
          </div>
        </section>

        {/* 5. Login Form Prototype Preview (Reference Inspiration) */}
        <section className="bg-white border border-slate-300 p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <i className="pi pi-shield text-primary-green" />
                5. Full-Width Login Button Preview (Reference Alignment)
              </h3>
              <p className="text-xs text-slate-500">
                Testing how the FlatButton looks inside a login card container like the reference image
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">fullWidth={'{true}'}</span>
          </div>

          <div className="max-w-md mx-auto p-6 bg-slate-900 text-white space-y-4 border border-slate-800">
            <div className="text-center space-y-1 mb-4">
              <img
                src="/images/prohpharmacy_icon.png"
                alt="Logo"
                className="w-12 h-12 mx-auto object-contain"
              />
              <h4 className="text-base font-bold uppercase tracking-wider text-white">
                LOGIN TO YOUR ACCOUNT
              </h4>
              <p className="text-xs text-slate-400">
                ProH Pharmacy Trekking Operations Portal
              </p>
            </div>

            <FlatButton
              variant="primary"
              size="lg"
              fullWidth
              uppercase
              loading={isLoading}
              onClick={simulateAction}
            >
              {isLoading ? 'Authenticating...' : 'Login'}
            </FlatButton>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <a href="#forgot" className="hover:text-white transition">
                Forgot my password
              </a>
              <a href="#help" className="hover:text-white transition">
                Contact Ops Admin
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default FlatButtonsShowcase;
