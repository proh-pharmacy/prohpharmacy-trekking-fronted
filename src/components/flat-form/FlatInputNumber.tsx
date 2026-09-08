import React from 'react';
import { InputNumber, type InputNumberProps, type InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { type FlatInputSize, getInputSizeClasses } from './inputVariants';

export interface FlatInputNumberProps extends Omit<InputNumberProps, 'value' | 'onChange' | 'variant' | 'size'> {
  value?: number | null;
  onChange?: (value: number | null) => void;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  fullWidth?: boolean;
  variant?: 'default' | 'dark' | 'white';
  size?: FlatInputSize;
  inputSize?: FlatInputSize;
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
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const isDark = variant === 'dark';
  const effectiveSize: FlatInputSize = inputSize || size || 'md';
  const sizeConfig = getInputSizeClasses(effectiveSize);

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
        value={value}
        onValueChange={(e: InputNumberValueChangeEvent) => onChange?.(e.value ?? null)}
        className={`w-full ${className}`}
        inputClassName={`
          w-full border rounded transition-colors
          ${sizeConfig.input}
          ${
            isDark
              ? '!bg-portal-canvas !border-portal-border !text-white placeholder:!text-portal-muted hover:!border-portal-border/80 focus:!border-portal-accent focus:ring-0 focus:outline-none'
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
