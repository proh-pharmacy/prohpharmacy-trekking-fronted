import React, { useState, useEffect } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatInputText, FlatAsyncSelect } from '../../../../components/flat-form';
import { fleetApi, type TrackingDevice, type OperationalStatus } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

const STATUS_COLOR: Record<string, string> = {
  Active: 'text-portal-accent',
  UnderMaintenance: 'text-yellow-400',
  Decommissioned: 'text-portal-muted',
};

interface DeviceModalProps {
  visible: boolean;
  onHide: () => void;
  device: TrackingDevice | null;
  onCreated?: (device: TrackingDevice) => void;
}

export const DeviceModal: React.FC<DeviceModalProps> = ({ visible, onHide, device, onCreated }) => {
  const isEditing = Boolean(device);

  // Create mode
  const [vehicleId, setVehicleId] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [uniqueId, setUniqueId] = useState('');

  // Both modes
  const [phoneNumber, setPhoneNumber] = useState('');

  // Edit mode
  const [name, setName] = useState('');
  const [traccarDeviceId, setTraccarDeviceId] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (device) {
      setName(device.name || '');
      setPhoneNumber(device.phoneNumber || '');
      setTraccarDeviceId(device.traccarDeviceId != null ? String(device.traccarDeviceId) : '');
    } else {
      setVehicleId('');
      setSelectedVehicle(null);
      setUniqueId('');
      setPhoneNumber('');
      setName('');
      setTraccarDeviceId('');
    }
  }, [visible, device]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing && device) {
        if (!name.trim()) { toast.error('Name is required.'); setSubmitting(false); return; }
        await fleetApi.updateDevice(device.id, {
          name: name.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
          traccarDeviceId: traccarDeviceId ? Number(traccarDeviceId) : undefined,
        });
        toast.success(`Device "${name.trim()}" updated.`);
        resetTableData();
        onHide();
      } else {
        if (!vehicleId) { toast.error('A vehicle is required.'); setSubmitting(false); return; }
        const created = await fleetApi.createDevice({
          vehicleId,
          uniqueId: uniqueId.trim() || undefined,
          phoneNumber: phoneNumber.trim() || undefined,
        });
        toast.success('Tracking device registered.');
        resetTableData();
        onHide();
        onCreated?.(created);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save device.';
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

  const LockedField: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
    <div className="flex items-center gap-2 bg-portal-canvas border border-portal-border rounded px-3 py-2">
      <i className="pi pi-lock text-portal-muted text-xs" />
      <span className="text-[11px] text-portal-muted uppercase tracking-wide">{label}</span>
      <span className={`text-xs text-white ml-auto ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title={isEditing ? 'Edit Device' : 'Register Device'}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <FlatButton variant="danger-outline" label="Cancel" onClick={onHide} disabled={submitting} />
          <FlatButton
            variant="primary"
            label={submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Register'}
            icon={isEditing ? 'pi pi-check' : 'pi pi-plus'}
            onClick={handleSubmit}
            loading={submitting}
            disabled={submitting}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {isEditing ? (
          <>
            <SectionLabel>Vehicle & Identifier</SectionLabel>
            <LockedField label="Vehicle" value={device?.vehicleRegistration || '—'} mono />
            <LockedField label="Unique ID" value={device?.traccarUniqueId || '—'} mono />

            <SectionLabel>Device Details</SectionLabel>
            <FlatInputText
              label="Name"
              placeholder="e.g. Kwame Asante - GR-1234-24"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="sm"
              maxLength={100}
              required
            />
            <FlatInputText
              label="Phone Number"
              placeholder="+233..."
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              size="sm"
              maxLength={30}
            />
            <FlatInputText
              label="Traccar Device ID"
              placeholder="Numeric Traccar ID"
              value={traccarDeviceId}
              onChange={(e) => setTraccarDeviceId(e.target.value.replace(/\D/g, ''))}
              size="sm"
            />
          </>
        ) : (
          <>
            <SectionLabel>Vehicle</SectionLabel>

            <FlatAsyncSelect<any>
              id="device-vehicle-select"
              label="Vehicle"
              required
              placeholder="Search by registration or display name..."
              value={vehicleId}
              onChange={(val: any, item: any) => {
                setVehicleId(val || '');
                setSelectedVehicle(item || null);
              }}
              endpointUrl="/fleet/vehicles"
              defaultParams={undefined}
              pageSize={10}
              searchParam="search"
              optionValue="id"
              optionLabel={(v: any) => `${v?.displayName || ''} (${v?.registrationNumber || '—'})`}
              itemTemplate={(v: any) => (
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="min-w-0 truncate">
                    <span className="font-semibold text-white text-xs block truncate">{v?.displayName}</span>
                    <span className="text-[11px] text-portal-muted truncate block">{v?.branchName || '—'}</span>
                  </div>
                  {v?.registrationNumber && (
                    <span className="font-mono text-xs text-portal-accent shrink-0">{v.registrationNumber}</span>
                  )}
                </div>
              )}
              size="sm"
            />

            <div
              className={`transition-opacity duration-200 ${
                selectedVehicle ? 'opacity-100' : 'opacity-0 pointer-events-none select-none'
              }`}
            >
              <div className="bg-portal-canvas border border-portal-border/60 rounded p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-portal-border/40">
                  <span className="font-semibold text-white">{selectedVehicle?.displayName}</span>
                  <span className="font-mono text-portal-accent">{selectedVehicle?.registrationNumber}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-portal-muted text-[11px] block">Branch</span>
                    <span className="text-white">{selectedVehicle?.branchName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-portal-muted text-[11px] block">Status</span>
                    <span className={`font-medium ${STATUS_COLOR[selectedVehicle?.operationalStatus as OperationalStatus] || 'text-portal-muted'}`}>
                      {selectedVehicle?.operationalStatus || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <SectionLabel>Device Info</SectionLabel>
            <FlatInputText
              label="IMEI / Unique ID"
              placeholder="Leave blank for smartphones (auto-generated)"
              value={uniqueId}
              onChange={(e) => setUniqueId(e.target.value)}
              size="sm"
              maxLength={50}
            />
            <FlatInputText
              label="Phone Number"
              placeholder="+233..."
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              size="sm"
              maxLength={30}
            />
            <p className="text-[11px] text-portal-muted">
              For smartphones, leave IMEI blank — a unique ID is auto-generated. For hardware GPS trackers, enter the IMEI.
            </p>
          </>
        )}
      </form>
    </FlatModal>
  );
};

export default DeviceModal;
