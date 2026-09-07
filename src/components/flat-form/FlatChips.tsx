import React from 'react';
import { Chips, type ChipsChangeEvent, type ChipsProps } from 'primereact/chips';

export interface FlatChipsProps extends Omit<ChipsProps, 'value' | 'onChange'> {
  value?: string[];
  onChange?: (value: string[]) => void;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  fullWidth?: boolean;
}

export const FlatChips: React.FC<FlatChipsProps> = ({
  value = [],
  onChange,
  label,
  helperText,
  errorMessage,
  fullWidth = true,
  className = '',
  id,
  required,
  placeholder = 'Type and press Enter',
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

      <Chips
        id={inputId}
        value={value}
        onChange={(e: ChipsChangeEvent) => onChange?.(e.value ?? [])}
        placeholder={placeholder}
        className={`w-full ${className}`}
        pt={{
          container: {
            className: `
              w-full border rounded text-sm px-2 py-1 transition-colors min-h-[42px]
              bg-white border-slate-300 text-slate-900
              hover:border-slate-400 focus-within:border-teal-600
              ${errorMessage ? '!border-red-500' : ''}
            `,
          },
          token: {
            className: 'bg-teal-50 border border-teal-200 text-teal-800 rounded px-2 py-0.5 text-xs font-medium mr-1 mb-1',
          },
        }}
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

export default FlatChips;
