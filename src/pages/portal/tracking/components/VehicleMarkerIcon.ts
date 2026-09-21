import L from 'leaflet';

export type VehicleTelemetryStatus = 'moving' | 'idling' | 'stopped';

export function getVehicleStatus(
  ignition?: boolean | null,
  motion?: boolean | null,
  speed?: number | null
): VehicleTelemetryStatus {
  const hasSpeed = (speed ?? 0) > 1.0;
  if (ignition && (motion || hasSpeed)) {
    return 'moving';
  }
  if (ignition) {
    return 'idling';
  }
  return 'stopped';
}

interface MarkerIconOptions {
  ignition?: boolean | null;
  motion?: boolean | null;
  speed?: number | null;
  course?: number | null;
  isSelected?: boolean;
  registrationNumber?: string;
}

export function createVehicleMarkerIcon({
  ignition,
  motion,
  speed,
  course,
  isSelected = false,
  registrationNumber,
}: MarkerIconOptions): L.DivIcon {
  const status = getVehicleStatus(ignition, motion, speed);

  // Status colors adhering strictly to portal theme
  const colors = {
    moving: {
      bg: '#41cc84', // portal-accent
      border: '#ffffff',
      pulse: 'rgba(65, 204, 132, 0.45)',
      badge: '#045e1f',
    },
    idling: {
      bg: '#f0883e', // portal-orange
      border: '#ffffff',
      pulse: 'rgba(240, 136, 62, 0.35)',
      badge: '#7a3e08',
    },
    stopped: {
      bg: '#768390', // portal-muted
      border: '#adbac7',
      pulse: 'transparent',
      badge: '#2d333b',
    },
  }[status];

  const rotation = typeof course === 'number' && !isNaN(course) ? course : 0;
  const shortPlate = registrationNumber || '';

  const html = `
    <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -50%); width: 58px;">
      ${
        isSelected
          ? `<div style="
              position: absolute;
              width: 58px;
              height: 58px;
              top: -2px;
              left: 0;
              border-radius: 50%;
              border: 3px solid #41cc84;
              box-shadow: 0 0 0 5px rgba(65,204,132,0.22);
              pointer-events: none;
            "></div>`
          : ''
      }

      <div style="position: relative; width: 58px; height: 66px; z-index: 2;">
        <img src="/images/vehicle-marker.png" alt="" style="width: 58px; height: 66px; object-fit: contain; transform: rotate(${rotation}deg); filter: drop-shadow(0 4px 5px rgba(0,0,0,0.45));" />
        <span style="position: absolute; right: 2px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: ${colors.bg}; border: 2px solid #22272e;"></span>
      </div>

      <!-- Vehicle label -->
      ${
        shortPlate
          ? `<div style="
              position: absolute;
              top: 64px;
              background-color: #22272e;
              color: #adbac7;
              border: 1px solid #444c56;
              border-radius: 3px;
              padding: 1px 5px;
              font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.02em;
              white-space: nowrap;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
              pointer-events: none;
              z-index: 1;
            ">
              ${shortPlate}
            </div>`
          : ''
      }
    </div>
  `;

  return L.divIcon({
    className: 'custom-vehicle-marker-icon',
    html,
    iconSize: [58, 76],
    iconAnchor: [29, 33],
    popupAnchor: [0, -32],
  });
}
