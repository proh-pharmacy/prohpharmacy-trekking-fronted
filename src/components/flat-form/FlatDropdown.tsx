import React from 'react';
import { Dropdown, type DropdownChangeEvent, type DropdownProps } from 'primereact/dropdown';

export interface FlatDropdownProps extends Omit<DropdownProps, 'value' | 'onChange' | 'variant'> {
  value?: any;
  onChange?: (value: any) => void;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  fullWidth?: boolean;
  variant?: 'default' | 'dark' | 'white';
}

export const FlatDropdown: React.FC<FlatDropdownProps> = ({
  value,
  onChange,
  label,
  helperText,
  errorMessage,
  fullWidth = true,
  variant = 'dark',
  className = '',
  id,
  required,
  placeholder = 'Select an option',
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

      <Dropdown
        id={inputId}
        value={value}
        onChange={(e: DropdownChangeEvent) => onChange?.(e.value)}
        placeholder={placeholder}
        className={`
          w-full border rounded text-sm transition-colors
          ${
            isDark
              ? '!bg-portal-canvas !border-portal-border !text-white hover:!border-portal-border/80 focus:!border-portal-accent focus:ring-0 [&_.p-dropdown-label]:!text-white [&_.p-dropdown-trigger]:!text-portal-muted'
              : 'bg-white border-slate-300 text-slate-900 hover:border-slate-400 focus:border-primary-green'
          }
          ${errorMessage ? '!border-red-500' : ''}
          ${className}
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

export default FlatDropdown;
