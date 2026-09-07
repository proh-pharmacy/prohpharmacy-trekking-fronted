import React from 'react';
import { InputSwitch, type InputSwitchChangeEvent, type InputSwitchProps } from 'primereact/inputswitch';

export interface FlatSwitchProps extends Omit<InputSwitchProps, 'checked' | 'onChange'> {
  label?: string | React.ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  helperText?: string;
  errorMessage?: string;
  className?: string;
}

export const FlatSwitch: React.FC<FlatSwitchProps> = ({
  id,
  label,
  checked = false,
  onChange,
  disabled = false,
  helperText,
  errorMessage,
  className = '',
  ...props
}) => {
  const switchId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={switchId}
        className={`inline-flex items-center gap-3 cursor-pointer select-none group ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <InputSwitch
          inputId={switchId}
          checked={checked}
          disabled={disabled}
          onChange={(e: InputSwitchChangeEvent) => onChange?.(Boolean(e.value))}
          className="shrink-0"
          {...props}
        />

        {label && (
          <span className="text-sm font-medium text-slate-800 group-hover:text-slate-900 transition-colors">
            {label}
          </span>
        )}
      </label>

      {errorMessage ? (
        <span className="text-xs text-red-500 flex items-center gap-1 pl-12">
          <i className="pi pi-exclamation-circle text-[11px]" />
          {errorMessage}
        </span>
      ) : helperText ? (
        <span className="text-xs text-slate-500 pl-12">{helperText}</span>
      ) : null}
    </div>
  );
};

export default FlatSwitch;
