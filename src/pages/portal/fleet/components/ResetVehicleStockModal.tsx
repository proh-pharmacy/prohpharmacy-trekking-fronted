import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { getApiError, vehicleStockApi } from '../../../../api-client';
import { resetTableData } from '../../../../components/data-table';
import { FlatButton, FlatDropdown, FlatTextarea } from '../../../../components/flat-form';
import { FlatModal } from '../../../../components/overlay';

const RESET_REASONS = [
  'End-of-month reconciliation',
  'Inventory count correction',
  'Stock transferred from vehicle',
  'Vehicle reassignment',
  'Vehicle decommissioning',
  'Damaged or expired stock clearance',
  'Other',
].map((reason) => ({ label: reason, value: reason }));

interface Props {
  visible: boolean;
  vehicleId: string;
  vehicleName: string;
  onHide: () => void;
  onComplete: () => Promise<void> | void;
}

export const ResetVehicleStockModal: React.FC<Props> = ({ visible, vehicleId, vehicleName, onHide, onComplete }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);

  const reasonValue = reason === 'Other' ? customReason.trim() : reason;

  const close = () => {
    if (resetting) return;
    setReason('');
    setCustomReason('');
    setError('');
    onHide();
  };

  const reset = async () => {
    const value = reasonValue.trim();
    if (!value) {
      setError(reason === 'Other' ? 'Enter the reset reason.' : 'Select a reason for resetting the stock.');
      return;
    }
    setError('');
    setResetting(true);
    try {
      const result = await vehicleStockApi.resetStock(vehicleId, value);
      resetTableData();
      await onComplete();
      toast.success(`${result.productsRemoved} ${result.productsRemoved === 1 ? 'product' : 'products'} removed from the vehicle.`);
      setResetting(false);
      setReason('');
      setCustomReason('');
      setError('');
      onHide();
    } catch (error: unknown) {
      setError(getApiError(error)?.message || 'Failed to reset vehicle stock.');
      setResetting(false);
    }
  };

  return (
    <FlatModal
      visible={visible}
      onHide={close}
      title="Reset vehicle stock"
      subtitle={vehicleName}
      size="sm"
      closable={!resetting}
      footer={(
        <>
          <FlatButton size="sm" variant="outline" onClick={close} disabled={resetting}>Cancel</FlatButton>
          <FlatButton size="sm" variant="danger" leftIcon="pi pi-trash" onClick={() => void reset()} loading={resetting} disabled={resetting}>Reset stock</FlatButton>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 text-xs text-red-accent">
          <i className="pi pi-exclamation-triangle mt-0.5" />
          <p>This removes every tracked product from the vehicle. Review pending returns before continuing.</p>
        </div>
        <FlatDropdown
          id="vehicle-stock-reset-reason"
          label="Reason"
          value={reason}
          options={RESET_REASONS}
          onChange={(value) => {
            setReason(value ?? '');
            if (value !== 'Other') setCustomReason('');
            setError('');
          }}
          placeholder="Select a reason"
          required
          size="sm"
        />
        {reason === 'Other' && (
          <FlatTextarea
            id="vehicle-stock-reset-custom-reason"
            label="Other reason"
            value={customReason}
            onChange={(event) => { setCustomReason(event.target.value); setError(''); }}
            maxLength={300}
            rows={3}
            required
            size="sm"
          />
        )}
        {error && (
          <p className="flex items-start gap-1.5 text-xs text-red-accent">
            <i className="pi pi-exclamation-circle mt-0.5" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </FlatModal>
  );
};

export default ResetVehicleStockModal;
