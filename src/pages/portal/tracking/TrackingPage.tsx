import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  fleetApi,
  organisationApi,
  type DeviceLastPosition,
  type TraccarDeviceMetadata,
  type PositionHistoryPoint,
  type Branch,
} from '../../../api-client';
import { FlatDropdown, FlatButton } from '../../../components/flat-form';
import { useTraccarSocket, type TraccarMessage } from './hooks/useTraccarSocket';
import { TrackingMap, type MapTileMode } from './components/TrackingMap';
import { TrackingSidebar } from './components/TrackingSidebar';
import { VehicleTelemetryCard } from './components/VehicleTelemetryCard';
import toast from 'react-hot-toast';

export const TrackingPage: React.FC = () => {
  // ── Fleet & Map State ──────────────────────────────────────────────
  const [allDevices, setAllDevices] = useState<DeviceLastPosition[]>([]);
  const deviceMetadataRef = useRef<Map<number, TraccarDeviceMetadata>>(new Map());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceLastPosition | null>(null);
  const [trailPoints, setTrailPoints] = useState<PositionHistoryPoint[] | null>(null);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<number>(0);

  // ── View & Controls State ──────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tileMode, setTileMode] = useState<MapTileMode>('dark');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ── Load Branches ──────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const loadBranches = async () => {
      try {
        const list = await organisationApi.getBranches();
        if (isMounted) setBranches(list);
      } catch (err) {
        console.error('Failed to load branches for tracking filter:', err);
      }
    };
    loadBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Load vehicle/staff metadata once; live positions come from Traccar ──
  useEffect(() => {
    let isMounted = true;
    fleetApi.getTraccarDeviceMetadata()
      .then((metadata) => {
        if (!isMounted) return;
        deviceMetadataRef.current = new Map(metadata.map((item) => [item.traccarDeviceId, item]));
        setAllDevices((previous) => previous.map((device) => {
          const item = deviceMetadataRef.current.get(Number(device.deviceId));
          return item ? {
            ...device,
            backendDeviceId: item.backendDeviceId ?? device.backendDeviceId,
            deviceName: item.name || device.deviceName,
            vehicleId: item.vehicleId || device.vehicleId,
            vehicleRegistration: item.vehicleRegistration || device.vehicleRegistration,
            staffName: item.staffName ?? device.staffName,
            branchId: item.branchId ?? device.branchId,
            branchName: item.branchName ?? device.branchName,
            regionName: item.regionName ?? device.regionName,
            vehicleDisplayName: item.name || device.vehicleDisplayName,
          } : device;
        }));
        setSelectedDevice((selected) => {
          if (!selected) return selected;
          const item = deviceMetadataRef.current.get(Number(selected.deviceId));
          return item ? {
            ...selected,
            backendDeviceId: item.backendDeviceId ?? selected.backendDeviceId,
            deviceName: item.name || selected.deviceName,
            vehicleId: item.vehicleId || selected.vehicleId,
            vehicleRegistration: item.vehicleRegistration || selected.vehicleRegistration,
            staffName: item.staffName ?? selected.staffName,
            branchId: item.branchId ?? selected.branchId,
            branchName: item.branchName ?? selected.branchName,
            regionName: item.regionName ?? selected.regionName,
            vehicleDisplayName: item.name || selected.vehicleDisplayName,
          } : selected;
        });
      })
      .catch((err) => {
        console.error('Failed to load Traccar device metadata:', err);
        toast.error('Failed to load vehicle labels');
      });
    return () => { isMounted = false; };
  }, []);

  const handleTraccarMessage = useCallback((message: TraccarMessage) => {
    if (message.positions?.length) {
      setAllDevices((previous) => {
        const next = new Map(previous.map((device) => [Number(device.deviceId), device]));
        message.positions!.forEach((position) => {
          if (!position.valid) return;
          const metadata = deviceMetadataRef.current.get(position.deviceId);
          const existing = next.get(position.deviceId);
          const attributes = position.attributes || {};
          next.set(position.deviceId, {
            deviceId: String(position.deviceId),
            backendDeviceId: metadata?.backendDeviceId ?? existing?.backendDeviceId ?? null,
            deviceName: metadata?.name || existing?.deviceName || `Device ${position.deviceId}`,
            staffMemberId: null,
            staffName: metadata?.staffName ?? existing?.staffName ?? null,
            vehicleId: metadata?.vehicleId || existing?.vehicleId || String(position.deviceId),
            vehicleRegistration: metadata?.vehicleRegistration || existing?.vehicleRegistration || `Device ${position.deviceId}`,
            vehicleDisplayName: metadata?.name ?? existing?.vehicleDisplayName ?? null,
            branchId: metadata?.branchId ?? existing?.branchId ?? null,
            branchName: metadata?.branchName ?? existing?.branchName ?? null,
            regionName: metadata?.regionName ?? existing?.regionName ?? null,
            latitude: position.latitude,
            longitude: position.longitude,
            lastAddress: position.address ?? existing?.lastAddress ?? null,
            lastReportedAt: position.fixTime,
            speed: (Number(position.speed) || 0) * 1.852,
            course: position.course,
            ignition: typeof attributes.ignition === 'boolean' ? attributes.ignition : existing?.ignition ?? null,
            motion: typeof attributes.motion === 'boolean' ? attributes.motion : existing?.motion ?? false,
            batteryLevel: typeof attributes.batteryLevel === 'number' ? attributes.batteryLevel : existing?.batteryLevel ?? null,
            valid: position.valid,
          });
        });
        return Array.from(next.values());
      });
    }
    if (message.devices?.length) {
      setAllDevices((previous) => previous.map((device) => {
        const status = message.devices!.find((item) => item.id === Number(device.deviceId));
        return status ? { ...device, lastReportedAt: status.lastUpdate || device.lastReportedAt } : device;
      }));
    }
    setIsLoading(false);
    setFitBoundsTrigger((prev) => prev + 1);
  }, []);

  const { status: hubStatus, reconnect, lastEventTime } = useTraccarSocket(handleTraccarMessage);
  const devices = useMemo(
    () => selectedBranchId ? allDevices.filter((device) => device.branchId === selectedBranchId) : allDevices,
    [allDevices, selectedBranchId]
  );
  const loadPositions = useCallback(() => {
    setIsLoading(true);
    reconnect();
  }, [reconnect]);

  useEffect(() => {
    setSelectedDevice(null);
    setTrailPoints(null);
  }, [selectedBranchId]);

  // Branch dropdown options
  const branchOptions = useMemo(() => {
    return [
      { label: 'All Branches (Entire Fleet)', value: '' },
      ...branches.map((b) => ({ label: b.name, value: b.id })),
    ];
  }, [branches]);

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] md:h-[calc(100dvh-4.5rem)] -m-4 sm:-m-6 md:-m-8 overflow-hidden bg-portal-canvas select-none">
      {/* ── Top Telemetry Control & KPI Bar ─────────────────────────── */}
      <div className="shrink-0 bg-portal-surface border-b border-portal-border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-20">
        {/* Left: Title & Live Connection Status */}
        <div className="flex items-center gap-3">
          {/* Connection Status - Minimal, unbordered text with green/amber/red tint */}
          <div
            className={`flex items-center gap-1.5 text-[11px] font-semibold ${
              hubStatus === 'connected'
                ? 'text-portal-accent'
                : hubStatus === 'connecting' || hubStatus === 'reconnecting'
                  ? 'text-portal-orange'
                  : 'text-red-accent'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                hubStatus === 'connected'
                  ? 'bg-portal-accent animate-pulse'
                  : hubStatus === 'connecting' || hubStatus === 'reconnecting'
                    ? 'bg-portal-orange animate-ping'
                    : 'bg-red-accent'
              }`}
            />
            <span>
              {hubStatus === 'connected'
                ? 'Connected'
                : hubStatus === 'connecting'
                  ? 'Connecting...'
                  : hubStatus === 'reconnecting'
                    ? 'Reconnecting...'
                    : 'Disconnected'}
            </span>
            {hubStatus === 'disconnected' && (
              <button
                type="button"
                onClick={reconnect}
                className="ml-1 text-[10px] underline hover:text-white cursor-pointer"
              >
                Reconnect
              </button>
            )}
          </div>

          {lastEventTime && (
            <span className="hidden lg:inline text-[10px] text-portal-muted font-mono">
              Last signal: {lastEventTime.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Right: Branch Selector & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Branch Filter Dropdown */}
          <div className="w-48 sm:w-56">
            <FlatDropdown
              value={selectedBranchId || ''}
              onChange={(val) => setSelectedBranchId(val ? String(val) : null)}
              options={branchOptions}
              placeholder="All Branches"
              size="sm"
              variant="dark"
            />
          </div>

          {/* Fit Bounds Button */}
          <FlatButton
            variant="outline"
            size="sm"
            leftIcon={<i className="pi pi-arrows-alt text-xs" />}
            onClick={() => setFitBoundsTrigger((prev) => prev + 1)}
            title="Fit map to all reported vehicles"
            className="!h-[38px] px-2.5"
          >
            <span className="hidden md:inline">Fit All</span>
          </FlatButton>

          {/* Refresh Seed Button */}
          <FlatButton
            variant="outline"
            size="sm"
            leftIcon={<i className={`pi pi-refresh text-xs ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={loadPositions}
            title="Reload last known positions from database"
            className="!h-[38px] px-2.5"
          />

          <a
            href={import.meta.env.VITE_TRACKING_ENDPOINT || '#'}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Traccar"
            className="inline-flex items-center gap-1.5 h-[38px] px-2.5 text-xs font-medium text-portal-muted border border-portal-border rounded hover:text-white hover:border-portal-accent hover:bg-white/5 transition-colors"
          >
            <i className="pi pi-external-link text-xs" />
            <span className="hidden md:inline">Traccar</span>
          </a>
        </div>
      </div>

      {/* ── Main Viewport: Sidebar + Map ─────────────────────────────── */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Collapsible Fleet List Sidebar */}
        <TrackingSidebar
          devices={devices}
          selectedDevice={selectedDevice}
          onSelectDevice={(device) => {
            setSelectedDevice(device);
            // Clear prior trail points when switching vehicles
            if (selectedDevice?.deviceId !== device.deviceId) {
              setTrailPoints(null);
            }
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Main Map Container */}
        <div className="flex-1 relative h-full w-full overflow-hidden">
          <TrackingMap
            devices={devices}
            selectedDevice={selectedDevice}
            onSelectDevice={(device) => {
              setSelectedDevice(device);
              if (selectedDevice?.deviceId !== device.deviceId) {
                setTrailPoints(null);
              }
            }}
            trailPoints={trailPoints}
            trailVehicleName={selectedDevice?.vehicleRegistration}
            fitBoundsTrigger={fitBoundsTrigger}
            tileMode={tileMode}
            onToggleTileMode={() =>
              setTileMode((prev) => (prev === 'dark' ? 'street' : 'dark'))
            }
          />

          {/* Floating Vehicle Telemetry Inspection Drawer */}
          {selectedDevice && (
            <VehicleTelemetryCard
              device={selectedDevice}
              onClose={() => {
                setSelectedDevice(null);
                setTrailPoints(null);
              }}
              onFocus={() => {
                // Re-trigger flyTo by updating state reference
                setSelectedDevice({ ...selectedDevice });
              }}
              onTrailLoaded={setTrailPoints}
              hasActiveTrail={Boolean(trailPoints && trailPoints.length > 0)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
