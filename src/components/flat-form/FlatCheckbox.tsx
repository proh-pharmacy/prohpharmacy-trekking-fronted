import React from 'react';
import { Checkbox, type CheckboxChangeEvent } from 'primereact/checkbox';

export interface FlatCheckboxProps {
  id?: string;
  name?: string;
  label?: string | React.ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  helperText?: string;
  errorMessage?: string;
  className?: string;
}

export const FlatCheckbox: React.FC<FlatCheckboxProps> = ({
  id,
  name,
  label,
  checked = false,
  onChange,
  disabled = false,
  required = false,
  helperText,
  errorMessage,
  className = '',
}) => {
  const checkboxId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={checkboxId}
        className={`inline-flex items-center gap-2.5 cursor-pointer select-none group ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <Checkbox
          inputId={checkboxId}
          name={name}
          checked={checked}
          disabled={disabled}
          required={required}
          onChange={(e: CheckboxChangeEvent) => onChange?.(Boolean(e.checked))}
          className="shrink-0"
        />

        {label && (
          <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
        )}
      </label>

      {errorMessage ? (
        <span className="text-xs text-red-500 flex items-center gap-1 pl-7">
          <i className="pi pi-exclamation-circle text-[11px]" />
          {errorMessage}
        </span>
      ) : helperText ? (
        <span className="text-xs text-slate-500 pl-7">{helperText}</span>
      ) : null}
    </div>
  );
};

export default FlatCheckbox;
