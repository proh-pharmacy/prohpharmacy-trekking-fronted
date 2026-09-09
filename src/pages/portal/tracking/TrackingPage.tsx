import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fleetApi,
  organisationApi,
  type DeviceLastPosition,
  type PositionUpdateEvent,
  type PositionHistoryPoint,
  type Branch,
} from '../../../api-client';
import { FlatDropdown, FlatButton } from '../../../components/flat-form';
import { useTrackingHub } from './hooks/useTrackingHub';
import { TrackingMap, type MapTileMode } from './components/TrackingMap';
import { TrackingSidebar } from './components/TrackingSidebar';
import { VehicleTelemetryCard } from './components/VehicleTelemetryCard';
import { getVehicleStatus } from './components/VehicleMarkerIcon';
import toast from 'react-hot-toast';

export const TrackingPage: React.FC = () => {
  // ── Fleet & Map State ──────────────────────────────────────────────
  const [devices, setDevices] = useState<DeviceLastPosition[]>([]);
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

  // ── Seed Positions from REST Endpoint ──────────────────────────────
  const loadPositions = useCallback(async (branchId?: string | null) => {
    try {
      setIsLoading(true);
      const data = await fleetApi.getPositions(branchId || undefined);
      setDevices(data);
      // Trigger auto-fit to visible vehicles after initial load
      setFitBoundsTrigger((prev) => prev + 1);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load fleet positions';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reload when selected branch changes
  useEffect(() => {
    loadPositions(selectedBranchId);
    // Deselect active trail and vehicle if branch changed
    setSelectedDevice(null);
    setTrailPoints(null);
  }, [selectedBranchId, loadPositions]);

  // ── Real-Time SignalR Updates ──────────────────────────────────────
  const handlePositionUpdated = useCallback((event: PositionUpdateEvent) => {
    if (!event.valid) return; // Skip bad GPS fixes per doc

    setDevices((prev) => {
      const index = prev.findIndex((d) => d.deviceId === event.deviceId);
      const updatedItem: DeviceLastPosition = {
        deviceId: event.deviceId,
        deviceName:
          prev[index]?.deviceName ||
          `${event.staffName || 'Driver'} - ${event.vehicleRegistration}`,
        staffMemberId: event.staffMemberId,
        staffName: event.staffName,
        vehicleId: event.vehicleId,
        vehicleRegistration: event.vehicleRegistration,
        vehicleDisplayName: prev[index]?.vehicleDisplayName,
        branchId: event.branchId,
        branchName: event.branchName,
        latitude: event.latitude,
        longitude: event.longitude,
        lastAddress: event.address ?? prev[index]?.lastAddress ?? null,
        lastReportedAt: event.fixTime,
        speed: event.speed,
        course: event.course,
        ignition: event.ignition,
        motion: event.motion,
        batteryLevel: event.batteryLevel,
        valid: event.valid,
      };

      if (index >= 0) {
        const next = [...prev];
        next[index] = updatedItem;
        return next;
      } else {
        // First report for this device in current session
        return [...prev, updatedItem];
      }
    });

    // Also update selectedDevice live if it is the currently inspected one
    setSelectedDevice((prevSelected) => {
      if (prevSelected && prevSelected.deviceId === event.deviceId) {
        return {
          ...prevSelected,
          latitude: event.latitude,
          longitude: event.longitude,
          speed: event.speed,
          course: event.course,
          ignition: event.ignition,
          motion: event.motion,
          batteryLevel: event.batteryLevel,
          lastAddress: event.address ?? prevSelected.lastAddress,
          lastReportedAt: event.fixTime,
          valid: event.valid,
        };
      }
      return prevSelected;
    });
  }, []);

  // Hook up SignalR tracking hub
  const { status: hubStatus, reconnect, lastEventTime } = useTrackingHub({
    branchId: selectedBranchId,
    onPositionUpdated: handlePositionUpdated,
  });

  // KPI telemetry calculations
  const telemetrySummary = useMemo(() => {
    let moving = 0;
    let idling = 0;
    let stopped = 0;

    devices.forEach((d) => {
      const s = getVehicleStatus(d.ignition, d.motion, d.speed);
      if (s === 'moving') moving++;
      else if (s === 'idling') idling++;
      else stopped++;
    });

    return { total: devices.length, moving, idling, stopped };
  }, [devices]);

  // Branch dropdown options
  const branchOptions = useMemo(() => {
    return [
      { label: 'All Branches (Entire Fleet)', value: '' },
      ...branches.map((b) => ({ label: b.name, value: b.id })),
    ];
  }, [branches]);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-[calc(100vh-4.5rem)] -m-4 sm:-m-6 md:-m-8 overflow-hidden bg-portal-canvas select-none">
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

        {/* Center: Live KPI Counters */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-portal-canvas rounded border border-portal-border text-xs">
            <span className="text-portal-muted text-[10px] uppercase font-medium">Total</span>
            <span className="font-mono font-bold text-white">{telemetrySummary.total}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-portal-canvas rounded border border-portal-border text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-portal-accent" />
            <span className="text-portal-muted text-[10px] uppercase font-medium">Moving</span>
            <span className="font-mono font-bold text-portal-accent">{telemetrySummary.moving}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-portal-canvas rounded border border-portal-border text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-portal-orange" />
            <span className="text-portal-muted text-[10px] uppercase font-medium">Idle</span>
            <span className="font-mono font-bold text-portal-orange">{telemetrySummary.idling}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-portal-canvas rounded border border-portal-border text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-portal-muted" />
            <span className="text-portal-muted text-[10px] uppercase font-medium">Off</span>
            <span className="font-mono font-bold text-portal-muted">{telemetrySummary.stopped}</span>
          </div>
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
            onClick={() => loadPositions(selectedBranchId)}
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
