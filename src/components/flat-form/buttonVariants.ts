import { cva, type VariantProps } from 'class-variance-authority';

/**
 * CVA Definition for FlatButton variants, sizes, and states.
 * Enforces zero border-radius, clean 1px borders, and ProH Pharmacy brand colors.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold rounded border transition-all duration-150 select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#41cc84] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none shadow-xs hover:shadow-sm active:shadow-none',
  {
    variants: {
      variant: {
        primary:
          '!bg-[#41cc84] hover:!bg-[#36ba76] active:!bg-[#2fa367] !text-white !border-transparent',
        secondary:
          '!bg-slate-900 hover:!bg-slate-800 active:!bg-slate-950 !text-white !border-slate-900 hover:!border-slate-800',
        danger:
          '!bg-red-accent hover:!bg-red-accent-hover active:!bg-red-700 !text-white !border-red-accent hover:!border-red-accent-hover',
        outline:
          '!bg-transparent hover:!bg-slate-100 active:!bg-slate-200 !text-slate-800 !border-slate-300 hover:!border-slate-400',
        ghost:
          '!bg-transparent hover:!bg-slate-100 active:!bg-slate-200 !text-slate-700 !border-transparent shadow-none hover:shadow-none active:shadow-none',
        link:
          '!bg-transparent !text-primary-green hover:!text-deep-green underline underline-offset-4 !border-transparent !p-0 !h-auto shadow-none hover:shadow-none active:shadow-none',
      },
      size: {
        sm: 'text-xs py-1.5 px-3 gap-1.5 h-8',
        md: 'text-sm py-2 px-4 gap-2 h-10',
        lg: 'text-base py-2.5 px-6 gap-2.5 h-12',
        icon: 'h-10 w-10 p-0',
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
