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
  const isMoving = status === 'moving';
  const shortPlate = registrationNumber || '';

  const html = `
    <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -50%);">
      ${
        isSelected
          ? `<div style="
              position: absolute;
              width: 44px;
              height: 44px;
              top: -6px;
              left: -6px;
              border-radius: 50%;
              border: 2px dashed #41cc84;
              animation: spin 8s linear infinite;
              pointer-events: none;
            "></div>`
          : ''
      }

      <!-- Outer Pulse Ring for moving vehicles -->
      ${
        isMoving
          ? `<div style="
              position: absolute;
              width: 38px;
              height: 38px;
              top: -3px;
              left: -3px;
              border-radius: 50%;
              background: ${colors.pulse};
              animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
              pointer-events: none;
            "></div>`
          : ''
      }

      <!-- Main Marker Circle & Direction Arrow -->
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: ${colors.bg};
        border: 2.5px solid ${isSelected ? '#41cc84' : colors.border};
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 2;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      ">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="1.5"
          style="
            color: #ffffff;
            transform: rotate(${rotation}deg);
            transform-origin: center center;
            transition: transform 0.3s ease;
          "
        >
          <!-- Sleek Navigation / Arrow Icon pointing UP (0 deg) -->
          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
        </svg>
      </div>

      <!-- Compact Plate Tag Pill -->
      ${
        shortPlate
          ? `<div style="
              position: absolute;
              top: 34px;
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
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}
