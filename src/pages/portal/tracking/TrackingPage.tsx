import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fleetApi,
  type DeviceLastPosition,
  type TraccarDeviceMetadata,
  type PositionHistoryPoint,
  type Vehicle,
} from '../../../api-client';
import { FlatButton } from '../../../components/flat-form';
import { useTraccarSocket, type TraccarMessage } from './hooks/useTraccarSocket';
import { TrackingMap, type MapTileMode } from './components/TrackingMap';
import { TrackingSidebar } from './components/TrackingSidebar';
import { VehicleTelemetryCard } from './components/VehicleTelemetryCard';
import toast from 'react-hot-toast';

const normaliseBackendDeviceId = (value: string | null | undefined) => value?.toLowerCase() ?? '';

const getVehiclesFromResponse = (response: any): Vehicle[] => (
  Array.isArray(response) ? response : (response?.data ?? response?.items ?? [])
);

const loadAllFleetVehicles = async (): Promise<Vehicle[]> => {
  const pageSize = 100;
  const firstResponse = await fleetApi.getVehicles({ pageNumber: 1, pageSize });
  const firstPage = getVehiclesFromResponse(firstResponse);

  // Some backend versions return an unpaginated array when pagination is not
  // applied. The documented contract returns PaginatedData<VehicleResponse>.
  if (Array.isArray(firstResponse)) return firstPage;

  const totalPages = Math.max(1, Number(firstResponse?.totalPages) || 1);
  if (totalPages === 1) return firstPage;

  const remainingResponses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => (
      fleetApi.getVehicles({ pageNumber: index + 2, pageSize })
    )),
  );

  return [
    ...firstPage,
    ...remainingResponses.flatMap(getVehiclesFromResponse),
  ];
};

interface TrackingDeviceMetadata extends TraccarDeviceMetadata {
  vehicleDisplayName: string | null;
  regionName: string | null;
  branchId: string | null;
  branchName: string | null;
}

