import React from 'react';
import { Dropdown, type DropdownChangeEvent, type DropdownProps } from 'primereact/dropdown';

export interface FlatDropdownProps extends Omit<DropdownProps, 'value' | 'onChange'> {
  value?: any;
  onChange?: (value: any) => void;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  fullWidth?: boolean;
}

export const FlatDropdown: React.FC<FlatDropdownProps> = ({
  value,
  onChange,
  label,
  helperText,
  errorMessage,
  fullWidth = true,
  className = '',
  id,
  required,
  placeholder = 'Select an option',
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

      <Dropdown
        id={inputId}
        value={value}
        onChange={(e: DropdownChangeEvent) => onChange?.(e.value)}
        placeholder={placeholder}
        className={`
          w-full border rounded text-sm transition-colors
          bg-white border-slate-300 text-slate-900
          hover:border-slate-400 focus:border-teal-600
          ${errorMessage ? '!border-red-500' : ''}
          ${className}
        `}
        panelClassName="rounded shadow-xl border border-slate-200"
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

export default FlatDropdown;
