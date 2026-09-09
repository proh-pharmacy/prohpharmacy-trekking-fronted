import React from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton } from '../../../../components/flat-form';
import toast from 'react-hot-toast';

export interface PasswordResetResultModalProps {
  visible: boolean;
  onHide: () => void;
  user: {
    fullName?: string;
    email?: string;
    emailAddress?: string;
    employeeNumber?: string;
  } | null;
  newPassword?: string;
  message?: string;
}

export const PasswordResetResultModal: React.FC<PasswordResetResultModalProps> = ({
  visible,
  onHide,
  user,
  newPassword,
  message,
}) => {
  if (!user) return null;

  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    toast.success('Password copied to clipboard!');
  };

  const userEmail = user.emailAddress || user.email || '—';

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title="Password Reset"
      size="sm"
      footer={
        <div className="flex items-center justify-end w-full">
          <FlatButton
            variant="primary"
            label="Done"
            icon="pi pi-check"
            size="sm"
            onClick={onHide}
          />
        </div>
      }
    >
      <div className="space-y-4 py-1">
        <div className="bg-portal-canvas border border-portal-border/60 rounded p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
            <span className="text-portal-muted">User</span>
            <span className="font-semibold text-white">
              {user.fullName || 'User'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
            <span className="text-portal-muted">Login Email</span>
            <span className="font-mono text-white text-xs">
              {userEmail}
            </span>
          </div>

          {newPassword && (
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-portal-muted block text-[11px]">New Generated Password</span>
                <span className="font-mono text-amber-400 font-bold text-sm">
                  {newPassword}
                </span>
              </div>
              <FlatButton
                variant="outline"
                size="sm"
                label="Copy"
                leftIcon="pi pi-copy"
                onClick={handleCopyPassword}
              />
            </div>
          )}
        </div>

        <div className="p-3 bg-portal-canvas/60 border border-portal-border/40 rounded text-[11px] text-portal-muted flex items-start gap-2">
          <i className="pi pi-info-circle text-portal-accent text-xs mt-0.5 shrink-0" />
          <span>
            {message ||
              'All active sessions for this user have been revoked. A notification email with credentials has also been sent.'}
          </span>
        </div>
      </div>
    </FlatModal>
  );
};

export default PasswordResetResultModal;
