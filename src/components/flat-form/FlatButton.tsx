import React from 'react';
import { Button as PrimeButton, type ButtonProps as PrimeButtonProps } from 'primereact/button';
import { cn } from '../../lib/utils';
import { buttonVariants, type ButtonVariantProps } from './buttonVariants';

export type { ButtonVariantProps };

export interface FlatButtonProps
  extends Omit<PrimeButtonProps, 'size'>,
    ButtonVariantProps {
  leftIcon?: string | React.ReactNode;
  rightIcon?: string | React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const FlatButton: React.FC<FlatButtonProps> = ({
  variant,
  size,
  fullWidth,
  uppercase,
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  className = '',
  children,
  label,
  type = 'button',
  ...props
}) => {
  const isDisabled = disabled || loading;
  const content = children || label;

  return (
    <PrimeButton
      type={type}
      disabled={isDisabled}
      className={cn(
        buttonVariants({ variant, size, fullWidth, uppercase }),
        className
      )}
      {...props}
    >
      {loading ? (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent animate-spin inline-block mr-2 shrink-0"
          style={{ borderRadius: '50%' }}
        />
      ) : typeof leftIcon === 'string' ? (
        <i className={cn(leftIcon, 'text-sm shrink-0 mr-1.5')} />
      ) : leftIcon ? (
        <span className="mr-1.5 shrink-0 flex items-center">{leftIcon}</span>
      ) : null}

      {content && <span>{content}</span>}

      {!loading && typeof rightIcon === 'string' ? (
        <i className={cn(rightIcon, 'text-sm shrink-0 ml-1.5')} />
      ) : !loading && rightIcon ? (
        <span className="ml-1.5 shrink-0 flex items-center">{rightIcon}</span>
      ) : null}
    </PrimeButton>
  );
};

export default FlatButton;
