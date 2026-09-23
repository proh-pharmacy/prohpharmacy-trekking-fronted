import React, { useState, useEffect } from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton, FlatDropdown } from '../../../../components/flat-form';
import { fleetApi, type Vehicle, type OperationalStatus } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import toast from 'react-hot-toast';

const STATUS_OPTIONS: { label: string; value: OperationalStatus }[] = [
  { label: 'Active', value: 'Active' },
  { label: 'Under Maintenance', value: 'UnderMaintenance' },
  { label: 'Decommissioned', value: 'Decommissioned' },
];

interface VehicleStatusModalProps {
  visible: boolean;
  onHide: () => void;
  vehicle: Vehicle | null;
}

export const VehicleStatusModal: React.FC<VehicleStatusModalProps> = ({ visible, onHide, vehicle }) => {
  const [status, setStatus] = useState<OperationalStatus | ''>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && vehicle) setStatus(vehicle.operationalStatus);
  }, [visible, vehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status || !vehicle) return;

    setSubmitting(true);
    try {
      await fleetApi.changeVehicleStatus(vehicle.id, status as OperationalStatus);
      toast.success('Vehicle status updated.');
      resetTableData();
      onHide();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to update status.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title="Change Vehicle Status"
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <FlatButton variant="danger-outline" label="Cancel" onClick={onHide} disabled={submitting} />
          <FlatButton
            variant="primary"
            label={submitting ? 'Saving...' : 'Update Status'}
            icon="pi pi-check"
            onClick={handleSubmit}
            loading={submitting}
            disabled={submitting || !status}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {vehicle && (
          <div className="text-xs text-portal-muted mb-2">
            Vehicle: <span className="text-white font-medium">{vehicle.displayName}</span>
            <span className="ml-2 font-mono text-portal-accent">{vehicle.registrationNumber}</span>
          </div>
        )}
        <FlatDropdown
          label="Operational Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(val: any) => setStatus(val?.value !== undefined ? val.value : val)}
          placeholder="Select status"
          size="sm"
        />
      </form>
    </FlatModal>
  );
};

export default VehicleStatusModal;
