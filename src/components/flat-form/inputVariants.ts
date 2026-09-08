export type FlatInputSize = 'sm' | 'md' | 'lg';

export interface InputSizeConfig {
  input: string;
  leftIcon: string;
  rightIcon: string;
  label: string;
  container: string;
}

/**
 * Provides Tailwind CSS classes for consistent sizing across all flat form input components.
 * - 'sm': 38px height (compact, matches table toolbars and Linked Staff Member dropdown)
 * - 'md': 44px height (standard default for prominent forms)
 * - 'lg': 50px height (large/spacious)
 */
export const getInputSizeClasses = (
  size: FlatInputSize = 'sm',
  hasLeftIcon = false,
  hasRightIcon = false
): InputSizeConfig => {
  switch (size) {
    case 'sm':
      return {
        input: `!h-[38px] !text-xs px-3 py-1 leading-tight placeholder:!text-xs ${hasLeftIcon ? '!pl-8' : ''} ${hasRightIcon ? '!pr-8' : ''}`,
        leftIcon: 'left-2.5 text-xs',
        rightIcon: 'right-2.5 text-xs',
        label: 'text-[11px] mb-1',
        container: 'gap-1',
      };
    case 'lg':
      return {
        input: `!h-[50px] !text-base px-4 py-3 leading-normal placeholder:!text-base ${hasLeftIcon ? '!pl-12' : ''} ${hasRightIcon ? '!pr-11' : ''}`,
        leftIcon: 'left-4 text-lg',
        rightIcon: 'right-3.5 text-base',
        label: 'text-xs mb-1.5',
        container: 'gap-2',
      };
    case 'md':
    default:
      return {
        input: `!h-[44px] !text-sm px-3.5 py-2.5 leading-normal placeholder:!text-sm ${hasLeftIcon ? '!pl-10' : ''} ${hasRightIcon ? '!pr-10' : ''}`,
        leftIcon: 'left-3.5 text-base',
        rightIcon: 'right-3 text-sm',
        label: 'text-xs mb-1.5',
        container: 'gap-1.5',
      };
  }
};
