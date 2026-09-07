import { RadioButton, type RadioButtonChangeEvent } from 'primereact/radiobutton';

export interface RadioOption<T = string | number> {
  label: string;
  value: T;
  helperText?: string;
  disabled?: boolean;
}

export interface FlatRadioGroupProps<T = string | number> {
  name: string;
  label?: string;
  options: RadioOption<T>[];
  value?: T;
  onChange?: (value: T) => void;
  orientation?: 'horizontal' | 'vertical';
  errorMessage?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
}

export const FlatRadioGroup = <T extends string | number>({
  name,
  label,
  options,
  value,
  onChange,
  orientation = 'vertical',
  errorMessage,
  helperText,
  disabled = false,
  required = false,
}: FlatRadioGroupProps<T>) => {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-xs font-semibold tracking-wide uppercase text-slate-700 flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </span>
      )}

      <div className={`flex ${orientation === 'horizontal' ? 'flex-row flex-wrap gap-5' : 'flex-col gap-2.5'}`}>
        {options.map((option) => {
          const isSelected = value === option.value;
          const isDisabled = disabled || option.disabled;
          const optionId = `${name}-${String(option.value)}`;

          return (
            <label
              key={String(option.value)}
              htmlFor={optionId}
              className={`inline-flex items-center gap-2.5 cursor-pointer select-none group ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <RadioButton
                inputId={optionId}
                name={name}
                value={option.value}
                checked={isSelected}
                disabled={isDisabled}
                onChange={(e: RadioButtonChangeEvent) => onChange?.(e.value as T)}
                className="shrink-0"
              />

              <div className="flex flex-col">
                <span className={`text-sm text-slate-800 group-hover:text-slate-900 transition-colors ${isSelected ? 'font-semibold text-slate-900' : ''}`}>
                  {option.label}
                </span>
                {option.helperText && (
                  <span className="text-xs text-slate-500">{option.helperText}</span>
                )}
              </div>
            </label>
          );
        })}
      </div>

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

export default FlatRadioGroup;
