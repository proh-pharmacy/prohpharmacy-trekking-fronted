import React, { useEffect, useRef } from 'react';
import { InputNumber, type InputNumberProps } from 'primereact/inputnumber';
import { type FlatInputSize, getInputSizeClasses } from './inputVariants';

export interface FlatInputNumberProps extends Omit<InputNumberProps, 'value' | 'onChange' | 'variant' | 'size' | 'onInput' | 'onKeyUp' | 'onKeyDown'> {
  value?: number | null;
  onChange?: (value: number | null) => void;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  fullWidth?: boolean;
  variant?: 'default' | 'dark' | 'white';
  size?: FlatInputSize;
  inputSize?: FlatInputSize;
  onInput?: (event: Event) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
}

export const FlatInputNumber: React.FC<FlatInputNumberProps> = ({
  value,
  onChange,
  label,
  helperText,
  errorMessage,
  fullWidth = true,
  variant = 'dark',
  size,
  inputSize,
  className = '',
  inputClassName = '',
  id,
  required,
  onInput,
  onKeyUp,
  onKeyDown,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isDark = variant === 'dark';
  const effectiveSize: FlatInputSize = inputSize || size || 'sm';
  const sizeConfig = getInputSizeClasses(effectiveSize);

  useEffect(() => {
    // Prefer this component's ref. Driver control panel can mount multiple
    // action modals at once, so duplicate generated ids must not bind a
    // listener to another (possibly hidden) input.
    const input = inputRef.current || (inputId ? document.getElementById(inputId) : null) as HTMLInputElement | null;
    if (!input) return;
    if (onInput) input.addEventListener('input', onInput);
    if (onKeyUp) input.addEventListener('keyup', onKeyUp);
    if (onKeyDown) input.addEventListener('keydown', onKeyDown);
    return () => {
      if (onInput) input.removeEventListener('input', onInput);
      if (onKeyUp) input.removeEventListener('keyup', onKeyUp);
      if (onKeyDown) input.removeEventListener('keydown', onKeyDown);
    };
  }, [inputId, onInput, onKeyUp, onKeyDown]);

  return (
    <div className={`flex flex-col ${sizeConfig.container} ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={`font-medium tracking-wider uppercase flex items-center gap-1 ${sizeConfig.label} ${
            isDark ? 'text-portal-muted' : 'text-slate-700'
          }`}
        >
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <InputNumber
        inputId={inputId}
        inputRef={inputRef}
        value={value}
        // PrimeReact's onChange is emitted as the user edits the value. Its
        // onValueChange callback is emitted on blur in this component version.
        onChange={(e) => onChange?.(e.value ?? null)}
        className={`w-full ${className}`}
        inputClassName={`
          w-full border rounded transition-colors
          ${sizeConfig.input}
          ${
            isDark
              ? '!bg-portal-canvas !border-portal-border !text-portal-heading placeholder:!text-portal-muted hover:!border-portal-border/80 focus:!border-portal-accent focus:ring-0 focus:outline-none'
              : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 hover:border-slate-400 focus:border-primary-green focus:ring-0 focus:outline-none'
          }
          ${errorMessage ? '!border-red-500' : ''}
          ${inputClassName}
        `}
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

export default FlatInputNumber;
