import React from 'react';
import { InputOtp, type InputOtpProps } from 'primereact/inputotp';

export interface FlatInputOtpProps extends Omit<InputOtpProps, 'value' | 'onChange'> {
  value?: string | number | null;
  onChange?: (value: string | number | null) => void;
  label?: string;
  helperText?: string;
  errorMessage?: string;
}

export const FlatInputOtp: React.FC<FlatInputOtpProps> = ({
  value = '',
  onChange,
  label,
  helperText,
  errorMessage,
  length = 6,
  integerOnly = true,
  className = '',
  id,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold tracking-wide uppercase text-slate-700"
        >
          {label}
        </label>
      )}

      <div className="flex items-center">
        <InputOtp
          id={id}
          value={value}
          onChange={(e) => onChange?.(e.value ?? '')}
          length={length}
          integerOnly={integerOnly}
          className={`flex gap-2 ${className}`}
          pt={{
            input: {
              className: `
                w-10 h-12 text-center text-lg font-bold border rounded
                bg-white border-slate-300 text-slate-900
                hover:border-slate-400 focus:border-teal-600 focus:ring-0 focus:outline-none
                disabled:opacity-60 disabled:bg-slate-100
                ${errorMessage ? '!border-red-500' : ''}
              `,
            },
          }}
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
};

export default FlatInputOtp;
