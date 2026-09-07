import React, { useState } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText } from '../../../../components/flat-form';
import { usersApi, type Role } from '../../../../api-client';
import toast from 'react-hot-toast';

interface InviteUserModalProps {
  visible: boolean;
  onHide: () => void;
  availableRoles: Role[];
  onSuccess?: () => void;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  visible,
  onHide,
  availableRoles,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['Staff']);
  const [submitting, setSubmitting] = useState(false);

  const toggleRole = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName)
        ? prev.filter((r) => r !== roleName)
        : [...prev, roleName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName || !lastName) {
      toast.error('Please fill in all required fields.');
      return;
    }
    if (selectedRoles.length === 0) {
      toast.error('Please select at least one role.');
      return;
    }

    setSubmitting(true);
    try {
      await usersApi.inviteUser({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        roles: selectedRoles,
      });
      toast.success(`Invitation email sent to ${email}`);
      setEmail('');
      setFirstName('');
      setLastName('');
      setSelectedRoles(['Staff']);
      onHide();
      onSuccess?.();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to send invitation.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title="Invite New User"
      subtitle="Send a secure 48-hour invitation link to onboard a new account"
      icon="pi pi-user-plus"
      badge="Admin"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <FlatButton
            variant="outline"
            label="Cancel"
            onClick={onHide}
            disabled={submitting}
          />
          <FlatButton
            variant="primary"
            label={submitting ? 'Sending...' : 'Send Invitation'}
            icon="pi pi-send"
            onClick={handleSubmit}
            disabled={submitting}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FlatInputText
            label="First Name"
            placeholder="e.g. Ama"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <FlatInputText
            label="Last Name"
            placeholder="e.g. Owusu"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>

        <FlatInputText
          label="Corporate Email"
          type="email"
          placeholder="e.g. a.owusu@prohpharmacy.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          helperText="The user will receive an onboarding link to set their secure password."
          required
        />

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#adbac7] mb-2">
            Assign Initial Roles <span className="text-red-accent">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {availableRoles.map((role) => {
              const isChecked = selectedRoles.includes(role.name);
              return (
                <button
                  type="button"
                  key={role.name}
                  onClick={() => toggleRole(role.name)}
                  className={`p-3 rounded border text-left flex items-start justify-between transition cursor-pointer ${
                    isChecked
                      ? 'bg-portal-accent/10 border-portal-accent text-white'
                      : 'bg-portal-canvas/70 border-portal-border text-[#adbac7] hover:border-portal-border/80'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{role.name}</div>
                    <div className="text-[11px] text-portal-muted mt-0.5">
                      {role.name === 'Admin'
                        ? 'Full system & security controls'
                        : role.name === 'Manager'
                        ? 'Branch & team operations'
                        : role.name === 'Driver'
                        ? 'Dispatch & transit runs'
                        : 'Standard staff duties'}
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${
                      isChecked
                        ? 'bg-portal-accent border-portal-accent text-white'
                        : 'border-portal-border bg-portal-surface'
                    }`}
                  >
                    {isChecked && <i className="pi pi-check" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </FlatModal>
  );
};

export default InviteUserModal;
