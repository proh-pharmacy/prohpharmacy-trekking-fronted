import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface FlatBottomSheetProps {
  visible: boolean;
  onHide: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  maxHeight?: string;
  maxWidth?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  closable?: boolean;
  dismissableMask?: boolean;
  closeOnEscape?: boolean;
  showHandle?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const FlatBottomSheet: React.FC<FlatBottomSheetProps> = ({
  visible,
  onHide,
  title,
  subtitle,
  badge,
  maxHeight = 'max-h-[85vh]',
  maxWidth = 'max-w-2xl',
  header,
  footer,
  closable = true,
  dismissableMask = true,
  closeOnEscape = true,
  showHandle = true,
  className = '',
  children,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

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

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center select-none"
    >
      {/* Dark Obsidian Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-[4px] transition-opacity animate-fadeIn"
        onClick={dismissableMask ? onHide : undefined}
      />

      {/* Slide-Up Bottom Sheet Panel */}
      <div
        ref={sheetRef}
        className={`relative w-full ${maxWidth} ${maxHeight} bg-portal-surface border-t border-x border-portal-border/80 rounded-t-lg shadow-2xl flex flex-col z-10 text-white select-text animate-slideInBottom overflow-hidden ${className}`}
      >
        {/* Drag Handle Indicator */}
        {showHandle && (
          <div className="w-full flex justify-center pt-3 pb-1 cursor-grab">
            <div className="w-12 h-1.5 bg-white/20 rounded-full hover:bg-white/40 transition-colors" />
          </div>
        )}

        {/* Sheet Header */}
        {header !== undefined ? (
          header
        ) : title ? (
          <div className="shrink-0 px-6 py-3.5 border-b border-portal-border/60 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white truncate">
                  {title}
                </h3>
                {badge && <span>{badge}</span>}
              </div>
              {subtitle && (
                <p className="text-xs text-portal-muted mt-0.5">{subtitle}</p>
              )}
            </div>

            {closable && (
              <button
                type="button"
                onClick={onHide}
                className="p-1.5 text-portal-muted hover:text-white hover:bg-white/[0.08] rounded transition cursor-pointer shrink-0"
                title="Close sheet"
              >
                <i className="pi pi-times text-xs" />
              </button>
            )}
          </div>
        ) : null}

        {/* Sheet Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar text-sm text-portal-text leading-relaxed">
          {children}
        </div>

        {/* Sheet Sticky Footer */}
        {footer && (
          <div className="shrink-0 px-6 py-3.5 border-t border-portal-border/60 bg-portal-canvas flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default FlatBottomSheet;
