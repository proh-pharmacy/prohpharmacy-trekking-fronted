import React, { useState, useEffect, useRef } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText, FlatDropdown } from '../../../../components/flat-form';
import { staffApi, type StaffItem, type Branch, type Role } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

interface EditStaffModalProps {
  visible: boolean;
  onHide: () => void;
  staff: StaffItem | null;
  onSuccess?: () => void;
  branches: Branch[];
  availableRoles: Role[];
}

const DEFAULT_STAFF_ROLES: Role[] = [
  { name: 'Driver' },
  { name: 'FieldStaff' },
  { name: 'BranchManager' },
  { name: 'OperationsManager' },
  { name: 'CreditOfficer' },
  { name: 'Auditor' },
  { name: 'SuperAdmin' },
];

export const EditStaffModal: React.FC<EditStaffModalProps> = ({
  visible,
  onHide,
  staff,
  onSuccess,
  branches,
  availableRoles,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [branchId, setBranchId] = useState('');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, or WebP images are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5 MB.');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const rolesToDisplay = availableRoles.length > 0 ? availableRoles : DEFAULT_STAFF_ROLES;

  const branchOptions = [
    { label: 'Select branch / hub...', value: '' },
    ...branches.map((b) => ({ label: b.name, value: b.id })),
  ];

  const roleOptions = [
    { label: 'Select role / position...', value: '' },
    ...rolesToDisplay.map((r) => ({ label: r.name, value: r.name })),
  ];

  useEffect(() => {
    if (staff) {
      setFirstName(staff.firstName || '');
      setLastName(staff.lastName || '');
      setPhoneNumber(staff.phoneNumber || '');
      setBranchId(staff.branchId || '');
      setRole(staff.role || staff.jobTitle || '');
      setPhotoFile(null);
      setPhotoPreview(staff.profilePhotoUrl ?? null);
    }
  }, [staff]);

  if (!staff) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required.');
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error('Phone number is required.');
      return;
    }
    if (!branchId) {
      toast.error('Branch is required.');
      return;
    }

    setSaving(true);
    try {
      await staffApi.updateStaff(staff.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        branchId,
        role: role || undefined,
      });

      if (photoFile) {
        try {
          await staffApi.uploadPhoto(staff.id, photoFile);
        } catch {
          toast.error('Staff updated but photo upload failed.');
        }
      }

      toast.success(`Staff member ${firstName} ${lastName} updated.`);
      resetTableData();
      onHide();
      onSuccess?.();
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to update staff member.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title="Edit Staff Member"
      subtitle={`Update details for ${staff.fullName}`}
      badge={staff.status || staff.employmentStatus}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <FlatButton
            variant="danger-outline"
            label="Cancel"
            onClick={onHide}
            disabled={saving}
          />
          <FlatButton
            variant="primary"
            label={saving ? 'Saving...' : 'Save Changes'}
            icon="pi pi-check"
            onClick={handleSubmit}
            loading={saving}
            disabled={saving || !firstName.trim() || !lastName.trim() || !phoneNumber.trim()}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
        {/* Read-Only Summary Header with avatar */}
        <div className="p-3 bg-portal-canvas border border-portal-border/60 rounded flex items-center gap-3">
          <button
            type="button"
            onClick={() => photoPreview ? setShowPhotoViewer(true) : photoInputRef.current?.click()}
            className="relative w-10 h-10 rounded overflow-hidden border border-portal-border hover:border-portal-accent transition-colors flex-shrink-0 group bg-portal-surface"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Staff photo" className="w-full h-full object-cover" />
            ) : (
              <i className="pi pi-user text-sm text-portal-muted group-hover:text-portal-accent transition-colors" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <i className={`pi ${photoPreview ? 'pi-search-plus' : 'pi-upload'} text-white text-[10px]`} />
            </div>
          </button>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-white block truncate">{staff.fullName}</span>
            <span className="text-[11px] text-portal-muted font-mono block truncate">
              {staff.emailAddress || staff.email || 'No email registered'}
            </span>
            <div className="flex items-center gap-3 mt-0.5">
              <button type="button" onClick={() => photoInputRef.current?.click()} className="text-[10px] text-portal-accent hover:text-portal-accent-hover">
                {photoPreview ? 'Change photo' : 'Upload photo'}
              </button>
              {photoFile && (
                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(staff.profilePhotoUrl ?? null); }} className="text-[10px] text-red-400 hover:text-red-300">
                  Remove
                </button>
              )}
            </div>
          </div>
          {staff.employeeNumber && (
            <span className="font-mono text-xs text-portal-accent shrink-0">{staff.employeeNumber}</span>
          )}
        </div>

        <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />

        {showPhotoViewer && photoPreview && (
          <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center" onClick={() => setShowPhotoViewer(false)}>
            <div className="relative max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <img src={photoPreview} alt="Staff photo" className="w-full rounded object-contain max-h-[70vh]" />
              <button type="button" onClick={() => setShowPhotoViewer(false)} className="absolute top-2 right-2 w-7 h-7 rounded bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                <i className="pi pi-times text-xs" />
              </button>
            </div>
          </div>
        )}

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3">
          <FlatInputText
            label="First Name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            size="sm"
          />
          <FlatInputText
            label="Last Name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            size="sm"
          />
        </div>

        {/* Contact & Branch */}
        <div className="grid grid-cols-2 gap-3">
          <FlatInputText
            label="Phone Number"
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            size="sm"
          />
          <FlatDropdown
            label="Assigned Branch / Hub"
            required
            options={branchOptions}
            value={branchId}
            onChange={(val) => setBranchId(val)}
            size="sm"
          />
        </div>

        {/* Role Field */}
        <div>
          <FlatDropdown
            label="Position / Role"
            options={roleOptions}
            value={role}
            onChange={(val) => setRole(val)}
            size="sm"
          />
        </div>
      </form>
    </FlatModal>
  );
};

export default EditStaffModal;
