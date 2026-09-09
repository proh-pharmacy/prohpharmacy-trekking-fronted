import React from 'react';
import { FlatModal } from '../../../../components/overlay';
import { FlatButton } from '../../../../components/flat-form';
import { type TrackingDevice } from '../../../../api-client';
import toast from 'react-hot-toast';

interface DeviceRegisteredModalProps {
  visible: boolean;
  onHide: () => void;
  device: TrackingDevice | null;
}

export const DeviceRegisteredModal: React.FC<DeviceRegisteredModalProps> = ({ visible, onHide, device }) => {
  if (!device) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(device.traccarUniqueId);
    toast.success('Unique ID copied to clipboard!');
  };

  return (
    <FlatModal
      visible={visible}
      onHide={onHide}
      title="Device Registered"
      size="sm"
      footer={
        <div className="flex items-center justify-end w-full">
          <FlatButton variant="primary" label="Done" icon="pi pi-check" size="sm" onClick={onHide} />
        </div>
      }
    >
      <div className="space-y-4 py-1">
        <div className="bg-portal-canvas border border-portal-border/60 rounded p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
            <span className="text-portal-muted">Device Name</span>
            <span className="font-semibold text-white">{device.name}</span>
          </div>

          {device.phoneNumber && (
            <div className="flex items-center justify-between py-1 border-b border-portal-border/40">
              <span className="text-portal-muted">Phone</span>
              <span className="font-mono text-white">{device.phoneNumber}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-portal-muted block text-[11px]">Traccar Unique ID</span>
              <span className="font-mono text-amber-400 font-bold text-sm break-all">{device.traccarUniqueId}</span>
            </div>
            <FlatButton
              variant="outline"
              size="sm"
              label="Copy"
              leftIcon="pi pi-copy"
              onClick={handleCopy}
            />
          </div>
        </div>

        <div className="p-3 bg-portal-canvas/60 border border-portal-border/40 rounded text-[11px] text-portal-muted flex items-start gap-2">
          <i className="pi pi-info-circle text-portal-accent text-xs mt-0.5 shrink-0" />
          <span>
            Copy the Unique ID above and use it to identify this device in the Traccar application.
          </span>
        </div>
      </div>
    </FlatModal>
  );
};

export default DeviceRegisteredModal;
