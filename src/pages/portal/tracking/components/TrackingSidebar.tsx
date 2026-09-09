import React, { useState, useMemo } from 'react';
import { type DeviceLastPosition } from '../../../../api-client';
import { getVehicleStatus, type VehicleTelemetryStatus } from './VehicleMarkerIcon';

interface TrackingSidebarProps {
  devices: DeviceLastPosition[];
  selectedDevice: DeviceLastPosition | null;
  onSelectDevice: (device: DeviceLastPosition) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const TrackingSidebar: React.FC<TrackingSidebarProps> = ({
  devices,
  selectedDevice,
  onSelectDevice,
  collapsed,
  onToggleCollapse,
  searchQuery,
  onSearchChange,
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

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const plate = (d.vehicleRegistration || '').toLowerCase();
        const driver = (d.staffName || '').toLowerCase();
        const branch = (d.branchName || '').toLowerCase();
        const deviceName = (d.deviceName || '').toLowerCase();
        return (
          plate.includes(q) ||
          driver.includes(q) ||
          branch.includes(q) ||
          deviceName.includes(q)
        );
      }
      return true;
    });
  }, [devices, statusFilter, searchQuery]);

  const formatRelativeTime = (dateStr?: string | null): string => {
    if (!dateStr) return 'Never';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (diffMs < 0) return 'Just now';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (collapsed) {
    return (
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
    );
  }

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col h-full bg-portal-surface border-r border-portal-border shrink-0 z-10 overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-portal-border flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white">
          Active Fleet ({devices.length})
        </h2>
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Collapse Fleet List"
          className="w-7 h-7 rounded flex items-center justify-center text-portal-muted hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
        >
          <i className="pi pi-angle-double-left text-xs" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-portal-border/60 bg-portal-canvas/40">
        <div className="relative flex items-center">
          <i className="pi pi-search absolute left-2.5 text-portal-muted text-xs pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search plate, driver, branch..."
            className="w-full pl-8 pr-7 h-[34px] bg-portal-canvas border border-portal-border rounded text-xs text-white placeholder-portal-muted focus:border-portal-accent focus:outline-none transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 text-portal-muted hover:text-white text-xs cursor-pointer"
            >
              <i className="pi pi-times" />
            </button>
          )}
        </div>

        {/* Status Filter Segmented Tabs */}
        <div className="grid grid-cols-4 gap-1 mt-2">
          {(
            [
              { id: 'all', label: 'All', count: counts.all, dot: 'bg-portal-text' },
              { id: 'moving', label: 'Moving', count: counts.moving, dot: 'bg-portal-accent' },
              { id: 'idling', label: 'Idle', count: counts.idling, dot: 'bg-portal-orange' },
              { id: 'stopped', label: 'Off', count: counts.stopped, dot: 'bg-portal-muted' },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`py-1 px-1.5 rounded text-[11px] font-semibold transition flex flex-col items-center justify-center cursor-pointer ${
                  isActive
                    ? 'bg-portal-accent/15 text-white border border-portal-accent/50'
                    : 'bg-portal-surface hover:bg-white/[0.04] text-portal-muted border border-transparent'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />
                  <span>{tab.label}</span>
                </div>
                <span className="font-mono text-[10px] mt-0.5 opacity-90">{tab.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vehicle List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-portal-border/40">
        {filteredDevices.length === 0 ? (
          <div className="p-8 text-center text-portal-muted text-xs">
            <i className="pi pi-inbox text-2xl mb-2 block opacity-40" />
            {devices.length === 0 ? 'No reported positions yet.' : 'No vehicles match filter.'}
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
                className={`p-3 transition cursor-pointer relative ${
                  isSelected
                    ? 'bg-portal-accent/10 border-l-4 border-l-portal-accent text-white'
                    : 'hover:bg-white/[0.03] text-portal-text border-l-4 border-l-transparent'
                }`}
              >
                {/* Top Row: Plate & Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-xs text-white tracking-wide">
                    {device.vehicleRegistration}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isMoving
                          ? 'bg-portal-accent animate-pulse'
                          : isIdle
                            ? 'bg-portal-orange'
                            : 'bg-portal-muted'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isMoving
                          ? 'text-portal-accent'
                          : isIdle
                            ? 'text-portal-orange'
                            : 'text-portal-muted'
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                </div>

                {/* Second Row: Driver Name */}
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-white truncate max-w-[170px]">
                    {device.staffName || 'Unassigned'}
                  </span>
                  <span className="font-mono text-xs font-bold text-portal-accent">
                    {typeof device.speed === 'number' ? `${device.speed.toFixed(1)} km/h` : '0.0 km/h'}
                  </span>
                </div>

                {/* Third Row: Branch & Last Report Time */}
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-portal-muted">
                  <span className="truncate max-w-[140px]">{device.branchName || 'No Branch'}</span>
                  <span>{formatRelativeTime(device.lastReportedAt)}</span>
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
  );
};
