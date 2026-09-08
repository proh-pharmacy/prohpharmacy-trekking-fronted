import { cva, type VariantProps } from 'class-variance-authority';

/**
 * CVA Definition for FlatButton variants, sizes, and states.
 * Enforces zero border-radius, clean 1px borders, and ProH Pharmacy brand colors.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold rounded border transition-all duration-150 select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-portal-accent focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none shadow-xs hover:shadow-sm active:shadow-none',
  {
    variants: {
      variant: {
        primary:
          '!bg-portal-accent hover:!bg-portal-accent-hover active:!bg-portal-accent-hover !text-white !border-transparent',
        secondary:
          '!bg-slate-900 hover:!bg-slate-800 active:!bg-slate-950 !text-white !border-slate-900 hover:!border-slate-800',
        danger:
          '!bg-red-accent hover:!bg-red-accent-hover active:!bg-red-700 !text-white !border-red-accent hover:!border-red-accent-hover',
        warning:
          '!bg-amber-600 hover:!bg-amber-500 active:!bg-amber-700 !text-white !border-amber-600 hover:!border-amber-500',
        'danger-outline':
          '!bg-transparent hover:!bg-red-accent/15 active:!bg-red-accent/25 !text-red-400 !border-red-accent/50 hover:!border-red-accent hover:!text-red-300',
        'outline-danger':
          '!bg-transparent hover:!bg-red-accent/15 active:!bg-red-accent/25 !text-red-400 !border-red-accent/50 hover:!border-red-accent hover:!text-red-300',
        outline:
          '!bg-transparent hover:!bg-slate-100 active:!bg-slate-200 !text-slate-800 !border-slate-300 hover:!border-slate-400',
        ghost:
          '!bg-transparent hover:!bg-slate-100 active:!bg-slate-200 !text-slate-700 !border-transparent shadow-none hover:shadow-none active:shadow-none',
        link:
          '!bg-transparent !text-primary-green hover:!text-deep-green underline underline-offset-4 !border-transparent !p-0 !h-auto shadow-none hover:shadow-none active:shadow-none',
      },
      size: {
        xs: '!text-[11px] py-1 px-2.5 gap-1 h-7 [&_.p-button-icon]:!text-[11px] [&_.p-button-label]:!text-[11px]',
        sm: '!text-xs py-1.5 px-3 gap-1.5 h-[38px] [&_.p-button-icon]:!text-xs [&_.p-button-label]:!text-xs',
        md: '!text-sm py-2 px-4 gap-2 h-[44px] [&_.p-button-icon]:!text-sm [&_.p-button-label]:!text-sm',
        lg: '!text-base py-2.5 px-6 gap-2.5 h-[50px] [&_.p-button-icon]:!text-base [&_.p-button-label]:!text-base',
        'icon-xs': 'h-7 w-7 p-0 [&_.p-button-icon]:!text-[11px]',
        'icon-sm': 'h-[38px] w-[38px] p-0 [&_.p-button-icon]:!text-xs',
        icon: 'h-[44px] w-[44px] p-0 [&_.p-button-icon]:!text-base',
        'icon-lg': 'h-[50px] w-[50px] p-0 [&_.p-button-icon]:!text-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
      uppercase: {
        true: 'uppercase tracking-wider text-[11px]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      uppercase: false,
    },
  }
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
