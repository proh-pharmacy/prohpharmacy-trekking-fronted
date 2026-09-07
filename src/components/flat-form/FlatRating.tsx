import React from 'react';
import { Rating, type RatingChangeEvent, type RatingProps } from 'primereact/rating';

export interface FlatRatingProps extends Omit<RatingProps, 'value' | 'onChange'> {
  value?: number;
  onChange?: (value: number) => void;
  label?: string;
  helperText?: string;
  errorMessage?: string;
}

export const FlatRating: React.FC<FlatRatingProps> = ({
  value = 0,
  onChange,
  label,
  helperText,
  errorMessage,
  stars = 5,
  cancel = true,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-xs font-semibold tracking-wide uppercase text-slate-700">
          {label}
        </span>
      )}

      <div className="flex items-center gap-2">
        <Rating
          value={value}
          onChange={(e: RatingChangeEvent) => onChange?.(e.value ?? 0)}
          stars={stars}
          cancel={cancel}
          className={`flex items-center gap-1.5 ${className}`}
          {...props}
        />
        <span className="text-xs font-mono text-slate-500 font-semibold">({value}/{stars})</span>
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

export default FlatRating;
