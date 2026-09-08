import React from 'react';
import { InputMask, type InputMaskChangeEvent, type InputMaskProps } from 'primereact/inputmask';
import { type FlatInputSize, getInputSizeClasses } from './inputVariants';

export interface FlatInputMaskProps extends Omit<InputMaskProps, 'value' | 'onChange' | 'size'> {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  fullWidth?: boolean;
  size?: FlatInputSize;
  inputSize?: FlatInputSize;
}

export const FlatInputMask: React.FC<FlatInputMaskProps> = ({
  value = '',
  onChange,
  label,
  helperText,
  errorMessage,
  fullWidth = true,
  size,
  inputSize,
  className = '',
  id,
  required,
  mask,
  placeholder,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const effectiveSize: FlatInputSize = inputSize || size || 'md';
  const sizeConfig = getInputSizeClasses(effectiveSize);

  return (
    <div className={`flex flex-col ${sizeConfig.container} ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={`font-semibold tracking-wide uppercase text-slate-700 flex items-center gap-1 ${sizeConfig.label}`}
        >
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <InputMask
        id={inputId}
        value={value}
        onChange={(e: InputMaskChangeEvent) => onChange?.(e.value ?? '')}
        mask={mask}
        placeholder={placeholder}
        className={`
          w-full border rounded transition-colors
          ${sizeConfig.input}
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

export default FlatInputMask;
