import React from 'react';

interface CockpitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: string;
  badge?: string | number;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function CockpitButton({
  children,
  icon = 'pi-arrow-right',
  badge,
  variant = 'primary',
  className = '',
  disabled = false,
  onClick,
  ...rest
}: CockpitButtonProps) {
  if (variant === 'ghost') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`group inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-portal-muted hover:text-portal-heading transition-colors disabled:opacity-40 sm:text-xs ${className}`}
        {...rest}
      >
        <span>{children}</span>
        {icon && (
          <i
            className={`pi ${icon} text-[10px] transition-transform group-hover:translate-x-0.5`}
            aria-hidden="true"
          />
        )}
      </button>
    );
  }

  if (variant === 'secondary') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`group inline-flex items-center gap-2.5 rounded-full border border-portal-border/80 bg-portal-canvas/70 px-4 py-2 text-[11px] font-semibold text-portal-text backdrop-blur-md transition-all duration-300 hover:border-portal-border hover:bg-portal-hover hover:text-portal-heading active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs ${className}`}
        {...rest}
      >
        <span>{children}</span>
        {icon && (
          <i
            className={`pi ${icon} text-[11px] text-portal-muted transition-transform group-hover:translate-x-0.5 group-hover:text-portal-heading`}
            aria-hidden="true"
          />
        )}
      </button>
    );
  }

  // Direction 1: Glassmorphic Telemetry Pill
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-portal-accent/60 bg-portal-accent/25 px-4 py-2 text-[11px] font-semibold tracking-wide text-portal-accent transition-all duration-300 hover:bg-portal-accent/40 hover:border-portal-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs ${className}`}
      {...rest}
    >
      {/* Subtle glowing sweep effect on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />

      <span className="relative z-10 flex items-center gap-2 font-medium">
        {children}
      </span>

      {badge != null && (
        <span className="relative z-10 rounded-full border border-portal-accent/40 bg-portal-accent/20 px-2 py-0.5 font-mono text-[10px] font-bold text-portal-accent">
          {badge}
        </span>
      )}

      {icon && (
        <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-portal-accent/40 bg-portal-accent/20 text-portal-accent transition-all duration-300 group-hover:translate-x-0.5 group-hover:border-portal-accent group-hover:bg-portal-accent group-hover:text-[#102218]">
          <i className={`pi ${icon} text-[10px] font-bold`} aria-hidden="true" />
        </span>
      )}
    </button>
  );
}
