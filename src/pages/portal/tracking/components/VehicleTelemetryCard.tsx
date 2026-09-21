import React, { useState } from 'react';
import {
  fleetApi,
  type DeviceLastPosition,
  type DeviceLivePosition,
  type PositionHistoryPoint,
} from '../../../../api-client';
import { getVehicleStatus } from './VehicleMarkerIcon';
import toast from 'react-hot-toast';

interface VehicleTelemetryCardProps {
  device: DeviceLastPosition;
  onClose: () => void;
  onTrailLoaded: (points: PositionHistoryPoint[] | null) => void;
  hasActiveTrail: boolean;
}

type TrailPreset = '1h' | '6h' | 'today' | '24h';

export const VehicleTelemetryCard: React.FC<VehicleTelemetryCardProps> = ({
  device,
  onClose,
  onTrailLoaded,
  hasActiveTrail,
}) => {
  const [isRefreshingLive, setIsRefreshingLive] = useState(false);
  const [liveOverride, setLiveOverride] = useState<DeviceLivePosition | null>(null);
  const [isLoadingTrail, setIsLoadingTrail] = useState(false);
  const [trailPreset, setTrailPreset] = useState<TrailPreset>('today');
  const [trailPointCount, setTrailPointCount] = useState<number | null>(null);

  // Merged position data (live Traccar fetch takes precedence over cached position)
  const currentSpeed = liveOverride?.speed ?? device.speed ?? 0;
  const currentIgnition = liveOverride?.ignition ?? device.ignition;
  const currentMotion = liveOverride?.motion ?? device.motion;
  const currentBattery = liveOverride?.batteryLevel ?? device.batteryLevel;
  const currentAddress = liveOverride?.address ?? device.lastAddress;
  const lastReportTime = liveOverride?.fixTime ?? device.lastReportedAt;

  const status = getVehicleStatus(currentIgnition, currentMotion, currentSpeed);

  // Fetch live direct Traccar position
  const handleRefreshLive = async () => {
    if (!device.backendDeviceId) {
      toast.error('Backend device link is not available for this vehicle');
      return;
    }
    try {
      setIsRefreshingLive(true);
      const live = await fleetApi.getDeviceLivePosition(device.backendDeviceId);
      setLiveOverride(live);
      toast.success('Live Traccar position received');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to ping live device position';
      toast.error(msg);
    } finally {
      setIsRefreshingLive(false);
    }
  };

  // Fetch historical GPS trail
  const handleFetchTrail = async (preset: TrailPreset = trailPreset) => {
    if (!device.backendDeviceId) {
      toast.error('Backend device link is not available for this vehicle');
      return;
    }
    try {
      setIsLoadingTrail(true);
      setTrailPreset(preset);

      const now = new Date();
      let from: Date;

      if (preset === '1h') {
        from = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      } else if (preset === '6h') {
        from = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      } else if (preset === '24h') {
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else {
        // Today from midnight UTC
        from = new Date();
        from.setUTCHours(0, 0, 0, 0);
      }

      const history = await fleetApi.getDevicePositionHistory(
        device.backendDeviceId,
        from.toISOString(),
        now.toISOString()
      );

      const validPoints = history.filter((p) => p.valid);
      setTrailPointCount(validPoints.length);
      onTrailLoaded(validPoints);

      if (validPoints.length === 0) {
        toast('No GPS points recorded for this timeframe', { icon: 'ℹ️' });
      } else {
        toast.success(`Loaded ${validPoints.length} GPS trail points`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load route history';
      toast.error(msg);
    } finally {
      setIsLoadingTrail(false);
    }
  };

  const handleClearTrail = () => {
    setTrailPointCount(null);
    onTrailLoaded(null);
  };

  const formatRelativeTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Never';
    const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
    if (diffSeconds < 60) return 'Just now';
    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="absolute top-4 left-4 z-[999] w-[calc(100%-2rem)] sm:w-96 bg-portal-surface/80 border border-portal-border rounded shadow-2xl backdrop-blur-xl overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="p-3.5 bg-transparent border-b border-portal-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-white tracking-wide">
                {device.vehicleDisplayName || device.deviceName}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClose}
            title="Close panel"
            className="w-7 h-7 rounded flex items-center justify-center text-portal-text hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
          >
            <i className="pi pi-times text-xs" />
          </button>
        </div>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="p-3.5 space-y-3 text-xs">
        {/* Top 3 KPI blocks: Speed, Engine, Battery */}
        <div className="grid grid-cols-3 gap-2">
          {/* Speed */}
          <div className="bg-portal-canvas/55 p-2 rounded border border-portal-border/60">
            <span className="text-[10px] font-medium text-portal-muted uppercase block">Speed</span>
            <span className="font-mono font-bold text-sm text-portal-accent block mt-0.5">
              {currentSpeed.toFixed(1)}{' '}
              <span className="text-[10px] font-normal text-portal-text">km/h</span>
            </span>
          </div>

          {/* Ignition / Engine */}
          <div className="bg-portal-canvas/55 p-2 rounded border border-portal-border/60">
            <span className="text-[10px] font-medium text-portal-muted uppercase block">Ignition</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <i
                className={`pi pi-power-off text-xs ${
                  currentIgnition ? 'text-portal-accent' : 'text-portal-muted'
                }`}
              />
              <span
                className={`font-semibold text-xs ${
                  currentIgnition ? 'text-white' : 'text-portal-muted'
                }`}
              >
                {currentIgnition ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Battery */}
          <div className="bg-portal-canvas/55 p-2 rounded border border-portal-border/60">
            <span className="text-[10px] font-medium text-portal-muted uppercase block">Battery</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <i
                className={`pi ${
                  (currentBattery ?? 100) > 50
                    ? 'pi-bolt text-portal-accent'
                    : (currentBattery ?? 100) > 20
                      ? 'pi-bolt text-portal-orange'
                      : 'pi-exclamation-circle text-red-accent'
                } text-xs`}
              />
              <span className="font-mono font-bold text-xs text-white">
                {currentBattery !== null && currentBattery !== undefined
                  ? `${currentBattery.toFixed(0)}%`
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Last update and location */}
        <div className="flex items-center justify-between gap-3 text-[11px] text-portal-muted">
          <span className="flex items-center gap-1.5 min-w-0">
            <i className="pi pi-clock text-[10px]" />
            <span>Last update {formatRelativeTime(lastReportTime)}</span>
          </span>
          {currentAddress && (
            <span className="truncate text-right" title={currentAddress}>
              {currentAddress}
            </span>
          )}
        </div>

        {/* Action: Direct Traccar Ping */}
        <button
          type="button"
          onClick={handleRefreshLive}
          disabled={isRefreshingLive}
          className="w-full py-2 px-3 bg-white/[0.08] hover:bg-white/[0.14] text-white border border-portal-border text-xs font-bold uppercase tracking-wider rounded transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <i className={`pi pi-sync text-xs ${isRefreshingLive ? 'animate-spin' : ''}`} />
          {isRefreshingLive ? 'Pinging Traccar...' : 'Ping Live Position'}
        </button>

        {/* Route Trail History Section */}
        <div className="pt-2 border-t border-portal-border/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-normal text-portal-muted flex items-center gap-1.5">
              Route History Trail
            </span>
            {hasActiveTrail && (
              <button
                type="button"
                onClick={handleClearTrail}
                className="text-[10px] font-semibold text-red-accent hover:underline cursor-pointer"
              >
                Clear Trail
              </button>
            )}
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            {(
              [
                { id: '1h', label: '1h' },
                { id: '6h', label: '6h' },
                { id: 'today', label: 'Today' },
                { id: '24h', label: '24h' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTrailPreset(p.id)}
                className={`py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                  trailPreset === p.id
                    ? 'bg-portal-accent/20 text-portal-accent border border-portal-accent'
                    : 'bg-portal-canvas/40 hover:bg-white/[0.08] text-portal-muted border border-portal-border/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Load Trail Button */}
          <button
            type="button"
            onClick={() => handleFetchTrail()}
            disabled={isLoadingTrail}
            className="w-full py-2 px-3 bg-white/[0.08] hover:bg-white/[0.14] text-white border border-portal-border text-xs font-bold uppercase tracking-wider rounded transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <i className={`pi pi-map text-xs ${isLoadingTrail ? 'animate-spin' : ''}`} />
            {isLoadingTrail ? 'Loading Trail...' : 'Draw Route Trail'}
          </button>

          {trailPointCount !== null && (
            <div className="mt-1.5 text-center text-[10px] text-portal-muted font-mono">
              {trailPointCount} GPS points on route
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
