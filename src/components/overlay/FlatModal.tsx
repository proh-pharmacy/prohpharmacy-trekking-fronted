import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface FlatModalProps {
  visible: boolean;
  onHide: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: string;
  size?: ModalSize;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  closable?: boolean;
  dismissableMask?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  children: React.ReactNode;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-[96vw] h-[94vh]',
};

export const FlatModal: React.FC<FlatModalProps> = ({
  visible,
  onHide,
  title,
  subtitle,
  badge,
  icon,
  size = 'md',
  header,
  footer,
  closable = true,
  dismissableMask = true,
  closeOnEscape = true,
  className = '',
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-fadeIn"
    >
      {/* Dark Obsidian Backdrop with Soft Blur */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-[4px] transition-opacity"
        onClick={dismissableMask ? onHide : undefined}
      />

      {/* Modal Surface Box (#1e2126 card, 4px subtle rounded flat) */}
      <div
        ref={modalRef}
        className={`relative w-full ${sizeClasses[size]} bg-[#1e2126] border border-white/[0.08] rounded shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10 transition-all transform animate-scaleIn text-white select-text ${className}`}
      >
        {/* Modal Header */}
        {header !== undefined ? (
          header
        ) : title ? (
          <div className="shrink-0 px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-4 bg-[#1e2126]">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="w-9 h-9 rounded bg-[#101214] border border-white/10 flex items-center justify-center text-[#41cc84] shrink-0 shadow-inner">
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
                  <p className="text-xs text-[#e2eee6]/65 mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {closable && (
              <button
                type="button"
                onClick={onHide}
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/[0.08] rounded transition cursor-pointer shrink-0"
                title="Close"
              >
                <i className="pi pi-times text-xs" />
              </button>
            )}
          </div>
        ) : null}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar text-sm text-[#e2eee6]/90 leading-relaxed">
          {children}
        </div>

        {/* Modal Sticky Footer */}
        {footer && (
          <div className="shrink-0 px-6 py-3.5 border-t border-white/[0.08] bg-[#16181d] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default FlatModal;
