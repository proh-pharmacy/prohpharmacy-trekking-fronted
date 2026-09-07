import { forwardRef } from 'react';
import { Password, type PasswordProps } from 'primereact/password';

export interface FlatInputPasswordProps
  extends Omit<PasswordProps, 'variant'> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftIcon?: string;
  fullWidth?: boolean;
  variant?: 'default' | 'dark' | 'white';
  iconClassName?: string;
}

export const FlatInputPassword = forwardRef<HTMLInputElement, FlatInputPasswordProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      leftIcon,
      fullWidth = true,
      variant = 'default',
      iconClassName = '',
      className = '',
      inputClassName = '',
      id,
      required,
      toggleMask = true,
      feedback = false,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const isDark = variant === 'dark';
    const isWhite = variant === 'white';

    return (
      <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className={`text-xs font-semibold tracking-wide uppercase flex items-center gap-1 ${
              isDark ? 'text-white/90' : 'text-slate-700'
            }`}
          >
            {label}
            {required && <span className="text-red-500">*</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <span
              className={`absolute left-3.5 top-0 bottom-0 flex items-center justify-center pointer-events-none text-base z-10 ${
                iconClassName || (isDark ? 'text-white/60' : 'text-slate-400')
              }`}
            >
              <i className={leftIcon} />
            </span>
          )}

          <Password
            inputId={inputId}
            inputRef={ref}
            toggleMask={toggleMask}
            feedback={feedback}
            value={value}
            onChange={onChange}
            style={{ width: '100%' }}
            inputStyle={{ width: '100%' }}
            className={`!w-full flex-1 [&_.p-icon-field]:!w-full [&_.p-icon-field]:!flex-1 [&_.p-icon-field]:!flex [&_.p-icon-field]:!relative [&_.p-input-icon]:!top-0 [&_.p-input-icon]:!bottom-0 [&_.p-input-icon]:!my-auto [&_.p-input-icon]:!h-full [&_.p-input-icon]:!flex [&_.p-input-icon]:!items-center [&_.p-input-icon]:!right-3.5 ${
              isDark
                ? '[&_.p-password-show-icon]:!text-white/60 [&_.p-password-hide-icon]:!text-white/60'
                : isWhite
                ? '[&_.p-password-show-icon]:!text-slate-400 [&_.p-password-hide-icon]:!text-slate-400 hover:[&_.p-password-show-icon]:!text-slate-600'
                : ''
            } ${className}`}
            inputClassName={`
              !w-full border rounded text-sm px-3.5 py-3 transition-colors
              ${
                isWhite
                  ? '!bg-white !text-slate-900 !border-0 placeholder:!text-slate-400 focus:!ring-2 focus:!ring-[#41cc84] focus:!outline-none'
                  : isDark
                  ? '!bg-black/40 !border-white/20 !text-white placeholder:!text-white/50 hover:!border-white/40 focus:!border-bright-green focus:!bg-black/60 focus:ring-0 focus:outline-none'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 hover:border-slate-400 focus:border-primary-green focus:ring-0 focus:outline-none disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed'
              }
              ${leftIcon ? '!pl-10' : ''}
              ${errorMessage ? '!border-red-500' : ''}
              ${inputClassName}
            `}
            {...props}
          />
        </div>

        {errorMessage ? (
          <span className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
            <i className="pi pi-exclamation-circle text-[11px]" />
            {errorMessage}
          </span>
        ) : helperText ? (
          <span className="text-xs text-slate-500 mt-0.5">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

FlatInputPassword.displayName = 'FlatInputPassword';

export default FlatInputPassword;
