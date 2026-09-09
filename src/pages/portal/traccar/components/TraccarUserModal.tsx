import React, { useState, useEffect } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText, FlatInputPassword } from '../../../../components/flat-form';
import {
  fleetApi,
  type TraccarUser,
  type CreateTraccarUserPayload,
  type UpdateTraccarUserPayload,
} from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

interface TraccarUserModalProps {
  visible: boolean;
  onHide: () => void;
  user: TraccarUser | null;
}

export const TraccarUserModal: React.FC<TraccarUserModalProps> = ({ visible, onHide, user }) => {
  const isEditing = Boolean(user);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [administrator, setAdministrator] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPassword('');
      setAdministrator(user.administrator || false);
      setDisabled(user.disabled || false);
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setAdministrator(false);
      setDisabled(false);
    }
  }, [visible, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required.'); return; }
    if (!email.trim()) { toast.error('Email address is required.'); return; }
    if (!isEditing && !password.trim()) { toast.error('Password is required.'); return; }
    if (password && password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }

    setSubmitting(true);
    try {
      if (isEditing && user) {
        const payload: UpdateTraccarUserPayload = {
          name: name.trim(),
          email: email.trim(),
          administrator,
          disabled,
          ...(password.trim() ? { password: password.trim() } : {}),
        };
        await fleetApi.updateTraccarUser(user.id, payload);
        toast.success(`Traccar user "${name.trim()}" updated.`);
      } else {
        const payload: CreateTraccarUserPayload = {
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          administrator,
        };
        await fleetApi.createTraccarUser(payload);
        toast.success(`Traccar user "${name.trim()}" created.`);
      }
      resetTableData();
      onHide();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save Traccar user.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mt-4 mb-3">
      <span className="text-[11px] font-medium text-portal-muted uppercase tracking-wide">{children}</span>
      <div className="h-[1px] w-full bg-portal-border mt-2" />
    </div>
  );

  const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-portal-accent' : 'bg-portal-border'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title={isEditing ? 'Edit Traccar User' : 'Add Traccar User'}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <FlatButton variant="danger-outline" label="Cancel" onClick={onHide} disabled={submitting} />
          <FlatButton
            variant="primary"
            label={submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create User'}
            icon={isEditing ? 'pi pi-check' : 'pi pi-plus'}
            onClick={handleSubmit}
            loading={submitting}
            disabled={submitting}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <SectionLabel>Account Details</SectionLabel>

        <FlatInputText
          label="Full Name"
          placeholder="e.g. Kwame Asante"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="sm"
          maxLength={100}
          required
        />

        <FlatInputText
          label="Email Address"
          placeholder="e.g. kwame@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          size="sm"
          maxLength={200}
          required
        />

        <FlatInputPassword
          label={isEditing ? 'New Password' : 'Password'}
          placeholder={isEditing ? 'Leave blank to keep current' : 'Min. 6 characters'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          size="sm"
          required={!isEditing}
        />

        <SectionLabel>Permissions</SectionLabel>

        <div className="flex items-center justify-between p-3 bg-portal-canvas border border-portal-border/60 rounded">
          <div>
            <span className="text-xs font-semibold text-white block">Administrator</span>
            <span className="text-[11px] text-portal-muted">Full access to the Traccar web interface</span>
          </div>
          <Toggle checked={administrator} onChange={setAdministrator} />
        </div>

        {isEditing && (
          <div className="flex items-center justify-between p-3 bg-portal-canvas border border-portal-border/60 rounded">
            <div>
              <span className="text-xs font-semibold text-white block">Account Disabled</span>
              <span className="text-[11px] text-portal-muted">Prevent this user from logging into Traccar</span>
            </div>
            <Toggle checked={disabled} onChange={setDisabled} />
          </div>
        )}
      </form>
    </FlatModal>
  );
};

export default TraccarUserModal;