export const TrackingPage: React.FC = () => {
  // ── Fleet & Map State ──────────────────────────────────────────────
  const [allDevices, setAllDevices] = useState<DeviceLastPosition[]>([]);
  const deviceMetadataRef = useRef<Map<number, TrackingDeviceMetadata>>(new Map());
  const hasAutoFittedRef = useRef(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceLastPosition | null>(null);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [trailPoints, setTrailPoints] = useState<PositionHistoryPoint[] | null>(null);
  const [trailVehicleName, setTrailVehicleName] = useState<string | null>(null);
  const [trailDeviceId, setTrailDeviceId] = useState<string | null>(null);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<number>(0);

  // ── View & Controls State ──────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  );
  const [tileMode, setTileMode] = useState<MapTileMode>('street');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMetadataReady, setIsMetadataReady] = useState(false);

  // Load backend labels before opening the direct Traccar socket. Traccar owns
  // live positions; the backend owns vehicle, branch and region metadata.
  const loadTrackingMetadata = useCallback(async () => {
    setIsLoading(true);
    setIsMetadataReady(false);

    try {
      const [metadataResult, vehiclesResult] = await Promise.allSettled([
        fleetApi.getTraccarDeviceMetadata(),
        loadAllFleetVehicles(),
      ]);

      if (metadataResult.status === 'rejected') throw metadataResult.reason;

      const metadata = metadataResult.value;
      if (vehiclesResult.status === 'rejected') {
        console.error('Failed to load fleet vehicle metadata:', vehiclesResult.reason);
      }

      const vehicles = vehiclesResult.status === 'fulfilled' ? vehiclesResult.value : [];
      const vehiclesById = new Map(
        vehicles.map((vehicle) => [normaliseBackendDeviceId(vehicle.id), vehicle]),
      );

      const enrichedMetadata = metadata.map((item): TrackingDeviceMetadata => {
        const vehicle = vehiclesById.get(normaliseBackendDeviceId(item.vehicleId));
        return {
          ...item,
          vehicleRegistration: vehicle?.registrationNumber || item.vehicleRegistration,
          vehicleDisplayName: vehicle?.displayName ?? null,
          regionName: vehicle?.regionName ?? null,
          branchId: vehicle?.branchId ?? null,
          branchName: vehicle?.branchName ?? null,
        };
      });

      deviceMetadataRef.current = new Map(
        enrichedMetadata.map((item) => [item.traccarDeviceId, item]),
      );
      setAllDevices((previous) => previous.map((device) => {
        const item = deviceMetadataRef.current.get(Number(device.deviceId));
        if (!item) return device;
        return {
          ...device,
          backendDeviceId: item.backendDeviceId ?? device.backendDeviceId,
          deviceName: item.name || device.deviceName,
          staffName: item.staffName ?? device.staffName,
          vehicleId: item.vehicleId || device.vehicleId,
          vehicleRegistration: item.vehicleRegistration || device.vehicleRegistration,
          vehicleDisplayName: item.vehicleDisplayName ?? device.vehicleDisplayName,
          regionName: item.regionName ?? device.regionName,
          branchId: item.branchId ?? device.branchId,
          branchName: item.branchName ?? device.branchName,
        };
      }));
      setSelectedDevice((selected) => {
        if (!selected) return null;
        const item = deviceMetadataRef.current.get(Number(selected.deviceId));
        if (!item) return selected;
        return {
          ...selected,
          backendDeviceId: item.backendDeviceId ?? selected.backendDeviceId,
          deviceName: item.name || selected.deviceName,
          staffName: item.staffName ?? selected.staffName,
          vehicleId: item.vehicleId || selected.vehicleId,
          vehicleRegistration: item.vehicleRegistration || selected.vehicleRegistration,
          vehicleDisplayName: item.vehicleDisplayName ?? selected.vehicleDisplayName,
          regionName: item.regionName ?? selected.regionName,
          branchId: item.branchId ?? selected.branchId,
          branchName: item.branchName ?? selected.branchName,
        };
      });
    } catch (error) {
      console.error('Failed to load tracking metadata:', error);
      toast.error('Failed to load vehicle labels');
    } finally {
      // Live Traccar positions must remain available even if label enrichment
      // fails; unlinked devices use a neutral Device <id> fallback.
      setIsMetadataReady(true);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrackingMetadata();
  }, [loadTrackingMetadata]);

  const handleTraccarMessage = useCallback((message: TraccarMessage) => {
    if (message.positions?.length) {
      // Fit the map once when the first live positions arrive. Re-fitting on
      // every socket update causes the map to animate continuously while a
      // device is selected and its telemetry panel is open.
      if (!hasAutoFittedRef.current) {
        hasAutoFittedRef.current = true;
        setFitBoundsTrigger((prev) => prev + 1);
      }
      setAllDevices((previous) => {
        const next = new Map(previous.map((device) => [device.deviceId, device]));
        message.positions!.forEach((position) => {
          if (!position.valid) return;
          const metadata = deviceMetadataRef.current.get(position.deviceId);
          const deviceId = String(position.deviceId);
          const existing = next.get(deviceId);
          const attributes = position.attributes || {};
          next.set(deviceId, {
            deviceId,
            backendDeviceId: metadata?.backendDeviceId ?? existing?.backendDeviceId ?? null,
            deviceName: metadata?.name || existing?.deviceName || `Device ${position.deviceId}`,
            staffMemberId: existing?.staffMemberId ?? null,
            staffName: metadata?.staffName ?? existing?.staffName ?? null,
            vehicleId: metadata?.vehicleId || existing?.vehicleId || String(position.deviceId),
            vehicleRegistration: metadata?.vehicleRegistration || existing?.vehicleRegistration || `Device ${position.deviceId}`,
            vehicleDisplayName: metadata?.vehicleDisplayName ?? existing?.vehicleDisplayName ?? null,
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
      setSelectedDevice((selected) => {
        if (!selected) return null;
        const position = message.positions!.find((item) => String(item.deviceId) === selected.deviceId);
        if (!position?.valid) return selected;
        const attributes = position.attributes || {};
        return {
          ...selected,
          latitude: position.latitude,
          longitude: position.longitude,
          lastAddress: position.address ?? selected.lastAddress,
          lastReportedAt: position.fixTime,
          speed: (Number(position.speed) || 0) * 1.852,
          course: position.course,
          ignition: typeof attributes.ignition === 'boolean' ? attributes.ignition : selected.ignition,
          motion: typeof attributes.motion === 'boolean' ? attributes.motion : selected.motion,
          batteryLevel: typeof attributes.batteryLevel === 'number' ? attributes.batteryLevel : selected.batteryLevel,
          valid: position.valid,
        };
      });
    }
    if (message.devices?.length) {
      setAllDevices((previous) => previous.map((device) => {
        const status = message.devices!.find((item) => item.id === Number(device.deviceId));
        return status ? { ...device, lastReportedAt: status.lastUpdate || device.lastReportedAt } : device;
      }));
    }
    setIsLoading(false);
  }, []);

  const { status: hubStatus, reconnect, lastEventTime } = useTraccarSocket(
    handleTraccarMessage,
    isMetadataReady,
  );
  const devices = allDevices;

  const loadPositions = useCallback(() => {
    void loadTrackingMetadata();
  }, [loadTrackingMetadata]);

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] md:h-[calc(100dvh-4.5rem)] -m-4 sm:-m-6 md:-m-8 overflow-hidden bg-portal-canvas select-none">
      {/* ── Top Telemetry Control & KPI Bar ─────────────────────────── */}
      <div className="shrink-0 bg-portal-surface border-b border-portal-border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-20">
        {/* Left: Title & Live Connection Status */}
        <div className="flex items-center gap-3">
          {/* Connection Status - Minimal, unbordered text with green/amber/red tint */}
          <div
            className={`flex items-center text-[11px] font-semibold ${
              hubStatus === 'connected'
                ? 'text-portal-accent'
                : hubStatus === 'connecting' || hubStatus === 'reconnecting'
                  ? 'text-portal-orange'
                  : 'text-red-accent'
            }`}
          >
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
                className="ml-1 text-[10px] underline hover:text-portal-heading cursor-pointer"
              >
                Reconnect
              </button>
            )}
          </div>

          {lastEventTime && (
            <span className="hidden lg:inline text-[10px] text-portal-muted font-mono">
              Last signal: {lastEventTime.toLocaleTimeString()} · Fleets ({devices.length})
            </span>
          )}
        </div>

        {/* Right: Branch Selector & Action Buttons */}
        <div className="flex items-center gap-2">
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
            className="inline-flex items-center gap-1.5 h-[38px] px-2.5 text-xs font-medium text-portal-muted border border-portal-border rounded hover:text-portal-heading hover:bg-portal-hover transition-colors"
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
            const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
            setIsTelemetryOpen(!isMobile);
            if (isMobile) setSidebarCollapsed(true);
            // Clear prior trail points when switching vehicles
            if (trailDeviceId && trailDeviceId !== device.deviceId) {
              setTrailPoints(null);
              setTrailVehicleName(null);
              setTrailDeviceId(null);
            }
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        {/* Main Map Container */}
        <div className="flex-1 relative h-full w-full overflow-hidden">
          <TrackingMap
            devices={devices}
            selectedDevice={selectedDevice}
            onSelectDevice={(device) => {
              setSelectedDevice(device);
              setIsTelemetryOpen(true);
              if (trailDeviceId && trailDeviceId !== device.deviceId) {
                setTrailPoints(null);
                setTrailVehicleName(null);
                setTrailDeviceId(null);
              }
            }}
            trailPoints={trailPoints}
            trailVehicleName={trailVehicleName}
            fitBoundsTrigger={fitBoundsTrigger}
            tileMode={tileMode}
            onToggleTileMode={() =>
              setTileMode((prev) => (prev === 'dark' ? 'street' : 'dark'))
            }
          />

          {/* Floating Vehicle Telemetry Inspection Drawer */}
          {selectedDevice && isTelemetryOpen && (
            <VehicleTelemetryCard
              device={selectedDevice}
              onClose={() => {
                setSelectedDevice(null);
                setIsTelemetryOpen(false);
              }}
              onTrailLoaded={(points) => {
                setTrailPoints(points);
                if (points) {
                  setTrailDeviceId(selectedDevice.deviceId);
                  setTrailVehicleName(
                    selectedDevice.vehicleDisplayName ||
                      selectedDevice.vehicleRegistration ||
                      selectedDevice.deviceName ||
                      null,
                  );
                } else {
                  setTrailVehicleName(null);
                  setTrailDeviceId(null);
                }
              }}
              hasActiveTrail={Boolean(trailPoints && trailPoints.length > 0)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
