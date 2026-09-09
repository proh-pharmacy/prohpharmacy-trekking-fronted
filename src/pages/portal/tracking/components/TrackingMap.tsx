import React, { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  type DeviceLastPosition,
  type PositionHistoryPoint,
} from '../../../../api-client';
import {
  createVehicleMarkerIcon,
  getVehicleStatus,
} from './VehicleMarkerIcon';

export type MapTileMode = 'dark' | 'street';

interface TrackingMapProps {
  devices: DeviceLastPosition[];
  selectedDevice: DeviceLastPosition | null;
  onSelectDevice: (device: DeviceLastPosition) => void;
  trailPoints?: PositionHistoryPoint[] | null;
  trailVehicleName?: string | null;
  fitBoundsTrigger?: number;
  tileMode?: MapTileMode;
  onToggleTileMode?: () => void;
}

// MapController manages programmatic pan/zoom and fitting bounds
const MapController: React.FC<{
  devices: DeviceLastPosition[];
  selectedDevice: DeviceLastPosition | null;
  fitBoundsTrigger?: number;
}> = ({ devices, selectedDevice, fitBoundsTrigger }) => {
  const map = useMap();
  const prevTriggerRef = useRef<number | undefined>(fitBoundsTrigger);
  const prevSelectedRef = useRef<string | null>(null);

  // Invalidate map size to prevent gray tiles on container resize
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  // Fit bounds when trigger changes
  useEffect(() => {
    if (fitBoundsTrigger !== undefined && fitBoundsTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = fitBoundsTrigger;
      const validPoints = devices
        .filter((d) => typeof d.latitude === 'number' && typeof d.longitude === 'number' && !isNaN(d.latitude) && !isNaN(d.longitude))
        .map((d) => [d.latitude, d.longitude] as [number, number]);

      if (validPoints.length === 1) {
        map.flyTo(validPoints[0], 14, { animate: true, duration: 1 });
      } else if (validPoints.length > 1) {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true });
      }
    }
  }, [fitBoundsTrigger, devices, map]);

  // Smooth flyTo when selectedDevice changes
  useEffect(() => {
    if (selectedDevice && selectedDevice.deviceId !== prevSelectedRef.current) {
      prevSelectedRef.current = selectedDevice.deviceId;
      if (
        typeof selectedDevice.latitude === 'number' &&
        typeof selectedDevice.longitude === 'number' &&
        !isNaN(selectedDevice.latitude) &&
        !isNaN(selectedDevice.longitude)
      ) {
        map.flyTo([selectedDevice.latitude, selectedDevice.longitude], 15, {
          animate: true,
          duration: 1.2,
        });
      }
    } else if (!selectedDevice) {
      prevSelectedRef.current = null;
    }
  }, [selectedDevice, map]);

  return null;
};

