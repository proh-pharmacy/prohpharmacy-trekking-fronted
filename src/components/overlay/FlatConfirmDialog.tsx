import React, { useState } from 'react';
import { FlatModal, type ModalSize } from './FlatModal';
import { FlatButton } from '../flat-form/FlatButton';

export type ConfirmVariant = 'primary' | 'danger' | 'warning';

export interface FlatConfirmDialogProps {
  visible: boolean;
  onHide: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  variant?: ConfirmVariant;
  icon?: string;
  showIcon?: boolean;
  size?: ModalSize;
  loading?: boolean;
}

export const FlatConfirmDialog: React.FC<FlatConfirmDialogProps> = ({
  visible,
  onHide,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'primary',
  icon,
  showIcon = true,
  size = 'sm',
  loading = false,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);

  // Reset internal loading whenever visibility closes
  React.useEffect(() => {
    if (!visible) {
      setInternalLoading(false);
    }
  }, [visible]);

  const isBusy = loading || internalLoading;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  const defaultIcons: Record<ConfirmVariant, string> = {
    primary: 'pi pi-check-circle',
    danger: 'pi pi-exclamation-triangle',
    warning: 'pi pi-info-circle',
  };

  const iconColors: Record<ConfirmVariant, string> = {
    primary: 'text-portal-accent bg-portal-accent/15 border-portal-accent/30',
    danger: 'text-red-accent bg-red-accent/15 border-red-accent/30',
    warning: 'text-amber-400 bg-amber-400/15 border-amber-400/30',
  };

  const confirmButtonClasses: Record<ConfirmVariant, string> = {
    primary:
      '!bg-portal-accent hover:!bg-portal-accent-hover active:!bg-portal-accent-hover !text-white !border-transparent font-bold text-xs',
    danger:
      '!bg-red-accent hover:!bg-red-accent-hover active:!bg-red-800 !text-white !border-transparent font-bold text-xs',
    warning:
      '!bg-amber-500 hover:!bg-amber-600 active:!bg-amber-700 !text-black !border-transparent font-bold text-xs',
  };

  const activeIcon = icon || defaultIcons[variant];

  return (
    <FlatModal
      visible={visible}
      onHide={isBusy ? () => {} : onHide}
      size={size}
      closable={!isBusy}
      dismissableMask={false}
      closeOnEscape={false}
      footer={
        <>
          <FlatButton
            variant="outline"
            size="sm"
            onClick={onHide}
            disabled={isBusy}
            className="!border-portal-border !text-portal-text hover:!bg-portal-hover text-xs font-semibold"
          >
            {cancelLabel}
          </FlatButton>

          {secondaryActionLabel && onSecondaryAction && (
            <FlatButton
              variant="outline"
              size="sm"
              onClick={onSecondaryAction}
              disabled={isBusy}
              className="!border-portal-border !text-portal-text hover:!bg-portal-hover text-xs font-semibold"
            >
              {secondaryActionLabel}
            </FlatButton>
          )}

          <FlatButton
            size="sm"
            onClick={handleConfirm}
            loading={isBusy}
            disabled={isBusy}
            className={confirmButtonClasses[variant]}
          >
            {confirmLabel}
          </FlatButton>
        </>
      }
    >
      <div className="flex items-start gap-4 py-1">
        {showIcon && (
          <div
            className={`w-11 h-11 rounded-full border flex items-center justify-center shrink-0 shadow-inner ${iconColors[variant]}`}
          >
            <i className={`${activeIcon} text-lg`} />
          </div>
        )}

        <div className="space-y-1.5 flex-1">
          <h4 className="text-base font-bold text-portal-heading tracking-tight">{title}</h4>
          <div className="text-xs text-portal-text leading-relaxed">{message}</div>
        </div>
      </div>
    </FlatModal>
  );
};

export default FlatConfirmDialog;
