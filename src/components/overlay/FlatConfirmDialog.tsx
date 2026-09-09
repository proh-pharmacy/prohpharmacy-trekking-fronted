import React, { useState } from 'react';
import { FlatModal } from './FlatModal';
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
  variant?: ConfirmVariant;
  icon?: string;
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
  variant = 'primary',
  icon,
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
      size="sm"
      closable={!isBusy}
      dismissableMask={!isBusy}
      closeOnEscape={!isBusy}
      footer={
        <>
          <FlatButton
            variant="outline"
            size="sm"
            onClick={onHide}
            disabled={isBusy}
            className="!border-white/10 !text-white/80 hover:!bg-white/[0.08] text-xs font-semibold"
          >
            {cancelLabel}
          </FlatButton>

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
        <div
          className={`w-11 h-11 rounded-full border flex items-center justify-center shrink-0 shadow-inner ${iconColors[variant]}`}
        >
          <i className={`${activeIcon} text-lg`} />
        </div>

        <div className="space-y-1.5 flex-1">
          <h4 className="text-base font-bold text-white tracking-tight">{title}</h4>
          <div className="text-xs text-portal-text leading-relaxed">{message}</div>
        </div>
      </div>
    </FlatModal>
  );
};

export default FlatConfirmDialog;
