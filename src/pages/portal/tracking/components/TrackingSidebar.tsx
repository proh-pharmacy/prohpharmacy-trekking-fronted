import React, { useState, useMemo } from 'react';
import { type DeviceLastPosition } from '../../../../api-client';
import { getVehicleStatus, type VehicleTelemetryStatus } from './VehicleMarkerIcon';

interface TrackingSidebarProps {
  devices: DeviceLastPosition[];
  selectedDevice: DeviceLastPosition | null;
  onSelectDevice: (device: DeviceLastPosition) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const TrackingSidebar: React.FC<TrackingSidebarProps> = ({
  devices,
  selectedDevice,
  onSelectDevice,
  collapsed,
  onToggleCollapse,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | VehicleTelemetryStatus>('all');

  // Compute status counts
  const counts = useMemo(() => {
    let moving = 0;
    let idling = 0;
    let stopped = 0;

    devices.forEach((d) => {
      const s = getVehicleStatus(d.ignition, d.motion, d.speed);
      if (s === 'moving') moving++;
      else if (s === 'idling') idling++;
      else stopped++;
    });

    return { all: devices.length, moving, idling, stopped };
  }, [devices]);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      // Status filter
      const status = getVehicleStatus(d.ignition, d.motion, d.speed);
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      return true;
    });
  }, [devices, statusFilter]);

  const formatRelativeTime = (dateStr?: string | null): string => {
    if (!dateStr) return 'Never';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (diffMs < 0) return 'Just now';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec} ${diffSec === 1 ? 'second' : 'seconds'} ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  };

  // Mobile uses one persistent bottom sheet. Its filter row remains visible
  // when closed, and the device list slides up from that same surface.
  const mobileFleetSheet = (
    <div
      className="md:hidden absolute inset-x-0 bottom-0 z-[1050] h-[70%] flex flex-col bg-portal-surface/95 border-t border-portal-border shadow-2xl backdrop-blur-xl transform-gpu will-change-transform transition-transform duration-500 ease-in-out pointer-events-auto"
      style={{ transform: collapsed ? 'translateY(calc(100% - 52px))' : 'translateY(0)' }}
    >
      <div className="shrink-0 grid grid-cols-[repeat(4,minmax(0,1fr))_44px]">
        {(
          [
            { id: 'all', label: 'All', count: counts.all, color: 'text-portal-text' },
            { id: 'moving', label: 'Moving', count: counts.moving, color: 'text-portal-accent' },
            { id: 'idling', label: 'Idle', count: counts.idling, color: 'text-portal-orange' },
            { id: 'stopped', label: 'Off', count: counts.stopped, color: 'text-portal-muted' },
          ] as const
        ).map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`!rounded-none min-w-0 py-3 border-t-2 text-[11px] font-semibold transition cursor-pointer ${isActive
                ? `${tab.color} border-portal-accent bg-white/[0.05]`
                : `${tab.color} border-transparent hover:bg-white/[0.04]`
                }`}
            >
              <span className="truncate">{tab.label}</span>
              <span className="text-portal-muted/70"> · </span>
              <span className="font-mono text-[10px]">{tab.count}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? 'Show devices' : 'Hide devices'}
          className="!rounded-none flex items-center justify-center border-t-2 border-transparent text-portal-text hover:bg-white/[0.08] hover:text-white transition cursor-pointer"
        >
          <i className={`pi ${collapsed ? 'pi-list' : 'pi-angle-down'} text-sm`} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar divide-y divide-portal-border/40">
        {filteredDevices.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2 text-portal-muted text-xs">
            <i className="pi pi-inbox text-2xl opacity-40" />
            <span>{devices.length === 0 ? 'No reported positions yet.' : 'No vehicles match filter.'}</span>
          </div>
        ) : (
          filteredDevices.map((device) => {
            const isSelected = selectedDevice?.deviceId === device.deviceId;
            const status = getVehicleStatus(device.ignition, device.motion, device.speed);
            const isMoving = status === 'moving';
            const isIdle = status === 'idling';
            return (
              <div
                key={device.deviceId}
                onClick={() => onSelectDevice(device)}
                className={`p-4 transition cursor-pointer relative ${isSelected ? 'bg-white/[0.08] text-white' : 'hover:bg-white/[0.03] text-portal-text'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 my-auto flex items-center gap-2">
                    <span className="w-9 h-9 !rounded-full bg-white/[0.08] flex items-center justify-center shrink-0">
                      <i className="pi pi-map-marker text-white text-base" aria-hidden="true" />
                    </span>
                    <span className="font-semibold text-sm text-white truncate leading-tight">
                      {device.regionName ? `${device.regionName} - ` : ''}{device.vehicleDisplayName || device.deviceName}
                    </span>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isMoving ? 'text-portal-accent' : isIdle ? 'text-portal-orange' : 'text-portal-muted'}`}>
                      {status}
                    </span>
                    <span className="text-[11px] text-portal-muted whitespace-nowrap">{formatRelativeTime(device.lastReportedAt)}</span>
                  </div>
                </div>
                {device.lastAddress && <div className="mt-1 text-[10px] text-portal-muted/80 truncate">{device.lastAddress}</div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (collapsed) {
    return (
      <>
        {mobileFleetSheet}
        <div className="hidden md:flex flex-col items-center bg-portal-surface border-r border-portal-border w-12 py-4 z-10 select-none">
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand Fleet List"
            className="w-8 h-8 rounded flex items-center justify-center text-portal-muted hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
          >
            <i className="pi pi-angle-double-right text-sm" />
          </button>
          <div className="mt-8 flex flex-col items-center gap-4 text-portal-muted">
            <div className="flex flex-col items-center text-[10px]">
              <span className="w-2 h-2 rounded-full bg-portal-accent mb-1" />
              <span className="font-mono font-bold text-white">{counts.moving}</span>
            </div>
            <div className="flex flex-col items-center text-[10px]">
              <span className="w-2 h-2 rounded-full bg-portal-orange mb-1" />
              <span className="font-mono font-bold text-white">{counts.idling}</span>
            </div>
            <div className="flex flex-col items-center text-[10px]">
              <span className="w-2 h-2 rounded-full bg-portal-muted mb-1" />
              <span className="font-mono font-bold text-white">{counts.stopped}</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {mobileFleetSheet}
      <div className="hidden md:flex relative md:inset-auto md:w-80 lg:w-96 md:h-full flex-col bg-portal-surface border-r border-portal-border shrink-0 z-10 overflow-visible">
      {/* Floating panel control */}
      <button
        type="button"
        onClick={onToggleCollapse}
        title="Collapse Fleet List"
        className="absolute top-2 right-2 md:-right-8 z-[1100] w-7 h-7 rounded flex items-center justify-center text-portal-muted bg-portal-surface border border-portal-border hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
      >
        <i className="pi pi-angle-double-left text-xs" />
      </button>

      {/* Status Filter Segmented Tabs */}
      <div className="px-2.5 pb-0 bg-portal-canvas/40">
        <div className="grid grid-cols-4 gap-0 border-b border-portal-border">
          {(
            [
              { id: 'all', label: 'All', count: counts.all, dot: 'bg-portal-text', color: 'text-portal-text' },
              { id: 'moving', label: 'Moving', count: counts.moving, dot: 'bg-portal-accent', color: 'text-portal-accent' },
              { id: 'idling', label: 'Idle', count: counts.idling, dot: 'bg-portal-orange', color: 'text-portal-orange' },
              { id: 'stopped', label: 'Off', count: counts.stopped, dot: 'bg-portal-muted', color: 'text-portal-muted' },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`py-4.5 px-1.5 !rounded-none border-b-2 text-xs font-semibold transition flex flex-col items-center justify-center cursor-pointer ${isActive
                  ? `bg-transparent ${tab.color} border-portal-accent`
                  : `bg-transparent hover:bg-white/[0.04] ${tab.color} border-transparent`
                  }`}
              >
                <div className="flex items-center gap-1">
                  <span>{tab.label}</span>
                  <span className="text-portal-muted/70">·</span>
                  <span className="font-mono text-[10px] opacity-90">{tab.count}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vehicle List */}
      <div className="flex-1  overflow-y-auto custom-scrollbar divide-y divide-portal-border/40">
        {filteredDevices.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2 text-portal-muted text-xs">
            <i className="pi pi-inbox text-2xl opacity-40" />
            <span>{devices.length === 0 ? 'No reported positions yet.' : 'No vehicles match filter.'}</span>
          </div>
        ) : (
          filteredDevices.map((device) => {
            const isSelected = selectedDevice?.deviceId === device.deviceId;
            const status = getVehicleStatus(device.ignition, device.motion, device.speed);
            const isMoving = status === 'moving';
            const isIdle = status === 'idling';

            return (
              <div
                key={device.deviceId}
                onClick={() => onSelectDevice(device)}
                className={`p-4 rounded-none transition cursor-pointer relative ${isSelected
                  ? 'bg-white/[0.08] border-l-4 border-l-transparent text-white'
                  : 'hover:bg-white/[0.03] text-portal-text border-l-4 border-l-transparent'
                  }`}
              >
                {/* Vehicle identity and status */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 my-auto flex items-center gap-2">
                    <span className="w-9 h-9 !rounded-full bg-white/[0.08] flex items-center justify-center shrink-0">
                      <i className="pi pi-map-marker text-white text-base" aria-hidden="true" />
                    </span>
                    <span className="font-semibold text-sm text-white truncate leading-tight">
                      {device.regionName ? `${device.regionName} - ` : ''}
                      {device.vehicleDisplayName || device.deviceName}
                    </span>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${isMoving
                          ? 'bg-portal-accent animate-pulse'
                          : isIdle
                            ? 'bg-portal-orange'
                            : 'bg-portal-muted'
                          }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${isMoving
                          ? 'text-portal-accent'
                          : isIdle
                            ? 'text-portal-orange'
                            : 'text-portal-muted'
                          }`}
                      >
                        {status}
                      </span>
                    </div>
                    <span className="text-[11px] text-portal-muted whitespace-nowrap">
                      {formatRelativeTime(device.lastReportedAt)}
                    </span>
                  </div>
                </div>

                {/* Optional Address snippet */}
                {device.lastAddress && (
                  <div className="mt-1 text-[10px] text-portal-muted/80 truncate">
                    {device.lastAddress}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      </div>
    </>
  );
};
