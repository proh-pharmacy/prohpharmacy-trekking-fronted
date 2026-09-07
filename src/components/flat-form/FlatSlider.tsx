import React from 'react';
import { Slider, type SliderChangeEvent, type SliderProps } from 'primereact/slider';

export interface FlatSliderProps extends Omit<SliderProps, 'value' | 'onChange'> {
  value?: number | [number, number];
  onChange?: (value: number | [number, number]) => void;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  showValue?: boolean;
}

export const FlatSlider: React.FC<FlatSliderProps> = ({
  value = 0,
  onChange,
  label,
  helperText,
  errorMessage,
  showValue = true,
  className = '',
  id,
  min = 0,
  max = 100,
  step = 1,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        {label && (
          <label
            htmlFor={id}
            className="text-xs font-semibold tracking-wide uppercase text-slate-700"
          >
            {label}
          </label>
        )}
        {showValue && (
          <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 border border-teal-200">
            {Array.isArray(value) ? `${value[0]} - ${value[1]}` : value}
          </span>
        )}
      </div>

      <div className="py-2">
        <Slider
          id={id}
          value={value}
          onChange={(e: SliderChangeEvent) => onChange?.(e.value as number | [number, number])}
          min={min}
          max={max}
          step={step}
          className={`w-full ${className}`}
          {...props}
        />
      </div>

      {errorMessage ? (
        <span className="text-xs text-red-500 flex items-center gap-1">
          <i className="pi pi-exclamation-circle text-[11px]" />
          {errorMessage}
        </span>
      ) : helperText ? (
        <span className="text-xs text-slate-500">{helperText}</span>
      ) : null}
    </div>
  );
};

export default FlatSlider;
