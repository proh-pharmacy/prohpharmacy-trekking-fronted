import React from 'react';
import { InputTextarea, type InputTextareaProps } from 'primereact/inputtextarea';

export interface FlatTextareaProps extends Omit<InputTextareaProps, 'value'> {
  value?: string;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  fullWidth?: boolean;
}

export const FlatTextarea: React.FC<FlatTextareaProps> = ({
  label,
  helperText,
  errorMessage,
  autoResize = true,
  fullWidth = true,
  className = '',
  id,
  required,
  rows = 4,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold tracking-wide uppercase text-slate-700 flex items-center gap-1"
        >
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <InputTextarea
        id={inputId}
        required={required}
        rows={rows}
        autoResize={autoResize}
        className={`
          w-full border rounded text-sm px-3 py-2 transition-colors resize-y
          bg-white border-slate-300 text-slate-900 placeholder-slate-400
          hover:border-slate-400 focus:border-teal-600 focus:ring-0 focus:outline-none
          disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed
          ${errorMessage ? '!border-red-500' : ''}
          ${className}
        `}
        {...props}
      />

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

export default FlatTextarea;
