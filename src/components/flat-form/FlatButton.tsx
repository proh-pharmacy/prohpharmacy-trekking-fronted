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

const getButtonIconSize = (size?: string | null) => {
  switch (size) {
    case 'xs':
    case 'icon-xs':
      return {
        iconClass: '!text-[11px]',
        spinnerClass: 'w-3 h-3 border-[1.5px]',
        gapLeft: 'mr-1',
        gapRight: 'ml-1',
      };
    case 'sm':
    case 'icon-sm':
      return {
        iconClass: '!text-xs',
        spinnerClass: 'w-3.5 h-3.5 border-2',
        gapLeft: 'mr-1.5',
        gapRight: 'ml-1.5',
      };
    case 'lg':
    case 'icon-lg':
      return {
        iconClass: '!text-base',
        spinnerClass: 'w-5 h-5 border-2',
        gapLeft: 'mr-2',
        gapRight: 'ml-2',
      };
    case 'md':
    case 'icon':
    default:
      return {
        iconClass: '!text-sm',
        spinnerClass: 'w-4 h-4 border-2',
        gapLeft: 'mr-1.5',
        gapRight: 'ml-1.5',
      };
  }
};

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
  const iconConfig = getButtonIconSize(size);

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
          className={cn(
            iconConfig.spinnerClass,
            'border-current border-t-transparent animate-spin inline-block shrink-0',
            content ? iconConfig.gapLeft : ''
          )}
          style={{ borderRadius: '50%' }}
        />
      ) : typeof leftIcon === 'string' ? (
        <i className={cn(leftIcon, iconConfig.iconClass, 'shrink-0', content ? iconConfig.gapLeft : '')} />
      ) : leftIcon ? (
        <span className={cn('shrink-0 flex items-center', content ? iconConfig.gapLeft : '')}>{leftIcon}</span>
      ) : null}

      {content && <span>{content}</span>}

      {!loading && typeof rightIcon === 'string' ? (
        <i className={cn(rightIcon, iconConfig.iconClass, 'shrink-0', content ? iconConfig.gapRight : '')} />
      ) : !loading && rightIcon ? (
        <span className={cn('shrink-0 flex items-center', content ? iconConfig.gapRight : '')}>{rightIcon}</span>
      ) : null}
    </PrimeButton>
  );
};

export default FlatButton;