export const TrackingMap: React.FC<TrackingMapProps> = ({
  devices,
  selectedDevice,
  onSelectDevice,
  trailPoints,
  trailVehicleName,
  fitBoundsTrigger,
  tileMode = 'dark',
  onToggleTileMode,
}) => {
  // Center of Ghana
  const defaultCenter: [number, number] = [7.9465, -1.0232];
  const defaultZoom = 7;

  // Check for optional CARTO API Key
  const cartoApiKey = (import.meta as any).env?.VITE_CARTO_API_KEY;

  // Smart tile layer configuration (uses CARTO Dark Matter if API key provided, otherwise clean OpenStreetMap)
  const tileConfig = React.useMemo(() => {
    if (cartoApiKey && tileMode === 'dark') {
      return {
        url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${cartoApiKey}`,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        className: '',
      };
    }
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: 'abc',
      maxZoom: 19,
      className: tileMode === 'dark' ? 'dark-tiles' : '',
    };
  }, [tileMode, cartoApiKey]);

  // Convert trail points to latlng pairs
  const polylineCoords: [number, number][] = (trailPoints || [])
    .filter((p) => p.valid && typeof p.latitude === 'number' && typeof p.longitude === 'number')
    .map((p) => [p.latitude, p.longitude]);

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-portal-canvas select-none">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          key={`${tileMode}-${Boolean(cartoApiKey)}`}
          url={tileConfig.url}
          attribution={tileConfig.attribution}
          subdomains={tileConfig.subdomains}
          maxZoom={tileConfig.maxZoom}
          className={tileConfig.className}
        />

        <MapController
          devices={devices}
          selectedDevice={selectedDevice}
          fitBoundsTrigger={fitBoundsTrigger}
        />

        {/* GPS Breadcrumb Polyline Route Trail */}
        {polylineCoords.length > 1 && (
          <>
            <Polyline
              positions={polylineCoords}
              pathOptions={{
                color: '#41cc84',
                weight: 4,
                opacity: 0.85,
                lineJoin: 'round',
                lineCap: 'round',
                dashArray: undefined,
              }}
            />
            {/* Start point marker */}
            <CircleMarker
              center={polylineCoords[0]}
              radius={6}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                fillColor: '#38b273',
                fillOpacity: 1,
              }}
            >
              <Popup>
                <div className="p-2 text-xs">
                  <div className="font-bold text-portal-accent uppercase tracking-wider text-[11px]">Route Origin</div>
                  <div className="text-white font-mono mt-1">{trailVehicleName || 'Vehicle'}</div>
                  <div className="text-portal-muted text-[10px] mt-0.5">
                    {trailPoints?.[0]?.fixTime ? new Date(trailPoints[0].fixTime).toLocaleTimeString() : ''}
                  </div>
                </div>
              </Popup>
            </CircleMarker>

            {/* End point marker */}
            <CircleMarker
              center={polylineCoords[polylineCoords.length - 1]}
              radius={6}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                fillColor: '#de2512',
                fillOpacity: 1,
              }}
            >
              <Popup>
                <div className="p-2 text-xs">
                  <div className="font-bold text-red-400 uppercase tracking-wider text-[11px]">Latest Point</div>
                  <div className="text-white font-mono mt-1">{trailVehicleName || 'Vehicle'}</div>
                  <div className="text-portal-muted text-[10px] mt-0.5">
                    {trailPoints?.[trailPoints.length - 1]?.fixTime
                      ? new Date(trailPoints[trailPoints.length - 1].fixTime).toLocaleTimeString()
                      : ''}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          </>
        )}

        {/* Vehicle Markers */}
        {devices.map((device) => {
          if (
            typeof device.latitude !== 'number' ||
            typeof device.longitude !== 'number' ||
            isNaN(device.latitude) ||
            isNaN(device.longitude)
          ) {
            return null;
          }

          const isSelected = selectedDevice?.deviceId === device.deviceId;
          const status = getVehicleStatus(device.ignition, device.motion, device.speed);
          const icon = createVehicleMarkerIcon({
            ignition: device.ignition,
            motion: device.motion,
            speed: device.speed,
            course: device.course,
            isSelected,
            registrationNumber: device.vehicleRegistration,
          });

          return (
            <Marker
              key={device.deviceId}
              position={[device.latitude, device.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectDevice(device),
              }}
            >
              <Popup className="portal-map-popup">
                <div className="p-3 w-64 text-left">
                  {/* Header: Status & Plate */}
                  <div className="flex items-center justify-between border-b border-portal-border/60 pb-2 mb-2">
                    <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                      {device.vehicleRegistration}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${
                        status === 'moving'
                          ? 'bg-portal-accent/20 text-portal-accent'
                          : status === 'idling'
                            ? 'bg-portal-orange/20 text-portal-orange'
                            : 'bg-portal-surface text-portal-muted border border-portal-border'
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  {/* Driver & Branch */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-portal-text">
                      <span className="text-portal-muted text-[11px] uppercase font-medium">Driver</span>
                      <span className="font-semibold text-white truncate max-w-[140px]">
                        {device.staffName || 'Unassigned'}
                      </span>
                    </div>
                    {device.branchName && (
                      <div className="flex items-center justify-between text-portal-text">
                        <span className="text-portal-muted text-[11px] uppercase font-medium">Branch</span>
                        <span className="text-portal-text truncate max-w-[140px]">{device.branchName}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-portal-text">
                      <span className="text-portal-muted text-[11px] uppercase font-medium">Speed</span>
                      <span className="font-mono font-bold text-portal-accent">
                        {typeof device.speed === 'number' ? `${device.speed.toFixed(1)} km/h` : '0.0 km/h'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-portal-text">
                      <span className="text-portal-muted text-[11px] uppercase font-medium">Ignition</span>
                      <span className={device.ignition ? 'text-portal-accent font-semibold' : 'text-portal-muted'}>
                        {device.ignition ? 'Engine ON' : 'Engine OFF'}
                      </span>
                    </div>
                    {device.lastAddress && (
                      <div className="pt-1.5 border-t border-portal-border/40 text-[11px] text-portal-muted leading-tight line-clamp-2">
                        {device.lastAddress}
                      </div>
                    )}
                  </div>

                  {/* Inspect CTA */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDevice(device);
                    }}
                    className="mt-3 w-full py-1.5 px-2 bg-portal-surface hover:bg-white/[0.08] text-portal-accent hover:text-white border border-portal-border text-[11px] font-bold uppercase tracking-wider rounded transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <i className="pi pi-compass text-xs" />
                    Inspect Telemetry
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Map Controls Toolbar */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-auto">
        {onToggleTileMode && (
          <button
            type="button"
            onClick={onToggleTileMode}
            title={tileMode === 'dark' ? 'Switch to Standard OpenStreetMap' : 'Switch to Dark Matter'}
            className="w-9 h-9 flex items-center justify-center bg-portal-surface/90 hover:bg-portal-surface text-portal-text hover:text-white border border-portal-border rounded shadow-lg backdrop-blur transition cursor-pointer"
          >
            <i className={tileMode === 'dark' ? 'pi pi-sun text-sm text-yellow-400' : 'pi pi-moon text-sm text-portal-accent'} />
          </button>
        )}
      </div>
    </div>
  );
};
