import React from 'react';
import { AutoComplete, type AutoCompleteChangeEvent, type AutoCompleteProps } from 'primereact/autocomplete';

export interface FlatAutoCompleteProps extends Omit<AutoCompleteProps, 'value' | 'onChange' | 'variant'> {
  value?: any;
  onChange?: (value: any) => void;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  fullWidth?: boolean;
  variant?: 'default' | 'dark' | 'white';
}

export const FlatAutoComplete: React.FC<FlatAutoCompleteProps> = ({
  value,
  onChange,
  label,
  helperText,
  errorMessage,
  fullWidth = true,
  variant = 'dark',
  className = '',
  inputClassName = '',
  id,
  required,
  placeholder = 'Search...',
  panelClassName = '',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const isDark = variant === 'dark';

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={`text-xs font-bold tracking-wider uppercase flex items-center gap-1 ${
            isDark ? 'text-[#adbac7]' : 'text-slate-700'
          }`}
        >
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <AutoComplete
        inputId={inputId}
        value={value}
        onChange={(e: AutoCompleteChangeEvent) => onChange?.(e.value)}
        placeholder={placeholder}
        className={`w-full ${className}`}
        inputClassName={`
          w-full border rounded text-sm px-3.5 py-2.5 transition-colors
          ${
            isDark
              ? '!bg-portal-canvas !border-portal-border !text-white placeholder:!text-portal-muted hover:!border-portal-border/80 focus:!border-portal-accent focus:ring-0 focus:outline-none'
              : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 hover:border-slate-400 focus:border-primary-green focus:ring-0 focus:outline-none'
          }
          ${errorMessage ? '!border-red-500' : ''}
          ${inputClassName}
        `}
        panelClassName={`rounded shadow-2xl !bg-portal-surface !border !border-portal-border !text-white ${panelClassName}`}
        {...props}
      />

      {errorMessage ? (
        <span className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
          <i className="pi pi-exclamation-circle text-[11px]" />
          {errorMessage}
        </span>
      ) : helperText ? (
        <span className={`text-xs mt-0.5 ${isDark ? 'text-portal-muted' : 'text-slate-500'}`}>{helperText}</span>
      ) : null}
    </div>
  );
};

export default FlatAutoComplete;
