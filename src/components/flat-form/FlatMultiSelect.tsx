import React from 'react';
import { MultiSelect, type MultiSelectChangeEvent, type MultiSelectProps } from 'primereact/multiselect';
import { type FlatInputSize, getInputSizeClasses } from './inputVariants';

export interface FlatMultiSelectProps extends Omit<MultiSelectProps, 'value' | 'onChange' | 'variant' | 'size'> {
  value?: any[];
  onChange?: (value: any[]) => void;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  fullWidth?: boolean;
  variant?: 'default' | 'dark' | 'white';
  size?: FlatInputSize;
  inputSize?: FlatInputSize;
}

export const FlatMultiSelect: React.FC<FlatMultiSelectProps> = ({
  value,
  onChange,
  label,
  helperText,
  errorMessage,
  fullWidth = true,
  variant = 'dark',
  size = 'sm',
  inputSize,
  className = '',
  id,
  required,
  placeholder = 'Select options',
  display = 'chip',
  panelClassName = '',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const isDark = variant === 'dark';
  const effectiveSize: FlatInputSize = inputSize || size || 'sm';
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

      <MultiSelect
        id={inputId}
        value={value}
        onChange={(e: MultiSelectChangeEvent) => onChange?.(e.value)}
        placeholder={placeholder}
        display={display}
        className={`
          w-full border rounded transition-colors p-multiselect-${effectiveSize}
          ${
            effectiveSize === 'sm'
              ? `${!value || value.length === 0 ? '!h-[38px]' : '!min-h-[38px]'} text-xs [&_.p-multiselect-token]:!py-0.5 [&_.p-multiselect-token]:!text-xs`
              : effectiveSize === 'lg'
              ? '!min-h-[50px] text-base'
              : '!min-h-[44px] text-sm'
          }
          ${
            isDark
              ? '!bg-portal-canvas !border-portal-border !text-white hover:!border-portal-border/80 focus:!border-portal-accent focus:ring-0 [&_.p-multiselect-label.p-placeholder]:!text-portal-muted [&_.p-multiselect-label:not(.p-placeholder)]:!text-white [&_.p-multiselect-trigger]:!text-portal-muted [&_.p-multiselect-token]:!bg-portal-surface [&_.p-multiselect-token]:!text-white [&_.p-multiselect-token]:!border [&_.p-multiselect-token]:!border-portal-border'
              : 'bg-white border-slate-300 text-slate-900 hover:border-slate-400 focus:border-primary-green'
          }
          ${errorMessage ? '!border-red-500' : ''}
          ${className}
        `}
        panelClassName={`rounded shadow-2xl !bg-portal-surface !border !border-portal-border !text-white p-multiselect-panel-${effectiveSize} ${panelClassName}`}
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

export default FlatMultiSelect;
