import React from 'react';

export type FlatStepStatus = 'completed' | 'current' | 'upcoming';

export interface FlatStepperStep {
  title: string;
  status: FlatStepStatus;
  onClick?: () => void;
  disabled?: boolean;
}

export interface FlatStepperProps {
  steps: FlatStepperStep[];
  ariaLabel?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const FlatStepper: React.FC<FlatStepperProps> = ({
  steps,
  ariaLabel = 'Steps',
  footer,
  children,
  className = '',
}) => {
  const totalSteps = Math.max(1, steps.length);
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.status === 'current'),
  );
  const progressPercentage = ((currentIndex + 1) / totalSteps) * 100;

  return (
    <div className={`w-full flex flex-col !rounded-none bg-portal-surface border border-portal-border ${className}`}>
      {/* Sticky Stepper Header — rectilinear bottom divider, animated progress bar */}
      <div className="sticky -top-4 sm:-top-6 md:-top-8 z-20 h-16 sm:h-[72px] w-full !rounded-none border-b border-portal-border bg-portal-surface">
        <ol
          aria-label={ariaLabel}
          className="relative grid h-full w-full !rounded-none"
          style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}
        >
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            const isClickable = Boolean(step.onClick && !step.disabled);

            const content = (
              <div className="relative flex h-full w-full items-center justify-center gap-3 px-4 !rounded-none transition-colors">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center !rounded-full text-sm font-medium transition-colors duration-300 ${
                    isCurrent || isCompleted
                      ? 'bg-portal-accent text-white'
                      : 'bg-portal-muted/30 text-white'
                  }`}
                >
                  {isCompleted ? (
                    <i className="pi pi-check text-xs font-bold" aria-hidden="true" />
                  ) : (
                    stepNumber
                  )}
                </span>

                <span
                  className={`truncate text-sm transition-colors duration-300 ${
                    isCurrent
                      ? 'font-medium text-portal-accent'
                      : isCompleted
                        ? 'font-medium text-portal-heading'
                        : 'font-normal text-portal-muted/50'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            );

            return (
              <li key={`${stepNumber}-${step.title}`} className="h-full min-w-0 !rounded-none">
                {isClickable ? (
                  <button
                    type="button"
                    onClick={step.onClick}
                    disabled={step.disabled}
                    aria-current={isCurrent ? 'step' : undefined}
                    className="h-full w-full !rounded-none cursor-pointer text-left hover:bg-portal-hover focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    aria-current={isCurrent ? 'step' : undefined}
                    className="h-full w-full !rounded-none text-left"
                  >
                    {content}
                  </div>
                )}
              </li>
            );
          })}

          {/* Continuous animated progress indicator along the bottom edge */}
          <span
            aria-hidden="true"
            style={{ width: `${progressPercentage}%` }}
            className="pointer-events-none absolute -bottom-px left-0 h-0.5 !rounded-none bg-portal-accent transition-[width] duration-300 ease-out"
          />
        </ol>
      </div>

      {/* Step Body */}
      <div className="!rounded-none bg-portal-surface p-5 sm:p-6">
        {children}
      </div>

      {/* Sticky Stepper Footer — clean matching surface background, rectilinear top divider */}
      {footer && (
        <div className="sticky -bottom-4 sm:-bottom-6 md:-bottom-8 z-20 flex h-16 sm:h-[72px] w-full flex-wrap items-center justify-between gap-3 !rounded-none border-t border-portal-border bg-portal-surface px-6">
          {footer}
        </div>
      )}
    </div>
  );
};

export default FlatStepper;
