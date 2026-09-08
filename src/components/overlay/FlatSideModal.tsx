import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export type SideModalPosition = 'right' | 'left';
export type SideModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface FlatSideModalProps {
  visible: boolean;
  onHide: () => void;
  position?: SideModalPosition;
  size?: SideModalSize;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  closable?: boolean;
  dismissableMask?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  children: React.ReactNode;
}

const sizeClasses: Record<SideModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
  '2xl': 'max-w-3xl',
  full: 'max-w-full',
};

export const FlatSideModal: React.FC<FlatSideModalProps> = ({
  visible,
  onHide,
  position = 'right',
  size = 'md',
  title,
  subtitle,
  badge,
  icon,
  header,
  footer,
  closable = true,
  dismissableMask = true,
  closeOnEscape = true,
  className = '',
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!visible) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onHide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, closeOnEscape, onHide]);

  if (!visible) return null;

  const isRight = position === 'right';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex overflow-hidden select-none"
    >
      {/* Dark Obsidian Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-[4px] transition-opacity animate-fadeIn"
        onClick={dismissableMask ? onHide : undefined}
      />

      {/* Slide-over Container */}
      <div
        className={`fixed inset-y-0 ${
          isRight ? 'right-0' : 'left-0'
        } flex max-w-full pl-0 pointer-events-auto`}
      >
        <div
          ref={panelRef}
          className={`w-screen ${sizeClasses[size]} bg-portal-surface ${
            isRight ? 'border-l' : 'border-r'
          } border-portal-border/80 shadow-2xl flex flex-col h-full z-10 text-white select-text ${
            isRight ? 'animate-slideInRight' : 'animate-slideInLeft'
          } ${className}`}
        >
          {/* Top Pinned Header */}
          {header !== undefined ? (
            header
          ) : title ? (
            <div className="shrink-0 px-6 py-4 border-b border-portal-border/60 flex items-center justify-between gap-4 bg-portal-surface">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className="w-9 h-9 rounded bg-portal-canvas border border-portal-border flex items-center justify-center text-portal-accent shrink-0 shadow-inner">
                    <i className={`${icon} text-base`} />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold tracking-tight text-white truncate">
                      {title}
                    </h3>
                    {badge && <span>{badge}</span>}
                  </div>
                  {subtitle && (
                    <p className="text-xs text-portal-muted mt-0.5 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {closable && (
                <button
                  type="button"
                  onClick={onHide}
                  className="p-1.5 text-portal-muted hover:text-white hover:bg-white/[0.08] rounded transition cursor-pointer shrink-0"
                  title="Close panel"
                >
                  <i className="pi pi-times text-xs" />
                </button>
              )}
            </div>
          ) : null}

          {/* Scrollable Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar text-sm text-portal-text leading-relaxed">
            {children}
          </div>

          {/* Bottom Fixed Footer */}
          {footer && (
            <div className="shrink-0 px-6 py-3.5 border-t border-portal-border/60 bg-portal-canvas flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FlatSideModal;
